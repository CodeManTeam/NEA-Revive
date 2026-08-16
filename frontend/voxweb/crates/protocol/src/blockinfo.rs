//! NEA block catalog — BlockInfo / block-texture-map loading.
//!
//! The preserved NEA world references blocks by id (0..767); each block has
//! 6 face texture values (lo/hi byte pairs decoded by the renderer) plus a
//! fluid flag. The catalog is derived from the preserved archive via
//! player-babylon's extract-block-texture-map.mjs and mirrors the same data
//! here as a pure Rust structure (no IO; load from the JSON fixture).
//!
//! Atlas facts (recovered): atlasRadius = 32 (512px atlas),
//! blockColorShift = 4 (16px tiles), 10 color + 10 material + 12 bump
//! atlases. Per-block 6-face entries read at 6*(blockId & 0xfff) + face.

use serde::Deserialize;

pub const ATLAS_RADIUS: u32 = 32;
pub const BLOCK_COLOR_SHIFT: u32 = 4;
pub const BLOCK_COLOR_SIZE: u32 = 16;
pub const FACE_COUNT: usize = 6;

/// Face order matches the preserved engine: +X, -X, +Y, -Y, +Z, -Z.
pub const FACE_ORDER: [&str; FACE_COUNT] = ["px", "nx", "py", "ny", "pz", "nz"];

#[derive(Clone, Debug, Deserialize)]
pub struct BlockEntry {
    pub id: u16,
    pub name: String,
    pub fluid: bool,
    #[serde(default)]
    pub emissive: u16,
    #[serde(default = "default_friction")]
    pub friction: f32,
    #[serde(default)]
    pub restitution: f32,
    #[serde(rename = "faces")]
    pub faces: FaceMap,
}

fn default_friction() -> f32 {
    1.0
}

#[derive(Clone, Debug, Deserialize)]
pub struct FaceMap {
    pub px: u16,
    pub nx: u16,
    pub py: u16,
    pub ny: u16,
    pub pz: u16,
    pub nz: u16,
}

impl FaceMap {
    /// Texture value for a face index (0..6 in FACE_ORDER).
    pub fn at(&self, face: usize) -> u16 {
        match face {
            0 => self.px,
            1 => self.nx,
            2 => self.py,
            3 => self.ny,
            4 => self.pz,
            _ => self.nz,
        }
    }
}

/// Loaded catalog: fast lookup by block id plus the atlas metadata.
#[derive(Clone, Debug)]
pub struct BlockCatalog {
    /// indexed by block id (sparse; missing -> None)
    by_id: Vec<Option<BlockEntry>>,
    pub fluid_ids: Vec<u16>,
    pub max_id: u16,
}

impl BlockCatalog {
    pub fn from_json(j: &serde_json::Value) -> Result<Self, String> {
        let blocks = j
            .get("blocks")
            .and_then(|b| b.as_array())
            .ok_or("blocks array missing")?;
        let entries: Vec<BlockEntry> = blocks
            .iter()
            .map(|b| serde_json::from_value(b.clone()).map_err(|e| e.to_string()))
            .collect::<Result<_, _>>()?;
        let max_id = entries.iter().map(|e| e.id).max().unwrap_or(0);
        let mut by_id: Vec<Option<BlockEntry>> = vec![None; max_id as usize + 1];
        let mut fluid_ids = Vec::new();
        for e in entries {
            if e.fluid {
                fluid_ids.push(e.id);
            }
            let id = e.id as usize;
            by_id[id] = Some(e);
        }
        Ok(Self {
            by_id,
            fluid_ids,
            max_id,
        })
    }

    pub fn get(&self, id: u16) -> Option<&BlockEntry> {
        self.by_id.get(id as usize).and_then(|o| o.as_ref())
    }

    pub fn is_fluid(&self, id: u16) -> bool {
        self.get(id).map(|e| e.fluid).unwrap_or(false)
    }

    pub fn apply_emissive_json(&mut self, value: &serde_json::Value) -> Result<(), String> {
        let by_id = value
            .get("byId")
            .and_then(|entry| entry.as_object())
            .ok_or("emissive byId object missing")?;
        for (raw_id, raw_emissive) in by_id {
            let id = raw_id
                .parse::<u16>()
                .map_err(|_| format!("invalid emissive block id: {raw_id}"))?;
            let emissive = raw_emissive
                .as_u64()
                .filter(|packed| *packed <= u16::MAX as u64)
                .ok_or_else(|| format!("invalid emissive value for block {id}"))?
                as u16;
            let entry = self
                .by_id
                .get_mut(id as usize)
                .and_then(Option::as_mut)
                .ok_or_else(|| format!("emissive references unknown block id {id}"))?;
            entry.emissive = emissive;
        }
        self.apply_surface_physics_json(value)?;
        Ok(())
    }

