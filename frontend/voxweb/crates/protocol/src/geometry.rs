//! NEA voxel box geometry — pure CPU mesh generation (1:1 port of
//! player-babylon voxel-geometry.mjs + block-atlas.mjs faceUvRect).
//!
//! Produces per-face positions/normals/uvs/indices for axis-aligned boxes
//! with the recovered atlas UV semantics (tile repeats one tile per voxel
//! unit via fract()). No rendering dependency — native-testable.

use crate::blockinfo::BLOCK_COLOR_SIZE;

pub const CHUNK_SIZE: u32 = 32;
pub const BLOCK_ID_MASK: u16 = 0x3fff;
pub const FACE_ORDER: [&str; 6] = ["px", "nx", "py", "ny", "pz", "nz"];

/// Per-face axis mapping: which local axis is atlas-U and which is atlas-V.
/// { px: {u:2, v:1}, nx: {u:2, v:1}, py: {u:0, v:2}, ny: {u:0, v:2},
///   pz: {u:0, v:1}, nz: {u:0, v:1} }
pub const FACE_AXES: [(usize, usize); 6] = [
    (2, 1), // px: U along Z, V along Y
    (2, 1), // nx
    (0, 2), // py: U along X, V along Z
    (0, 2), // ny
    (0, 1), // pz: U along X, V along Y
    (0, 1), // nz
];

/// Face vertex corners (LL, LR, UR, UL) + normals, order +X,-X,+Y,-Y,+Z,-Z.
pub const FACE_VERTS: [[[f32; 3]; 4]; 6] = [
    // px
    [
        [1.0, 0.0, 0.0],
        [1.0, 1.0, 0.0],
        [1.0, 1.0, 1.0],
        [1.0, 0.0, 1.0],
    ],
    // nx
    [
        [0.0, 0.0, 1.0],
        [0.0, 1.0, 1.0],
        [0.0, 1.0, 0.0],
        [0.0, 0.0, 0.0],
    ],
    // py
    [
        [0.0, 1.0, 0.0],
        [0.0, 1.0, 1.0],
        [1.0, 1.0, 1.0],
        [1.0, 1.0, 0.0],
    ],
    // ny
    [
        [0.0, 0.0, 1.0],
        [0.0, 0.0, 0.0],
        [1.0, 0.0, 0.0],
        [1.0, 0.0, 1.0],
    ],
    // pz
    [
        [1.0, 0.0, 1.0],
        [1.0, 1.0, 1.0],
        [0.0, 1.0, 1.0],
        [0.0, 0.0, 1.0],
    ],
    // nz
    [
        [0.0, 0.0, 0.0],
        [0.0, 1.0, 0.0],
        [1.0, 1.0, 0.0],
        [1.0, 0.0, 0.0],
    ],
];

pub const FACE_NORMALS: [[f32; 3]; 6] = [
    [1.0, 0.0, 0.0],
    [-1.0, 0.0, 0.0],
    [0.0, 1.0, 0.0],
    [0.0, -1.0, 0.0],
    [0.0, 0.0, 1.0],
    [0.0, 0.0, -1.0],
];

/// UV rect within the atlas for a texture value.
///
/// The preserved engine's vertex attribute carries the TILE ORIGIN
/// (faceUvBase = tile * (BLOCK_COLOR_SIZE/atlasRadius)); the fragment
/// shader then adds half-texel + span*fract for in-tile sampling. Since the
/// Rust geometry bakes the per-vertex UV directly, the rect here spans one
/// full tile from its origin — sampling the atlas with it yields the exact
/// tile the face value points at.
/// atlas_radius here is the PIXEL radius (512).
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct UvRect {
    pub u0: f32,
    pub v0: f32,
    pub u1: f32,
    pub v1: f32,
}

pub fn face_uv_rect(texture_value: u16, atlas_radius: f32) -> UvRect {
    let tile = crate::blockinfo::texture_tile(texture_value);
    // tile origin (faceUvBase) + the (size-1)/r span: the fragment shader
    // adds the half-texel offset, so the sampled range stays INSIDE the
    // tile — [origin+half, origin+15/16 tile+half] never crosses the border.
    let tile_w = BLOCK_COLOR_SIZE as f32 / atlas_radius;
    let span = (BLOCK_COLOR_SIZE as f32 - 1.0) / atlas_radius;
    let u0 = tile_w * tile.0 as f32;
    let v0 = tile_w * tile.1 as f32;
    UvRect {
        u0,
        v0,
        u1: u0 + span,
        v1: v0 + span,
    }
}

/// Generated mesh for one box.
#[derive(Clone, Debug, Default)]
pub struct BoxMesh {
    /// interleaved [px,py,pz] * verts
    pub positions: Vec<f32>,
    /// [nx,ny,nz] * verts
    pub normals: Vec<f32>,
    /// [u,v] * verts
    pub uvs: Vec<f32>,
    pub indices: Vec<u32>,
}

