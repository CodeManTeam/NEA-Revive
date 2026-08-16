//! MuDB schema value model — byte-exact semantics ported from Shared/mudb.
//!
//! Design mirrors the JS runtime: every schema type carries an identity; diff
//! writes to a WriteStream; patch reads from a ReadStream. Values are a plain
//! enum tree so schemas can be described at runtime (like the JS MuStruct
//! constructor spec) instead of via Rust generics.

use crate::stream::{ReadStream, WriteStream};

pub const SCHROEPPEL2: u32 = 0xAAAA_AAAA;

/// A schema type with its wire semantics (identity + diff/patch rules).
#[derive(Clone, Debug)]
pub enum Schema {
    Boolean(bool),
    Uint8(u8),
    Uint16(u16),
    Uint32(u32),
    Int8(i8),
    Int16(i16),
    Int32(i32),
    Float32(f32),
    Float64(f64),
    Varint(u32),
    RVarint(u32),
    QuantizedFloat {
        precision: f32,
        identity: f32,
    },
    ASCII(String),
    FixedASCII(String),
    UTF8(String),
    Bytes(Vec<u8>),
    Array {
        elem: Box<Schema>,
        capacity: u32,
        identity: Vec<Value>,
    },
    Option {
        elem: Box<Schema>,
        identity: Option<Box<Value>>,
        identity_is_undefined: bool,
    },
    Union {
        /// sorted type names (JS `Object.keys(spec).sort()`)
        types: Vec<String>,
        schemas: Vec<Schema>,
        identity_type: String,
    },
    Dictionary {
        elem: Box<Schema>,
        capacity: u32,
        identity: Vec<(String, Value)>,
    },
    SortedArray {
        elem: Box<Schema>,
        capacity: u32,
        identity: Vec<Value>,
    },
    Struct {
        /// fields in WIRE order (JS constructor sorts by muType desc, name asc)
        names: Vec<String>,
        schemas: Vec<Schema>,
    },
    /// MuDate — two varints (low 28 bits, high quotient).
    Date,
    /// MuJSON — writeString(JSON.stringify(target)); always diffed.
    Json,
    /// MuVector (float32 elements, JS MuVector over Float32Array): byte-level
    /// tracker diff over dimension*4 bytes.
    Vector {
        dimension: usize,
    },
    /// NEA cube-axis scalar: single-byte index into CUBE_AXIS.
    CubeAxis,
    /// NEA QuantizedVecN (2/3/4): header + varint deltas.
    QuantizedVec {
        precision: f32,
        dimension: usize,
        identity: Vec<f32>,
    },
    Void,
}

/// A runtime value tree (mirrors the JS data shapes).
#[derive(Clone, Debug, PartialEq)]
pub enum Value {
    Bool(bool),
    U8(u8),
    U16(u16),
    U32(u32),
    I8(i8),
    I16(i16),
    I32(i32),
    F32(f32),
    F64(f64),
    Varint(u32),
    RVarint(u32),
    Quantized(f32),
    ASCII(String),
    FixedASCII(String),
    UTF8(String),
    Bytes(Vec<u8>),
    Array(Vec<Value>),
    Option(Option<Box<Value>>),
    Union { type_index: usize, data: Box<Value> },
    Dictionary(Vec<(String, Value)>),
    SortedArray(Vec<Value>),
    Struct(Vec<Value>),
    Date(i64),
    Json(serde_json::Value),
    Vector(Vec<f32>),
    CubeAxis(u8),
    QuantizedVec(Vec<f32>),
    Void,
}

impl Value {
    pub fn type_name(&self) -> &'static str {
        match self {
            Value::Bool(_) => "boolean",
            Value::U8(_) => "uint8",
            Value::U16(_) => "uint16",
            Value::U32(_) => "uint32",
            Value::I8(_) => "int8",
            Value::I16(_) => "int16",
            Value::I32(_) => "int32",
            Value::F32(_) => "float32",
            Value::F64(_) => "float64",
            Value::Varint(_) => "varint",
            Value::RVarint(_) => "rvarint",
            Value::Quantized(_) => "quantized-float",
            Value::ASCII(_) => "ascii",
            Value::FixedASCII(_) => "fixed-ascii",
            Value::UTF8(_) => "utf8",
            Value::Bytes(_) => "bytes",
            Value::Array(_) => "array",
            Value::Option(_) => "option",
            Value::Union { .. } => "union",
            Value::Dictionary(_) => "dictionary",
            Value::SortedArray(_) => "sorted-array",
            Value::Struct(_) => "struct",
            Value::Date(_) => "date",
            Value::Json(_) => "json",
            Value::Vector(_) => "vector",
            Value::CubeAxis(_) => "cube-axis",
            Value::QuantizedVec(_) => "quantized-vec",
            Value::Void => "void",
        }
    }
}

// ---------------------------------------------------------------------------
// identity
// ---------------------------------------------------------------------------

impl Schema {
    pub fn identity(&self) -> Value {
        match self {
            Schema::Boolean(b) => Value::Bool(*b),
            Schema::Uint8(x) => Value::U8(*x),
            Schema::Uint16(x) => Value::U16(*x),
            Schema::Uint32(x) => Value::U32(*x),
            Schema::Int8(x) => Value::I8(*x),
            Schema::Int16(x) => Value::I16(*x),
            Schema::Int32(x) => Value::I32(*x),
            Schema::Float32(x) => Value::F32(*x),
            Schema::Float64(x) => Value::F64(*x),
            Schema::Varint(x) => Value::Varint(*x),
            Schema::RVarint(x) => Value::RVarint(*x),
            Schema::QuantizedFloat { identity, .. } => Value::Quantized(*identity),
            Schema::ASCII(s) => Value::ASCII(s.clone()),
            Schema::FixedASCII(s) => Value::FixedASCII(s.clone()),
            Schema::UTF8(s) => Value::UTF8(s.clone()),
            Schema::Bytes(b) => Value::Bytes(b.clone()),
            Schema::Array { identity, .. } => Value::Array(identity.clone()),
            Schema::Option {
                identity,
                identity_is_undefined,
                ..
            } => {
                if *identity_is_undefined {
                    Value::Option(None)
                } else {
                    Value::Option(identity.clone())
                }
            }
            Schema::Union {
                types,
                schemas,
                identity_type,
            } => {
                let idx = types.iter().position(|t| t == identity_type).unwrap_or(0);
                let data = schemas
                    .get(idx)
                    .map(|s| s.identity())
                    .unwrap_or(Value::Void);
                Value::Union {
                    type_index: idx,
                    data: Box::new(data),
                }
            }
            Schema::Dictionary { identity, .. } => Value::Dictionary(identity.clone()),
            Schema::SortedArray { identity, .. } => Value::SortedArray(identity.clone()),
            Schema::Struct { names, schemas } => {
                let vals = schemas.iter().map(|s| s.identity()).collect();
                let _ = names;
                Value::Struct(vals)
            }
            Schema::Date => Value::Date(0),
            Schema::Json => Value::Json(serde_json::json!({})),
            Schema::Vector { dimension } => Value::Vector(vec![0.0; *dimension]),
            Schema::CubeAxis => Value::CubeAxis(0),
            Schema::QuantizedVec {
                identity,
                dimension,
                ..
            } => Value::QuantizedVec({
                let mut v = vec![0.0; *dimension];
                for (i, x) in identity.iter().enumerate().take(*dimension) {
                    v[i] = *x;
                }
                v
            }),
            Schema::Void => Value::Void,
        }
    }

