//! CPU reconstruction of the recovered six-face avatar-part quad encoding.

use voxweb_protocol::{AvatarFace, AvatarPart};

use crate::avatar_idle_pose::recovered_idle_pose;
use crate::nea_mesh::{FLOATS_PER_VERTEX, MeshBuffers};

const UV_ROTATIONS: [[usize; 4]; 8] = [
    [0, 1, 2, 3],
    [1, 3, 0, 2],
    [3, 2, 1, 0],
    [2, 0, 3, 1],
    [0, 2, 1, 3],
    [2, 3, 0, 1],
    [3, 1, 2, 0],
    [1, 0, 3, 2],
];
const FACE_VERTEX_XOR: [usize; 6] = [1, 0, 0, 1, 1, 0];
const FACE_NORMALS: [[f32; 3]; 6] = [
    [-1.0, 0.0, 0.0],
    [1.0, 0.0, 0.0],
    [0.0, -1.0, 0.0],
    [0.0, 1.0, 0.0],
    [0.0, 0.0, -1.0],
    [0.0, 0.0, 1.0],
];

#[derive(Clone, Debug)]
pub struct AvatarPartMesh {
    pub buffers: MeshBuffers,
    pub quad_count: usize,
    pub bounds_min: [f32; 3],
    pub bounds_max: [f32; 3],
}

pub fn build_avatar_part_mesh(part: &AvatarPart) -> Result<AvatarPartMesh, String> {
    let mut buffers = MeshBuffers::default();
    let mut bounds_min = [f32::INFINITY; 3];
    let mut bounds_max = [f32::NEG_INFINITY; 3];
    let mut quad_count = 0usize;
    for (face_code, face) in part.faces.iter().enumerate() {
        if face_code >= FACE_NORMALS.len() {
            return Err(format!("avatar has unsupported face code {face_code}"));
        }
        validate_face(face, face_code)?;
        for quad_index in 0..face.vertices.len() / 3 {
            append_quad(
                &mut buffers,
                &mut bounds_min,
                &mut bounds_max,
                face,
                face_code,
                quad_index,
            );
            quad_count += 1;
        }
    }
    if quad_count == 0 {
        bounds_min = [0.0; 3];
        bounds_max = [0.0; 3];
    }
    Ok(AvatarPartMesh {
        buffers,
        quad_count,
        bounds_min,
        bounds_max,
    })
}

pub fn build_posed_avatar_part_mesh(
    part_name: &str,
    part: &AvatarPart,
) -> Result<AvatarPartMesh, String> {
    let mut mesh = build_avatar_part_mesh(part)?;
    let pose = recovered_idle_pose(part_name)
        .ok_or_else(|| format!("missing recovered idle pose for {part_name}"))?;
    let transform =
        glam::Mat4::from_cols_array(&pose) * glam::Mat4::from_cols_array(&part.bind_matrix);
    mesh.bounds_min = [f32::INFINITY; 3];
    mesh.bounds_max = [f32::NEG_INFINITY; 3];
    for vertex in mesh.buffers.vertices.chunks_exact_mut(FLOATS_PER_VERTEX) {
        let position = transform.transform_point3(glam::Vec3::new(vertex[0], vertex[1], vertex[2]));
        let normal = transform
            .transform_vector3(glam::Vec3::new(vertex[3], vertex[4], vertex[5]))
            .normalize_or_zero();
        vertex[0..3].copy_from_slice(&position.to_array());
        vertex[3..6].copy_from_slice(&normal.to_array());
        for axis in 0..3 {
            mesh.bounds_min[axis] = mesh.bounds_min[axis].min(position[axis]);
            mesh.bounds_max[axis] = mesh.bounds_max[axis].max(position[axis]);
        }
        if part.texture.width > 0 {
            let height = part.texture.data.len() as f32 / part.texture.width as f32;
            vertex[6] /= part.texture.width as f32;
            vertex[7] /= height;
        }
    }
    if mesh.quad_count == 0 {
        mesh.bounds_min = [0.0; 3];
        mesh.bounds_max = [0.0; 3];
    }
    Ok(mesh)
}

fn validate_face(face: &AvatarFace, face_code: usize) -> Result<(), String> {
    if face.vertices.len() % 3 != 0 {
        return Err(format!("avatar face {face_code} vertex data is truncated"));
    }
    let quads = face.vertices.len() / 3;
    if face.sizes.len() < quads * 2
        || face.uvs.len() < quads * 4
        || face.uv_flags.len() < quads.div_ceil(2)
    {
        return Err(format!("avatar face {face_code} attributes are truncated"));
    }
    Ok(())
}

