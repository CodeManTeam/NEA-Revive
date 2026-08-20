use voxweb_protocol::atlas::AtlasImage;

const COLOR_SIZE: u32 = 512;
const COLOR_TILE_SIZE: u32 = 16;
const BUMP_SIZE: u32 = 2048;
const BUMP_TILE_SIZE: u32 = 64;

const MATERIAL_COLORS: [[u8; 3]; 16] = [
    [111, 116, 118],
    [143, 145, 141],
    [89, 96, 99],
    [177, 169, 147],
    [157, 116, 69],
    [106, 72, 42],
    [86, 59, 38],
    [112, 78, 50],
    [83, 119, 54],
    [58, 99, 45],
    [157, 139, 78],
    [207, 185, 126],
    [219, 224, 219],
    [143, 180, 198],
    [129, 58, 50],
    [72, 78, 82],
];

#[derive(Clone, Copy)]
pub enum SanitizedAtlasKind {
    Color,
    Material,
    Bump,
}

pub fn atlas_mip(kind: SanitizedAtlasKind, level: usize) -> AtlasImage {
    let (base_size, base_tile) = match kind {
        SanitizedAtlasKind::Color | SanitizedAtlasKind::Material => (COLOR_SIZE, COLOR_TILE_SIZE),
        SanitizedAtlasKind::Bump => (BUMP_SIZE, BUMP_TILE_SIZE),
    };
    let size = (base_size >> level).max(1);
    let tile_size = (base_tile >> level).max(1);
    let mut rgba = vec![0; (size * size * 4) as usize];
    for y in 0..size {
        for x in 0..size {
            let tile_x = (x / tile_size).min(31);
            let tile_y = (y / tile_size).min(31);
            let local_x = x % tile_size;
            let local_y = y % tile_size;
            let pixel = match kind {
                SanitizedAtlasKind::Color => {
                    color_pixel(tile_x, tile_y, local_x, local_y, tile_size)
                }
                SanitizedAtlasKind::Material => [96, 190, 0, 255],
                SanitizedAtlasKind::Bump => [128, 128, 255, 255],
            };
            let offset = ((y * size + x) * 4) as usize;
            rgba[offset..offset + 4].copy_from_slice(&pixel);
        }
    }
    AtlasImage {
        width: size,
        height: size,
        rgba,
    }
}

pub fn water_bump() -> AtlasImage {
    let size = 256u32;
    let mut rgba = vec![0; (size * size * 4) as usize];
    for y in 0..size {
        for x in 0..size {
            let wave_x = (((x + 2 * y) / 8) % 16) as i16 - 8;
            let wave_y = (((2 * x + y) / 11) % 16) as i16 - 8;
            let offset = ((y * size + x) * 4) as usize;
            rgba[offset..offset + 4].copy_from_slice(&[
                (128 + wave_x * 3).clamp(0, 255) as u8,
                (128 + wave_y * 3).clamp(0, 255) as u8,
                244,
                255,
            ]);
        }
    }
    AtlasImage {
        width: size,
        height: size,
        rgba,
    }
}

#[allow(dead_code)]
pub fn anonymize_avatar_palette(name: &str, palette: &mut [u32]) {
    let base = match name {
        "head" | "neck" => [202u8, 168, 137],
        "torso" | "hips" => [58, 91, 105],
        "leftHand" | "rightHand" => [212, 178, 145],
        "leftFoot" | "rightFoot" => [61, 68, 76],
        _ => [91, 119, 132],
    };
    for (index, packed) in palette.iter_mut().enumerate() {
        let alpha = (*packed & 0xff) as u8;
        let variation = ((index as i16 * 17) % 31) - 15;
        let channel = |value: u8| (value as i16 + variation).clamp(16, 238) as u8;
        *packed = u32::from_be_bytes([channel(base[0]), channel(base[1]), channel(base[2]), alpha]);
    }
}

fn color_pixel(tile_x: u32, tile_y: u32, x: u32, y: u32, tile_size: u32) -> [u8; 4] {
    let seed = tile_y * 32 + tile_x;
    let base = MATERIAL_COLORS[(seed as usize * 7 + tile_y as usize) % MATERIAL_COLORS.len()];
    let noise = hash(seed, x, y) as i16 % 17 - 8;
    let pattern = match seed % 5 {
        0 if tile_size > 3 && (y == tile_size / 2 || x == tile_size / 2) => -18,
        1 if tile_size > 3 && (x + y) % (tile_size / 2).max(2) == 0 => 14,
        2 if tile_size > 3 && y % (tile_size / 3).max(2) == 0 => -12,
        3 if hash(seed + 11, x, y) % 13 == 0 => 20,
        _ => 0,
    };
    let adjust = noise + pattern;
    let channel = |value: u8| (value as i16 + adjust).clamp(8, 247) as u8;
    [channel(base[0]), channel(base[1]), channel(base[2]), 255]
}

fn hash(seed: u32, x: u32, y: u32) -> u32 {
    let mut value = seed
        .wrapping_mul(0x9e37_79b9)
        .wrapping_add(x.wrapping_mul(0x85eb_ca6b))
        .wrapping_add(y.wrapping_mul(0xc2b2_ae35));
    value ^= value >> 16;
    value = value.wrapping_mul(0x7feb_352d);
    value ^ (value >> 15)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generated_atlas_mips_follow_recovered_dimensions() {
        assert_eq!(atlas_mip(SanitizedAtlasKind::Color, 0).width, 512);
        assert_eq!(atlas_mip(SanitizedAtlasKind::Color, 9).width, 1);
        assert_eq!(atlas_mip(SanitizedAtlasKind::Bump, 0).width, 2048);
        assert_eq!(atlas_mip(SanitizedAtlasKind::Bump, 11).width, 1);
    }

    #[test]
    fn avatar_anonymization_preserves_alpha() {
        let mut palette = [0x11223300, 0xaabbccff];
        anonymize_avatar_palette("head", &mut palette);
        assert_eq!(palette[0] & 0xff, 0);
        assert_eq!(palette[1] & 0xff, 255);
        assert_ne!(palette[1], 0xaabbccff);
    }
}