    /// JS `equal(a, b)`.
    pub fn equal(&self, a: &Value, b: &Value) -> bool {
        match (a, b) {
            (Value::Bool(x), Value::Bool(y)) => x == y,
            (Value::U8(x), Value::U8(y)) => x == y,
            (Value::U16(x), Value::U16(y)) => x == y,
            (Value::U32(x), Value::U32(y)) => x == y,
            (Value::I8(x), Value::I8(y)) => x == y,
            (Value::I16(x), Value::I16(y)) => x == y,
            (Value::I32(x), Value::I32(y)) => x == y,
            (Value::F32(x), Value::F32(y)) => x == y,
            (Value::F64(x), Value::F64(y)) => x == y,
            (Value::Varint(x), Value::Varint(y)) => x == y,
            (Value::RVarint(x), Value::RVarint(y)) => x == y,
            (Value::Quantized(x), Value::Quantized(y)) => {
                // JS: invPrecision-based compare: ((invP*x)>>0) === ((invP*y)>>0)
                match self {
                    Schema::QuantizedFloat { precision, .. } => {
                        let inv = 1.0 / precision;
                        ((inv * x) as i32) == ((inv * y) as i32)
                    }
                    _ => x == y,
                }
            }
            (Value::ASCII(x), Value::ASCII(y)) => x == y,
            (Value::FixedASCII(x), Value::FixedASCII(y)) => x == y,
            (Value::UTF8(x), Value::UTF8(y)) => x == y,
            (Value::Bytes(x), Value::Bytes(y)) => x == y,
            (Value::Array(x), Value::Array(y)) => {
                if x.len() != y.len() {
                    return false;
                }
                let elem = match self {
                    Schema::Array { elem, .. } => elem,
                    _ => return x == y,
                };
                x.iter().zip(y.iter()).all(|(a, b)| elem.equal(a, b))
            }
            (Value::Option(x), Value::Option(y)) => match (x, y) {
                (None, None) => true,
                (Some(a), Some(b)) => match self {
                    Schema::Option { elem, .. } => elem.equal(a, b),
                    _ => a == b,
                },
                _ => false,
            },
            (
                Value::Union {
                    type_index: ti,
                    data: da,
                },
                Value::Union {
                    type_index: tj,
                    data: db,
                },
            ) => {
                if ti != tj {
                    return false;
                }
                match self {
                    Schema::Union { schemas, .. } => {
                        if *ti >= schemas.len() {
                            return ti == tj;
                        }
                        schemas[*ti].equal(da, db)
                    }
                    _ => da == db,
                }
            }
            (Value::Dictionary(x), Value::Dictionary(y)) => {
                if x.len() != y.len() {
                    return false;
                }
                let elem = match self {
                    Schema::Dictionary { elem, .. } => elem,
                    _ => return x == y,
                };
                x.iter().all(|(k, v)| {
                    y.iter()
                        .find(|(k2, _)| k2 == k)
                        .map(|(_, v2)| elem.equal(v, v2))
                        .unwrap_or(false)
                })
            }
            (Value::SortedArray(x), Value::SortedArray(y)) => {
                if x.len() != y.len() {
                    return false;
                }
                let elem = match self {
                    Schema::SortedArray { elem, .. } => elem,
                    _ => return x == y,
                };
                x.iter().zip(y.iter()).all(|(a, b)| elem.equal(a, b))
            }
            (Value::Struct(x), Value::Struct(y)) => {
                if x.len() != y.len() {
                    return false;
                }
                match self {
                    Schema::Struct { schemas, .. } => x
                        .iter()
                        .zip(y.iter())
                        .enumerate()
                        .all(|(i, (a, b))| schemas[i].equal(a, b)),
                    _ => x == y,
                }
            }
            (Value::Void, Value::Void) => true,
            (Value::Date(x), Value::Date(y)) => x == y,
            (Value::Json(x), Value::Json(y)) => x == y,
            (Value::Vector(x), Value::Vector(y)) => x == y,
            (Value::CubeAxis(x), Value::CubeAxis(y)) => x == y,
            (Value::QuantizedVec(x), Value::QuantizedVec(y)) => match self {
                Schema::QuantizedVec { precision, .. } => {
                    let inv = 1.0 / precision;
                    if x.len() != y.len() {
                        return false;
                    }
                    x.iter()
                        .zip(y.iter())
                        .all(|(a, b)| ((inv * a) as i32) == ((inv * b) as i32))
                }
                _ => x == y,
            },
            _ => false,
        }
    }

    /// JS `clone(s)`.
    pub fn clone_value(&self, v: &Value) -> Value {
        match v {
            Value::Quantized(x) => match self {
                Schema::QuantizedFloat { precision, .. } => {
                    let inv = 1.0 / precision;
                    Value::Quantized(((inv * x) as i32) as f32 * precision)
                }
                _ => v.clone(),
            },
            Value::Array(items) => {
                let elem = match self {
                    Schema::Array { elem, .. } => elem,
                    _ => return v.clone(),
                };
                Value::Array(items.iter().map(|i| elem.clone_value(i)).collect())
            }
            Value::Option(inner) => match self {
                Schema::Option { elem, .. } => {
                    Value::Option(inner.as_ref().map(|b| Box::new(elem.clone_value(b))))
                }
                _ => v.clone(),
            },
            Value::Union { type_index, data } => match self {
                Schema::Union { schemas, .. } => {
                    let data = if *type_index < schemas.len() {
                        schemas[*type_index].clone_value(data)
                    } else {
                        (**data).clone()
                    };
                    Value::Union {
                        type_index: *type_index,
                        data: Box::new(data),
                    }
                }
                _ => v.clone(),
            },
            Value::Dictionary(entries) => match self {
                Schema::Dictionary { elem, .. } => Value::Dictionary(
                    entries
                        .iter()
                        .map(|(k, val)| (k.clone(), elem.clone_value(val)))
                        .collect(),
                ),
                _ => v.clone(),
            },
            Value::SortedArray(items) => match self {
                Schema::SortedArray { elem, .. } => {
                    Value::SortedArray(items.iter().map(|i| elem.clone_value(i)).collect())
                }
                _ => v.clone(),
            },
            Value::Struct(fields) => match self {
                Schema::Struct { schemas, .. } => Value::Struct(
                    fields
                        .iter()
                        .zip(schemas.iter())
                        .map(|(f, s)| s.clone_value(f))
                        .collect(),
                ),
                _ => v.clone(),
            },
            Value::QuantizedVec(items) => match self {
                Schema::QuantizedVec { precision, .. } => Value::QuantizedVec(
                    items
                        .iter()
                        .map(|x| ((1.0 / precision) * x) as i32 as f32 * precision)
                        .collect(),
                ),
                _ => v.clone(),
            },
            _ => v.clone(),
        }
    }

    /// JS `assign(dst, src)` — returns the assigned value.
    pub fn assign_value(&self, dst: &Value, src: &Value) -> Value {
        match (dst, src) {
            (Value::Quantized(_), Value::Quantized(s)) => match self {
                Schema::QuantizedFloat { precision, .. } => {
                    let inv = 1.0 / precision;
                    Value::Quantized(((inv * s) as i32) as f32 * precision)
                }
                _ => src.clone(),
            },
            (Value::Array(d), Value::Array(s)) => {
                let elem = match self {
                    Schema::Array { elem, .. } => elem,
                    _ => return src.clone(),
                };
                let n = s.len();
                let m = d.len();
                let mut out = Vec::with_capacity(n);
                for i in 0..m.min(n) {
                    out.push(elem.assign_value(&d[i], &s[i]));
                }
                for i in m..n {
                    out.push(elem.clone_value(&s[i]));
                }
                out.truncate(n);
                Value::Array(out)
            }
            (Value::Option(d), Value::Option(s)) => match (d, s) {
                (Some(_), Some(sv)) => match self {
                    Schema::Option { elem, .. } => {
                        Value::Option(Some(Box::new(elem.clone_value(sv))))
                    }
                    _ => src.clone(),
                },
                _ => src.clone(),
            },
            (Value::Union { .. }, Value::Union { type_index, data }) => match self {
                Schema::Union { schemas, .. } => {
                    let data = if *type_index < schemas.len() {
                        schemas[*type_index].clone_value(data)
                    } else {
                        (**data).clone()
                    };
                    Value::Union {
                        type_index: *type_index,
                        data: Box::new(data),
                    }
                }
                _ => src.clone(),
            },
            _ => src.clone(),
        }
    }

