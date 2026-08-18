//! Recovered content-addressed avatar-part binary format.

use crate::{ReadStream, Schema, Value};

const MAX_AVATAR_PART_BYTES: usize = 16 * 1024 * 1024;
const MAX_FACE_VALUES: u32 = 1_000_000;
const MAX_TEXTURE_VALUES: u32 = 4_000_000;

#[derive(Clone, Debug, PartialEq)]
pub struct AvatarFace {
    pub sizes: Vec<u32>,
    pub uv_flags: Vec<u8>,
    pub uvs: Vec<u32>,
    pub vertices: Vec<u32>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct AvatarTexture {
    pub width: u32,
    pub data: Vec<u32>,
    pub palette: Vec<u32>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct AvatarPart {
    pub part_id: u8,
    pub bind_matrix: [f32; 16],
    pub faces: Vec<AvatarFace>,
    pub texture: AvatarTexture,
}

pub fn decode_avatar_part(bytes: &[u8]) -> Result<AvatarPart, String> {
    if bytes.is_empty() || bytes.len() > MAX_AVATAR_PART_BYTES {
        return Err(format!(
            "avatar part size {} is outside limits",
            bytes.len()
        ));
    }
    let schema = avatar_part_schema();
    let mut input = ReadStream::new(bytes);
    let value = schema.patch(&schema.identity(), &mut input)?;
    avatar_part_from_value(&value)
}

fn avatar_part_schema() -> Schema {
    let varint_array = || Schema::Array {
        elem: Box::new(Schema::Varint(0)),
        capacity: MAX_FACE_VALUES,
        identity: Vec::new(),
    };
    let face = Schema::Struct {
        names: vec!["sizes", "uvFlags", "uvs", "vertices"]
            .into_iter()
            .map(str::to_string)
            .collect(),
        schemas: vec![
            varint_array(),
            Schema::Array {
                elem: Box::new(Schema::Uint8(0)),
                capacity: MAX_FACE_VALUES,
                identity: Vec::new(),
            },
            varint_array(),
            varint_array(),
        ],
    };
    let texture = Schema::Struct {
        names: vec!["width", "data", "palette"]
            .into_iter()
            .map(str::to_string)
            .collect(),
        schemas: vec![
            Schema::Varint(0),
            Schema::Array {
                elem: Box::new(Schema::Varint(0)),
                capacity: MAX_TEXTURE_VALUES,
                identity: Vec::new(),
            },
            Schema::Array {
                elem: Box::new(Schema::Uint32(0)),
                capacity: MAX_TEXTURE_VALUES,
                identity: Vec::new(),
            },
        ],
    };
    Schema::Struct {
        names: vec!["partId", "bindMat", "mesh", "texture"]
            .into_iter()
            .map(str::to_string)
            .collect(),
        schemas: vec![
            Schema::Uint8(0),
            Schema::Vector { dimension: 16 },
            Schema::Array {
                elem: Box::new(face),
                capacity: 6,
                identity: Vec::new(),
            },
            texture,
        ],
    }
}

fn avatar_part_from_value(value: &Value) -> Result<AvatarPart, String> {
    let Value::Struct(fields) = value else {
        return Err("avatar part is not a struct".into());
    };
    let part_id = value_u8(fields.first(), "partId")?;
    if part_id >= 18 {
        return Err(format!("avatar part id {part_id} is out of range"));
    }
    let bind_matrix = value_matrix(fields.get(1))?;
    let faces = value_faces(fields.get(2))?;
    let texture = value_texture(fields.get(3))?;
    Ok(AvatarPart {
        part_id,
        bind_matrix,
        faces,
        texture,
    })
}

fn value_faces(value: Option<&Value>) -> Result<Vec<AvatarFace>, String> {
    let Some(Value::Array(items)) = value else {
        return Err("avatar mesh is not an array".into());
    };
    items
        .iter()
        .map(|item| {
            let Value::Struct(fields) = item else {
                return Err("avatar face is not a struct".into());
            };
            Ok(AvatarFace {
                sizes: value_u32_array(fields.first(), "sizes")?,
                uv_flags: value_u8_array(fields.get(1), "uvFlags")?,
                uvs: value_u32_array(fields.get(2), "uvs")?,
                vertices: value_u32_array(fields.get(3), "vertices")?,
            })
        })
        .collect()
}

fn value_texture(value: Option<&Value>) -> Result<AvatarTexture, String> {
    let Some(Value::Struct(fields)) = value else {
        return Err("avatar texture is not a struct".into());
    };
    let texture = AvatarTexture {
        width: value_varint(fields.first(), "texture.width")?,
        data: value_u32_array(fields.get(1), "texture.data")?,
        palette: value_u32_array(fields.get(2), "texture.palette")?,
    };
    let invalid_empty_texture = texture.width == 0 && !texture.data.is_empty();
    let invalid_sized_texture =
        texture.width > 0 && texture.data.len() % texture.width as usize != 0;
    if invalid_empty_texture || invalid_sized_texture {
        return Err("avatar texture dimensions are invalid".into());
    }
    Ok(texture)
}

fn value_matrix(value: Option<&Value>) -> Result<[f32; 16], String> {
    let Some(Value::Vector(values)) = value else {
        return Err("avatar bind matrix is not a vector".into());
    };
    values
        .as_slice()
        .try_into()
        .map_err(|_| format!("avatar bind matrix has {} values", values.len()))
}

fn value_u8(value: Option<&Value>, field: &str) -> Result<u8, String> {
    match value {
        Some(Value::U8(value)) => Ok(*value),
        _ => Err(format!("avatar {field} is not uint8")),
    }
}

fn value_varint(value: Option<&Value>, field: &str) -> Result<u32, String> {
    match value {
        Some(Value::Varint(value)) => Ok(*value),
        _ => Err(format!("avatar {field} is not varint")),
    }
}

fn value_u32_array(value: Option<&Value>, field: &str) -> Result<Vec<u32>, String> {
    let Some(Value::Array(values)) = value else {
        return Err(format!("avatar {field} is not an array"));
    };
    values
        .iter()
        .map(|value| match value {
            Value::Varint(value) | Value::U32(value) => Ok(*value),
            _ => Err(format!("avatar {field} contains a non-integer")),
        })
        .collect()
}

fn value_u8_array(value: Option<&Value>, field: &str) -> Result<Vec<u8>, String> {
    let Some(Value::Array(values)) = value else {
        return Err(format!("avatar {field} is not an array"));
    };
    values
        .iter()
        .map(|value| match value {
            Value::U8(value) => Ok(*value),
            _ => Err(format!("avatar {field} contains a non-uint8")),
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::WriteStream;

    #[test]
    fn avatar_part_schema_roundtrips_recovered_wire_order() {
        let schema = avatar_part_schema();
        let face = Value::Struct(vec![
            Value::Array(vec![Value::Varint(2), Value::Varint(3)]),
            Value::Array(vec![Value::U8(0)]),
            Value::Array(vec![Value::Varint(0), Value::Varint(4)]),
            Value::Array(vec![Value::Varint(1), Value::Varint(2), Value::Varint(3)]),
        ]);
        let target = Value::Struct(vec![
            Value::U8(4),
            Value::Vector((0..16).map(|value| value as f32).collect()),
            Value::Array(vec![face]),
            Value::Struct(vec![
                Value::Varint(1),
                Value::Array(vec![Value::Varint(0)]),
                Value::Array(vec![Value::U32(0xff00ffff)]),
            ]),
        ]);
        let mut output = WriteStream::new(256);
        assert!(schema.diff(&schema.identity(), &target, &mut output));

        let decoded = decode_avatar_part(&output.into_bytes()).expect("decode avatar part");
        assert_eq!(decoded.part_id, 4);
        assert_eq!(decoded.bind_matrix[15], 15.0);
        assert_eq!(decoded.faces[0].vertices, vec![1, 2, 3]);
        assert_eq!(decoded.texture.palette, vec![0xff00ffff]);
    }

    /// 自写后端（box-go empty-avatar.ts）生成的空部件占位字节应可解析，
    /// 用于替换 archive 中损坏的 2 字节文件（neck/leftShoulder/rightShoulder）。
    #[test]
    fn decodes_self_written_empty_parts() {
        // leftShoulder id=6 / neck id=9 / rightShoulder id=14
        for (hex, expected_id) in [
            ("03060c00c000000c00c0803f803f803f803f", 6u8),
            ("03090c00c000000c00c0803f803f803f803f", 9u8),
            ("030e0c00c000000c00c0803f803f803f803f", 14u8),
        ] {
            let bytes: Vec<u8> = (0..hex.len())
                .step_by(2)
                .map(|i| u8::from_str_radix(&hex[i..i + 2], 16).unwrap())
                .collect();
            let part = decode_avatar_part(&bytes).expect("empty part decodes");
            assert_eq!(part.part_id, expected_id, "part id");
            assert!(part.faces.is_empty(), "empty mesh");
            assert_eq!(part.texture.width, 0, "empty texture");
            // bindMat 是单位矩阵（对角线 1）
            assert_eq!(part.bind_matrix[0], 1.0);
            assert_eq!(part.bind_matrix[5], 1.0);
            assert_eq!(part.bind_matrix[10], 1.0);
        }
    }
}
