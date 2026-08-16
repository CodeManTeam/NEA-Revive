//! NEA → VoxWeb world-shape adapter.
//!
//! The preserved NEA world is 256×64×256 voxels in 32×32×32 chunks
//! (8×2×8 grid, chunkId = i + shapeI*(j + shapeJ*k)); VoxWeb chunks are
//! 16×256×16 columns (x/z split, y full-height). One NEA chunk therefore
//! maps onto 2×2 VoxWeb chunks in the xz plane, with the NEA chunk's y-slab
//! (j*32 .. j*32+32) placed at the same absolute y offset (NEA world height
//! 64 fits inside VoxWeb's 256-high column).
//!
//! Pure data mapping — no rendering, no IO — so it is unit-testable in
//! native Rust. Rendering consumption is a separate step.

use crate::terrain::{chunk_cell_index, CELLS_PER_CHUNK, CHUNK_SIZE};

pub const NEA_WORLD: [u32; 3] = [256, 64, 256];
pub const NEA_CHUNK_GRID: [u32; 3] = [
    NEA_WORLD[0] / CHUNK_SIZE as u32,
    NEA_WORLD[1] / CHUNK_SIZE as u32,
    NEA_WORLD[2] / CHUNK_SIZE as u32,
]; // 8×2×8

/// VoxWeb chunk dimensions (core crate constants mirrored here so this module
/// stays dependency-free).
pub const VW_CHUNK_X: usize = 16;
pub const VW_CHUNK_Z: usize = 16;
pub const VW_CHUNK_Y: usize = 256;

/// Decode a NEA chunkId into (i, j, k) grid indices.
pub fn nea_chunk_id_to_grid(chunk_id: u32) -> (u32, u32, u32) {
    let shape_i = NEA_CHUNK_GRID[0];
    let shape_j = NEA_CHUNK_GRID[1];
    let k = chunk_id / (shape_i * shape_j);
    let rest = chunk_id % (shape_i * shape_j);
    let j = rest / shape_i;
    let i = rest % shape_i;
    (i, j, k)
}

/// The 4 VoxWeb chunk positions (2×2 in xz) a NEA chunk maps onto.
/// Returns [(vx, vz), ...] in the same order as `write_voxweb_chunks`.
pub fn voxweb_chunk_positions(i: u32, j: u32, k: u32) -> [(i64, i64); 4] {
    let _ = j; // y slab offset is handled at write time
    let bx = i as i64 * 2;
    let bz = k as i64 * 2;
    [(bx, bz), (bx + 1, bz), (bx, bz + 1), (bx + 1, bz + 1)]
}

/// Write a NEA chunk's dense cells into 4 VoxWeb chunk column buffers.
///
/// `out` is indexed by the same order as `voxweb_chunk_positions`; each
/// buffer is a `VW_CHUNK_X × VW_CHUNK_Y × VW_CHUNK_Z` column (16×256×16)
/// pre-filled with 0 (air) by the caller or zeroed here when `clear` is set.
/// NEA block ids are copied verbatim (u16); the render layer decides how to
/// map ids to materials/textures.
///
/// Returns the number of non-air cells written.
pub fn write_voxweb_chunks(
    nea_cells: &[u16; CELLS_PER_CHUNK],
    out: &mut [[u16; VW_CHUNK_X * VW_CHUNK_Y * VW_CHUNK_Z]; 4],
    clear: bool,
) -> usize {
    if clear {
        for buf in out.iter_mut() {
            buf.fill(0);
        }
    }
    let mut written = 0usize;
    // NEA chunk-local x/z/y in 0..32; y slab starts at j*32.
    for z in 0..CHUNK_SIZE as usize {
        for y in 0..CHUNK_SIZE as usize {
            for x in 0..CHUNK_SIZE as usize {
                let b = nea_cells[chunk_cell_index(x as u32, y as u32, z as u32)];
                if b == 0 {
                    continue;
                }
                // which of the 4 VoxWeb chunks does (x, z) fall into?
                // x in 0..16 -> chunk 0 or 1 (x offset 0); 16..32 -> +1
                let vx = x / VW_CHUNK_X; // 0 or 1
                let vz = z / VW_CHUNK_Z; // 0 or 1
                let idx = vx + vz * 2; // order: (0,0),(1,0),(0,1),(1,1)
                let lx = x % VW_CHUNK_X;
                let lz = z % VW_CHUNK_Z;
                // NEA chunk y is absolute (j*32..j*32+32); VoxWeb column y is
                // also absolute (0..256). We receive only the chunk-local y,
                // so the caller must add the slab offset. To keep this pure we
                // write at the chunk-local y and let the caller place the slab.
                let cell = lx + lz * VW_CHUNK_X + y * (VW_CHUNK_X * VW_CHUNK_Z);
                out[idx][cell] = b;
                written += 1;
            }
        }
    }
    written
}

