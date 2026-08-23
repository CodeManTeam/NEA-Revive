//! NEA entry point.
//!
//! The session implementation lives in `nea_session`; this module remains a
//! small compatibility boundary for the `?nea=` boot path.

use wasm_bindgen::prelude::*;

pub async fn run(create_session_url: &str) -> Result<(), JsValue> {
    crate::nea_session::run(create_session_url).await
}
