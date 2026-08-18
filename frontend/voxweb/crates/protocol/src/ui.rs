//! Historical Player retained UI and script-facing protocol state.
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use crate::Value;

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct UiCoord2 { pub offset: [f32;2], pub ratio: [f32;2] }
#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct UiCommon { pub anchor:[f32;2], pub position:UiCoord2, pub size:UiCoord2, pub auto_resize:u8, pub visible:bool, pub background_color:[u8;3], pub background_opacity:f32, pub z_index:u32, pub layout_order:u32, pub clips_descendants:bool }
#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct UiScreen { pub enable:bool, pub z_index:u32 }
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum UiElement { Box{common:UiCommon,rotation:f32}, Image{common:UiCommon,image:String,image_opacity:f32,image_display_mode:u8,rotation:f32}, Text{common:UiCommon,text:String,font_size:u8,color:[u8;3],opacity:f32,rotation:f32}, Input{common:UiCommon,text:String,placeholder:String,rotation:f32}, ScrollBox{common:UiCommon,scroll_direction:u8,scroll_position:[f32;2],rotation:f32} }
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum UiNodeValue { Screen(UiScreen), Element(UiElement) }
#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct UiNode { pub id:String, pub node_type:u32, pub name:String, pub parent_id:String, pub children_ids:Vec<String>, pub value:Option<UiNodeValue> }
#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct PictureAsset { pub metadata_hash:String, pub hash:String, pub width:i32, pub height:i32 }
#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct GameUiState { pub running:bool, pub nodes:BTreeMap<String,UiNode>, pub picture_assets:BTreeMap<String,PictureAsset>, pub default_screen_id:String }
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum DialogConfig { Text{has_arrow:bool,content:String,title:String}, Input{content:String,title:String,confirm_text:String,placeholder:String}, Select{content:String,title:String,options:Vec<String>} }
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct DialogOpen { pub rpc_id:u32, pub config:DialogConfig }
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum DialogResult { Close, Text(String), Input(String), Select{index:u32,value:String} }
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct DialogClose { pub rpc_id:u32, pub result:DialogResult }
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum GuiCommand { Init{handle:u32,data:String}, Append{handle:u32,data:String,selector:String}, Remove{handle:u32,selector:String}, Show{handle:u32,allow_multiple:bool,name:String}, GetAttribute{handle:u32,name:String,selector:String}, SetAttribute{handle:u32,name:String,selector:String,value:String}, Reset }

pub fn decode_dialog_open(value: &Value) -> Option<DialogOpen> {
    let Value::Struct(fields) = value else { return None };
    let rpc_id = fields.first().and_then(value_u32)?;
    let Value::Union { type_index, data } = fields.get(1)? else { return None };
    let Value::Struct(parts) = data.as_ref() else { return None };
    let content = parts.iter().find_map(value_string).unwrap_or_default();
    let title = parts.iter().skip(1).find_map(value_string).unwrap_or_default();
    let config = match *type_index {
        0 => DialogConfig::Input { content, title, confirm_text: parts.iter().rev().find_map(value_string).unwrap_or_else(|| "确定".into()), placeholder: parts.iter().rev().nth(1).and_then(value_string).unwrap_or_default() },
        1 => DialogConfig::Select { content, title, options: parts.iter().find_map(|v| match v { Value::Array(items) => Some(items.iter().filter_map(value_string).collect()), _ => None }).unwrap_or_default() },
        _ => DialogConfig::Text { has_arrow: parts.iter().any(|v| matches!(v, Value::Bool(true))), content, title },
    };
    Some(DialogOpen { rpc_id, config })
}

