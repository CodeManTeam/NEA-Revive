//! NEA block atlas loading — 512×512 PNG decode + tile extraction.
//!
//! Recovered atlas contract (block-texture-map.json): atlasRadius = 32
//! (512px), blockColorShift = 4 (16px tiles), 10 color + 10 material + 12
//! bump atlases; per-block 6-face values (hn() split into lo/hi bytes) index
//! a 32×32 tile grid. Pure decode + tile math — native-testable with the
//! real archive PNGs; the browser path feeds the same tiles to WebGPU.

use crate::blockinfo::{texture_tile, BLOCK_COLOR_SIZE};

/// Decoded 512×512 RGBA atlas.
#[derive(Clone, Debug)]
pub struct AtlasImage {
    pub width: u32,
    pub height: u32,
    pub rgba: Vec<u8>,
}

impl AtlasImage {
    /// Decode a PNG byte buffer (native tests; wasm uses createImageBitmap).
    pub fn from_png(png: &[u8]) -> Result<Self, String> {
        let img = image::load_from_memory(png).map_err(|e| e.to_string())?;
        let rgba = img.to_rgba8();
        Ok(Self {
            width: rgba.width(),
            height: rgba.height(),
            rgba: rgba.into_raw(),
        })
    }

    /// Extract one 16×16 tile by (row, col) in the 32×32 grid.
    /// Returns None if out of bounds.
    pub fn tile(&self, row: u32, col: u32, tile_size: u32) -> Option<Vec<u8>> {
        if row >= self.height / tile_size || col >= self.width / tile_size {
            return None;
        }
        let mut out = Vec::with_capacity((tile_size * tile_size * 4) as usize);
        for y in 0..tile_size {
            let src_y = (row * tile_size + y) as usize;
            for x in 0..tile_size {
                let src_x = (col * tile_size + x) as usize;
                let i = (src_y * self.width as usize + src_x) * 4;
                out.extend_from_slice(&self.rgba[i..i + 4]);
            }
        }
        Some(out)
    }

    /// Average RGBA of a tile (sanity check against a known color).
    pub fn tile_average(&self, row: u32, col: u32, tile_size: u32) -> Option<[u8; 4]> {
        let t = self.tile(row, col, tile_size)?;
        let n = (tile_size * tile_size) as u32;
        let mut sum = [0u32; 4];
        for px in t.chunks_exact(4) {
            for i in 0..4 {
                sum[i] += px[i] as u32;
            }
        }
        Some([
            (sum[0] / n) as u8,
            (sum[1] / n) as u8,
            (sum[2] / n) as u8,
            (sum[3] / n) as u8,
        ])
    }
}

/// The block→atlas tile lookup: a face texture value (e.g. 524) splits into
/// (lo, hi) = (row, col) tile coords via hn(); both are < 32 for a valid
/// 512px atlas.
pub fn face_tile(texture_value: u16) -> (u32, u32) {
    let (lo, hi) = texture_tile(texture_value);
    (lo as u32, hi as u32)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_atlas() -> AtlasImage {
        // 64×64 RGBA: 4×4 grid of 16px tiles; tile (0,0) = red,
        // tile (1,1) = green, else blue
        let mut rgba = vec![0u8; 64 * 64 * 4];
        for y in 0..64u32 {
            for x in 0..64u32 {
                let i = ((y * 64 + x) * 4) as usize;
                let (tr, tc) = (y / 16, x / 16);
                match (tr, tc) {
                    (0, 0) => rgba[i..i + 4].copy_from_slice(&[255, 0, 0, 255]),
                    (1, 1) => rgba[i..i + 4].copy_from_slice(&[0, 255, 0, 255]),
                    _ => rgba[i..i + 4].copy_from_slice(&[0, 0, 255, 255]),
                }
            }
        }
        AtlasImage {
            width: 64,
            height: 64,
            rgba,
        }
    }

    #[test]
    fn tile_extraction_matches_grid() {
        let a = sample_atlas();
        let red = a.tile(0, 0, 16).expect("tile");
        assert_eq!(&red[0..4], &[255, 0, 0, 255]);
        let green = a.tile(1, 1, 16).expect("tile");
        assert_eq!(&green[0..4], &[0, 255, 0, 255]);
        let blue = a.tile(0, 3, 16).expect("tile");
        assert_eq!(&blue[0..4], &[0, 0, 255, 255]);
        assert!(a.tile(4, 0, 16).is_none(), "out of grid");
    }

    #[test]
    fn tile_average_sanity() {
        let a = sample_atlas();
        let avg = a.tile_average(0, 0, 16).expect("avg");
        assert_eq!(avg, [255, 0, 0, 255]);
        let avg2 = a.tile_average(1, 1, 16).expect("avg");
        assert_eq!(avg2, [0, 255, 0, 255]);
    }

    #[test]
    fn face_tile_splits_like_hn() {
        // 524 = 0x020c -> lo=12, hi=2 (row 12, col 2)
        assert_eq!(face_tile(524), (12, 2));
        // 1560 = 0x0618 -> lo=24, hi=6
        assert_eq!(face_tile(1560), (24, 6));
        // 4884 = 0x1314 -> lo=20, hi=19
        assert_eq!(face_tile(4884), (20, 19));
    }

    #[test]
    fn tile_size_matches_block_color_size() {
        assert_eq!(BLOCK_COLOR_SIZE, 16);
    }
}
