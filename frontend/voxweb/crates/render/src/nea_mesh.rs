//! NEA terrain mesh buffers — CPU packing of box geometry into the wgpu
//! vertex layout (VW-003 Step 3, CPU side).
//!
//! Layout: interleaved [px,py,pz, nx,ny,nz, u,v] as f32 (8 floats/vertex),
//! matching the recovered voxel shader's vertex inputs. Pure CPU packing —
//! the GPU upload is a single create_buffer_init once this is tested.

use voxweb_protocol::geometry::BoxMesh;

/// Floats per vertex in the interleaved layout.
pub const FLOATS_PER_VERTEX: usize = 25;

/// Packed interleaved vertex data + u32 indices, ready for
/// create_buffer_init.
#[derive(Clone, Debug, Default)]
pub struct MeshBuffers {
    pub vertices: Vec<f32>,
    pub indices: Vec<u32>,
}

impl MeshBuffers {
    /// Pack a BoxMesh into the interleaved layout.
    pub fn from_box_mesh(m: &BoxMesh) -> Self {
        let mut vertices = Vec::with_capacity(m.positions.len() / 3 * FLOATS_PER_VERTEX);
        let n = m.positions.len() / 3;
        for i in 0..n {
            vertices.push(m.positions[i * 3]);
            vertices.push(m.positions[i * 3 + 1]);
            vertices.push(m.positions[i * 3 + 2]);
            vertices.push(m.normals[i * 3]);
            vertices.push(m.normals[i * 3 + 1]);
            vertices.push(m.normals[i * 3 + 2]);
            vertices.push(m.uvs[i * 2]);
            vertices.push(m.uvs[i * 2 + 1]);
            for _ in 0..4 {
                vertices.extend_from_slice(&[0.0, 0.0, 0.0, 1.0]);
            }
            vertices.push(0.0);
        }
        Self {
            vertices,
            indices: m.indices.clone(),
        }
    }

    /// Byte size of the vertex buffer (f32 × count).
    pub fn vertex_bytes(&self) -> usize {
        self.vertices.len() * 4
    }

    /// Byte size of the index buffer.
    pub fn index_bytes(&self) -> usize {
        self.indices.len() * 4
    }

    /// The wgpu vertex buffer layout descriptor for this format.
    pub fn vertex_layout() -> wgpu::VertexBufferLayout<'static> {
        const ATTRS: [wgpu::VertexAttribute; 8] = wgpu::vertex_attr_array![
            0 => Float32x3, // position
            1 => Float32x3, // normal
            2 => Float32x2, // uv
            3 => Float32x4, // light00
            4 => Float32x4, // light01
            5 => Float32x4, // light10
            6 => Float32x4, // light11
            7 => Float32,   // recovered top/bottom texture rotation
        ];
        wgpu::VertexBufferLayout {
            array_stride: (FLOATS_PER_VERTEX * 4) as wgpu::BufferAddress,
            step_mode: wgpu::VertexStepMode::Vertex,
            attributes: &ATTRS,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use voxweb_protocol::geometry::{build_box_geometry, face_uv_rect};

    fn unit_box() -> BoxMesh {
        let rects = [face_uv_rect(524, 512.0); 6];
        build_box_geometry(0.0, 0.0, 0.0, 1.0, 1.0, 1.0, &rects)
    }

    #[test]
    fn packing_preserves_vertex_count() {
        let m = unit_box();
        let b = MeshBuffers::from_box_mesh(&m);
        assert_eq!(
            b.vertices.len(),
            24 * FLOATS_PER_VERTEX,
            "24 verts × 8 floats"
        );
        assert_eq!(b.indices.len(), 36);
        assert_eq!(b.vertex_bytes(), 24 * FLOATS_PER_VERTEX * 4);
        assert_eq!(b.index_bytes(), 36 * 4);
    }

    #[test]
    fn interleaved_layout_has_correct_order() {
        let m = unit_box();
        let b = MeshBuffers::from_box_mesh(&m);
        // vertex 0 = +X face (1,0,0) corner: pos (1,0,0), normal (1,0,0),
        // uv within the 524 tile rect
        let base = 0 * FLOATS_PER_VERTEX;
        assert!((b.vertices[base] - 1.0).abs() < 1e-6, "px");
        assert!(b.vertices[base + 1].abs() < 1e-6, "py");
        assert!(b.vertices[base + 2].abs() < 1e-6, "pz");
        assert!((b.vertices[base + 3] - 1.0).abs() < 1e-6, "nx normal");
        assert!(b.vertices[base + 4].abs() < 1e-6);
        assert!(b.vertices[base + 5].abs() < 1e-6);
        // uv u0 within [0,1]
        let u = b.vertices[base + 6];
        let v = b.vertices[base + 7];
        assert!((0.0..=1.0).contains(&u), "u in range: {u}");
        assert!((0.0..=1.0).contains(&v), "v in range: {v}");
    }

    #[test]
    fn layout_stride_matches_25_floats() {
        let layout = MeshBuffers::vertex_layout();
        assert_eq!(layout.array_stride, 100, "25 f32 = 100 bytes");
        assert_eq!(layout.attributes.len(), 8);
        // offsets: pos@0, normal@12, uv@24
        assert_eq!(layout.attributes[0].offset, 0);
        assert_eq!(layout.attributes[1].offset, 12);
        assert_eq!(layout.attributes[2].offset, 24);
        assert_eq!(layout.attributes[3].offset, 32);
        assert_eq!(layout.attributes[4].offset, 48);
        assert_eq!(layout.attributes[5].offset, 64);
        assert_eq!(layout.attributes[6].offset, 80);
        assert_eq!(layout.attributes[7].offset, 96);
    }
}
