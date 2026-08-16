//! Browser session — MuDB client over web-sys WebSockets.
//!
//! Mirrors the preserved Player's transport: open `maxSockets` WebSockets to
//! `{socketServerUrl}?sid={sessionId}`, the first frame on each socket decides
//! its role (reliable/unreliable), the reliable socket carries protocol
//! messages. This module is the browser twin of the native E2E path
//! (tests/e2e.rs) — same wire behavior, web-sys event plumbing.
//!
//! NOTE: web-sys is a no-op shell on native targets, so this module only
//! compiles meaningfully for wasm32. Native tests exercise the identical
//! logic through the tokio-tungstenite E2E.

use std::cell::RefCell;
use std::collections::VecDeque;
use std::rc::Rc;

use js_sys::{ArrayBuffer, Uint8Array};
use wasm_bindgen::closure::Closure;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::{BinaryType, MessageEvent, WebSocket};

/// Events surfaced to the session driver (polled from the main loop).
#[derive(Clone, Debug)]
pub enum SessionEvent {
    /// The reliable socket opened (protocol negotiation can start).
    ReliableOpen,
    /// A text frame (protocol validation JSON / role frames).
    Text(String),
    /// A binary frame on the reliable socket.
    Binary(Vec<u8>),
    /// A binary frame on an unreliable socket.
    UnreliableBinary(Vec<u8>),
    /// A socket errored.
    SocketError(String),
    /// A socket closed.
    Closed,
}

/// Browser MuDB socket set: one reliable + N unreliable WebSockets.
pub struct BrowserSockets {
    reliable: Option<WebSocket>,
    unreliable: Vec<WebSocket>,
    inbox: Rc<RefCell<VecDeque<SessionEvent>>>,
    /// Keep the event closures alive for the socket lifetimes.
    _closures: Vec<JsValue>,
    /// Set once the reliable socket is open.
    reliable_open: bool,
}

impl BrowserSockets {
    /// Open `max_sockets` WebSockets to `ws_url` (already includes ?sid=).
    /// Returns immediately; poll `poll()` for SessionEvents.
    pub fn connect(ws_url: &str, max_sockets: usize) -> Result<Self, JsValue> {
        let inbox: Rc<RefCell<VecDeque<SessionEvent>>> = Rc::new(RefCell::new(VecDeque::new()));
        let mut closures: Vec<JsValue> = Vec::new();
        let mut unreliable = Vec::new();
        let mut reliable: Option<WebSocket> = None;

        for _ in 0..max_sockets.max(1) {
            let socket = WebSocket::new(ws_url)?;
            socket.set_binary_type(BinaryType::Arraybuffer);

            // role flag per socket; decided by the first frame
            let role: Rc<RefCell<Option<bool>>> = Rc::new(RefCell::new(None));
            let inbox_open = inbox.clone();
            let role_open = role.clone();
            let on_open = Closure::<dyn FnMut(JsValue)>::new(move |_evt: JsValue| {
                // role is decided on the first MESSAGE; nothing to do on open
                let _ = (&inbox_open, &role_open);
            });
            socket.set_onopen(Some(on_open.as_ref().unchecked_ref()));
            closures.push(on_open.into_js_value());

            let inbox_msg = inbox.clone();
            let role_msg = role.clone();
            let on_message = Closure::<dyn FnMut(MessageEvent)>::new(move |evt: MessageEvent| {
                let data = evt.data();
                if let Some(text) = data.as_string() {
                    // first frame decides the role
                    let mut r = role_msg.borrow_mut();
                    if r.is_none() {
                        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) {
                            let rel = json.get("reliable").and_then(|v| v.as_bool());
                            if let Some(rel) = rel {
                                *r = Some(rel);
                                if rel {
                                    inbox_msg.borrow_mut().push_back(SessionEvent::ReliableOpen);
                                }
                            }
                        }
                    }
                    inbox_msg.borrow_mut().push_back(SessionEvent::Text(text));
                    return;
                }
                if let Some(buf) = data.dyn_ref::<ArrayBuffer>() {
                    let bytes = Uint8Array::new(buf).to_vec();
                    let is_reliable = role_msg.borrow().unwrap_or(false);
                    if is_reliable {
                        inbox_msg
                            .borrow_mut()
                            .push_back(SessionEvent::Binary(bytes));
                    } else {
                        inbox_msg
                            .borrow_mut()
                            .push_back(SessionEvent::UnreliableBinary(bytes));
                    }
                }
            });
            socket.set_onmessage(Some(on_message.as_ref().unchecked_ref()));
            closures.push(on_message.into_js_value());

            let inbox_err = inbox.clone();
            let on_error =
                Closure::<dyn FnMut(web_sys::ErrorEvent)>::new(move |evt: web_sys::ErrorEvent| {
                    let msg = evt.message();
                    inbox_err
                        .borrow_mut()
                        .push_back(SessionEvent::SocketError(msg));
                });
            socket.set_onerror(Some(on_error.as_ref().unchecked_ref()));
            closures.push(on_error.into_js_value());

            let inbox_close = inbox.clone();
            let on_close = Closure::<dyn FnMut(web_sys::CloseEvent)>::new(move |_evt| {
                inbox_close.borrow_mut().push_back(SessionEvent::Closed);
            });
            socket.set_onclose(Some(on_close.as_ref().unchecked_ref()));
            closures.push(on_close.into_js_value());

            // role isn't known until the first message, so every socket is a
            // candidate; we mark the first socket as the likely reliable one
            // but role assignment happens via the first frame.
            if reliable.is_none() {
                reliable = Some(socket.clone());
            } else {
                unreliable.push(socket);
            }
        }

        Ok(Self {
            reliable,
            unreliable,
            inbox,
            _closures: closures,
            reliable_open: false,
        })
    }

    /// Drain queued events.
    pub fn poll(&self) -> Vec<SessionEvent> {
        self.inbox.borrow_mut().drain(..).collect()
    }

    /// Send a binary frame on the reliable socket (binary_type is
    /// ArrayBuffer; web_sys send_with_u8_array handles the copy).
    pub fn send_reliable(&self, bytes: &[u8]) -> Result<(), JsValue> {
        if let Some(s) = &self.reliable {
            s.send_with_u8_array(bytes)
        } else {
            Err(JsValue::from_str("reliable socket not open"))
        }
    }

    /// Send a text frame on the reliable socket.
    pub fn send_reliable_text(&self, text: &str) -> Result<(), JsValue> {
        if let Some(s) = &self.reliable {
            s.send_with_str(text)
        } else {
            Err(JsValue::from_str("reliable socket not open"))
        }
    }

    pub fn is_reliable_open(&self) -> bool {
        self.reliable_open
    }

    pub fn close(&self) {
        if let Some(s) = &self.reliable {
            let _ = s.close();
        }
        for s in &self.unreliable {
            let _ = s.close();
        }
    }
}

/// Convenience: build the ws URL with the session id.
pub fn socket_url_with_sid(base: &str, session_id: &str) -> String {
    let sep = if base.contains('?') { '&' } else { '?' };
    format!("{base}{sep}sid={session_id}")
}
