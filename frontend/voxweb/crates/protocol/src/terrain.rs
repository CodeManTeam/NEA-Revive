//! game-terrain semantics — chunk fetch, RLE voxelChange, boxes->cells.
//!
//! Recovered from the preserved client (player-babylon voxel-cells.mjs +
//! cleanroom voxel.mjs). Kept platform-neutral so native tests can verify it;
//! the browser session layer feeds decoded messages in.

pub const CHUNK_SIZE: usize = 32;
pub const CHUNK_SHIFT: u32 = 5;
pub const CHUNK_MASK: u32 = 31;
pub const CELLS_PER_CHUNK: usize = CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE;

/// Recovered m97039-br.mjs y8: deinterleave one axis from a 3D morton code.
/// `t` is the running RLE offset; x=y8(t), y=y8(t>>>1), z=y8(t>>>2).
/// Port preserves the exact bit-twiddle sequence and result of the original.
pub fn y8(e: u32) -> u32 {
    let mut t2 = 1227133513u32 & e;
    t2 = 3272356035u32 & (t2 | t2 >> 2);
    t2 = 251719695u32 & (t2 | t2 >> 4);
    t2 = 4278190335u32 & (t2 | t2 >> 8);
    t2 = 1023u32 & (t2 | t2 >> 16);
    (t2 << 22) >> 22
}

/// Chunk-local cell index (x + (y<<5) + (z<<10)), matching the server's
/// chunkCellIndex.
pub fn chunk_cell_index(x: u32, y: u32, z: u32) -> usize {
    (x + (y << CHUNK_SHIFT) + (z << (2 * CHUNK_SHIFT))) as usize
}

/// A decoded collision box (chunk-local coordinates).
#[derive(Clone, Debug, PartialEq)]
pub struct CollisionBox {
    pub block: u32,
    pub min_x: u32,
    pub min_y: u32,
    pub min_z: u32,
    pub max_x: u32,
    pub max_y: u32,
    pub max_z: u32,
}

/// Expand a chunk's boxes into a dense u16 cell grid (0 = air). Mirrors
/// boxesToCells; all 16 voxel bits are retained because bits 14..15 carry
/// the recovered block rotation used by the mesh worker.
pub fn boxes_to_cells(boxes: &[CollisionBox]) -> Vec<u16> {
    let mut cells = vec![0u16; CELLS_PER_CHUNK];
    for b in boxes {
        if b.block == 0 {
            continue;
        }
        let block = b.block as u16;
        for z in b.min_z..b.max_z {
            for y in b.min_y..b.max_y {
                for x in b.min_x..b.max_x {
                    cells[chunk_cell_index(x, y, z)] = block;
                }
            }
        }
    }
    cells
}

/// Apply an RLE voxelChange batch (recovered m72658 semantics): runs are
/// {offset, count, block} with ACCUMULATING offset and block (MuRelativeVarint
/// deltas pre-resolved by the caller). Each run writes `count` voxels at the
/// running offset. Returns true if any cell changed.
pub fn apply_voxel_runs(cells: &mut [u16], runs: &[(u32, u32, u16)]) -> bool {
    let mut changed = false;
    let mut offset: u32 = 0;
    let mut block: u32 = 0;
    for (delta_offset, count, delta_block) in runs {
        offset = offset.wrapping_add(*delta_offset);
        block = block.wrapping_add(*delta_block as u32);
        let b = block as u16;
        for i in 0..*count {
            let idx = (offset + i) as usize;
            if idx < cells.len() && cells[idx] != b {
                cells[idx] = b;
                changed = true;
            }
        }
    }
    changed
}

/// Decode a running RLE offset into a world voxel coordinate via morton
/// deinterleave (x=y8(t), y=y8(t>>>1), z=y8(t>>>2)).
pub fn rle_offset_to_voxel(t: u32) -> (u32, u32, u32) {
    (y8(t), y8(t >> 1), y8(t >> 2))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn y8_known_values() {
        // x=y8(t) for t=0..3 (small morton codes)
        assert_eq!(y8(0), 0);
        // t=1 -> x=1, y=0, z=0
        assert_eq!(rle_offset_to_voxel(1), (1, 0, 0));
        // t=2 -> x=0, y=1
        assert_eq!(rle_offset_to_voxel(2), (0, 1, 0));
        // t=4 -> x=0, z=1
        assert_eq!(rle_offset_to_voxel(4), (0, 0, 1));
        // t=3 -> x=1, y=1
        assert_eq!(rle_offset_to_voxel(3), (1, 1, 0));
    }

    #[test]
    fn chunk_cell_index_matches_js() {
        assert_eq!(chunk_cell_index(1, 2, 3), 1 + (2 << 5) + (3 << 10));
        assert_eq!(chunk_cell_index(0, 0, 0), 0);
        assert_eq!(chunk_cell_index(31, 31, 31), CELLS_PER_CHUNK - 1);
    }

    #[test]
    fn boxes_to_cells_fills_dense_grid() {
        let boxes = vec![CollisionBox {
            block: 5,
            min_x: 0,
            min_y: 0,
            min_z: 0,
            max_x: 2,
            max_y: 2,
            max_z: 2,
        }];
        let cells = boxes_to_cells(&boxes);
        assert_eq!(cells[chunk_cell_index(0, 0, 0)], 5);
        assert_eq!(cells[chunk_cell_index(1, 1, 1)], 5);
        assert_eq!(cells[chunk_cell_index(2, 0, 0)], 0);
    }

    #[test]
    fn boxes_to_cells_preserves_recovered_rotation_bits() {
        let cells = boxes_to_cells(&[CollisionBox {
            block: 0xc005,
            min_x: 0,
            min_y: 0,
            min_z: 0,
            max_x: 1,
            max_y: 1,
            max_z: 1,
        }]);
        assert_eq!(cells[0], 0xc005);
    }

    #[test]
    fn apply_voxel_runs_accumulates_offset_and_block() {
        let mut cells = vec![0u16; CELLS_PER_CHUNK];
        // run 1: offset 0, count 3, block 7
        // run 2: offset delta 5, count 1, block delta 1 -> absolute offset 5,
        //        block 8
        let runs = vec![(0, 3, 7), (5, 1, 1)];
        assert!(apply_voxel_runs(&mut cells, &runs));
        assert_eq!(cells[0], 7);
        assert_eq!(cells[2], 7);
        assert_eq!(cells[3], 0);
        assert_eq!(cells[5], 8);
    }

    #[test]
    fn rle_voxel_world_coords() {
        // offset 5 = 0b101 -> x=bit0=1, y=bit1=0, z=bit2=1 (JS oracle verified)
        assert_eq!(rle_offset_to_voxel(5), (1, 0, 1));
        assert_eq!(rle_offset_to_voxel(7), (1, 1, 1));
        assert_eq!(rle_offset_to_voxel(8), (2, 0, 0));
    }
}
