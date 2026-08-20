use std::collections::HashMap;

use serde::Deserialize;

const MANIFEST_VERSION: u32 = 1;
const MAX_REPLACEMENTS: usize = 512;
const LOCAL_ASSET_PREFIX: &str = "/asset-overrides/files/";

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct AssetOverrides {
    #[serde(default)]
    version: u32,
    #[serde(default)]
    replacements: HashMap<String, String>,
}

impl AssetOverrides {
    pub fn parse(text: &str) -> Result<Self, String> {
        let manifest: Self = serde_json::from_str(text)
            .map_err(|error| format!("invalid asset manifest: {error}"))?;
        manifest.validate()?;
        Ok(manifest)
    }

    #[allow(dead_code)]
    pub fn resolve<'a>(&'a self, slot: &str, fallback: &'a str) -> &'a str {
        self.replacements
            .get(slot)
            .map(String::as_str)
            .unwrap_or(fallback)
    }

    pub fn replacement(&self, slot: &str) -> Option<&str> {
        self.replacements.get(slot).map(String::as_str)
    }

    pub fn len(&self) -> usize {
        self.replacements.len()
    }

    fn validate(&self) -> Result<(), String> {
        if self.version != MANIFEST_VERSION {
            return Err(format!(
                "unsupported asset manifest version {}",
                self.version
            ));
        }
        if self.replacements.len() > MAX_REPLACEMENTS {
            return Err("asset manifest has too many replacements".to_string());
        }
        for (slot, path) in &self.replacements {
            validate_slot(slot)?;
            validate_local_path(path)?;
        }
        Ok(())
    }
}

pub fn parse_optional(text: &str) -> Result<AssetOverrides, String> {
    let trimmed = text.trim_start();
    if trimmed.is_empty() || !trimmed.starts_with('{') {
        return Ok(AssetOverrides::default());
    }
    AssetOverrides::parse(trimmed)
}

fn validate_slot(slot: &str) -> Result<(), String> {
    if slot.is_empty()
        || !slot
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || b"._-".contains(&byte))
    {
        return Err(format!("invalid asset slot {slot:?}"));
    }
    Ok(())
}

fn validate_local_path(path: &str) -> Result<(), String> {
    if !path.starts_with(LOCAL_ASSET_PREFIX)
        || path.contains("..")
        || path.contains('\\')
        || path.contains('?')
        || path.contains('#')
        || path.bytes().any(|byte| byte.is_ascii_control())
    {
        return Err("asset replacement must be a clean /asset-overrides/files/ path".to_string());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn local_manifest_resolves_stable_slots() {
        let manifest = AssetOverrides::parse(
            r#"{"version":1,"replacements":{"terrain.color.0":"/asset-overrides/files/color.png"}}"#,
        )
        .unwrap();
        assert_eq!(
            manifest.resolve("terrain.color.0", "/block/original"),
            "/asset-overrides/files/color.png"
        );
        assert_eq!(
            manifest.resolve("terrain.color.1", "/block/original"),
            "/block/original"
        );
    }

    #[test]
    fn manifest_rejects_remote_and_traversal_paths() {
        for path in [
            "https://example.invalid/asset.png",
            "/asset-overrides/files/../private.png",
            "/asset-overrides/files/a.png?token=secret",
        ] {
            let text = format!(r#"{{"version":1,"replacements":{{"terrain.color.0":"{path}"}}}}"#);
            assert!(AssetOverrides::parse(&text).is_err());
        }
    }

    #[test]
    fn missing_manifest_accepts_static_server_html_fallback() {
        assert_eq!(parse_optional("").unwrap().len(), 0);
        assert_eq!(
            parse_optional("<!DOCTYPE html><title>VoxWeb</title>")
                .unwrap()
                .len(),
            0
        );
        assert!(parse_optional(r#"{"version":"broken"}"#).is_err());
    }
}
