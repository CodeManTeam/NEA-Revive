use std::collections::{HashMap, HashSet};

use wasm_bindgen::JsValue;
use web_sys::{Document, Element};

#[derive(Clone, Copy)]
struct HealthState {
    hp: f32,
    max_hp: f32,
    visible: bool,
    last_damage: f32,
    effect_until_ms: f64,
    died: bool,
}

pub struct DamageOverlay {
    document: Document,
    root: Element,
    states: HashMap<u32, HealthState>,
    labels: HashMap<u32, Element>,
}

impl DamageOverlay {
    pub fn new(document: &Document) -> Result<Self, JsValue> {
        if let Some(previous) = document.get_element_by_id("nea-entity-health") {
            previous.remove();
        }
        let root = document.create_element("div")?;
        root.set_id("nea-entity-health");
        root.set_attribute(
            "style",
            "position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:21",
        )?;
        document
            .document_element()
            .ok_or_else(|| JsValue::from_str("document has no root element"))?
            .append_child(&root)?;
        Ok(Self {
            document: document.clone(),
            root,
            states: HashMap::new(),
            labels: HashMap::new(),
        })
    }

    pub fn apply_event(&mut self, event: &serde_json::Value, now_ms: f64) {
        if event.get("type").and_then(serde_json::Value::as_str) != Some("nea-revive:damage-state")
        {
            return;
        }
        let Some(id) = event
            .pointer("/target/entityId")
            .and_then(serde_json::Value::as_u64)
        else {
            return;
        };
        let hp = event
            .pointer("/state/hp")
            .and_then(serde_json::Value::as_f64)
            .unwrap_or(100.0) as f32;
        let max_hp = event
            .pointer("/state/maxHp")
            .and_then(serde_json::Value::as_f64)
            .unwrap_or(100.0)
            .max(1.0) as f32;
        let last_damage = event
            .pointer("/events/hurt")
            .and_then(serde_json::Value::as_f64)
            .unwrap_or(0.0) as f32;
        let died = event
            .pointer("/events/die")
            .and_then(serde_json::Value::as_bool)
            .unwrap_or(false);
        self.states.insert(
            id as u32,
            HealthState {
                hp,
                max_hp,
                visible: event
                    .pointer("/state/showHealthBar")
                    .and_then(serde_json::Value::as_bool)
                    .unwrap_or(true),
                last_damage,
                effect_until_ms: now_ms
                    + if died {
                        1200.0
                    } else if last_damage > 0.0 {
                        900.0
                    } else {
                        0.0
                    },
                died,
            },
        );
    }

    pub fn update(
        &mut self,
        bodies: &[voxweb_protocol::netstate::RigidBody],
        view_projection: [f32; 16],
        width: u32,
        height: u32,
        now_ms: f64,
    ) -> Result<(), JsValue> {
        let matrix = glam::Mat4::from_cols_array(&view_projection);
        let live: HashSet<u32> = self.states.keys().copied().collect();
        self.labels.retain(|id, label| {
            if live.contains(id) {
                true
            } else {
                label.remove();
                false
            }
        });
        let states: Vec<(u32, HealthState)> = self
            .states
            .iter()
            .map(|(&id, &state)| (id, state))
            .collect();
        for (id, state) in states {
            let Some(body) = bodies.iter().find(|body| body.id == id) else {
                continue;
            };
            let label = self.ensure_label(id)?;
            let clip = matrix * glam::Vec4::new(body.px, body.py + body.hsy + 0.7, body.pz, 1.0);
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
            let ratio = (state.hp / state.max_hp).clamp(0.0, 1.0);
            let color = if ratio > 0.5 {
                "#55c878"
            } else if ratio > 0.2 {
                "#e2ad45"
            } else {
                "#dc4656"
            };
            // Historical Player renders the positive hurt amount above the
            // entity; the sign is conveyed by the red damage styling.
            let damage = if now_ms < state.effect_until_ms && state.last_damage > 0.0 {
                format!(
                    "<b style=\"position:absolute;left:50%;bottom:19px;transform:translateX(-50%);color:#ff5968;font:700 19px Arial;text-shadow:0 1px 2px #350000\">{:.0}</b>",
                    state.last_damage
                )
            } else {
                String::new()
            };
            let opacity = if state.died && now_ms < state.effect_until_ms {
                ((state.effect_until_ms - now_ms) / 1200.0).clamp(0.0, 1.0)
            } else {
                1.0
            };
            label.set_inner_html(&format!("{damage}<div style=\"display:{};width:76px;height:7px;background:rgba(0,0,0,.7);border:1px solid rgba(255,255,255,.65)\"><i style=\"display:block;width:{:.1}%;height:100%;background:{color}\"></i></div>", if state.visible { "block" } else { "none" }, ratio * 100.0));
            label.set_attribute("style", &format!("position:absolute;display:block;left:{x:.1}px;top:{y:.1}px;transform:translate(-50%,-100%);opacity:{opacity:.3}"))?;
        }
        Ok(())
    }

    fn ensure_label(&mut self, id: u32) -> Result<Element, JsValue> {
        if let Some(label) = self.labels.get(&id) {
            return Ok(label.clone());
        }
        let label = self.document.create_element("div")?;
        self.root.append_child(&label)?;
        self.labels.insert(id, label.clone());
        Ok(label)
    }
}

impl Drop for DamageOverlay {
    fn drop(&mut self) {
        self.root.remove();
    }
}
