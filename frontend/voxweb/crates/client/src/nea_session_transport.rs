//! HTTP and asset transport for the NEA project session.

use wasm_bindgen::JsCast;
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::JsFuture;
use web_sys::{Request, RequestInit, Response};

use crate::asset_overrides::AssetOverrides;
use crate::sanitized_assets::SanitizedAtlasKind;
use voxweb_protocol::atlas::AtlasImage;

pub(crate) fn origin_of(url: &str) -> String {
    if let Some(scheme_end) = url.find("://") {
        let scheme = &url[..scheme_end];
        let rest = &url[scheme_end + 3..];
        let end = rest.find('/').unwrap_or(rest.len());
        format!("{scheme}://{}", &rest[..end])
    } else {
        web_sys::window()
            .and_then(|window| window.location().origin().ok())
            .unwrap_or_default()
    }
}

pub(crate) fn page_content_id() -> String {
    web_sys::window()
        .and_then(|window| window.location().search().ok())
        .and_then(|search| {
            search.trim_start_matches('?').split('&').find_map(|pair| {
                let mut parts = pair.splitn(2, '=');
                match (parts.next(), parts.next()) {
                    (Some("contentId"), Some(value)) if !value.is_empty() => {
                        Some(value.to_string())
                    }
                    _ => None,
                }
            })
        })
        .unwrap_or_else(|| "100110008".to_string())
}

pub(crate) fn page_flag(name: &str) -> bool {
    web_sys::window()
        .and_then(|window| window.location().search().ok())
        .map(|search| {
            search.trim_start_matches('?').split('&').any(|pair| {
                let mut parts = pair.splitn(2, '=');
                let key = parts.next().unwrap_or_default();
                let value = parts.next().unwrap_or("true");
                key == name && matches!(value, "1" | "true" | "yes")
            })
        })
        .unwrap_or(false)
}

pub(crate) async fn create_session(
    url: &str,
    content_id: &str,
) -> Result<(String, String, usize), JsValue> {
    let opts = RequestInit::new();
    opts.set_method("POST");
    opts.set_body(&JsValue::from_str(&format!(
        r#"{{"mode":"play","contentId":"{content_id}","fingerPrint":"voxweb-smoke","serverId":""}}"#
    )));
    let request = Request::new_with_str_and_init(url, &opts)?;
    request.headers().set("Content-Type", "application/json")?;
    let window = web_sys::window().ok_or_else(|| JsValue::from_str("no window"))?;
    let resp: Response = JsFuture::from(window.fetch_with_request(&request))
        .await?
        .dyn_into()?;
    let text = JsFuture::from(resp.text()?)
        .await?
        .as_string()
        .ok_or_else(|| JsValue::from_str("resp not text"))?;
    if !resp.ok() {
        return Err(JsValue::from_str(&format!(
            "createSession HTTP {}: {}",
            resp.status(),
            text.trim()
        )));
    }
    let config: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| JsValue::from_str(&format!("bad config json: {e}")))?;
    let cfg = config
        .get("config")
        .ok_or_else(|| JsValue::from_str("no config key"))?;
    let session_id = cfg
        .get("sessionId")
        .and_then(|v| v.as_str())
        .ok_or_else(|| JsValue::from_str("no sessionId"))?
        .to_string();
    let socket_url = cfg
        .get("socketServerUrl")
        .and_then(|v| v.as_str())
        .ok_or_else(|| JsValue::from_str("no socketServerUrl"))?
        .to_string();
    let max_sockets = cfg.get("maxSockets").and_then(|v| v.as_u64()).unwrap_or(3) as usize;
    Ok((session_id, socket_url, max_sockets))
}

pub(crate) async fn load_asset_overrides() -> Result<AssetOverrides, JsValue> {
    let window = web_sys::window().ok_or_else(|| JsValue::from_str("no window"))?;
    let resp: Response = JsFuture::from(window.fetch_with_str("/asset-overrides/manifest.json"))
        .await?
        .dyn_into()?;
    if resp.status() == 404 {
        return Ok(AssetOverrides::default());
    }
    if !resp.ok() {
        return Err(JsValue::from_str(&format!(
            "asset manifest status {}",
            resp.status()
        )));
    }
    let text = JsFuture::from(resp.text()?)
        .await?
        .as_string()
        .ok_or_else(|| JsValue::from_str("asset manifest response is not text"))?;
    crate::asset_overrides::parse_optional(&text).map_err(|error| JsValue::from_str(&error))
}

pub(crate) async fn fetch_atlas_mips(
    mip_count: usize,
    overrides: &AssetOverrides,
    slot_prefix: &str,
) -> Result<Vec<AtlasImage>, JsValue> {
    let mut images = Vec::with_capacity(mip_count);
    for level in 0..mip_count {
        let slot = format!("{slot_prefix}.{level}");
        let image = if let Some(url) = overrides.replacement(&slot) {
            let bytes = fetch_bytes(url).await?;
            AtlasImage::from_png(&bytes).map_err(|error| {
                JsValue::from_str(&format!("atlas mip {level} decode failed: {error}"))
            })?
        } else {
            let kind = match slot_prefix {
                "terrain.color" => SanitizedAtlasKind::Color,
                "terrain.material" => SanitizedAtlasKind::Material,
                "terrain.bump" => SanitizedAtlasKind::Bump,
                _ => return Err(JsValue::from_str("unknown sanitized atlas slot")),
            };
            crate::sanitized_assets::atlas_mip(kind, level)
        };
        images.push(image);
    }
    Ok(images)
}

pub(crate) async fn fetch_bytes(url: &str) -> Result<Vec<u8>, JsValue> {
    let window = web_sys::window().ok_or_else(|| JsValue::from_str("no window"))?;
    let resp: Response = JsFuture::from(window.fetch_with_str(url))
        .await?
        .dyn_into()?;
    if !resp.ok() {
        return Err(JsValue::from_str(&format!(
            "fetch {url}: status {}",
            resp.status()
        )));
    }
    let buf = JsFuture::from(resp.array_buffer()?).await?;
    Ok(js_sys::Uint8Array::new(&buf).to_vec())
}
