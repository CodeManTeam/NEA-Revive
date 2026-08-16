//! Recovered `models` protocol catalog used to resolve player avatar skins
//! into content-addressed avatar-part assets.

use std::collections::HashMap;

use crate::Value;

pub const AVATAR_PART_NAMES: [&str; 18] = [
    "head",
    "hips",
    "leftFoot",
    "leftHand",
    "leftLowerArm",
    "leftLowerLeg",
    "leftShoulder",
    "leftUpperArm",
    "leftUpperLeg",
    "neck",
    "rightFoot",
    "rightHand",
    "rightLowerArm",
    "rightLowerLeg",
    "rightShoulder",
    "rightUpperArm",
    "rightUpperLeg",
    "torso",
];

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct AvatarSkin {
    pub hash: String,
    pub part_ids: [String; 18],
}

#[derive(Clone, Debug, Default)]
pub struct AvatarCatalog {
    skins: Vec<AvatarSkin>,
    part_hashes: HashMap<u32, String>,
}

impl AvatarCatalog {
    pub fn apply_models_message(&mut self, name: &str, value: &Value) -> bool {
        match name {
            "appendSkinHashes" => self.append_skins(value),
            "appendSkinPartHashes" => self.append_part_hashes(value),
            _ => false,
        }
    }

    pub fn skin(&self, index: usize) -> Option<&AvatarSkin> {
        self.skins.get(index)
    }

    pub fn part_hash(&self, id: u32) -> Option<&str> {
        self.part_hashes.get(&id).map(String::as_str)
    }

    pub fn resolved_skin_parts(&self, index: usize) -> Option<Vec<(&'static str, &str)>> {
        let skin = self.skin(index)?;
        Some(
            AVATAR_PART_NAMES
                .iter()
                .zip(skin.part_ids.iter())
                .filter_map(|(name, id)| {
                    id.parse()
                        .ok()
                        .and_then(|id| self.part_hash(id).map(|hash| (*name, hash)))
                })
                .collect(),
        )
    }

    pub fn resolved_part_ids(&self, ids: &[u32; 18]) -> Vec<(&'static str, &str)> {
        AVATAR_PART_NAMES
            .iter()
            .zip(ids.iter())
            .filter_map(|(name, id)| self.part_hash(*id).map(|hash| (*name, hash)))
            .collect()
    }

    pub fn part_ids_have_renderable_core(&self, ids: &[u32; 18]) -> bool {
        let parts = self.resolved_part_ids(ids);
        ["head", "hips", "torso"]
            .iter()
            .all(|required| parts.iter().any(|(name, _)| name == required))
    }

    pub fn part_ids_are_fully_resolved(&self, ids: &[u32; 18]) -> bool {
        let declared = ids.iter().filter(|id| **id > 0).count();
        declared > 0
            && ids
                .iter()
                .filter(|id| **id > 0)
                .all(|id| self.part_hash(*id).is_some())
    }

    pub fn skin_is_fully_resolved(&self, index: usize) -> bool {
        let Some(skin) = self.skin(index) else {
            return false;
        };
        let expected = skin.part_ids.iter().filter(|id| !id.is_empty()).count();
        expected > 0
            && skin.part_ids.iter().filter(|id| !id.is_empty()).all(|id| {
                id.parse::<u32>()
                    .ok()
                    .is_some_and(|part_id| self.part_hash(part_id).is_some())
            })
    }

    pub fn skin_has_renderable_core(&self, index: usize) -> bool {
        let Some(parts) = self.resolved_skin_parts(index) else {
            return false;
        };
        ["head", "hips", "torso"]
            .iter()
            .all(|required| parts.iter().any(|(name, _)| name == required))
    }

    fn append_skins(&mut self, value: &Value) -> bool {
        let Value::Array(entries) = value else {
            return false;
        };
        for entry in entries {
            let Value::Struct(fields) = entry else {
                continue;
            };
            let (Some(Value::ASCII(hash)), Some(Value::Struct(parts))) =
                (fields.first(), fields.get(1))
            else {
                continue;
            };
            let part_ids = std::array::from_fn(|index| match parts.get(index) {
                Some(Value::ASCII(id)) => id.clone(),
                _ => String::new(),
            });
            self.skins.push(AvatarSkin {
                hash: hash.clone(),
                part_ids,
            });
        }
        true
    }