    /// JS `diff(base, target, stream) -> bool`.
    pub fn diff(&self, base: &Value, target: &Value, out: &mut WriteStream) -> bool {
        match self {
            Schema::Boolean(_) => {
                if let (Value::Bool(b), Value::Bool(t)) = (base, target) {
                    if b != t {
                        out.grow(1);
                        out.write_u8(if *t { 1 } else { 0 });
                        return true;
                    }
                }
                false
            }
            Schema::Uint8(_) => fixed_diff(base, target, |b, t| {
                if let (Value::U8(b), Value::U8(t)) = (b, t) {
                    if b != t {
                        out.write_u8(*t);
                        return true;
                    }
                }
                false
            }),
            Schema::Uint16(_) => fixed_diff(base, target, |b, t| {
                if let (Value::U16(b), Value::U16(t)) = (b, t) {
                    if b != t {
                        out.write_u16(*t);
                        return true;
                    }
                }
                false
            }),
            Schema::Uint32(_) => fixed_diff(base, target, |b, t| {
                if let (Value::U32(b), Value::U32(t)) = (b, t) {
                    if b != t {
                        out.write_u32(*t);
                        return true;
                    }
                }
                false
            }),
            Schema::Int8(_) => fixed_diff(base, target, |b, t| {
                if let (Value::I8(b), Value::I8(t)) = (b, t) {
                    if b != t {
                        out.write_i8(*t);
                        return true;
                    }
                }
                false
            }),
            Schema::Int16(_) => fixed_diff(base, target, |b, t| {
                if let (Value::I16(b), Value::I16(t)) = (b, t) {
                    if b != t {
                        out.write_i16(*t);
                        return true;
                    }
                }
                false
            }),
            Schema::Int32(_) => fixed_diff(base, target, |b, t| {
                if let (Value::I32(b), Value::I32(t)) = (b, t) {
                    if b != t {
                        out.write_i32(*t);
                        return true;
                    }
                }
                false
            }),
            Schema::Float32(_) => fixed_diff(base, target, |b, t| {
                if let (Value::F32(b), Value::F32(t)) = (b, t) {
                    if b != t {
                        out.write_f32(*t);
                        return true;
                    }
                }
                false
            }),
            Schema::Float64(_) => fixed_diff(base, target, |b, t| {
                if let (Value::F64(b), Value::F64(t)) = (b, t) {
                    if b != t {
                        out.write_f64(*t);
                        return true;
                    }
                }
                false
            }),
            Schema::Varint(_) => {
                if let (Value::Varint(b), Value::Varint(t)) = (base, target) {
                    if b != t {
                        out.grow(5);
                        out.write_varint(*t);
                        return true;
                    }
                }
                false
            }
            Schema::RVarint(_) => {
                if let (Value::RVarint(b), Value::RVarint(t)) = (base, target) {
                    if b != t {
                        out.grow(5);
                        let v = (SCHROEPPEL2 as i64 + (*t as i64 - *b as i64)) as u32 ^ SCHROEPPEL2;
                        out.write_varint(v);
                        return true;
                    }
                }
                false
            }
            Schema::QuantizedFloat { precision, .. } => {
                if let (Value::Quantized(b), Value::Quantized(t)) = (base, target) {
                    let inv = 1.0 / precision;
                    let bq = (inv * b) as i32;
                    let tq = (inv * t) as i32;
                    if bq != tq {
                        out.grow(5);
                        let v =
                            ((SCHROEPPEL2 as i64 + (tq as i64 - bq as i64)) as u32) ^ SCHROEPPEL2;
                        out.write_varint(v);
                        return true;
                    }
                }
                false
            }
            Schema::ASCII(_) => {
                if let (Value::ASCII(b), Value::ASCII(t)) = (base, target) {
                    if b != t {
                        out.grow(5 + t.len());
                        out.write_varint(t.len() as u32);
                        out.write_ascii(t);
                        return true;
                    }
                }
                false
            }
            Schema::FixedASCII(_) => {
                if let (Value::FixedASCII(b), Value::FixedASCII(t)) = (base, target) {
                    if b != t {
                        out.grow(t.len());
                        out.write_ascii(t);
                        return true;
                    }
                }
                false
            }
            Schema::UTF8(_) => {
                if let (Value::UTF8(b), Value::UTF8(t)) = (base, target) {
                    if b != t {
                        out.write_utf8(t);
                        return true;
                    }
                }
                false
            }
            Schema::Bytes(_) => {
                // JS MuBytes.diff ALWAYS writes (varint(len)+bytes) and returns true.
                if let (_, Value::Bytes(t)) = (base, target) {
                    out.grow(5 + t.len());
                    out.write_varint(t.len() as u32);
                    for b in t {
                        out.write_u8(*b);
                    }
                    return true;
                }
                false
            }
            Schema::Array { elem, .. } => {
                let (b_list, t_list) = match (base, target) {
                    (Value::Array(b), Value::Array(t)) => (b, t),
                    _ => return false,
                };
                let t_len = t_list.len();
                let num_trackers = (t_len + 7) / 8;
                out.grow(4 + num_trackers);
                let head = out.len();
                out.write_varint(t_len as u32);
                let mut tracker_offset = out.len();
                // reserve tracker bytes
                for _ in 0..num_trackers {
                    out.write_u8(0);
                }
                let mut tracker: u8 = 0;
                let mut num_patches = 0usize;
                let b_len = b_list.len();
                for i in 0..b_len.min(t_len) {
                    if elem.diff(&b_list[i], &t_list[i], out) {
                        tracker |= 1 << (i & 7);
                        num_patches += 1;
                    }
                    if (i & 7) == 7 {
                        out.write_u8_at(tracker_offset, tracker);
                        tracker_offset += 1;
                        tracker = 0;
                    }
                }
                let elem_identity = elem.identity();
                for i in b_len..t_len {
                    if elem.diff(&elem_identity, &t_list[i], out) {
                        tracker |= 1 << (i & 7);
                        num_patches += 1;
                    }
                    if (i & 7) == 7 {
                        out.write_u8_at(tracker_offset, tracker);
                        tracker_offset += 1;
                        tracker = 0;
                    }
                }
                if t_len & 7 != 0 {
                    out.write_u8_at(tracker_offset, tracker);
                }
                if num_patches > 0 || b_len != t_len {
                    true
                } else {
                    out.bytes.truncate(head);
                    false
                }
            }
            Schema::Option { elem, .. } => {
                let (b_opt, t_opt) = match (base, target) {
                    (Value::Option(b), Value::Option(t)) => (b, t),
                    _ => return false,
                };
                match (b_opt, t_opt) {
                    (None, None) => false,
                    (None, Some(t)) => {
                        out.grow(1);
                        let id = elem.identity();
                        if elem.equal(&id, t) {
                            out.write_u8(1); // BECAME_IDENTITY
                            return true;
                        }
                        out.write_u8(2); // BECAME_DEFINED
                        elem.diff(&id, t, out);
                        true
                    }
                    (Some(_), None) => {
                        out.grow(1);
                        out.write_u8(0); // BECAME_UNDEFINED
                        true
                    }
                    (Some(b), Some(t)) => {
                        if elem.equal(b, t) {
                            return false;
                        }
                        out.grow(1);
                        out.write_u8(3); // STAYED_DEFINED
                        elem.diff(b, t, out);
                        true
                    }
                }
            }
            Schema::Union {
                types: _, schemas, ..
            } => {
                let (b_ti, b_data, t_ti, t_data) = match (base, target) {
                    (
                        Value::Union {
                            type_index: bi,
                            data: bd,
                        },
                        Value::Union {
                            type_index: ti,
                            data: td,
                        },
                    ) => (*bi, &**bd, *ti, &**td),
                    _ => return false,
                };
                let head = out.len();
                out.grow(8);
                out.write_u8(0); // opcode placeholder
                let mut opcode: u8 = 0;
                let t_schema = &schemas[t_ti];
                if b_ti == t_ti {
                    if t_schema.diff(b_data, t_data, out) {
                        opcode = 1;
                    }
                } else {
                    out.write_u8(t_ti as u8); // type index into sorted types
                    if t_schema.diff(&t_schema.identity(), t_data, out) {
                        opcode = 2;
                    } else {
                        opcode = 4;
                    }
                }
                if opcode != 0 {
                    out.write_u8_at(head, opcode);
                    true
                } else {
                    out.bytes.truncate(head);
                    false
                }
            }
            Schema::Dictionary { elem, .. } => {
                let (b_map, t_map) = match (base, target) {
                    (Value::Dictionary(b), Value::Dictionary(t)) => (b, t),
                    _ => return false,
                };
                let mut num_del = 0usize;
                let mut num_patch = 0usize;
                let head = out.len();
                out.grow(12);
                for _ in 0..12 {
                    out.write_u8(0);
                }
                let mut b_keys: Vec<&String> = b_map.iter().map(|(k, _)| k).collect();
                b_keys.sort();
                let t_has: std::collections::HashSet<&String> =
                    t_map.iter().map(|(k, _)| k).collect();
                for (i, k) in b_keys.iter().enumerate() {
                    if !t_has.contains(*k) {
                        num_del += 1;
                        out.write_varint(i as u32);
                    }
                }
                let mut new_keys: Vec<&String> = Vec::new();
                for (k, tv) in t_map.iter() {
                    if let Some(pos) = b_map.iter().position(|(bk, _)| bk == k) {
                        let prefix = out.len();
                        out.grow(5);
                        let bidx = b_keys.iter().position(|bk| *bk == k).unwrap();
                        out.write_varint(bidx as u32);
                        if elem.diff(&b_map[pos].1, tv, out) {
                            num_patch += 1;
                        } else {
                            out.bytes.truncate(prefix);
                        }
                    } else {
                        new_keys.push(k);
                    }
                }
                let num_add = new_keys.len();
                let num_trackers = (num_add + 7) / 8;
                out.grow(num_trackers);
                let mut tracker_offset = out.len();
                for _ in 0..num_trackers {
                    out.write_u8(0);
                }
                let mut tracker: u8 = 0;
                let id = elem.identity();
                for (i, k) in new_keys.iter().enumerate() {
                    out.write_utf8(k);
                    if let Some((_, tv)) = t_map.iter().find(|(kk, _)| kk == *k) {
                        if elem.diff(&id, tv, out) {
                            tracker |= 1 << (i & 7);
                        }
                    }
                    if (i & 7) == 7 {
                        out.write_u8_at(tracker_offset, tracker);
                        tracker_offset += 1;
                        tracker = 0;
                    }
                }
                if num_add & 7 != 0 {
                    out.write_u8_at(tracker_offset, tracker);
                }
                if num_del > 0 || num_patch > 0 || num_add > 0 {
                    out.write_u32_at(head, num_del as u32);
                    out.write_u32_at(head + 4, num_patch as u32);
                    out.write_u32_at(head + 8, num_add as u32);
                    true
                } else {
                    out.bytes.truncate(head);
                    false
                }
            }
            Schema::SortedArray { elem, .. } => {
                let (b_list, t_list) = match (base, target) {
                    (Value::SortedArray(b), Value::SortedArray(t)) => (b, t),
                    _ => return false,
                };
                // JS MuSortedArray.diff — opcode stream (see sorted-array.js)
                if b_list.is_empty() && t_list.is_empty() {
                    return false;
                }
                const SKIP: u32 = 0;
                const PATCH: u32 = 1;
                const INSERT: u32 = 2;
                const INSERT_IDENTITY: u32 = 3;
                const COPY: u32 = 4;
                let head = out.len();
                out.grow(8);
                // JS: out.offset += 4 — reserve numOps slot at head
                out.write_u32(0);
                let mut op_ptr = head; // JS opPtr = head initially
                let mut op_count: u32 = 0;
                let mut op_code: i32 = -1; // NONE
                let mut num_ops: u32 = 0;
                macro_rules! emit_op {
                    () => {
                        if op_count > 0 {
                            out.write_u32_at(op_ptr, (op_count << 3) | op_code as u32);
                            num_ops += 1;
                        }
                        // JS: opPtr = out.offset; out.offset += 4 — reserve next slot
                        out.grow(4);
                        op_ptr = out.len();
                        out.write_u32(0);
                    };
                }
                let id = elem.identity();
                let mut base_ptr = 0usize;
                let mut target_ptr = 0usize;
                // compare: JS defaultCompare (a<b => -1). Values here compare by
                // their canonical JSON-ish ordering — reuse PartialOrd on debug string.
                while base_ptr < b_list.len() && target_ptr < t_list.len() {
                    let cmp = compare_values(&b_list[base_ptr], &t_list[target_ptr]);
                    if cmp < 0 {
                        if op_code != SKIP as i32 {
                            emit_op!();
                            op_count = 1;
                            op_code = SKIP as i32;
                        } else {
                            op_count += 1;
                        }
                        base_ptr += 1;
                    } else if cmp > 0 {
                        if op_code == INSERT as i32 {
                            if elem.diff(&id, &t_list[target_ptr], out) {
                                op_count += 1;
                            } else {
                                emit_op!();
                                op_code = INSERT_IDENTITY as i32;
                                op_count = 1;
                            }
                        } else if op_code == INSERT_IDENTITY as i32 {
                            let prev = out.len();
                            out.grow(4);
                            out.write_u32(0);
                            if elem.diff(&id, &t_list[target_ptr], out) {
                                emit_op!();
                                out.bytes.truncate(prev);
                                op_ptr = prev;
                                op_code = INSERT as i32;
                                op_count = 1;
                            } else {
                                out.bytes.truncate(prev);
                                op_count += 1;
                            }
                        } else {
                            emit_op!();
                            op_count = 1;
                            if elem.diff(&id, &t_list[target_ptr], out) {
                                op_code = INSERT as i32;
                            } else {
                                op_code = INSERT_IDENTITY as i32;
                            }
                        }
                        target_ptr += 1;
                    } else {
                        if op_code == PATCH as i32 {
                            if elem.diff(&b_list[base_ptr], &t_list[target_ptr], out) {
                                op_count += 1;
                            } else {
                                emit_op!();
                                op_code = COPY as i32;
                                op_count = 1;
                            }
                        } else if op_code == COPY as i32 {
                            let prev = out.len();
                            out.grow(4);
                            out.write_u32(0);
                            if elem.diff(&b_list[base_ptr], &t_list[target_ptr], out) {
                                emit_op!();
                                out.bytes.truncate(prev);
                                op_ptr = prev;
                                op_code = PATCH as i32;
                                op_count = 1;
                            } else {
                                out.bytes.truncate(prev);
                                op_count += 1;
                            }
                        } else {
                            emit_op!();
                            op_count = 1;
                            if elem.diff(&b_list[base_ptr], &t_list[target_ptr], out) {
                                op_code = PATCH as i32;
                            } else {
                                op_code = COPY as i32;
                            }
                        }
                        base_ptr += 1;
                        target_ptr += 1;
                    }
                }
                while base_ptr < b_list.len() {
                    if op_code != SKIP as i32 {
                        emit_op!();
                        op_count = (b_list.len() - base_ptr) as u32;
                        op_code = SKIP as i32;
                    } else {
                        op_count += (b_list.len() - base_ptr) as u32;
                    }
                    base_ptr += 1;
                }
                while target_ptr < t_list.len() {
                    if op_code == INSERT as i32 {
                        if elem.diff(&id, &t_list[target_ptr], out) {
                            op_count += 1;
                        } else {
                            emit_op!();
                            op_code = INSERT_IDENTITY as i32;
                            op_count = 1;
                        }
                    } else if op_code == INSERT_IDENTITY as i32 {
                        let prev = out.len();
                        out.grow(4);
                        out.write_u32(0);
                        if elem.diff(&id, &t_list[target_ptr], out) {
                            emit_op!();
                            out.bytes.truncate(prev);
                            op_ptr = prev;
                            op_code = INSERT as i32;
                            op_count = 1;
                        } else {
                            out.bytes.truncate(prev);
                            op_count += 1;
                        }
                    } else {
                        emit_op!();
                        op_count = 1;
                        if elem.diff(&id, &t_list[target_ptr], out) {
                            op_code = INSERT as i32;
                        } else {
                            op_code = INSERT_IDENTITY as i32;
                        }
                    }
                    target_ptr += 1;
                }
                if num_ops == 0 && op_code == COPY as i32 && op_count == b_list.len() as u32 {
                    out.bytes.truncate(head);
                    return false;
                }
                if op_code != SKIP as i32 {
                    emit_op!();
                }
                out.bytes.truncate(out.len() - 4); // remove trailing op placeholder
                out.write_u32_at(head, num_ops);
                true
            }
            Schema::Struct { schemas, .. } => {
                let (b_fields, t_fields) = match (base, target) {
                    (Value::Struct(b), Value::Struct(t)) => (b, t),
                    _ => return false,
                };
                let num_props = schemas.len();
                let tracker_bytes = (num_props + 7) / 8;
                let mut base_size = tracker_bytes;
                for s in schemas.iter() {
                    base_size += primitive_size(s);
                }
                let head = out.len();
                out.grow(base_size);
                for _ in 0..tracker_bytes {
                    out.write_u8(0);
                }
                let mut tracker: u8 = 0;
                let mut np = 0usize;
                for (i, (schema, (b, t))) in schemas
                    .iter()
                    .zip(b_fields.iter().zip(t_fields.iter()))
                    .enumerate()
                {
                    match schema {
                        Schema::Boolean(_) => {
                            if let (Value::Bool(b), Value::Bool(t)) = (b, t) {
                                if b != t {
                                    np += 1;
                                    tracker |= 1 << (i & 7);
                                }
                            }
                        }
                        Schema::Float32(_) => {
                            if let (Value::F32(b), Value::F32(t)) = (b, t) {
                                if b != t {
                                    out.write_f32(*t);
                                    np += 1;
                                    tracker |= 1 << (i & 7);
                                }
                            }
                        }
                        Schema::Float64(_) => {
                            if let (Value::F64(b), Value::F64(t)) = (b, t) {
                                if b != t {
                                    out.write_f64(*t);
                                    np += 1;
                                    tracker |= 1 << (i & 7);
                                }
                            }
                        }
                        Schema::Int8(_) => {
                            if let (Value::I8(b), Value::I8(t)) = (b, t) {
                                if b != t {
                                    out.write_i8(*t);
                                    np += 1;
                                    tracker |= 1 << (i & 7);
                                }
                            }
                        }
                        Schema::Int16(_) => {
                            if let (Value::I16(b), Value::I16(t)) = (b, t) {
                                if b != t {
                                    out.write_i16(*t);
                                    np += 1;
                                    tracker |= 1 << (i & 7);
                                }
                            }
                        }
                        Schema::Int32(_) => {
                            if let (Value::I32(b), Value::I32(t)) = (b, t) {
                                if b != t {
                                    out.write_i32(*t);
                                    np += 1;
                                    tracker |= 1 << (i & 7);
                                }
                            }
                        }
                        Schema::Uint8(_) => {
                            if let (Value::U8(b), Value::U8(t)) = (b, t) {
                                if b != t {
                                    out.write_u8(*t);
                                    np += 1;
                                    tracker |= 1 << (i & 7);
                                }
                            }
                        }
                        Schema::Uint16(_) => {
                            if let (Value::U16(b), Value::U16(t)) = (b, t) {
                                if b != t {
                                    out.write_u16(*t);
                                    np += 1;
                                    tracker |= 1 << (i & 7);
                                }
                            }
                        }
                        Schema::Uint32(_) => {
                            if let (Value::U32(b), Value::U32(t)) = (b, t) {
                                if b != t {
                                    out.write_u32(*t);
                                    np += 1;
                                    tracker |= 1 << (i & 7);
                                }
                            }
                        }
                        Schema::Varint(_) => {
                            if let (Value::Varint(b), Value::Varint(t)) = (b, t) {
                                if b != t {
                                    out.write_varint(*t);
                                    np += 1;
                                    tracker |= 1 << (i & 7);
                                }
                            }
                        }
                        Schema::RVarint(_) => {
                            if let (Value::RVarint(b), Value::RVarint(t)) = (b, t) {
                                if b != t {
                                    let v = (SCHROEPPEL2 as i64 + (*t as i64 - *b as i64)) as u32
                                        ^ SCHROEPPEL2;
                                    out.write_varint(v);
                                    np += 1;
                                    tracker |= 1 << (i & 7);
                                }
                            }
                        }
                        Schema::ASCII(_) => {
                            if let (Value::ASCII(b), Value::ASCII(t)) = (b, t) {
                                if b != t {
                                    out.grow(5 + t.len());
                                    out.write_varint(t.len() as u32);
                                    out.write_ascii(t);
                                    np += 1;
                                    tracker |= 1 << (i & 7);
                                }
                            }
                        }
                        Schema::QuantizedFloat { precision, .. } => {
                            if let (Value::Quantized(b), Value::Quantized(t)) = (b, t) {
                                let inv = 1.0 / precision;
                                let bq = (inv * b) as i32;
                                let tq = (inv * t) as i32;
                                if bq != tq {
                                    let v = ((SCHROEPPEL2 as i64 + (tq as i64 - bq as i64)) as u32)
                                        ^ SCHROEPPEL2;
                                    out.write_varint(v);
                                    np += 1;
                                    tracker |= 1 << (i & 7);
                                }
                            }
                        }
                        _ => {
                            // JS default branch: schema.diff(b, t, s)
                            if schema.diff(b, t, out) {
                                np += 1;
                                tracker |= 1 << (i & 7);
                            }
                        }
                    }
                    if (i & 7) == 7 {
                        out.write_u8_at(head + (i >> 3), tracker);
                        tracker = 0;
                    }
                }
                if num_props & 7 != 0 {
                    out.write_u8_at(head + tracker_bytes - 1, tracker);
                }
                if np > 0 {
                    true
                } else {
                    out.bytes.truncate(head);
                    false
                }
            }
            Schema::Date => {
                if let (Value::Date(b), Value::Date(t)) = (base, target) {
                    if b != t {
                        out.grow(10);
                        out.write_varint((*t as u64 % 0x10000000) as u32);
                        out.write_varint((*t as f64 / 268_435_456.0) as i64 as u32);
                        return true;
                    }
                }
                false
            }
            Schema::Json => {
                // JS MuJSON.diff: writeString(JSON.stringify(target)); always true
                if let (_, Value::Json(t)) = (base, target) {
                    let s = serde_json::to_string(t).unwrap_or_else(|_| "null".to_string());
                    out.write_utf8(&s);
                    return true;
                }
                false
            }
            Schema::Vector { dimension } => {
                // JS MuVector.diff: byte-level tracker over dimension*4 bytes
                let (b_arr, t_arr) = match (base, target) {
                    (Value::Vector(b), Value::Vector(t)) => (b, t),
                    _ => return false,
                };
                let byte_length = dimension * 4;
                let b_bytes = f32s_to_bytes(b_arr, byte_length);
                let t_bytes = f32s_to_bytes(t_arr, byte_length);
                out.grow((byte_length * 9 + 7) / 8);
                let head = out.len();
                let mut tracker_offset = head;
                for _ in 0..(byte_length + 7) / 8 {
                    out.write_u8(0);
                }
                let mut tracker: u8 = 0;
                let mut num_patches = 0usize;
                for i in 0..byte_length {
                    if b_bytes[i] != t_bytes[i] {
                        out.write_u8(t_bytes[i]);
                        tracker |= 1 << (i & 7);
                        num_patches += 1;
                    }
                    if (i & 7) == 7 {
                        out.write_u8_at(tracker_offset, tracker);
                        tracker_offset += 1;
                        tracker = 0;
                    }
                }
                if num_patches == 0 {
                    out.bytes.truncate(head);
                    return false;
                }
                if byte_length & 7 != 0 {
                    out.write_u8_at(tracker_offset, tracker);
                }
                true
            }
            Schema::CubeAxis => {
                if let (Value::CubeAxis(b), Value::CubeAxis(t)) = (base, target) {
                    if b != t {
                        out.grow(1);
                        out.write_u8(*t);
                        return true;
                    }
                }
                false
            }
            Schema::QuantizedVec {
                precision,
                dimension,
                ..
            } => {
                let (b_arr, t_arr) = match (base, target) {
                    (Value::QuantizedVec(b), Value::QuantizedVec(t)) => (b, t),
                    _ => return false,
                };
                let inv = 1.0 / precision;
                let mut changed_mask: u8 = 0;
                let mut masked = vec![0u32; *dimension];
                let mut order: Vec<usize> = Vec::new();
                for i in 0..*dimension {
                    let qb = (inv * b_arr[i]) as i32;
                    let qt = (inv * t_arr[i]) as i32;
                    if qb != qt {
                        changed_mask |= 1 << i;
                        masked[i] =
                            ((qt as i64 - qb as i64 + SCHROEPPEL2 as i64) as u32) ^ SCHROEPPEL2;
                        order.push(i);
                    }
                }
                if changed_mask == 0 {
                    return false;
                }
                let n_changed = order.len();
                out.grow(5 + 5 * n_changed);
                let shift = 7 - dimension;
                let nibble_mask: u8 = if *dimension == 4 { 0x7 } else { 0xf };
                let first = masked[order[0]];
                if first <= nibble_mask as u32 {
                    out.write_u8((changed_mask << shift) | first as u8);
                } else {
                    out.write_u8(
                        0x80 | (changed_mask << shift) | (first & nibble_mask as u32) as u8,
                    );
                    out.write_varint(first >> shift);
                }
                for k in 1..n_changed {
                    out.write_varint(masked[order[k]]);
                }
                true
            }
            Schema::Void => false,
        }
    }