pub fn decode_gui_command(name: &str, value: &Value) -> Option<serde_json::Value> {
    let fields = match value { Value::Struct(fields) => fields, Value::Void => return Some(serde_json::json!({"operation":"reset"})), _ => return None };
    let u = |i: usize| fields.get(i).and_then(value_u32).unwrap_or_default();
    let s = |i: usize| fields.get(i).and_then(value_string).unwrap_or_default();
    let command = match name {
        "init" => serde_json::json!({"operation":"init","handle":u(0),"data":s(1)}),
        "append" => serde_json::json!({"operation":"append","handle":u(0),"data":s(1),"selector":s(2)}),
        "remove" => serde_json::json!({"operation":"remove","handle":u(0),"selector":s(1)}),
        "show" => serde_json::json!({"operation":"show","handle":u(0),"allowMultiple":matches!(fields.get(1),Some(Value::Bool(true))),"name":s(2)}),
        "getAttribute" => serde_json::json!({"operation":"getAttribute","handle":u(0),"name":s(1),"selector":s(2)}),
        "setAttribute" => serde_json::json!({"operation":"setAttribute","handle":u(0),"name":s(1),"selector":s(2),"value":s(3)}),
        "reset" => serde_json::json!({"operation":"reset"}),
        _ => return None,
    };
    Some(command)
}

pub fn encode_runtime_outbound(table: &crate::ProtocolTable, event: &serde_json::Value) -> Result<Option<Vec<u8>>, String> {
    let kind = event.get("type").and_then(serde_json::Value::as_str).unwrap_or_default();
    if kind == "gui" {
        let name = event.get("name").and_then(serde_json::Value::as_str).unwrap_or_default();
        let handle = event.get("handle").and_then(serde_json::Value::as_u64).unwrap_or_default() as u32;
        let payload = match name {
            "return" => Value::Struct(vec![Value::Varint(handle), Value::UTF8(event.get("value").and_then(serde_json::Value::as_str).unwrap_or_default().into())]),
            "throw" => Value::Struct(vec![Value::Varint(handle), Value::UTF8(event.get("message").and_then(serde_json::Value::as_str).unwrap_or_default().into())]),
            "sendMessage" => Value::Struct(vec![Value::UTF8(event.get("name").and_then(serde_json::Value::as_str).unwrap_or_default().into()), Value::UTF8(event.get("payload").and_then(serde_json::Value::as_str).unwrap_or_default().into())]),
            _ => return Ok(None),
        };
        return table.encode_server_message("gui", name, &payload).map(Some);
    }
    if kind == "dialog" && event.get("name").and_then(serde_json::Value::as_str) == Some("close") {
        let rpc_id = event.get("rpcId").and_then(serde_json::Value::as_u64).unwrap_or_default() as u32;
        let result = event.get("result").cloned().unwrap_or_else(|| serde_json::json!({"type":"close"}));
        let tag = result.get("type").and_then(serde_json::Value::as_str).unwrap_or("close");
        let union = match tag {
            "text" => Value::Union { type_index: 3, data: Box::new(Value::UTF8(result.get("value").and_then(serde_json::Value::as_str).unwrap_or_default().into())) },
            "input" => Value::Union { type_index: 1, data: Box::new(Value::UTF8(result.get("value").and_then(serde_json::Value::as_str).unwrap_or_default().into())) },
            "select" => Value::Union { type_index: 2, data: Box::new(Value::Struct(vec![Value::Varint(result.get("index").and_then(serde_json::Value::as_u64).unwrap_or_default() as u32), Value::UTF8(result.get("value").and_then(serde_json::Value::as_str).unwrap_or_default().into())])) },
            _ => Value::Union { type_index: 0, data: Box::new(Value::Void) },
        };
        return table.encode_server_message("dialog", "close", &Value::Struct(vec![Value::Varint(rpc_id), union])).map(Some);
    }
    Ok(None)
}

/// Decode the stable outer shape of the gameUI reset message.
pub fn decode_game_ui_reset(value: &Value) -> Option<GameUiState> {
    let Value::Struct(fields) = value else { return None };
    let running = matches!(fields.first(), Some(Value::Bool(true)));
    let mut nodes = BTreeMap::new();
    if let Some(Value::Dictionary(entries)) = fields.get(1) {
        for (key, value) in entries {
            if let Some(node) = decode_ui_node(value) { nodes.insert(key.clone(), node); }
        }
    }
    let mut picture_assets = BTreeMap::new();
    if let Some(Value::Dictionary(entries)) = fields.get(2) {
        for (key, value) in entries {
            if let Some(asset) = decode_picture_asset(value) { picture_assets.insert(key.clone(), asset); }
        }
    }
    let default_screen_id = fields.get(3).and_then(value_string).unwrap_or_default();
    Some(GameUiState { running, nodes, picture_assets, default_screen_id })
}