    fn apply_surface_physics_json(&mut self, value: &serde_json::Value) -> Result<(), String> {
        if value.get("frictionDefault").is_none() && value.get("restitutionDefault").is_none() {
            return Ok(());
        }
        let friction_default = finite_number(value, "frictionDefault")?;
        let restitution_default = finite_number(value, "restitutionDefault")?;
        for entry in self.by_id.iter_mut().flatten() {
            entry.friction = friction_default;
            entry.restitution = restitution_default;
        }
        apply_surface_overrides(&mut self.by_id, value, "frictionById", |entry, number| {
            entry.friction = number;
        })?;
        apply_surface_overrides(
            &mut self.by_id,
            value,
            "restitutionById",
            |entry, number| entry.restitution = number,
        )
    }
}

fn finite_number(value: &serde_json::Value, field: &str) -> Result<f32, String> {
    value
        .get(field)
        .and_then(serde_json::Value::as_f64)
        .filter(|number| number.is_finite() && *number >= 0.0)
        .map(|number| number as f32)
        .ok_or_else(|| format!("invalid or missing {field}"))
}

fn apply_surface_overrides(
    entries: &mut [Option<BlockEntry>],
    value: &serde_json::Value,
    field: &str,
    mut apply: impl FnMut(&mut BlockEntry, f32),
) -> Result<(), String> {
    let overrides = value
        .get(field)
        .and_then(serde_json::Value::as_object)
        .ok_or_else(|| format!("{field} object missing"))?;
    for (raw_id, raw_number) in overrides {
        let id = raw_id
            .parse::<usize>()
            .map_err(|_| format!("invalid block id in {field}"))?;
        let number = raw_number
            .as_f64()
            .filter(|number| number.is_finite() && *number >= 0.0)
            .ok_or_else(|| format!("invalid value for block {id} in {field}"))?
            as f32;
        let entry = entries
            .get_mut(id)
            .and_then(Option::as_mut)
            .ok_or_else(|| format!("{field} references unknown block id {id}"))?;
        apply(entry, number);
    }
    Ok(())
}

/// Recovered `hn(e,t){ le.set(e, 255&t, t>>8&255) }` — split a texture value
/// into (low, high) byte tile coords.
pub fn texture_tile(value: u16) -> (u8, u8) {
    ((value & 0xff) as u8, (value >> 8) as u8)
}

/// Recovered UV: getTexCoord(base, tile) = (0.5/atlasRadius) +
/// ((BLOCK_COLOR_SIZE-1)/atlasRadius)*tile, where atlasRadius is the PIXEL
/// radius (blockInfo.atlasRadius << 4, i.e. 32 -> 512). Returns a f32 UV
/// coordinate for one axis (tile row or column).
pub fn atlas_uv(tile: u8, atlas_radius: f32) -> f32 {
    0.5 / atlas_radius + (BLOCK_COLOR_SIZE as f32 - 1.0) / atlas_radius * tile as f32
}

/// Pixel atlas radius for a given blockInfo.atlasRadius (32 -> 512).
pub fn pixel_atlas_radius(block_atlas_radius: u32) -> f32 {
    (block_atlas_radius << 4) as f32
}