    /// JS `patch(base, stream) -> value`.
    pub fn patch(&self, base: &Value, inp: &mut ReadStream) -> Result<Value, String> {
        match self {
            Schema::Boolean(_) => {
                let v = inp.read_u8()?;
                if v > 1 {
                    return Err(format!("invalid value for boolean: {v}"));
                }
                Ok(Value::Bool(v == 1))
            }
            Schema::Uint8(_) => Ok(Value::U8(inp.read_u8()?)),
            Schema::Uint16(_) => Ok(Value::U16(inp.read_u16()?)),
            Schema::Uint32(_) => Ok(Value::U32(inp.read_u32()?)),
            Schema::Int8(_) => Ok(Value::I8(inp.read_i8()?)),
            Schema::Int16(_) => Ok(Value::I16(inp.read_i16()?)),
            Schema::Int32(_) => Ok(Value::I32(inp.read_i32()?)),
            Schema::Float32(_) => Ok(Value::F32(inp.read_f32()?)),
            Schema::Float64(_) => Ok(Value::F64(inp.read_f64()?)),
            Schema::Varint(_) => Ok(Value::Varint(inp.read_varint()?)),
            Schema::RVarint(_) => {
                let v = inp.read_varint()?;
                let delta = ((SCHROEPPEL2 ^ v) as i64 - SCHROEPPEL2 as i64) as i32;
                let base = match base {
                    Value::RVarint(b) => *b as i64,
                    _ => 0,
                };
                Ok(Value::RVarint((base + delta as i64) as u32))
            }
            Schema::QuantizedFloat { precision, .. } => {
                let v = inp.read_varint()?;
                let delta = ((SCHROEPPEL2 ^ v) as i64 - SCHROEPPEL2 as i64) as i32;
                let bq = match base {
                    Value::Quantized(b) => ((1.0 / precision) * b) as i32,
                    _ => 0,
                };
                Ok(Value::Quantized((bq + delta) as f32 * precision))
            }
            Schema::ASCII(_) => {
                let len = inp.read_varint()?;
                Ok(Value::ASCII(inp.read_ascii(len)?))
            }
            Schema::FixedASCII(_) => {
                let len = match self {
                    Schema::FixedASCII(s) => s.len(),
                    _ => 0,
                };
                Ok(Value::FixedASCII(inp.read_ascii(len as u32)?))
            }
            Schema::UTF8(_) => Ok(Value::UTF8(inp.read_utf8()?)),
            Schema::Bytes(_) => {
                let len = inp.read_varint()? as usize;
                let bytes = inp.remaining_bytes();
                if bytes.len() < len {
                    return Err("out of bounds".to_string());
                }
                let mut out = Vec::with_capacity(len);
                out.extend_from_slice(&bytes[..len]);
                inp.offset += len;
                Ok(Value::Bytes(out))
            }
            Schema::Array { elem, capacity, .. } => {
                let t_len = inp.read_varint()?;
                if t_len > *capacity {
                    return Err(format!("target length {t_len} exceeds capacity {capacity}"));
                }
                let b_list = match base {
                    Value::Array(b) => b.clone(),
                    _ => Vec::new(),
                };
                let b_len = b_list.len();
                let l = b_len.min(t_len as usize);
                let num_trackers = ((t_len as usize) + 7) / 8;
                let mut tracker_offset = inp.offset;
                inp.offset += num_trackers;
                let mut result: Vec<Value> = Vec::with_capacity(t_len as usize);
                let mut tracker: u8 = 0;
                for i in 0..l {
                    if (i & 7) == 0 {
                        tracker = inp.read_u8_at(tracker_offset)?;
                        tracker_offset += 1;
                    }
                    if (1 << (i & 7)) & tracker != 0 {
                        result.push(elem.patch(&b_list[i], inp)?);
                    } else {
                        result.push(elem.clone_value(&b_list[i]));
                    }
                }
                let id = elem.identity();
                for i in b_len..t_len as usize {
                    if (i & 7) == 0 {
                        tracker = inp.read_u8_at(tracker_offset)?;
                        tracker_offset += 1;
                    }
                    if (1 << (i & 7)) & tracker != 0 {
                        result.push(elem.patch(&id, inp)?);
                    } else {
                        result.push(elem.clone_value(&id));
                    }
                }
                Ok(Value::Array(result))
            }
            Schema::Option { elem, .. } => {
                let type_diff = inp.read_u8()?;
                match type_diff {
                    0 => Ok(Value::Option(None)), // BECAME_UNDEFINED
                    1 => Ok(Value::Option(Some(Box::new(
                        elem.clone_value(&elem.identity()),
                    )))), // BECAME_IDENTITY
                    2 => {
                        // BECAME_DEFINED
                        let id = elem.identity();
                        Ok(Value::Option(Some(Box::new(elem.patch(&id, inp)?))))
                    }
                    3 => {
                        // STAYED_DEFINED
                        let b = match base {
                            Value::Option(Some(b)) => (**b).clone(),
                            _ => return Err("Panic in muOption, invariants broken".to_string()),
                        };
                        Ok(Value::Option(Some(Box::new(elem.patch(&b, inp)?))))
                    }
                    _ => Err(format!("Panic in muOption, invalid TypeDiff: {type_diff}")),
                }
            }
            Schema::Union { types, schemas, .. } => {
                let opcode = inp.read_u8()?;
                let (b_ti, b_data) = match base {
                    Value::Union { type_index, data } => (*type_index, (**data).clone()),
                    _ => (0, Value::Void),
                };
                let mut result = Value::Union {
                    type_index: b_ti,
                    data: Box::new(b_data),
                };
                if opcode == 1 {
                    let schema = &schemas[b_ti];
                    if let Value::Union { data, .. } = &mut result {
                        let new_data = schema.patch(data, inp)?;
                        *data = Box::new(new_data);
                    }
                } else {
                    let type_idx = inp.read_u8()? as usize;
                    if type_idx >= types.len() {
                        return Err(format!("invalid union type index {type_idx}"));
                    }
                    let schema = &schemas[type_idx];
                    let id = schema.identity();
                    let data = if opcode == 2 {
                        schema.patch(&id, inp)?
                    } else if opcode == 4 {
                        schema.clone_value(&id)
                    } else {
                        return Err(format!("invalid opcode {opcode}"));
                    };
                    result = Value::Union {
                        type_index: type_idx,
                        data: Box::new(data),
                    };
                }
                Ok(result)
            }
            Schema::Dictionary { elem, capacity, .. } => {
                let num_del = inp.read_u32()?;
                let num_patch = inp.read_u32()?;
                let num_add = inp.read_u32()?;
                let b_map = match base {
                    Value::Dictionary(b) => b.clone(),
                    _ => Vec::new(),
                };
                let mut b_keys: Vec<String> = b_map.iter().map(|(k, _)| k.clone()).collect();
                b_keys.sort();
                let num_target = b_keys.len() as i64 - num_del as i64 + num_add as i64;
                if num_target > *capacity as i64 {
                    return Err(format!(
                        "number of target props {num_target} exceeds capacity {capacity}"
                    ));
                }
                let mut keys_to_del: std::collections::HashSet<String> =
                    std::collections::HashSet::new();
                for _ in 0..num_del {
                    let idx = inp.read_varint()? as usize;
                    if let Some(k) = b_keys.get(idx) {
                        keys_to_del.insert(k.clone());
                    }
                }
                let mut result: Vec<(String, Value)> = Vec::new();
                for (k, v) in b_map.iter() {
                    if !keys_to_del.contains(k) {
                        result.push((k.clone(), elem.clone_value(v)));
                    }
                }
                for _ in 0..num_patch {
                    let idx = inp.read_varint()? as usize;
                    let key = b_keys.get(idx).ok_or("invalid index of key")?.clone();
                    if let Some(pos) = result.iter().position(|(k, _)| *k == key) {
                        let new_v = elem.patch(&result[pos].1, inp)?;
                        result[pos].1 = new_v;
                    }
                }
                let num_full = (num_add / 8) as usize;
                let num_trackers = ((num_add as usize) + 7) / 8;
                let mut tracker_offset = inp.offset;
                inp.offset += num_trackers;
                let id = elem.identity();
                for _ in 0..num_full {
                    let tracker = inp.read_u8_at(tracker_offset)?;
                    tracker_offset += 1;
                    for j in 0..8 {
                        let k = inp.read_utf8()?;
                        let v = if tracker & (1 << j) != 0 {
                            elem.patch(&id, inp)?
                        } else {
                            elem.clone_value(&id)
                        };
                        result.push((k, v));
                    }
                }
                if num_add & 7 != 0 {
                    let tracker = inp.read_u8_at(tracker_offset)?;
                    for i in 0..(num_add & 7) {
                        let k = inp.read_utf8()?;
                        let v = if tracker & (1 << i) != 0 {
                            elem.patch(&id, inp)?
                        } else {
                            elem.clone_value(&id)
                        };
                        result.push((k, v));
                    }
                }
                Ok(Value::Dictionary(result))
            }
            Schema::SortedArray { elem, capacity, .. } => {
                const SKIP: u32 = 0;
                const PATCH: u32 = 1;
                const INSERT: u32 = 2;
                const INSERT_IDENTITY: u32 = 3;
                const COPY: u32 = 4;
                let num_ops = inp.read_u32()?;
                let b_list = match base {
                    Value::SortedArray(b) => b.clone(),
                    _ => Vec::new(),
                };
                let id = elem.identity();
                let mut result: Vec<Value> = Vec::new();
                let mut ptr = 0usize;
                let mut t_length = 0usize;
                for _ in 0..num_ops {
                    let code = inp.read_u32()?;
                    let count = (code >> 3) as usize;
                    t_length += count;
                    if t_length > *capacity as usize {
                        return Err(format!("target length exceeds capacity {capacity}"));
                    }
                    let op = code & 0x7;
                    match op {
                        INSERT_IDENTITY => {
                            for _ in 0..count {
                                result.push(elem.clone_value(&id));
                            }
                        }
                        INSERT => {
                            for _ in 0..count {
                                result.push(elem.patch(&id, inp)?);
                            }
                        }
                        PATCH => {
                            for _ in 0..count {
                                let b = b_list.get(ptr).cloned().unwrap_or_else(|| id.clone());
                                result.push(elem.patch(&b, inp)?);
                                ptr += 1;
                            }
                        }
                        COPY => {
                            for _ in 0..count {
                                if let Some(b) = b_list.get(ptr) {
                                    result.push(elem.clone_value(b));
                                }
                                ptr += 1;
                            }
                        }
                        SKIP => {
                            ptr += count;
                        }
                        _ => return Err(format!("invalid sorted-array op {op}")),
                    }
                }
                Ok(Value::SortedArray(result))
            }
            Schema::Struct { schemas, .. } => {
                let num_props = schemas.len();
                let tracker_bytes = (num_props + 7) / 8;
                let head = inp.offset;
                inp.offset += tracker_bytes;
                let mut result: Vec<Value> = Vec::with_capacity(num_props);
                let b_fields = match base {
                    Value::Struct(b) => b.clone(),
                    _ => Vec::new(),
                };
                let mut tracker: u8 = 0;
                for (i, schema) in schemas.iter().enumerate() {
                    if (i & 7) == 0 {
                        tracker = inp.read_u8_at(head + (i >> 3))?;
                    }
                    let b = b_fields
                        .get(i)
                        .cloned()
                        .unwrap_or_else(|| schema.identity());
                    if (1 << (i & 7)) & tracker != 0 {
                        match schema {
                            Schema::Boolean(_) => {
                                // JS: !b[pr] — flip
                                let bv = match b {
                                    Value::Bool(x) => x,
                                    _ => false,
                                };
                                result.push(Value::Bool(!bv));
                            }
                            _ => {
                                result.push(schema.patch(&b, inp)?);
                            }
                        }
                    } else {
                        result.push(schema.clone_value(&b));
                    }
                }
                Ok(Value::Struct(result))
            }
            Schema::Date => {
                let lo = inp.read_varint()?;
                let hi = inp.read_varint()?;
                Ok(Value::Date(lo as i64 + (hi as i64 * 0x10000000)))
            }
            Schema::Json => {
                let s = inp.read_utf8()?;
                let v = serde_json::from_str(&s).map_err(|e| format!("invalid json: {e}"))?;
                Ok(Value::Json(v))
            }
            Schema::Vector { dimension } => {
                let byte_length = dimension * 4;
                let head = inp.offset;
                let num_tracker_bytes = (byte_length + 7) / 8;
                inp.offset += num_tracker_bytes;
                let mut bytes = f32s_to_bytes(&vec![0.0; *dimension], byte_length);
                let num_full = byte_length / 8;
                for i in 0..num_full {
                    let start = i * 8;
                    let tracker = inp.read_u8_at(head + i)?;
                    for j in 0..8 {
                        if tracker & (1 << j) != 0 {
                            bytes[start + j] = inp.read_u8()?;
                        }
                    }
                }
                if byte_length & 7 != 0 {
                    let start = num_full * 8;
                    let tracker = inp.read_u8_at(head + num_full)?;
                    let partial = byte_length & 7;
                    for j in 0..partial {
                        if tracker & (1 << j) != 0 {
                            bytes[start + j] = inp.read_u8()?;
                        }
                    }
                }
                Ok(Value::Vector(bytes_to_f32s(&bytes, *dimension)))
            }
            Schema::CubeAxis => {
                let idx = inp.read_u8()?;
                Ok(Value::CubeAxis(idx))
            }
            Schema::QuantizedVec {
                precision,
                dimension,
                ..
            } => {
                let header = inp.read_u8()?;
                let mask_width: u8 = if *dimension == 4 {
                    0xf
                } else {
                    (1 << dimension) - 1
                };
                let extended = (header & 0x80) != 0;
                let shift = 7 - dimension;
                let changed_mask =
                    ((if extended { header } else { header | 0x80 }) >> shift) & mask_width;
                let nibble_mask: u8 = if *dimension == 4 { 0x7 } else { 0xf };
                let inv = 1.0 / precision;
                let mut out_v = vec![0.0f32; *dimension];
                let first_index = changed_mask.trailing_zeros() as usize;
                for i in 0..*dimension {
                    let qb = match base {
                        Value::QuantizedVec(b) => (inv * b[i]) as i32,
                        _ => 0,
                    };
                    let mut q = qb;
                    if changed_mask & (1 << i) != 0 {
                        let masked: u32 = if i == first_index {
                            if extended {
                                (header & nibble_mask) as u32 | (inp.read_varint()? << shift)
                            } else {
                                (header & nibble_mask) as u32
                            }
                        } else {
                            inp.read_varint()?
                        };
                        let delta = ((masked ^ SCHROEPPEL2) as i64 - SCHROEPPEL2 as i64) as i32;
                        q = qb + delta;
                    }
                    out_v[i] = q as f32 * precision;
                }
                Ok(Value::QuantizedVec(out_v))
            }
            Schema::Void => Ok(Value::Void),
        }
    }
}