fn value_string(value: &Value) -> Option<String> {
    match value { Value::UTF8(v) | Value::ASCII(v) | Value::FixedASCII(v) => Some(v.clone()), _ => None }
}
fn decode_ui_node(value: &Value) -> Option<UiNode> {
    let Value::Struct(fields) = value else { return None };
    let id = fields.first().and_then(value_string).unwrap_or_default();
    let node_type = fields.get(1).and_then(|v| match v { Value::Varint(x) => Some(*x), Value::U32(x) => Some(*x), _ => None }).unwrap_or_default();
    let name = fields.get(2).and_then(value_string).unwrap_or_default();
    let parent_id = fields.get(3).and_then(value_string).unwrap_or_default();
    let children_ids = match fields.get(4) { Some(Value::Array(items)) => items.iter().filter_map(value_string).collect(), _ => Vec::new() };
    let node_value = fields.get(5).and_then(decode_node_value);
    Some(UiNode { id, node_type, name, parent_id, children_ids, value: node_value })
}

fn decode_node_value(value: &Value) -> Option<UiNodeValue> {
    let Value::Option(Some(inner)) = value else { return None };
    let Value::Union { type_index, data } = inner.as_ref() else { return None };
    if *type_index == 0 {
        let Value::Struct(fields) = data.as_ref() else { return None };
        return Some(UiNodeValue::Screen(UiScreen {
            enable: matches!(fields.first(), Some(Value::Bool(true))),
            z_index: fields.get(2).and_then(value_u32).unwrap_or_default(),
        }));
    }
    let Value::Union { type_index: element_type, data: element_data } = data.as_ref() else { return None };
    let Value::Struct(fields) = element_data.as_ref() else { return None };
    let common = decode_common(fields)?;
    let value = match *element_type {
        0 => UiElement::Box { common, rotation: fields.get(12).and_then(value_f32).unwrap_or_default() },
        1 => UiElement::Image { common, image: fields.get(12).and_then(value_string).unwrap_or_default(), image_opacity: fields.get(13).and_then(value_f32).unwrap_or(1.0), image_display_mode: fields.get(14).and_then(value_u8).unwrap_or_default(), rotation: fields.get(15).and_then(value_f32).unwrap_or_default() },
        2 => UiElement::Input { common, text: fields.get(12).and_then(value_string).unwrap_or_default(), placeholder: fields.get(20).and_then(value_string).unwrap_or_default(), rotation: fields.get(29).and_then(value_f32).unwrap_or_default() },
        3 => UiElement::ScrollBox { common, scroll_direction: fields.get(12).and_then(value_u8).unwrap_or_default(), scroll_position: fields.get(20).and_then(value_vec2).unwrap_or_default(), rotation: fields.get(21).and_then(value_f32).unwrap_or_default() },
        4 => UiElement::Text { common, text: fields.get(12).and_then(value_string).unwrap_or_default(), font_size: fields.get(13).and_then(value_u8).unwrap_or_default(), color: fields.get(14).and_then(value_rgb).unwrap_or_default(), opacity: fields.get(15).and_then(value_f32).unwrap_or(1.0), rotation: fields.get(24).and_then(value_f32).unwrap_or_default() },
        _ => return None,
    };
    Some(UiNodeValue::Element(value))
}