/// Per-block 6-face texture table index (matches the preserved engine's
/// `6*(blockId & 0xfff) + face` access pattern).
pub fn face_table_index(block_id: u16, face: usize) -> usize {
    6 * (block_id as usize & 0xfff) + face
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_json() -> serde_json::Value {
        serde_json::json!({
            "source": "archive/block/QmTest",
            "atlas": {"radius": 32, "blockColorShift": 4},
            "blocks": [
                {"id": 0, "name": "air", "fluid": false,
                 "faces": {"px": 0, "nx": 0, "py": 0, "ny": 0, "pz": 0, "nz": 0}},
                {"id": 3, "name": "add", "fluid": false,
                 "faces": {"px": 524, "nx": 524, "py": 524, "ny": 524, "pz": 524, "nz": 524}},
                {"id": 259, "name": "red_brick_floor", "fluid": false,
                 "faces": {"px": 1560, "nx": 1560, "py": 1560, "ny": 1560, "pz": 1560, "nz": 1560}},
                {"id": 300, "name": "water", "fluid": true,
                 "faces": {"px": 800, "nx": 800, "py": 800, "ny": 800, "pz": 800, "nz": 800}}
            ]
        })
    }

    #[test]
    fn catalog_loads_and_looks_up() {
        let cat = BlockCatalog::from_json(&sample_json()).unwrap();
        assert_eq!(cat.max_id, 300);
        assert_eq!(cat.get(0).unwrap().name, "air");
        assert_eq!(cat.get(3).unwrap().name, "add");
        assert_eq!(cat.get(259).unwrap().name, "red_brick_floor");
        assert!(cat.get(999).is_none(), "sparse ids return None");
        assert_eq!(cat.fluid_ids, vec![300]);
        assert!(cat.is_fluid(300));
        assert!(!cat.is_fluid(3));
    }

    #[test]
    fn face_order_and_values() {
        let cat = BlockCatalog::from_json(&sample_json()).unwrap();
        let b = cat.get(3).unwrap();
        assert_eq!(b.faces.at(0), 524, "px");
        assert_eq!(b.faces.at(5), 524, "nz");
        // all faces equal in this fixture
        assert_eq!(b.faces.at(2), 524);
    }

    #[test]
    fn emissive_fixture_updates_known_blocks() {
        let mut catalog = BlockCatalog::from_json(&sample_json()).unwrap();
        catalog
            .apply_emissive_json(&serde_json::json!({
                "byId": { "3": 0x037f, "259": 0x01be }
            }))
            .unwrap();
        assert_eq!(catalog.get(0).unwrap().emissive, 0);
        assert_eq!(catalog.get(3).unwrap().emissive, 0x037f);
        assert_eq!(catalog.get(259).unwrap().emissive, 0x01be);
    }

    #[test]
    fn surface_physics_fixture_applies_defaults_and_overrides() {
        let mut catalog = BlockCatalog::from_json(&sample_json()).unwrap();
        catalog
            .apply_emissive_json(&serde_json::json!({
                "byId": {},
                "frictionDefault": 1,
                "frictionById": { "3": 5 },
                "restitutionDefault": 0,
                "restitutionById": { "259": 0.5 }
            }))
            .unwrap();
        assert_eq!(catalog.get(0).unwrap().friction, 1.0);
        assert_eq!(catalog.get(3).unwrap().friction, 5.0);
        assert_eq!(catalog.get(259).unwrap().restitution, 0.5);
    }

    #[test]
    fn emissive_fixture_rejects_unknown_blocks() {
        let mut catalog = BlockCatalog::from_json(&sample_json()).unwrap();
        assert!(catalog
            .apply_emissive_json(&serde_json::json!({ "byId": { "99": 1 } }))
            .is_err());
    }

    #[test]
    fn texture_tile_splits_bytes() {
        // 524 = 0x020c -> lo=0x0c=12, hi=0x02=2
        assert_eq!(texture_tile(524), (12, 2));
        // 1560 = 0x0618 -> lo=0x18=24, hi=0x06=6
        assert_eq!(texture_tile(1560), (24, 6));
        // 4884 = 0x1314 -> lo=0x14=20, hi=0x13=19
        assert_eq!(texture_tile(4884), (20, 19));
    }

    #[test]
    fn atlas_uv_matches_recovered_formula() {
        use crate::blockinfo::pixel_atlas_radius;
        // radius here is the PIXEL radius (512 for the bedwars catalog)
        let r = pixel_atlas_radius(32); // 512
        assert!((atlas_uv(0, r) - 0.5 / 512.0).abs() < 1e-6);
        assert!((atlas_uv(1, r) - (0.5 + 15.0) / 512.0).abs() < 1e-6);
        assert!((atlas_uv(12, r) - (0.5 + 15.0 * 12.0) / 512.0).abs() < 1e-6);
        // max tile 31 stays < 1
        assert!(atlas_uv(31, r) < 1.0);
    }

    #[test]
    fn face_table_index_matches_preserved() {
        assert_eq!(face_table_index(3, 0), 18);
        assert_eq!(face_table_index(3, 5), 23);
        assert_eq!(face_table_index(259, 2), 6 * 259 + 2);
    }
}
