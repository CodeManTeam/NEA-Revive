use wasm_bindgen::JsValue;
use web_sys::{Document, Element};

pub struct InteractionOverlay { root: Element }

impl InteractionOverlay {
    pub fn new(document: &Document) -> Result<Self, JsValue> {
        if let Some(old) = document.get_element_by_id("nea-interaction") { old.remove(); }
        let root = document.create_element("div")?;
        root.set_id("nea-interaction");
        root.set_attribute("style", "position:fixed;left:50%;bottom:18%;transform:translateX(-50%);z-index:25;pointer-events:none;color:white;background:rgba(0,0,0,.62);padding:6px 12px;border-radius:3px;font:600 14px Arial,sans-serif;text-shadow:0 1px 2px #000;display:none;white-space:nowrap")?;
        document.body().ok_or_else(|| JsValue::from_str("document has no body"))?.append_child(&root)?;
        Ok(Self { root })
    }

    pub fn set(&self, hint: Option<&str>) {
        if let Some(hint) = hint {
            self.root.set_text_content(Some(&format!("[E] {hint}")));
            let _ = self.root.set_attribute("style", "position:fixed;left:50%;bottom:18%;transform:translateX(-50%);z-index:25;pointer-events:none;color:white;background:rgba(0,0,0,.62);padding:6px 12px;border-radius:3px;font:600 14px Arial,sans-serif;text-shadow:0 1px 2px #000;display:block;white-space:nowrap");
        } else { let _ = self.root.set_attribute("style", "display:none"); }
    }
}

impl Drop for InteractionOverlay { fn drop(&mut self) { self.root.remove(); } }
