//! NEA 加载界面 — 全屏遮罩 + 状态文本 + 进度条。
//!
//! 在会话建立、WebGPU 初始化、资源加载、socket 连接、地形请求等阶段
//! 显示当前正在做什么，地形首帧渲染完成后淡出移除。

use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use web_sys::{Document, Element};

pub struct LoadingOverlay {
    root: Element,
    status: Element,
    bar_fill: Element,
    progress_text: Element,
    finished: bool,
}

impl LoadingOverlay {
    pub fn new(document: &Document) -> Result<Self, JsValue> {
        if let Some(previous) = document.get_element_by_id("nea-loading") {
            previous.remove();
        }
        let root = document.create_element("div")?;
        root.set_id("nea-loading");
        root.set_attribute(
            "style",
            "position:fixed;inset:0;z-index:100;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:linear-gradient(180deg,#0b0e1a 0%,#12182a 55%,#0e1424 100%);font-family:'Segoe UI',Arial,sans-serif;color:#dfe7ff;transition:opacity .45s ease;",
        )?;

        let title = document.create_element("div")?;
        title.set_text_content(Some("NEA 世界加载中"));
        title.set_attribute(
            "style",
            "font-size:26px;font-weight:700;letter-spacing:2px;text-shadow:0 2px 10px rgba(90,140,255,.35)",
        )?;
        root.append_child(&title)?;

        let status = document.create_element("div")?;
        status.set_text_content(Some("正在连接服务器…"));
        status.set_attribute("style", "font-size:15px;opacity:.9;min-height:22px")?;
        root.append_child(&status)?;

        let bar_track = document.create_element("div")?;
        bar_track.set_attribute(
            "style",
            "width:min(420px,72vw);height:8px;border-radius:6px;background:rgba(255,255,255,.12);overflow:hidden",
        )?;
        let bar_fill = document.create_element("div")?;
        bar_fill.set_attribute(
            "style",
            "width:0%;height:100%;border-radius:6px;background:linear-gradient(90deg,#4f7cff,#7ce0ff);transition:width .3s ease",
        )?;
        bar_track.append_child(&bar_fill)?;
        root.append_child(&bar_track)?;

        let progress_text = document.create_element("div")?;
        progress_text.set_text_content(Some("0%"));
        progress_text.set_attribute(
            "style",
            "font-size:12px;opacity:.65;font-variant-numeric:tabular-nums",
        )?;
        root.append_child(&progress_text)?;

        document
            .document_element()
            .ok_or_else(|| JsValue::from_str("document has no root element"))?
            .append_child(&root)?;

        Ok(Self {
            root,
            status,
            bar_fill,
            progress_text,
            finished: false,
        })
    }

    /// 更新当前阶段状态文本（如“正在请求地形区块 12/25”）。
    pub fn set_status(&self, text: &str) {
        let _ = self.status.set_text_content(Some(text));
    }

    /// 设置进度百分比（0.0..=1.0）。
    pub fn set_progress(&self, fraction: f32) {
        let clamped = fraction.clamp(0.0, 1.0);
        let percent = (clamped * 100.0).round() as u32;
        let _ = self.bar_fill.set_attribute("style", &format!(
            "width:{percent}%;height:100%;border-radius:6px;background:linear-gradient(90deg,#4f7cff,#7ce0ff);transition:width .3s ease"
        ));
        let _ = self
            .progress_text
            .set_text_content(Some(&format!("{percent}%")));
    }

    /// 完成加载：淡出并移除遮罩（释放游戏画面）。
    pub fn finish(&mut self) {
        if self.finished {
            return;
        }
        self.finished = true;
        let root = self.root.clone();
        let _ = root.set_attribute("style", &format!(
            "{}{}",
            "position:fixed;inset:0;z-index:100;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:linear-gradient(180deg,#0b0e1a 0%,#12182a 55%,#0e1424 100%);font-family:'Segoe UI',Arial,sans-serif;color:#dfe7ff;",
            "opacity:0;pointer-events:none;"
        ));
        // 动画结束后从 DOM 移除
        let window = web_sys::window();
        if let Some(win) = window {
            let _ = win.set_timeout_with_callback_and_timeout_and_arguments_0(
                &wasm_bindgen::closure::Closure::once_into_js(move || {
                    let _ = root.remove();
                })
                .as_ref()
                .unchecked_ref(),
                500,
            );
        }
    }
}
