use std::collections::{HashMap, HashSet};

use wasm_bindgen::JsValue;
use web_sys::{Document, Element};

pub struct NameplateEntry<'a> {
    pub id: u64,
    pub name: &'a str,
    pub world: [f32; 3],
}

pub struct NameplateOverlay {
    document: Document,
    root: Element,
    labels: HashMap<u64, Element>,
}

impl NameplateOverlay {
    pub fn new(document: &Document) -> Result<Self, JsValue> {
        if let Some(previous) = document.get_element_by_id("nea-nameplates") {
            previous.remove();
        }
        let root = document.create_element("div")?;
        root.set_id("nea-nameplates");
        root.set_attribute(
            "style",
            "position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:20",
        )?;
        document
            .document_element()
            .ok_or_else(|| JsValue::from_str("document has no root element"))?
            .append_child(&root)?;
        Ok(Self {
            document: document.clone(),
            root,
            labels: HashMap::new(),
        })
    }

    pub fn update(
        &mut self,
        entries: &[NameplateEntry<'_>],
        view_projection: [f32; 16],
        width: u32,
        height: u32,
    ) -> Result<(), JsValue> {
        let matrix = glam::Mat4::from_cols_array(&view_projection);
        let live: HashSet<u64> = entries.iter().map(|entry| entry.id).collect();
        self.labels.retain(|id, label| {
            if live.contains(id) {
                true
            } else {
                label.remove();
                false
            }
        });
        for entry in entries {
            let label = self.ensure_label(entry.id)?;
            label.set_text_content(Some(entry.name));
            let clip =
                matrix * glam::Vec4::new(entry.world[0], entry.world[1], entry.world[2], 1.0);
            if clip.w <= 0.0 {
                label.set_attribute("style", "display:none")?;
                continue;
            }
            let ndc = clip.truncate() / clip.w;
            if ndc.x.abs() > 1.1 || ndc.y.abs() > 1.1 || !(0.0..=1.0).contains(&ndc.z) {
                label.set_attribute("style", "display:none")?;
                continue;
            }
            let x = (ndc.x * 0.5 + 0.5) * width as f32;
            let y = (0.5 - ndc.y * 0.5) * height as f32;
            label.set_attribute(
                "style",
                &format!(
                    "position:absolute;display:block;left:{x:.1}px;top:{y:.1}px;transform:translate(-50%,-100%);color:white;font:600 14px Arial,sans-serif;text-shadow:0 1px 2px black,0 0 3px black;white-space:nowrap"
                ),
            )?;
        }
        Ok(())
    }

    fn ensure_label(&mut self, id: u64) -> Result<Element, JsValue> {
        if let Some(label) = self.labels.get(&id) {
            return Ok(label.clone());
        }
        let label = self.document.create_element("div")?;
        self.root.append_child(&label)?;
        self.labels.insert(id, label.clone());
        Ok(label)
    }
}

impl Drop for NameplateOverlay {
    fn drop(&mut self) {
        self.root.remove();
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn center_projection_maps_to_viewport_center() {
        let clip = glam::Mat4::IDENTITY * glam::Vec4::new(0.0, 0.0, 0.5, 1.0);
        let ndc = clip.truncate() / clip.w;
        let x = (ndc.x * 0.5 + 0.5) * 1920.0;
        let y = (0.5 - ndc.y * 0.5) * 1080.0;
        assert_eq!([x, y], [960.0, 540.0]);
    }
}
