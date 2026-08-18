use std::collections::BTreeMap;
use voxweb_protocol::{GameUiState, UiElement, UiNodeValue};
use wasm_bindgen::{closure::Closure, JsCast, JsValue};
use web_sys::{Document, Element};

#[derive(Clone, Debug, PartialEq)]
pub struct UiRect { pub x:f32, pub y:f32, pub width:f32, pub height:f32, pub z:u32 }

#[derive(Default)]
pub struct HistoricalUi { pub state: GameUiState, pub layout: BTreeMap<String, UiRect> }

impl HistoricalUi {
    pub fn replace(&mut self, state: GameUiState, viewport: [f32;2]) {
        self.state = state;
        self.layout.clear();
        let roots: Vec<String> = self.state.nodes.values().filter(|n| n.parent_id.is_empty() || !self.state.nodes.contains_key(&n.parent_id)).map(|n| n.id.clone()).collect();
        for id in roots { self.layout_node(&id, None, viewport); }
    }
    fn layout_node(&mut self, id:&str, parent:Option<UiRect>, viewport:[f32;2]) {
        let Some(node)=self.state.nodes.get(id).cloned() else { return };
        let rect = match node.value.as_ref() {
            Some(UiNodeValue::Element(element)) => {
                let common = match element { UiElement::Box{common,..}|UiElement::Image{common,..}|UiElement::Text{common,..}|UiElement::Input{common,..}|UiElement::ScrollBox{common,..} => common };
                let base = parent.unwrap_or(UiRect{x:0.0,y:0.0,width:viewport[0],height:viewport[1],z:0});
                let x = base.x + common.position.offset[0] + base.width * common.position.ratio[0] + base.width * common.anchor[0];
                let y = base.y + common.position.offset[1] + base.height * common.position.ratio[1] + base.height * common.anchor[1];
                UiRect{x,y,width:common.size.offset[0]+base.width*common.size.ratio[0],height:common.size.offset[1]+base.height*common.size.ratio[1],z:common.z_index}
            }
            Some(UiNodeValue::Screen(screen)) => UiRect{x:0.0,y:0.0,width:viewport[0],height:viewport[1],z:screen.z_index},
            None => parent.unwrap_or(UiRect{x:0.0,y:0.0,width:viewport[0],height:viewport[1],z:0}),
        };
        self.layout.insert(id.to_string(), rect.clone());
        for child in node.children_ids { self.layout_node(&child, Some(rect.clone()), viewport); }
    }

    pub fn render_dom(&self, document: &Document) -> Result<(), JsValue> {
        let root = if let Some(existing) = document.get_element_by_id("nea-historical-ui") {
            existing
        } else {
            let element = document.create_element("div")?;
            element.set_id("nea-historical-ui");
            element.set_attribute("style", "position:fixed;inset:0;z-index:21;pointer-events:none;overflow:hidden")?;
            document.body().ok_or_else(|| JsValue::from_str("document has no body"))?.append_child(&element)?;
            element
        };
        root.set_inner_html("");
        for (id, node) in &self.state.nodes {
            let Some(rect) = self.layout.get(id) else { continue };
            let Some(UiNodeValue::Element(element)) = node.value.as_ref() else { continue };
            let dom = match element {
                UiElement::Box { common, .. } => {
                    let e = document.create_element("div")?;
                    e.set_attribute("style", &format!("position:absolute;left:{}px;top:{}px;width:{}px;height:{}px;background:rgba({},{},{},{}) ;z-index:{};pointer-events:none", rect.x, rect.y, rect.width, rect.height, common.background_color[0], common.background_color[1], common.background_color[2], common.background_opacity, rect.z))?;
                    e
                }
                UiElement::Text { text, font_size, color, opacity, .. } => {
                    let e = document.create_element("div")?;
                    e.set_text_content(Some(text));
                    e.set_attribute("style", &format!("position:absolute;left:{}px;top:{}px;width:{}px;height:{}px;color:rgb({},{},{});opacity:{};font-size:{}px;line-height:1.2;white-space:pre-wrap;overflow:hidden;pointer-events:none;z-index:{}", rect.x, rect.y, rect.width, rect.height, color[0], color[1], color[2], opacity, font_size, rect.z))?;
                    e
                }
                UiElement::Image { common, image, image_opacity, image_display_mode, .. } => {
                    let e = document.create_element("img")?;
                    let url = self.state.picture_assets.get(image).map(|asset| format!("/engine/m/{}", asset.hash)).unwrap_or_default();
                    if !url.is_empty() { e.set_attribute("src", &url)?; }
                    let fit = match image_display_mode { 1 => "contain", 2 => "cover", _ => "fill" };
                    e.set_attribute("style", &format!("position:absolute;left:{}px;top:{}px;width:{}px;height:{}px;opacity:{};object-fit:{};pointer-events:none;z-index:{}", rect.x, rect.y, rect.width, rect.height, image_opacity, fit, rect.z))?;
                    e
                }
                UiElement::Input { text, placeholder, .. } => {
                    let e = document.create_element("input")?;
                    e.set_attribute("type", "text")?;
                    e.set_attribute("value", text)?;
                    e.set_attribute("placeholder", placeholder)?;
                    e.set_attribute("style", &format!("position:absolute;left:{}px;top:{}px;width:{}px;height:{}px;pointer-events:auto;z-index:{}", rect.x, rect.y, rect.width, rect.height, rect.z))?;
                    attach_ui_event(&e, id, "input")?;
                    e
                }
                UiElement::ScrollBox { .. } => {
                    let e = document.create_element("div")?;
                    e.set_attribute("style", &format!("position:absolute;left:{}px;top:{}px;width:{}px;height:{}px;overflow:auto;pointer-events:auto;z-index:{}", rect.x, rect.y, rect.width, rect.height, rect.z))?;
                    attach_ui_event(&e, id, "scroll")?;
                    e
                }
            };
            dom.set_attribute("data-ui-node", id)?;
            if !matches!(element, UiElement::Input { .. } | UiElement::ScrollBox { .. }) {
                attach_ui_event(&dom, id, "click")?;
            }
            root.append_child(&dom)?;
        }
        Ok(())
    }
}

