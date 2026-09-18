//! Engine-owned chat input for the NEA project path.

use std::cell::RefCell;
use std::rc::Rc;

use wasm_bindgen::JsCast;
use wasm_bindgen::prelude::*;
use web_sys::HtmlInputElement;

pub(crate) struct ChatOverlay {
    input: HtmlInputElement,
    pending: Rc<RefCell<Vec<String>>>,
    _keydown: Closure<dyn FnMut(web_sys::KeyboardEvent)>,
}

impl ChatOverlay {
    pub(crate) fn new(document: &web_sys::Document) -> Result<Rc<Self>, JsValue> {
        let input: HtmlInputElement = document.create_element("input")?.dyn_into()?;
        input.set_id("nea-chat-input");
        input.set_type("text");
        input.set_placeholder("输入消息，按 Enter 发送");
        input.set_hidden(true);
        input.set_attribute(
            "style",
            "position:fixed;left:50%;bottom:72px;transform:translateX(-50%);z-index:1200;width:min(560px,calc(100vw - 32px));box-sizing:border-box;padding:10px 14px;border:1px solid rgba(220,184,96,.75);border-radius:6px;background:rgba(10,16,18,.94);color:#e2eae5;font:16px/1.3 system-ui,sans-serif;outline:none;box-shadow:0 8px 24px rgba(0,0,0,.35);",
        )?;
        document
            .body()
            .ok_or_else(|| JsValue::from_str("document body unavailable"))?
            .append_child(&input)?;

        let pending = Rc::new(RefCell::new(Vec::new()));
        let pending_for_key = pending.clone();
        let keydown = Closure::<dyn FnMut(web_sys::KeyboardEvent)>::new(
            move |event: web_sys::KeyboardEvent| {
                event.stop_propagation();
                match event.code().as_str() {
                    "Enter" => {
                        if let Some(target) = event
                            .target()
                            .and_then(|value| value.dyn_into::<HtmlInputElement>().ok())
                        {
                            let message = target.value().trim().to_string();
                            target.set_value("");
                            target.set_hidden(true);
                            let _ = target.blur();
                            if !message.is_empty() {
                                pending_for_key.borrow_mut().push(message);
                            }
                        }
                        event.prevent_default();
                    }
                    "Escape" => {
                        if let Some(target) = event
                            .target()
                            .and_then(|value| value.dyn_into::<HtmlInputElement>().ok())
                        {
                            target.set_value("");
                            target.set_hidden(true);
                            let _ = target.blur();
                        }
                        event.prevent_default();
                    }
                    _ => {}
                }
            },
        );
        input.add_event_listener_with_callback("keydown", keydown.as_ref().unchecked_ref())?;
        Ok(Rc::new(Self {
            input,
            pending,
            _keydown: keydown,
        }))
    }

    pub(crate) fn is_open(&self) -> bool {
        !self.input.hidden()
    }

    pub(crate) fn toggle(&self) {
        if self.is_open() {
            self.input.set_value("");
            self.input.set_hidden(true);
            let _ = self.input.blur();
        } else {
            if let Some(document) = web_sys::window().and_then(|window| window.document()) {
                document.exit_pointer_lock();
            }
            self.input.set_hidden(false);
            let _ = self.input.focus();
        }
    }

    pub(crate) fn drain(&self) -> Vec<String> {
        std::mem::take(&mut *self.pending.borrow_mut())
    }
}