/// Build box geometry (1:1 buildBoxGeometry). `face_uvs` order +X..-Z.
/// `face_mask` bit f (0..6) selects which faces to emit — clear a bit to
/// cull faces hidden by a solid neighbour (drastically fewer vertices).
pub fn build_box_geometry_masked(
    cx: f32,
    cy: f32,
    cz: f32,
    w: f32,
    h: f32,
    d: f32,
    face_uvs: &[UvRect; 6],
    face_mask: u8,
) -> BoxMesh {
    let mut m = BoxMesh::default();
    for f in 0..6usize {
        if face_mask & (1 << f) == 0 {
            continue;
        }
        let rect = face_uvs[f];
        let base = (m.uvs.len() / 2) as u32;
        for v in 0..4usize {
            let vert = FACE_VERTS[f][v];
            m.positions.push(cx + vert[0] * w);
            m.positions.push(cy + vert[1] * h);
            m.positions.push(cz + vert[2] * d);
            let n = FACE_NORMALS[f];
            m.normals.push(n[0]);
            m.normals.push(n[1]);
            m.normals.push(n[2]);
            // The recovered vertex stream carries only the tile origin.
            // Repeating in-tile coordinates are calculated per fragment
            // from world position, avoiding fract(1.0) collapsing every
            // integer cube vertex to the same atlas texel.
            m.uvs.push(rect.u0);
            m.uvs.push(rect.v0);
        }
        m.indices
            .extend_from_slice(&[base, base + 1, base + 2, base, base + 2, base + 3]);
    }
    m
}

/// Convenience: build all six faces (equivalent to the original geometry).
pub fn build_box_geometry(
    cx: f32,
    cy: f32,
    cz: f32,
    w: f32,
    h: f32,
    d: f32,
    face_uvs: &[UvRect; 6],
) -> BoxMesh {
    build_box_geometry_masked(cx, cy, cz, w, h, d, face_uvs, 0b0011_1111)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn uv_rect_matches_tile_origin() {
        // 524 -> tile (12, 2); origin = (12,2)*(16/512), span = 15/512
        let r = face_uv_rect(524, 512.0);
        let tile_w = 16.0 / 512.0;
        let span = 15.0 / 512.0;
        assert!((r.u0 - tile_w * 12.0).abs() < 1e-6);
        assert!((r.v0 - tile_w * 2.0).abs() < 1e-6);
        assert!((r.u1 - r.u0 - span).abs() < 1e-6);
        assert!((r.v1 - r.v0 - span).abs() < 1e-6);
        // stone 1039 -> tile (15,4): u0 = 15/32 = 0.46875
        let s = face_uv_rect(1039, 512.0);
        assert!((s.u0 - 15.0 / 32.0).abs() < 1e-6);
        assert!((s.v0 - 4.0 / 32.0).abs() < 1e-6);
        // sampled range stays inside the tile: u1 + half < next tile origin
        assert!(r.u1 + 0.5 / 512.0 < tile_w * 13.0, "no border crossing");
    }

    #[test]
    fn unit_box_has_36_indices_24_verts() {
        let rects = [face_uv_rect(524, 512.0); 6];
        let m = build_box_geometry(0.0, 0.0, 0.0, 1.0, 1.0, 1.0, &rects);
        assert_eq!(m.positions.len(), 24 * 3, "6 faces × 4 verts");
        assert_eq!(m.normals.len(), 24 * 3);
        assert_eq!(m.uvs.len(), 24 * 2);
        assert_eq!(m.indices.len(), 36, "6 faces × 6 indices");
    }

    #[test]
    fn vertices_carry_tile_origin_for_fragment_repetition() {
        // A 2×1×1 box: +X face (px) U along Z (dim d=1), V along Y (h=1) —
        // no repeat. +Z face (pz) U along X (w=2): the far corner U should
        // wrap back into the tile (fract(2) = 0).
        let rects = [face_uv_rect(524, 512.0); 6];
        let m = build_box_geometry(0.0, 0.0, 0.0, 2.0, 1.0, 1.0, &rects);
        // +Z face starts at vertex index 4*4=16; its verts:
        // [1,0,1],[1,1,1],[0,1,1],[0,0,1] with U along X: local x * w
        // vertex 16: local (1,0,1) -> tileU = 1*2 = 2 -> fract 0
        let u16 = m.uvs[16 * 2];
        assert!((u16 - rects[4].u0).abs() < 1e-6, "fract(2)=0 wraps to u0");
        // vertex 18: local (0,1,1) -> tileU = 0*2 = 0 -> fract 0
        let u18 = m.uvs[18 * 2];
        assert!((u18 - rects[4].u0).abs() < 1e-6);
    }

    #[test]
    fn normal_directions_match_face_order() {
        let rects = [face_uv_rect(0, 512.0); 6];
        let m = build_box_geometry(5.0, 5.0, 5.0, 1.0, 1.0, 1.0, &rects);
        // +X face (f=0) normal = (1,0,0)
        let nx = m.normals[0];
        let ny = m.normals[1];
        let nz = m.normals[2];
        assert!((nx - 1.0).abs() < 1e-6 && ny.abs() < 1e-6 && nz.abs() < 1e-6);
        // -Y face (f=3) normal = (0,-1,0) at vertex 12
        let i = 12 * 3;
        assert!((m.normals[i + 1] - -1.0).abs() < 1e-6);
    }

    #[test]
    fn box_offset_moves_positions() {
        let rects = [face_uv_rect(524, 512.0); 6];
        let m = build_box_geometry(10.0, 20.0, 30.0, 1.0, 1.0, 1.0, &rects);
        // first vertex of +X face = (10+1, 20+0, 30+0)
        assert!((m.positions[0] - 11.0).abs() < 1e-6);
        assert!((m.positions[1] - 20.0).abs() < 1e-6);
        assert!((m.positions[2] - 30.0).abs() < 1e-6);
    }
}