fn attach_ui_event(element: &Element, node_id: &str, kind: &str) -> Result<(), JsValue> {
    let id = node_id.to_string();
    let event_kind = kind.to_string();
    let closure = Closure::wrap(Box::new(move |event: web_sys::Event| {
        let detail = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&detail, &JsValue::from_str("nodeId"), &JsValue::from_str(&id));
        let _ = js_sys::Reflect::set(&detail, &JsValue::from_str("kind"), &JsValue::from_str(&event_kind));
        if let Some(input) = event.target().and_then(|target| target.dyn_into::<Element>().ok()) {
            let value = js_sys::Reflect::get(&input, &JsValue::from_str("value")).unwrap_or(JsValue::UNDEFINED);
            let _ = js_sys::Reflect::set(&detail, &JsValue::from_str("value"), &value);
            let scroll_top = js_sys::Reflect::get(&input, &JsValue::from_str("scrollTop")).unwrap_or(JsValue::UNDEFINED);
            let scroll_left = js_sys::Reflect::get(&input, &JsValue::from_str("scrollLeft")).unwrap_or(JsValue::UNDEFINED);
            let _ = js_sys::Reflect::set(&detail, &JsValue::from_str("scrollTop"), &scroll_top);
            let _ = js_sys::Reflect::set(&detail, &JsValue::from_str("scrollLeft"), &scroll_left);
        }
        if let Some(window) = web_sys::window() {
            let _ = js_sys::Reflect::set(&window, &JsValue::from_str("__NEA_HISTORICAL_UI_EVENT"), &detail);
            if let Ok(event) = web_sys::Event::new("nea-historical-ui-event") {
                let _ = window.dispatch_event(&event);
            }
        }
    }) as Box<dyn FnMut(_)>);
    element.add_event_listener_with_callback(kind, closure.as_ref().unchecked_ref())?;
    closure.forget();
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use voxweb_protocol::{UiCommon, UiCoord2};
    #[test]
    fn layout_resolves_offset_and_ratio() {
        let common=UiCommon{position:UiCoord2{offset:[10.0,20.0],ratio:[0.25,0.5]},size:UiCoord2{offset:[100.0,40.0],ratio:[0.0,0.0]},..Default::default()};
        let mut state=GameUiState::default();
        state.nodes.insert("root".into(), voxweb_protocol::UiNode{id:"root".into(),children_ids:vec!["box".into()],..Default::default()});
        state.nodes.insert("box".into(), voxweb_protocol::UiNode{id:"box".into(),parent_id:"root".into(),value:Some(UiNodeValue::Element(UiElement::Box{common,rotation:0.0})),..Default::default()});
        let mut ui=HistoricalUi::default(); ui.replace(state,[800.0,600.0]);
        assert_eq!(ui.layout["box"].x,210.0); assert_eq!(ui.layout["box"].y,320.0);
    }
}
