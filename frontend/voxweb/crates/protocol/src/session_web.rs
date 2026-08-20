//! NEA browser session entry — the wasm glue for VW-003 Step 1.
//!
//! Exposes `#[wasm_bindgen]` functions that a page can call to start a NEA
//! session (connect → startup chain → net-state logging). Not wired into any
//! page yet (user-visible Step 1); this module proves the wasm-compile path
//! of the browser session layer.
//!
//! Compiles for wasm32-unknown-unknown; no-op on native.

use std::cell::RefCell;
use std::rc::Rc;

use wasm_bindgen::prelude::*;

use crate::browser::BrowserSockets;
use crate::driver::{SendFrame, SessionDriver, SessionStage};
use crate::protocol::ProtocolTable;

/// Log a message to the browser console.
#[wasm_bindgen]
pub fn nea_log(message: &str) {
    #[cfg(target_arch = "wasm32")]
    {
        web_sys::console::log_1(&JsValue::from_str(message));
    }
    #[cfg(not(target_arch = "wasm32"))]
    {
        let _ = message;
    }
}

/// A runnable NEA session bound to a single wasm instance.
#[wasm_bindgen]
pub struct NeaSessionHandle {
    inner: Rc<RefCell<Option<NeaSessionState>>>,
}

struct NeaSessionState {
    driver: SessionDriver,
    sockets: BrowserSockets,
    client_json_str: String,
    server_json_str: String,
    table: ProtocolTable,
}

impl NeaSessionState {
    fn new(ws_url: &str, max_sockets: usize) -> Result<Self, JsValue> {
        let sockets = BrowserSockets::connect(ws_url, max_sockets)?;
        let (table, client_json_str, server_json_str) = load_protocol_table();
        Ok(Self {
            driver: SessionDriver::new(),
            sockets,
            client_json_str,
            server_json_str,
            table,
        })
    }
}

#[wasm_bindgen]
impl NeaSessionHandle {
    /// Open the session: socket URL (with ?sid= appended later by the
    /// server's session config) + maxSockets.
    #[wasm_bindgen(constructor)]
    pub fn new(ws_url: &str, max_sockets: usize) -> Result<NeaSessionHandle, JsValue> {
        let inner = NeaSessionState::new(ws_url, max_sockets)?;
        Ok(Self {
            inner: Rc::new(RefCell::new(Some(inner))),
        })
    }

    /// Poll the sockets, feed the driver, return actions to take (as text
    /// summaries; the real page would send the frames over the sockets).
    #[wasm_bindgen]
    pub fn poll(&self) -> Result<Vec<JsValue>, JsValue> {
        let mut out = Vec::new();
        let mut inner = self.inner.borrow_mut();
        if let Some(session) = inner.as_mut() {
            for evt in session.sockets.poll() {
                match evt {
                    crate::browser::SessionEvent::ReliableOpen => {
                        let frames = session.driver.on_reliable_open(
                            &session.table,
                            &session.client_json_str,
                            &session.server_json_str,
                        );
                        out.extend(frames_to_js(frames));
                    }
                    crate::browser::SessionEvent::Binary(bytes) => {
                        match session.driver.on_frame(&session.table, &bytes) {
                            Ok(frames) => {
                                for f in &frames {
                                    if let Some(text) = &f.text {
                                        let _ = session.sockets.send_reliable_text(text);
                                    } else {
                                        let _ = session.sockets.send_reliable(&f.bytes);
                                    }
                                }
                                out.extend(frames_to_js(frames));
                            }
                            Err(e) => {
                                out.push(JsValue::from_str(&format!("frame error: {e}")));
                            }
                        }
                    }
                    crate::browser::SessionEvent::Text(_) => {}
                    crate::browser::SessionEvent::UnreliableBinary(_) => {}
                    crate::browser::SessionEvent::SocketError(e) => {
                        out.push(JsValue::from_str(&format!("socket error: {e}")));
                    }
                    crate::browser::SessionEvent::Closed => {
                        out.push(JsValue::from_str("socket closed"));
                    }
                }
            }
        }
        Ok(out)
    }

    #[wasm_bindgen]
    pub fn stage(&self) -> String {
        let inner = self.inner.borrow();
        match inner.as_ref().map(|s| &s.driver.stage) {
            Some(SessionStage::Connecting) => "connecting".into(),
            Some(SessionStage::Negotiating) => "negotiating".into(),
            Some(SessionStage::Joining) => "joining".into(),
            Some(SessionStage::Ready) => "ready".into(),
            Some(SessionStage::Playing) => "playing".into(),
            Some(SessionStage::Failed(e)) => format!("failed: {e}"),
            None => "none".into(),
        }
    }

    #[wasm_bindgen]
    pub fn player_id(&self) -> u32 {
        self.inner
            .borrow()
            .as_ref()
            .map(|s| s.driver.player_id)
            .unwrap_or(0)
    }

    #[wasm_bindgen]
    pub fn last_tick(&self) -> u32 {
        self.inner
            .borrow()
            .as_ref()
            .map(|s| s.driver.last_server_tick)
            .unwrap_or(0)
    }
}

fn frames_to_js(frames: Vec<SendFrame>) -> Vec<JsValue> {
    frames
        .into_iter()
        .map(|f| {
            if let Some(text) = f.text {
                JsValue::from_str(&format!("send-text:{text}"))
            } else {
                JsValue::from_str(&format!("send-binary:{} bytes", f.bytes.len()))
            }
        })
        .collect()
}

/// Load the 20-protocol table + jsonStr validation strings from the
/// generated fixtures (embedded at compile time).
fn load_protocol_table() -> (ProtocolTable, String, String) {
    let raw = include_str!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../tools/parity/fixtures/protocols.json"
    ));
    let j: serde_json::Value = serde_json::from_str(raw).expect("embedded protocols.json");
    let (table, _, _) = ProtocolTable::from_json(&j).expect("protocol table");
    let client = j
        .get("clientJsonStr")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let server = j
        .get("serverJsonStr")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    (table, client, server)
}

#[cfg(test)]
mod tests {
    #[test]
    fn embedded_fixtures_load() {
        let (table, client, server) = super::load_protocol_table();
        assert_eq!(table.protocols.len(), 20, "20 protocols");
        assert!(!client.is_empty(), "clientJsonStr embedded");
        assert!(!server.is_empty(), "serverJsonStr embedded");
    }
}