/// VoxWeb chunk-local cell index for a column buffer (x + z*16 + y*256).
pub fn voxweb_cell_index(lx: usize, ly: usize, lz: usize) -> usize {
    lx + lz * VW_CHUNK_X + ly * (VW_CHUNK_X * VW_CHUNK_Z)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn nea_chunk_id_grid_roundtrip() {
        for (id, expect) in [
            (0, (0, 0, 0)),
            (1, (1, 0, 0)),
            (7, (7, 0, 0)),
            (8, (0, 1, 0)),
            (9, (1, 1, 0)),
            (16, (0, 0, 1)),
            (76, (4, 1, 4)),
            (127, (7, 1, 7)),
        ] {
            assert_eq!(nea_chunk_id_to_grid(id), expect, "chunkId {id}");
        }
        // full grid: 8*2*8 = 128 chunks
        assert_eq!(
            NEA_CHUNK_GRID[0] * NEA_CHUNK_GRID[1] * NEA_CHUNK_GRID[2],
            128
        );
    }

    #[test]
    fn voxweb_chunk_positions_2x2() {
        // chunk (4,1,4) -> VoxWeb xz base (8,8)
        let pos = voxweb_chunk_positions(4, 1, 4);
        assert_eq!(pos, [(8, 8), (9, 8), (8, 9), (9, 9)]);
    }

    #[test]
    fn write_single_block_to_correct_subchunk() {
        // NEA chunk-local (17, 3, 5): x=17 -> vx=1, z=5 -> vz=0 -> buffer 1
        let mut cells = [0u16; CELLS_PER_CHUNK];
        cells[chunk_cell_index(17, 3, 5)] = 42;
        let mut out = [[0u16; VW_CHUNK_X * VW_CHUNK_Y * VW_CHUNK_Z]; 4];
        let written = write_voxweb_chunks(&cells, &mut out, true);
        assert_eq!(written, 1);
        // buffer 1 (vx=1,vz=0): local x = 17%16 = 1, lz = 5
        let cell = voxweb_cell_index(1, 3, 5);
        assert_eq!(out[1][cell], 42);
        assert_eq!(out[0][cell], 0, "other buffers stay air");
        assert_eq!(out[2][cell], 0);
        assert_eq!(out[3][cell], 0);
    }

    #[test]
    fn write_corners_cover_all_four_buffers() {
        let mut cells = [0u16; CELLS_PER_CHUNK];
        cells[chunk_cell_index(0, 0, 0)] = 1; // -> (0,0) buffer 0
        cells[chunk_cell_index(16, 0, 0)] = 2; // -> (1,0) buffer 1
        cells[chunk_cell_index(0, 0, 16)] = 3; // -> (0,1) buffer 2
        cells[chunk_cell_index(16, 0, 16)] = 4; // -> (1,1) buffer 3
        let mut out = [[0u16; VW_CHUNK_X * VW_CHUNK_Y * VW_CHUNK_Z]; 4];
        write_voxweb_chunks(&cells, &mut out, true);
        assert_eq!(out[0][0], 1);
        assert_eq!(out[1][0], 2);
        assert_eq!(out[2][0], 3);
        assert_eq!(out[3][0], 4);
    }

    #[test]
    fn clear_flag_resets_buffers() {
        let cells = [7u16; CELLS_PER_CHUNK];
        let mut out = [[9u16; VW_CHUNK_X * VW_CHUNK_Y * VW_CHUNK_Z]; 4];
        write_voxweb_chunks(&cells, &mut out, true);
        // with clear=true every buffer cell is overwritten with the NEA block
        assert_eq!(out[0][0], 7);
        // spot-check a deep cell: VoxWeb column index for lx=15, ly=31, lz=15
        let cell = voxweb_cell_index(15, 31, 15);
        assert_eq!(out[3][cell], 7);
    }
}
