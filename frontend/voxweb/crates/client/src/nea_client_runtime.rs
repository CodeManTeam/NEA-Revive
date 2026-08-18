use js_sys::{Function, Reflect};
use wasm_bindgen::{JsCast, JsValue};

pub fn install_modules(modules: &serde_json::Value) -> Result<(), String> {
    call("__neaClientRuntimeInstall", &modules.to_string()).map(|_| ())
}

pub fn receive_event(event: &serde_json::Value) -> Result<(), String> {
    call("__neaClientRuntimeReceive", &event.to_string()).map(|_| ())
}

pub fn drain_events() -> Result<Vec<serde_json::Value>, String> {
    let value = call("__neaClientRuntimeDrain", "")?;
    let json = value
        .as_string()
        .ok_or("Client Runtime drain result must be a string")?;
    serde_json::from_str(&json).map_err(|error| format!("Client Runtime drain JSON: {error}"))
}

fn call(name: &str, argument: &str) -> Result<JsValue, String> {
    let window = web_sys::window().ok_or("Window is unavailable")?;
    let value = Reflect::get(&window, &JsValue::from_str(name))
        .map_err(|_| format!("Client Runtime function {name} is unavailable"))?;
    let function: Function = value
        .dyn_into()
        .map_err(|_| format!("Client Runtime function {name} is invalid"))?;
    function
        .call1(&window, &JsValue::from_str(argument))
        .map_err(|error| format!("Client Runtime {name} failed: {error:?}"))
}
