//! Build Schema/Value trees from the Shared/mudb JSON representation
//! (`schema.json` shapes), so protocol schemas can be loaded from the same
//! evidence the JS side uses, and the parity test can replay fixtures.

use crate::schema::{Schema, Value};
use serde_json::Value as Json;

/// Wire-order for struct fields: JS sorts by `muPrimitiveTypes.indexOf(muType)`
/// DESCENDING (larger index first), ties by name ascending. Non-primitives
/// (indexOf = -1) sort last, by name.
fn mu_type_index(mu_type: &str) -> i32 {
    match mu_type {
        "boolean" => 0,
        "uint8" => 1,
        "uint16" => 2,
        "uint32" => 3,
        "int8" => 4,
        "int16" => 5,
        "int32" => 6,
        "float32" => 7,
        "float64" => 8,
        "varint" => 9,
        "rvarint" => 10,
        "quantized-float" => 11,
        _ => -1,
    }
}

/// Sort struct field names by wire order using their schema's muType.
pub fn sort_fields_with_types(names: &mut Vec<(String, String)>) {
    // names: (field_name, mu_type) pairs
    names.sort_by(|(an, at), (bn, bt)| {
        let ai = mu_type_index(at);
        let bi = mu_type_index(bt);
        (bi - ai).cmp(&0).then_with(|| an.cmp(bn))
    });
}

