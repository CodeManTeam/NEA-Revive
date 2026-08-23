//! NEA session entry point.

use wasm_bindgen::prelude::*;

pub(crate) async fn run(create_session_url: &str) -> Result<(), JsValue> {
    crate::nea_session_runtime::run(create_session_url).await
}

pub(crate) fn now_ms() -> u32 {
    crate::nea_session_runtime::now_ms()
}