/// Serialize f32 values into their little-endian byte representation,
/// truncated/padded to `byte_length`.
fn f32s_to_bytes(arr: &[f32], byte_length: usize) -> Vec<u8> {
    let mut out = Vec::with_capacity(byte_length);
    for x in arr {
        out.extend_from_slice(&x.to_le_bytes());
    }
    out.truncate(byte_length);
    while out.len() < byte_length {
        out.push(0);
    }
    out
}

/// Deserialize little-endian bytes into f32 values.
fn bytes_to_f32s(bytes: &[u8], dimension: usize) -> Vec<f32> {
    let mut out = Vec::with_capacity(dimension);
    for i in 0..dimension {
        let off = i * 4;
        let mut b = [0u8; 4];
        b.copy_from_slice(&bytes[off..off + 4]);
        out.push(f32::from_le_bytes(b));
    }
    out
}

fn fixed_diff(base: &Value, target: &Value, diff: impl FnOnce(&Value, &Value) -> bool) -> bool {
    diff(base, target)
}

/// JS `muPrimitiveSize` table — bytes a primitive occupies in struct diff.
fn primitive_size(s: &Schema) -> usize {
    match s {
        Schema::Boolean(_) => 0,
        Schema::Uint8(_) | Schema::Int8(_) => 1,
        Schema::Uint16(_) | Schema::Int16(_) => 2,
        Schema::Uint32(_) | Schema::Int32(_) | Schema::Float32(_) => 4,
        Schema::Float64(_) => 8,
        Schema::Varint(_) | Schema::RVarint(_) | Schema::QuantizedFloat { .. } => 5,
        _ => 0,
    }
}