/// Build a Schema from its `schema.json` representation.
pub fn schema_from_json(j: &Json) -> Result<Schema, String> {
    let ty = j
        .get("type")
        .and_then(|t| t.as_str())
        .ok_or("schema json missing type")?;
    match ty {
        "boolean" => Ok(Schema::Boolean(
            j.get("identity").and_then(|v| v.as_bool()).unwrap_or(false),
        )),
        "uint8" => Ok(Schema::Uint8(
            j.get("identity").and_then(|v| v.as_u64()).unwrap_or(0) as u8,
        )),
        "uint16" => Ok(Schema::Uint16(
            j.get("identity").and_then(|v| v.as_u64()).unwrap_or(0) as u16,
        )),
        "uint32" => Ok(Schema::Uint32(
            j.get("identity").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
        )),
        "int8" => Ok(Schema::Int8(
            j.get("identity").and_then(|v| v.as_i64()).unwrap_or(0) as i8,
        )),
        "int16" => Ok(Schema::Int16(
            j.get("identity").and_then(|v| v.as_i64()).unwrap_or(0) as i16,
        )),
        "int32" => Ok(Schema::Int32(
            j.get("identity").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
        )),
        "float32" => Ok(Schema::Float32(
            j.get("identity").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32,
        )),
        "float64" => Ok(Schema::Float64(
            j.get("identity").and_then(|v| v.as_f64()).unwrap_or(0.0),
        )),
        "varint" => Ok(Schema::Varint(
            j.get("identity").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
        )),
        "rvarint" => Ok(Schema::RVarint(
            j.get("identity").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
        )),
        "quantized-float" => Ok(Schema::QuantizedFloat {
            precision: j.get("precision").and_then(|v| v.as_f64()).unwrap_or(1.0) as f32,
            identity: j.get("identity").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32,
        }),
        "ascii" => Ok(Schema::ASCII(
            j.get("identity")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string(),
        )),
        "fixed-ascii" => {
            let ident = j.get("identity").and_then(|v| v.as_str()).unwrap_or("");
            Ok(Schema::FixedASCII(ident.to_string()))
        }
        "utf8" => Ok(Schema::UTF8(
            j.get("identity")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string(),
        )),
        "bytes" => {
            // identity is a string like "[0]" (JS Array.toString of the bytes)
            let ident_str = j.get("identity").and_then(|v| v.as_str()).unwrap_or("[]");
            let mut bytes = Vec::new();
            if let Some(inner) = ident_str
                .strip_prefix('[')
                .and_then(|s| s.strip_suffix(']'))
            {
                for part in inner.split(',') {
                    if let Ok(n) = part.trim().parse::<u8>() {
                        bytes.push(n);
                    }
                }
            }
            Ok(Schema::Bytes(bytes))
        }
        "array" => {
            let elem = schema_from_json(j.get("valueType").ok_or("array missing valueType")?)?;
            let capacity = 1024; // JS default when unspecified; fixtures use explicit
            let identity = match j.get("identity").and_then(|v| v.as_str()) {
                Some(s) => parse_array_identity(&elem, s),
                None => Vec::new(),
            };
            Ok(Schema::Array {
                elem: Box::new(elem),
                capacity,
                identity,
            })
        }
        "option" => {
            let elem = schema_from_json(j.get("valueType").ok_or("option missing valueType")?)?;
            let identity_is_undefined = !j.get("identity").is_some();
            let identity = if identity_is_undefined {
                None
            } else {
                let ident = j.get("identity").and_then(|v| v.as_str()).unwrap_or("null");
                let v = value_from_json_string(&elem, ident);
                Some(Box::new(v))
            };
            Ok(Schema::Option {
                elem: Box::new(elem),
                identity,
                identity_is_undefined,
            })
        }
        "union" => {
            let data = j.get("data").ok_or("union missing data")?;
            let mut names: Vec<String> = data
                .as_object()
                .map(|o| o.keys().cloned().collect())
                .unwrap_or_default();
            names.sort();
            let mut schemas = Vec::with_capacity(names.len());
            for n in &names {
                schemas.push(schema_from_json(&data.get(n).unwrap())?);
            }
            let identity_type = j
                .get("identity")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            Ok(Schema::Union {
                types: names,
                schemas,
                identity_type,
            })
        }
        "dictionary" => {
            let elem = schema_from_json(j.get("valueType").ok_or("dictionary missing valueType")?)?;
            let capacity = 1024;
            let identity = Vec::new();
            Ok(Schema::Dictionary {
                elem: Box::new(elem),
                capacity,
                identity,
            })
        }
        "sorted-array" => {
            let elem =
                schema_from_json(j.get("valueType").ok_or("sorted-array missing valueType")?)?;
            let capacity = 4096;
            let identity = match j.get("identity").and_then(|v| v.as_str()) {
                Some(s) => parse_array_identity(&elem, s),
                None => Vec::new(),
            };
            Ok(Schema::SortedArray {
                elem: Box::new(elem),
                capacity,
                identity,
            })
        }
        "struct" => {
            let sub_types = j.get("subTypes").ok_or("struct missing subTypes")?;
            let obj = sub_types
                .as_object()
                .ok_or("struct subTypes not an object")?;
            let mut fields: Vec<(String, String)> = obj
                .iter()
                .map(|(k, v)| {
                    let mt = v
                        .get("type")
                        .and_then(|t| t.as_str())
                        .unwrap_or("")
                        .to_string();
                    (k.clone(), mt)
                })
                .collect();
            sort_fields_with_types(&mut fields);
            let mut names = Vec::with_capacity(fields.len());
            let mut schemas = Vec::with_capacity(fields.len());
            for (n, _) in &fields {
                names.push(n.clone());
                schemas.push(schema_from_json(&obj.get(n).unwrap())?);
            }
            Ok(Schema::Struct { names, schemas })
        }
        "date" => Ok(Schema::Date),
        "json" => Ok(Schema::Json),
        "vector" => {
            // JSON shape: { type: 'vector', data: [...] } (NEA) or
            // { type: 'vector', valueType, dimension } (stock mudb)
            let dimension = if let Some(data) = j.get("data").and_then(|d| d.as_array()) {
                data.len()
            } else {
                j.get("dimension").and_then(|d| d.as_u64()).unwrap_or(3) as usize
            };
            Ok(Schema::Vector { dimension })
        }
        "cube-axis" => Ok(Schema::CubeAxis),
        "quantized-vec2" | "quantized-vec3" | "quantized-vec4" => {
            let dimension = match ty {
                "quantized-vec2" => 2,
                "quantized-vec3" => 3,
                _ => 4,
            };
            let precision = j.get("precision").and_then(|v| v.as_f64()).unwrap_or(1.0) as f32;
            let identity = j
                .get("identity")
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter()
                        .map(|x| x.as_f64().unwrap_or(0.0) as f32)
                        .collect()
                })
                .unwrap_or_else(|| vec![0.0; dimension]);
            Ok(Schema::QuantizedVec {
                precision,
                dimension,
                identity,
            })
        }
        "void" => Ok(Schema::Void),
        other => Err(format!("unknown muType {other}")),
    }
}

