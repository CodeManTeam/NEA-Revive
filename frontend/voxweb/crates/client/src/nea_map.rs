//! Map-independent chunk planning for the NEA content entry point.
//!
//! The server supplies a regular 32^3 chunk grid. This module owns ordering
//! and completion semantics so individual imported projects do not need a
//! map-specific loader.

pub(crate) fn plan_chunks(grid: [u32; 3], spawn_chunk: [u32; 3]) -> (Vec<(u32, u32, u32)>, usize) {
    let mut near = Vec::new();
    let mut rest = Vec::new();
    for cy in 0..grid[1] {
        for cx in 0..grid[0] {
            for cz in 0..grid[2] {
                let entry = (cx, cy, cz);
                // Keep the first synchronous build to a small 3D spawn window.
                // The native worker meshes other chunks independently as they
                // arrive; the combined Rust fallback performs one later full
                // build for the remaining chunks.
                if cx.abs_diff(spawn_chunk[0]) <= 1
                    && cy.abs_diff(spawn_chunk[1]) <= 1
                    && cz.abs_diff(spawn_chunk[2]) <= 1
                {
                    near.push(entry);
                } else {
                    rest.push(entry);
                }
            }
        }
    }
    let near_count = near.len();
    near.extend(rest);
    (near, near_count)
}