/// Compare two values with JS defaultCompare semantics (a<b => -1, a>b => 1).
/// Only used for sorted-array ordering; falls back to a debug-string compare.
pub fn compare_values(a: &Value, b: &Value) -> i32 {
    if a == b {
        return 0;
    }
    // For scalar values use numeric/string ordering; for complex values use
    // a deterministic debug ordering (JS would compare objects by < which
    // coerces to NaN => 0, but sorted arrays here use scalar keys in practice).
    match (a, b) {
        (Value::Varint(x), Value::Varint(y)) => cmp_i32((*x as i64).cmp(&(*y as i64))),
        (Value::RVarint(x), Value::RVarint(y)) => cmp_i32((*x as i64).cmp(&(*y as i64))),
        (Value::U8(x), Value::U8(y)) => cmp_i32(x.cmp(y)),
        (Value::U16(x), Value::U16(y)) => cmp_i32(x.cmp(y)),
        (Value::U32(x), Value::U32(y)) => cmp_i32(x.cmp(y)),
        (Value::I8(x), Value::I8(y)) => cmp_i32(x.cmp(y)),
        (Value::I16(x), Value::I16(y)) => cmp_i32(x.cmp(y)),
        (Value::I32(x), Value::I32(y)) => cmp_i32(x.cmp(y)),
        (Value::F32(x), Value::F32(y)) => {
            cmp_i32(x.partial_cmp(y).unwrap_or(std::cmp::Ordering::Equal))
        }
        (Value::F64(x), Value::F64(y)) => {
            cmp_i32(x.partial_cmp(y).unwrap_or(std::cmp::Ordering::Equal))
        }
        (Value::ASCII(x), Value::ASCII(y)) => cmp_i32(x.cmp(y)),
        (Value::UTF8(x), Value::UTF8(y)) => cmp_i32(x.cmp(y)),
        _ => cmp_i32(format!("{a:?}").cmp(&format!("{b:?}"))),
    }
}

fn cmp_i32(o: std::cmp::Ordering) -> i32 {
    match o {
        std::cmp::Ordering::Less => -1,
        std::cmp::Ordering::Equal => 0,
        std::cmp::Ordering::Greater => 1,
    }
}