fn parse_array_identity(elem: &Schema, s: &str) -> Vec<Value> {
    if s.is_empty() || s == "[]" {
        return Vec::new();
    }
    // identity strings are JSON arrays of element JSON — parse then convert
    match serde_json::from_str::<Json>(s) {
        Ok(Json::Array(items)) => items
            .iter()
            .map(|v| value_from_json(elem, v).unwrap_or_else(|_| elem.identity()))
            .collect(),
        _ => Vec::new(),
    }
}

fn value_from_json_string(elem: &Schema, s: &str) -> Value {
    match serde_json::from_str::<Json>(s) {
        Ok(v) => value_from_json(elem, &v).unwrap_or_else(|_| elem.identity()),
        Err(_) => elem.identity(),
    }
}

/// Convert a JSON value to a Value using the schema's type.
pub fn value_from_json(s: &Schema, j: &Json) -> Result<Value, String> {
    match s {
        Schema::Boolean(_) => match j {
            Json::Bool(b) => Ok(Value::Bool(*b)),
            _ => Err("boolean value expected".into()),
        },
        Schema::Uint8(_) => Ok(Value::U8(j.as_u64().unwrap_or(0) as u8)),
        Schema::Uint16(_) => Ok(Value::U16(j.as_u64().unwrap_or(0) as u16)),
        Schema::Uint32(_) => Ok(Value::U32(j.as_u64().unwrap_or(0) as u32)),
        Schema::Int8(_) => Ok(Value::I8(j.as_i64().unwrap_or(0) as i8)),
        Schema::Int16(_) => Ok(Value::I16(j.as_i64().unwrap_or(0) as i16)),
        Schema::Int32(_) => Ok(Value::I32(j.as_i64().unwrap_or(0) as i32)),
        Schema::Float32(_) => Ok(Value::F32(j.as_f64().unwrap_or(0.0) as f32)),
        Schema::Float64(_) => Ok(Value::F64(j.as_f64().unwrap_or(0.0))),
        Schema::Varint(_) => Ok(Value::Varint(j.as_u64().unwrap_or(0) as u32)),
        Schema::RVarint(_) => Ok(Value::RVarint(j.as_u64().unwrap_or(0) as u32)),
        Schema::QuantizedFloat { precision, .. } => {
            let x = j.as_f64().unwrap_or(0.0) as f32;
            let inv = 1.0 / precision;
            Ok(Value::Quantized(((inv * x) as i32) as f32 * precision))
        }
        Schema::ASCII(_) => Ok(Value::ASCII(j.as_str().unwrap_or("").to_string())),
        Schema::FixedASCII(_) => Ok(Value::FixedASCII(j.as_str().unwrap_or("").to_string())),
        Schema::UTF8(_) => Ok(Value::UTF8(j.as_str().unwrap_or("").to_string())),
        Schema::Bytes(_) => {
            let arr = j.as_array().ok_or("bytes value expected")?;
            let mut b = Vec::with_capacity(arr.len());
            for v in arr {
                b.push(v.as_u64().unwrap_or(0) as u8);
            }
            Ok(Value::Bytes(b))
        }
        Schema::Array { elem, .. } => {
            let arr = j.as_array().ok_or("array value expected")?;
            let mut items = Vec::with_capacity(arr.len());
            for v in arr {
                items.push(value_from_json(elem, v)?);
            }
            Ok(Value::Array(items))
        }
        Schema::SortedArray { elem, .. } => {
            let arr = j.as_array().ok_or("sorted-array value expected")?;
            let mut items = Vec::with_capacity(arr.len());
            for v in arr {
                items.push(value_from_json(elem, v)?);
            }
            Ok(Value::SortedArray(items))
        }
        Schema::Option { elem, .. } => {
            if j.is_null() {
                Ok(Value::Option(None))
            } else {
                Ok(Value::Option(Some(Box::new(value_from_json(elem, j)?))))
            }
        }
        Schema::Union { types, schemas, .. } => {
            let obj = j.as_object().ok_or("union value expected")?;
            let ty = obj.get("type").and_then(|t| t.as_str()).unwrap_or("");
            let idx = types.iter().position(|t| t == ty);
            match idx {
                Some(i) => {
                    let data = obj.get("data").unwrap_or(&Json::Null);
                    let v = if data.is_null() && schemas[i].is_void_like() {
                        Value::Void
                    } else {
                        value_from_json(&schemas[i], data)?
                    };
                    Ok(Value::Union {
                        type_index: i,
                        data: Box::new(v),
                    })
                }
                None => {
                    // empty identity type
                    Ok(Value::Union {
                        type_index: 0,
                        data: Box::new(Value::Void),
                    })
                }
            }
        }
        Schema::Dictionary { elem, .. } => {
            let obj = j.as_object().ok_or("dictionary value expected")?;
            let mut entries = Vec::with_capacity(obj.len());
            for (k, v) in obj {
                entries.push((k.clone(), value_from_json(elem, v)?));
            }
            Ok(Value::Dictionary(entries))
        }
        Schema::Struct { names, schemas, .. } => {
            let obj = j.as_object().ok_or("struct value expected")?;
            let mut fields = Vec::with_capacity(schemas.len());
            for (i, n) in names.iter().enumerate() {
                let v = obj.get(n).unwrap_or(&Json::Null);
                fields.push(value_from_json(&schemas[i], v)?);
            }
            Ok(Value::Struct(fields))
        }
        Schema::Date => Ok(Value::Date(j.as_i64().unwrap_or(0))),
        Schema::Json => Ok(Value::Json(j.clone())),
        Schema::Vector { dimension } => {
            let arr = j
                .as_array()
                .ok_or("vector value expected")?
                .iter()
                .map(|x| x.as_f64().unwrap_or(0.0) as f32)
                .collect::<Vec<f32>>();
            let mut v = vec![0.0f32; *dimension];
            for (i, x) in arr.iter().enumerate().take(*dimension) {
                v[i] = *x;
            }
            Ok(Value::Vector(v))
        }
        Schema::CubeAxis => Ok(Value::CubeAxis(j.as_u64().unwrap_or(0) as u8)),
        Schema::QuantizedVec {
            precision,
            dimension,
            ..
        } => {
            let arr = j
                .as_array()
                .ok_or("quantized-vec value expected")?
                .iter()
                .map(|x| x.as_f64().unwrap_or(0.0) as f32)
                .collect::<Vec<f32>>();
            let mut v = vec![0.0f32; *dimension];
            let inv = 1.0 / precision;
            for (i, x) in arr.iter().enumerate().take(*dimension) {
                v[i] = ((inv * x) as i32) as f32 * precision;
            }
            Ok(Value::QuantizedVec(v))
        }
        Schema::Void => Ok(Value::Void),
    }
}

impl Schema {
    pub fn is_void_like(&self) -> bool {
        matches!(self, Schema::Void)
    }
}