fn append_quad(
    buffers: &mut MeshBuffers,
    bounds_min: &mut [f32; 3],
    bounds_max: &mut [f32; 3],
    face: &AvatarFace,
    face_code: usize,
    quad_index: usize,
) {
    let position_offset = quad_index * 3;
    let uv_offset = quad_index * 4;
    let position = [
        face.vertices[position_offset] as f32,
        face.vertices[position_offset + 1] as f32,
        face.vertices[position_offset + 2] as f32,
    ];
    let corners = face_corners(
        face_code,
        position,
        face.sizes[quad_index * 2] as f32,
        face.sizes[quad_index * 2 + 1] as f32,
    );
    let source_uvs = [
        [face.uvs[uv_offset] as f32, face.uvs[uv_offset + 1] as f32],
        [
            face.uvs[uv_offset + 2] as f32,
            face.uvs[uv_offset + 1] as f32,
        ],
        [face.uvs[uv_offset] as f32, face.uvs[uv_offset + 3] as f32],
        [
            face.uvs[uv_offset + 2] as f32,
            face.uvs[uv_offset + 3] as f32,
        ],
    ];
    let flag = face.uv_flags[quad_index / 2];
    let rotation = if quad_index & 1 == 1 {
        flag & 15
    } else {
        flag >> 4
    } as usize;
    let order = UV_ROTATIONS.get(rotation).unwrap_or(&UV_ROTATIONS[0]);
    let mut emitted_positions = [[0.0; 3]; 4];
    let mut emitted_uvs = [[0.0; 2]; 4];
    for emitted in 0..4 {
        let destination = emitted ^ FACE_VERTEX_XOR[face_code];
        emitted_positions[destination] = corners[emitted];
        emitted_uvs[destination] = source_uvs[order[emitted]];
    }
    let base = (buffers.vertices.len() / FLOATS_PER_VERTEX) as u32;
    for vertex in 0..4 {
        buffers
            .vertices
            .extend_from_slice(&emitted_positions[vertex]);
        buffers.vertices.extend_from_slice(&FACE_NORMALS[face_code]);
        buffers.vertices.extend_from_slice(&emitted_uvs[vertex]);
        // Avatar buffers share the NEA interleaved stride with terrain. The
        // avatar pipeline only consumes locations 0..2, but every vertex must
        // still occupy the complete 25-float record so subsequent positions
        // and index bases remain aligned.
        for _ in 0..4 {
            buffers.vertices.extend_from_slice(&[0.0, 0.0, 0.0, 1.0]);
        }
        buffers.vertices.push(0.0);
    }
    buffers
        .indices
        .extend_from_slice(&[base, base + 1, base + 2, base + 2, base + 1, base + 3]);
    for corner in corners {
        for axis in 0..3 {
            bounds_min[axis] = bounds_min[axis].min(corner[axis]);
            bounds_max[axis] = bounds_max[axis].max(corner[axis]);
        }
    }
}

fn face_corners(face_code: usize, position: [f32; 3], width: f32, height: f32) -> [[f32; 3]; 4] {
    let [x, y, z] = position;
    let high_x = x + if face_code >= 2 { width } else { 0.0 };
    let high_y = y + if face_code <= 1 {
        width
    } else if face_code >= 4 {
        height
    } else {
        0.0
    };
    let high_z = z + if face_code <= 3 { height } else { 0.0 };
    if face_code <= 1 {
        [
            [x, y, z],
            [x, high_y, z],
            [x, y, high_z],
            [x, high_y, high_z],
        ]
    } else if face_code <= 3 {
        [
            [x, y, z],
            [high_x, y, z],
            [x, y, high_z],
            [high_x, y, high_z],
        ]
    } else {
        [
            [x, y, z],
            [high_x, y, z],
            [x, high_y, z],
            [high_x, high_y, z],
        ]
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use voxweb_protocol::{AvatarPart, AvatarTexture};

    #[test]
    fn recovered_negative_x_quad_has_expected_winding_and_normal() {
        let part = AvatarPart {
            part_id: 0,
            bind_matrix: [0.0; 16],
            faces: vec![AvatarFace {
                vertices: vec![1, 0, 0],
                sizes: vec![1, 1],
                uvs: vec![0, 0, 1, 1],
                uv_flags: vec![0],
            }],
            texture: AvatarTexture {
                width: 1,
                data: vec![0],
                palette: vec![u32::MAX],
            },
        };

        let mesh = build_avatar_part_mesh(&part).expect("build avatar mesh");
        assert_eq!(mesh.quad_count, 1);
        assert_eq!(mesh.buffers.vertices.len(), 4 * FLOATS_PER_VERTEX);
        assert_eq!(mesh.buffers.indices, vec![0, 1, 2, 2, 1, 3]);
        assert_eq!(&mesh.buffers.vertices[3..6], &[-1.0, 0.0, 0.0]);
        assert_eq!(
            &mesh.buffers.vertices[FLOATS_PER_VERTEX..FLOATS_PER_VERTEX + 3],
            &[1.0, 0.0, 0.0]
        );
        assert_eq!(mesh.bounds_min, [1.0, 0.0, 0.0]);
        assert_eq!(mesh.bounds_max, [1.0, 1.0, 1.0]);
    }
}