    fn append_part_hashes(&mut self, value: &Value) -> bool {
        let entries = match value {
            Value::SortedArray(entries) | Value::Array(entries) => entries,
            _ => return false,
        };
        for entry in entries {
            let Value::Struct(fields) = entry else {
                continue;
            };
            let pair = match (fields.first(), fields.get(1)) {
                (Some(Value::ASCII(hash)), Some(Value::Varint(id))) => Some((*id, hash)),
                (Some(Value::Varint(id)), Some(Value::ASCII(hash))) => Some((*id, hash)),
                _ => None,
            };
            if let Some((id, hash)) = pair {
                self.part_hashes.insert(id, hash.clone());
            }
        }
        true
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolves_skin_part_ids_through_hash_catalog() {
        let mut catalog = AvatarCatalog::default();
        let mut parts = vec![Value::ASCII(String::new()); 18];
        parts[0] = Value::ASCII("311".into());

        assert!(catalog.apply_models_message(
            "appendSkinHashes",
            &Value::Array(vec![Value::Struct(vec![
                Value::ASCII("skin-hash".into()),
                Value::Struct(parts),
            ])]),
        ));
        assert!(catalog.apply_models_message(
            "appendSkinPartHashes",
            &Value::SortedArray(vec![Value::Struct(vec![
                Value::ASCII("part-hash".into()),
                Value::Varint(311),
            ])]),
        ));

        assert_eq!(
            catalog.skin(0).map(|skin| skin.hash.as_str()),
            Some("skin-hash")
        );
        assert_eq!(catalog.part_hash(311), Some("part-hash"));
        assert_eq!(
            catalog.resolved_skin_parts(0),
            Some(vec![("head", "part-hash")])
        );
        assert!(catalog.skin_is_fully_resolved(0));
    }

    #[test]
    fn empty_optional_parts_do_not_block_a_complete_skin() {
        let mut catalog = AvatarCatalog::default();
        let mut parts = vec![Value::ASCII(String::new()); 18];
        parts[0] = Value::ASCII("7".into());
        catalog.apply_models_message(
            "appendSkinHashes",
            &Value::Array(vec![Value::Struct(vec![
                Value::ASCII("skin".into()),
                Value::Struct(parts),
            ])]),
        );

        assert!(!catalog.skin_is_fully_resolved(0));
        catalog.apply_models_message(
            "appendSkinPartHashes",
            &Value::SortedArray(vec![Value::Struct(vec![
                Value::ASCII("part".into()),
                Value::Varint(7),
            ])]),
        );
        assert!(catalog.skin_is_fully_resolved(0));
    }

    #[test]
    fn renderable_core_requires_head_hips_and_torso() {
        let mut catalog = AvatarCatalog::default();
        let mut parts = vec![Value::ASCII(String::new()); 18];
        for (index, id) in [(0, 1), (1, 2), (17, 3)] {
            parts[index] = Value::ASCII(id.to_string());
        }
        catalog.apply_models_message(
            "appendSkinHashes",
            &Value::Array(vec![Value::Struct(vec![
                Value::ASCII("skin".into()),
                Value::Struct(parts),
            ])]),
        );
        catalog.apply_models_message(
            "appendSkinPartHashes",
            &Value::SortedArray(vec![
                Value::Struct(vec![Value::ASCII("head".into()), Value::Varint(1)]),
                Value::Struct(vec![Value::ASCII("hips".into()), Value::Varint(2)]),
            ]),
        );
        assert!(!catalog.skin_has_renderable_core(0));
        catalog.apply_models_message(
            "appendSkinPartHashes",
            &Value::SortedArray(vec![Value::Struct(vec![
                Value::ASCII("torso".into()),
                Value::Varint(3),
            ])]),
        );
        assert!(catalog.skin_has_renderable_core(0));
    }

    #[test]
    fn part_hashes_accept_declared_id_hash_field_order() {
        let mut catalog = AvatarCatalog::default();
        assert!(catalog.apply_models_message(
            "appendSkinPartHashes",
            &Value::Array(vec![Value::Struct(vec![
                Value::Varint(19),
                Value::ASCII("part".into()),
            ])]),
        ));
        assert_eq!(catalog.part_hash(19), Some("part"));
    }

    #[test]
    fn player_part_ids_wait_for_every_declared_part() {
        let mut catalog = AvatarCatalog::default();
        let mut ids = [0; 18];
        ids[0] = 11;
        ids[17] = 12;
        catalog.apply_models_message(
            "appendSkinPartHashes",
            &Value::Array(vec![Value::Struct(vec![
                Value::Varint(11),
                Value::ASCII("head".into()),
            ])]),
        );
        assert!(!catalog.part_ids_are_fully_resolved(&ids));
        catalog.apply_models_message(
            "appendSkinPartHashes",
            &Value::Array(vec![Value::Struct(vec![
                Value::Varint(12),
                Value::ASCII("torso".into()),
            ])]),
        );
        assert!(catalog.part_ids_are_fully_resolved(&ids));
    }
}