fn decode_common(fields: &[Value]) -> Option<UiCommon> {
    Some(UiCommon {
        anchor: fields.first().and_then(value_vec2).unwrap_or_default(),
        position: UiCoord2 { offset: fields.get(1).and_then(value_struct_vec2_0).unwrap_or_default(), ratio: fields.get(1).and_then(value_struct_vec2_1).unwrap_or_default() },
        size: UiCoord2 { offset: fields.get(2).and_then(value_struct_vec2_0).unwrap_or_default(), ratio: fields.get(2).and_then(value_struct_vec2_1).unwrap_or_default() },
        auto_resize: fields.get(3).and_then(value_u8).unwrap_or_default(),
        visible: matches!(fields.get(4), Some(Value::Bool(true))),
        background_color: fields.get(5).and_then(value_rgb).unwrap_or([255,255,255]),
        background_opacity: fields.get(6).and_then(value_f32).unwrap_or(1.0),
        z_index: fields.get(7).and_then(value_u32).unwrap_or_default(),
        layout_order: fields.get(8).and_then(value_u32).unwrap_or_default(),
        clips_descendants: matches!(fields.get(11), Some(Value::Bool(true))),
    })
}
fn decode_picture_asset(value: &Value) -> Option<PictureAsset> {
    let Value::Struct(fields) = value else { return None };
    Some(PictureAsset {
        metadata_hash: fields.first().and_then(value_string).unwrap_or_default(),
        hash: fields.get(1).and_then(value_string).unwrap_or_default(),
        width: fields.get(2).and_then(|v| match v { Value::I32(x) => Some(*x), Value::U32(x) => Some(*x as i32), _ => None }).unwrap_or_default(),
        height: fields.get(3).and_then(|v| match v { Value::I32(x) => Some(*x), Value::U32(x) => Some(*x as i32), _ => None }).unwrap_or_default(),
    })
}

fn value_u8(v: &Value) -> Option<u8> { match v { Value::U8(x) => Some(*x), Value::U32(x) => Some(*x as u8), Value::Varint(x) => Some(*x as u8), _ => None } }
fn value_u32(v: &Value) -> Option<u32> { match v { Value::U32(x) => Some(*x), Value::Varint(x) => Some(*x), Value::U8(x) => Some(*x as u32), _ => None } }
fn value_f32(v: &Value) -> Option<f32> { match v { Value::F32(x) => Some(*x), Value::F64(x) => Some(*x as f32), Value::Quantized(x) => Some(*x), _ => None } }
fn value_vec2(v: &Value) -> Option<[f32;2]> { match v { Value::QuantizedVec(x) if x.len() >= 2 => Some([x[0],x[1]]), Value::Vector(x) if x.len() >= 2 => Some([x[0],x[1]]), _ => None } }
fn value_rgb(v: &Value) -> Option<[u8;3]> { match v { Value::QuantizedVec(x) if x.len() >= 3 => Some([x[0] as u8,x[1] as u8,x[2] as u8]), Value::Vector(x) if x.len() >= 3 => Some([x[0] as u8,x[1] as u8,x[2] as u8]), _ => None } }
fn value_struct_vec2_0(v: &Value) -> Option<[f32;2]> { match v { Value::Struct(f) => f.first().and_then(value_vec2), _ => None } }
fn value_struct_vec2_1(v: &Value) -> Option<[f32;2]> { match v { Value::Struct(f) => f.get(1).and_then(value_vec2), _ => None } }

#[cfg(test)] mod tests {
    use super::*;
    #[test] fn ui_state_json_roundtrip(){ let state=GameUiState::default(); assert_eq!(serde_json::from_str::<GameUiState>(&serde_json::to_string(&state).unwrap()).unwrap(),state); }
    #[test] fn decode_reset_keeps_graph_and_assets() {
        let node = Value::Struct(vec![Value::ASCII("n".into()), Value::Varint(2), Value::UTF8("screen".into()), Value::ASCII("ROOT_ID".into()), Value::Array(vec![])]);
        let asset = Value::Struct(vec![Value::ASCII("meta".into()), Value::ASCII("hash".into()), Value::I32(10), Value::I32(20)]);
        let value = Value::Struct(vec![Value::Bool(true), Value::Dictionary(vec![("n".into(), node)]), Value::Dictionary(vec![("p".into(), asset)]), Value::UTF8("n".into())]);
        let state = decode_game_ui_reset(&value).unwrap();
        assert!(state.running); assert_eq!(state.nodes["n"].name, "screen"); assert_eq!(state.picture_assets["p"].width, 10);
    }
}
