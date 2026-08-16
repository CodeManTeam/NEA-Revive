//! VW-003 Step 7: NEA session + rendering smoke — connects to a box3-server,
//! drives the full startup chain, downloads the real atlas, fetches the
//! player's chunk, and renders the terrain on the #game canvas with WebGPU.
//!
//! Activated by `?nea=<createSessionUrl>` on the page; the default game
//! path is untouched.

use std::cell::RefCell;
use std::collections::HashMap;
use std::rc::Rc;
use std::sync::OnceLock;

use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::JsFuture;
use web_sys::{HtmlCanvasElement, Request, RequestInit, Response};

use voxweb_protocol::Value;
use voxweb_protocol::atlas::AtlasImage;
use voxweb_protocol::browser::{BrowserSockets, SessionEvent, socket_url_with_sid};
use voxweb_protocol::driver::{SessionDriver, SessionStage};
use voxweb_protocol::protocol::ProtocolTable;
use voxweb_protocol::terrain::{CollisionBox, boxes_to_cells};
use voxweb_render::avatar_pipeline::{AvatarInstance, NeaAvatarRenderer};
use voxweb_render::device::{configure_surface, init_device};
use voxweb_render::nea_alpha::NeaAlphaPipeline;
use voxweb_render::nea_atlas::{AtlasSampling, AtlasTexture};
use voxweb_render::nea_fluid::NeaFluidPipeline;
use voxweb_render::nea_mesh::{FLOATS_PER_VERTEX, MeshBuffers};
use voxweb_render::nea_pipeline::NeaTerrainPipeline;
use voxweb_render::passes::skybox::{SkyboxGlobals, SkyboxPass};

use crate::asset_overrides::AssetOverrides;
use crate::nea_eye_ambient::{EyeAmbientSampler, EyeExposure, RECOVERED_INITIAL_EXPOSURE};
use crate::nea_loading::LoadingOverlay;
use voxweb_physics::NeaPlayerPhysics;
use crate::nea_prediction::{PredictionHistory, PredictionInput};
use crate::nea_voxel_light::StaticVoxelLight;
use crate::sanitized_assets::{SanitizedAtlasKind, anonymize_avatar_palette};

const COLOR_ATLAS_MIP_COUNT: usize = 10;
const MATERIAL_ATLAS_MIP_COUNT: usize = 10;
const BUMP_ATLAS_MIP_COUNT: usize = 12;
const CHUNK_SIZE: usize = 16 * 256 * 16;
const RECOVERED_WALK_CYCLE_TICKS: f32 = 13.45;
const RECOVERED_RUN_CYCLE_TICKS: f32 = 5.75;
const RECOVERED_CROUCH_CYCLE_TICKS: f32 = 17.31;
const RECOVERED_WALK_VELOCITY_PER_TICK: f32 = 0.324;
const RECOVERED_ROLL_START_PHASE: f32 = 0.84;
const RECOVERED_ROLL_END_PHASE: f32 = RECOVERED_ROLL_START_PHASE + 1.0;

#[derive(Clone, Copy, Debug)]
struct AvatarRollState {
    phase: f32,
    completed: bool,
}

impl Default for AvatarRollState {
    fn default() -> Self {
        Self {
            phase: RECOVERED_ROLL_START_PHASE,
            completed: false,
        }
    }
}

impl AvatarRollState {
    fn update(&mut self, double_jumping: bool, grounded: bool, frame_seconds: f32) -> Option<f32> {
        if grounded {
            *self = Self::default();
            return None;
        }
        if !double_jumping || self.completed {
            return None;
        }
        self.phase += voxweb_render::recovered_ik_data::ROLL_RATE * frame_seconds.max(0.0)
            / voxweb_protocol::player::TICK_SECONDS;
        if self.phase >= RECOVERED_ROLL_END_PHASE {
            self.phase = RECOVERED_ROLL_END_PHASE;
            self.completed = true;
            return None;
        }
        Some(self.phase)
    }
}

fn recovered_walk_phase_delta(frame_seconds: f32, mode: voxweb_protocol::player::MoveMode) -> f32 {
    let cycle = match mode {
        voxweb_protocol::player::MoveMode::Run => RECOVERED_RUN_CYCLE_TICKS,
        voxweb_protocol::player::MoveMode::Crouch => RECOVERED_CROUCH_CYCLE_TICKS,
        _ => RECOVERED_WALK_CYCLE_TICKS,
    };
    frame_seconds.max(0.0) / voxweb_protocol::player::TICK_SECONDS / cycle
}

/// Convert recovered world movement to the avatar mesh yaw. The bind pose
/// faces +Z while movement angle zero points along +X.
fn recovered_avatar_yaw(movement: [f32; 2], camera_yaw: f32) -> f32 {
    let input_angle = if movement[0] != 0.0 || movement[1] != 0.0 {
        movement[1].atan2(movement[0])
    } else {
        camera_yaw
    };
    // Recovered `calcPlayerLookDirection` and IK input both use
    // [-cos(inputAngle), 0, -sin(inputAngle)].
    std::f32::consts::FRAC_PI_2 - (input_angle + std::f32::consts::PI)
}

fn network_tick_is_newer(last: u32, next: u32) -> bool {
    if last == 0 {
        return true;
    }
    let delta = next.wrapping_sub(last);
    delta != 0 && delta < (1 << 31)
}

fn recovered_block_catalog() -> &'static voxweb_protocol::blockinfo::BlockCatalog {
    static CATALOG: OnceLock<voxweb_protocol::blockinfo::BlockCatalog> = OnceLock::new();
    CATALOG.get_or_init(|| {
        let value: serde_json::Value = serde_json::from_str(include_str!(concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../../tools/parity/fixtures/block-texture-map.json"
        )))
        .expect("embedded block catalog json");
        let mut catalog = voxweb_protocol::blockinfo::BlockCatalog::from_json(&value)
            .expect("embedded block catalog");
        let surface_value: serde_json::Value = serde_json::from_str(include_str!(concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../../tools/parity/fixtures/block-emissive-map.json"
        )))
        .expect("embedded block surface fixture json");
        catalog
            .apply_emissive_json(&surface_value)
            .expect("embedded block surface fixture");
        catalog
    })
}

fn block_is_solid(block: u16) -> bool {
    let block_id = block & voxweb_protocol::geometry::BLOCK_ID_MASK;
    block_id != 0 && !recovered_block_catalog().is_fluid(block_id)
}

fn block_surface_friction(block: u16) -> f32 {
    let block = block & voxweb_protocol::geometry::BLOCK_ID_MASK;
    recovered_block_catalog()
        .get(block)
        .map_or(1.0, |entry| entry.friction)
}

/// DAO3 barrier（id=650）：隐形屏障但**按不透明渲染**（有贴图）——
/// 既避免半透明网格造成的透视，也避免完全不渲染导致地面层悬空/底部透空。
/// 面剔除时视作 opaque（奇数规则）。
fn is_barrier_block(id: u16) -> bool {
    matches!(id, 650)
}

fn recovered_voxel_face_visible(block: u16, neighbour: u16) -> bool {
    let block = block & voxweb_protocol::geometry::BLOCK_ID_MASK;
    let neighbour = neighbour & voxweb_protocol::geometry::BLOCK_ID_MASK;
    let block_opaque = block & 1 != 0 || is_barrier_block(block);
    let neighbour_opaque = neighbour & 1 != 0 || is_barrier_block(neighbour);
    if block_opaque {
        !neighbour_opaque
    } else {
        block != 0 && neighbour == 0
    }
}

/// 左上角 FPS 图表控件：帧时间折线（最近 180 帧）+ 平均帧耗 + 1% low。
/// 每帧记录帧耗时，每 500ms 重绘一次 canvas（避免每帧 DOM/Canvas 开销）。
struct FpsOverlay {
    canvas: web_sys::HtmlCanvasElement,
    ctx: web_sys::CanvasRenderingContext2d,
    text: web_sys::Element,
    frame_times: std::collections::VecDeque<f32>,
    last_frame_ms: f64,
    last_ui_update_ms: f64,
}

const FPS_BUFFER: usize = 180;

impl FpsOverlay {
    fn new(document: &web_sys::Document) -> Result<Self, wasm_bindgen::JsValue> {
        if let Some(previous) = document.get_element_by_id("nea-fps") {
            previous.remove();
        }
        let root = document.create_element("div")?;
        root.set_id("nea-fps");
        root.set_attribute(
            "style",
            "position:fixed;left:12px;top:12px;z-index:30;pointer-events:none;font:600 12px Consolas,monospace;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.9)",
        )?;
        document
            .document_element()
            .ok_or_else(|| wasm_bindgen::JsValue::from_str("no document element"))?
            .append_child(&root)?;
        let text = document.create_element("div")?;
        text.set_text_content(Some("FPS: --"));
        root.append_child(&text)?;
        let canvas = document.create_element("canvas")?;
        let canvas: web_sys::HtmlCanvasElement = canvas.dyn_into()?;
        canvas.set_width(240);
        canvas.set_height(80);
        root.append_child(&canvas)?;
        let ctx: web_sys::CanvasRenderingContext2d = canvas
            .get_context("2d")?
            .ok_or_else(|| wasm_bindgen::JsValue::from_str("no 2d context"))?
            .dyn_into()?;
        Ok(Self {
            canvas,
            ctx,
            text,
            frame_times: std::collections::VecDeque::with_capacity(FPS_BUFFER),
            last_frame_ms: 0.0,
            last_ui_update_ms: 0.0,
        })
    }

    fn record_frame(&mut self, now_ms: f64) {
        if self.last_frame_ms > 0.0 {
            let dt = (now_ms - self.last_frame_ms) as f32;
            self.frame_times.push_back(dt.min(250.0));
            if self.frame_times.len() > FPS_BUFFER {
                self.frame_times.pop_front();
            }
        }
        self.last_frame_ms = now_ms;
        if now_ms - self.last_ui_update_ms < 500.0 {
            return;
        }
        self.last_ui_update_ms = now_ms;
        self.draw();
    }

    fn draw(&mut self) {
        let n = self.frame_times.len();
        if n == 0 {
            return;
        }
        let sum: f32 = self.frame_times.iter().sum();
        let avg_ms = sum / n as f32;
        let mut sorted: Vec<f32> = self.frame_times.iter().copied().collect();
        sorted.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
        // 1% low：最差 1% 帧时间的平均（p99 帧耗时 → low fps）
        let low_count = (n / 100).max(1);
        let low_avg: f32 = sorted[n - low_count..].iter().sum::<f32>() / low_count as f32;
        let fps = 1000.0 / avg_ms;
        let low_fps = 1000.0 / low_avg;
        self.text.set_text_content(Some(&format!(
            "FPS {fps:.0}  avg {avg_ms:.1}ms  1%low {low_fps:.0}"
        )));

        let w = self.canvas.width() as f64;
        let h = self.canvas.height() as f64;
        let ctx = &self.ctx;
        ctx.clear_rect(0.0, 0.0, w, h);
        ctx.set_fill_style(&wasm_bindgen::JsValue::from_str("rgba(0,0,0,0.35)"));
        ctx.fill_rect(0.0, 0.0, w, h);
        // 60fps 参考线（16.7ms）与 30fps 参考线（33.3ms）
        let max_ms = 100.0f64;
        ctx.set_stroke_style(&wasm_bindgen::JsValue::from_str("rgba(255,255,255,0.2)"));
        ctx.set_line_width(1.0);
        for ref_ms in [16.7f64, 33.3] {
            let y = h * (1.0 - ref_ms / max_ms);
            ctx.begin_path();
            ctx.move_to(0.0, y);
            ctx.line_to(w, y);
            ctx.stroke();
        }
        // 帧时间折线
        ctx.set_stroke_style(&wasm_bindgen::JsValue::from_str("rgba(120,220,120,0.9)"));
        ctx.set_line_width(1.5);
        ctx.begin_path();
        for (i, &t) in self.frame_times.iter().enumerate() {
            let x = (i as f64) / (FPS_BUFFER as f64 - 1.0) * w;
            let y = h - (f64::from(t).min(max_ms) / max_ms) * h;
            if i == 0 {
                ctx.move_to(x, y);
            } else {
                ctx.line_to(x, y);
            }
        }
        ctx.stroke();
    }
}

impl Drop for FpsOverlay {
    fn drop(&mut self) {
        if let Some(parent) = self.canvas.parent_element() {
            let _ = parent.remove();
        }
    }
}

fn recovered_rotated_face_rects(
    faces: [voxweb_protocol::geometry::UvRect; 6],
    rotation: u16,
) -> [voxweb_protocol::geometry::UvRect; 6] {
    let rotation = usize::from(rotation & 3);
    let side_sources = [[0, 5, 1, 4], [1, 4, 0, 5], [4, 0, 5, 1], [5, 1, 4, 0]];
    let mut rotated = faces;
    for (destination, sources) in side_sources.iter().enumerate() {
        let face_index = [0, 1, 4, 5][destination];
        rotated[face_index] = faces[sources[rotation]];
    }
    rotated
}

fn write_recovered_texture_rotation(vertices: &mut [f32], rotation: u16) {
    let top_rotation = f32::from(rotation & 3);
    let bottom_rotation = f32::from((4 - (rotation & 3)) & 3);
    for vertex in vertices.chunks_exact_mut(FLOATS_PER_VERTEX) {
        vertex[24] = if vertex[4] > 0.5 {
            top_rotation
        } else if vertex[4] < -0.5 {
            bottom_rotation
        } else {
            0.0
        };
    }
}

fn recovered_fluid_info(block: u16) -> Option<[f32; 4]> {
    let block = block & voxweb_protocol::geometry::BLOCK_ID_MASK;
    if block == 0 {
        return None;
    }
    static FLUIDS: OnceLock<HashMap<u16, [f32; 4]>> = OnceLock::new();
    FLUIDS
        .get_or_init(|| {
            let value: serde_json::Value = serde_json::from_str(include_str!(concat!(
                env!("CARGO_MANIFEST_DIR"),
                "/../../tools/parity/fixtures/block-emissive-map.json"
            )))
            .expect("embedded fluid fixture");
            value["fluids"]
                .as_array()
                .expect("fluid fixture array")
                .iter()
                .filter_map(|entry| {
                    let id = entry["id"].as_u64()? as u16;
                    let packed = entry["info"].as_u64()? as u32;
                    let bytes = packed.to_le_bytes();
                    Some((id, bytes.map(|channel| channel as f32 / 255.0)))
                })
                .collect()
        })
        .get(&block)
        .copied()
}

/// JS-native logging (bypasses tracing-wasm so CDP reliably sees it).
macro_rules! jslog {
    ($($arg:tt)*) => {
        web_sys::console::log_1(&JsValue::from_str(&format!($($arg)*)))
    };
}

/// Run the smoke session + first-chunk render. Returns Ok when the first
/// terrain frame is drawn, or an error string.
pub async fn run(create_session_url: &str) -> Result<(), JsValue> {
    // surface Rust panics to the console (wasm-bindgen default only throws
    // "unreachable", which hides the actual panic message)
    std::panic::set_hook(Box::new(|info| {
        web_sys::console::error_1(&JsValue::from_str(&format!("[nea-panic] {info}")));
    }));
    jslog!("[nea] session + render smoke: {create_session_url}");

    // 0) 加载界面（先于任何网络/GPU 工作显示；document 始终可用）
    let window0 = web_sys::window().ok_or_else(|| JsValue::from_str("no window"))?;
    let document0 = window0
        .document()
        .ok_or_else(|| JsValue::from_str("no document"))?;
    let mut loading = LoadingOverlay::new(&document0)?;
    loading.set_status("正在连接服务器…");
    loading.set_progress(0.05);

    // 1) createSession HTTP (contentId selectable via ?contentId= on the page)
    let content_id = page_content_id();
    let (session_id, socket_url, max_sockets) =
        create_session(create_session_url, &content_id).await?;
    jslog!("[nea] session {session_id} contentId {content_id} socketUrl {socket_url} maxSockets {max_sockets}");
    loading.set_status("会话已建立，正在初始化渲染…");
    loading.set_progress(0.12);

    // 2) the #game canvas (VoxWeb page provides it; nea path owns it)
    let window = web_sys::window().ok_or_else(|| JsValue::from_str("no window"))?;
    let document = window
        .document()
        .ok_or_else(|| JsValue::from_str("no document"))?;
    let canvas: HtmlCanvasElement = document
        .get_element_by_id("game")
        .ok_or_else(|| JsValue::from_str("no #game canvas"))?
        .dyn_into()
        .map_err(|_| JsValue::from_str("#game not a canvas"))?;
    let mut nameplate_overlay = crate::nea_nameplates::NameplateOverlay::new(&document)?;
    let mut fps_overlay = FpsOverlay::new(&document)?;
    // fill the window so the terrain fills the viewport
    let view_w = window
        .inner_width()
        .ok()
        .and_then(|w| w.as_f64())
        .unwrap_or(800.0) as u32;
    let view_h = window
        .inner_height()
        .ok()
        .and_then(|h| h.as_f64())
        .unwrap_or(600.0) as u32;
    canvas.set_width(view_w.max(64));
    canvas.set_height(view_h.max(64));
    let width = canvas.width().max(1);
    let height = canvas.height().max(1);

    // 3) WebGPU device + surface
    let dc = init_device(&canvas)
        .await
        .map_err(|e| JsValue::from_str(&e))?;
    configure_surface(&dc.surface, &dc.device, dc.surface_format, width, height);
    let skybox = SkyboxPass::new(&dc.device, dc.surface_format);
    jslog!(
        "[nea] WebGPU device ready, surface {:?} {width}x{height}",
        dc.surface_format
    );
    loading.set_status("渲染器就绪，正在加载材质…");
    loading.set_progress(0.25);

    // 4) depth texture (pipeline uses depth test)
    let depth_tex = dc.device.create_texture(&wgpu::TextureDescriptor {
        label: Some("nea.depth"),
        size: wgpu::Extent3d {
            width,
            height,
            depth_or_array_layers: 1,
        },
        mip_level_count: 1,
        sample_count: 1,
        dimension: wgpu::TextureDimension::D2,
        format: wgpu::TextureFormat::Depth32Float,
        usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
        view_formats: &[],
    });
    let depth_view = depth_tex.create_view(&wgpu::TextureViewDescriptor::default());

    // 5) resolve optional same-origin replacements, then decode atlas mips.
    let origin = origin_of(create_session_url);
    let asset_overrides = load_asset_overrides().await?;
    jslog!("[nea] local asset replacements: {}", asset_overrides.len());
    let atlas_images =
        fetch_atlas_mips(COLOR_ATLAS_MIP_COUNT, &asset_overrides, "terrain.color").await?;
    let material_images = fetch_atlas_mips(
        MATERIAL_ATLAS_MIP_COUNT,
        &asset_overrides,
        "terrain.material",
    )
    .await?;
    let bump_images =
        fetch_atlas_mips(BUMP_ATLAS_MIP_COUNT, &asset_overrides, "terrain.bump").await?;
    jslog!(
        "[nea] sanitized/local atlas chains: color {} ({}x{}), material {}, bump {}",
        atlas_images.len(),
        atlas_images[0].width,
        atlas_images[0].height,
        material_images.len(),
        bump_images.len(),
    );
    let atlas = AtlasTexture::upload_mip_chain_with_format(
        &dc.device,
        &dc.queue,
        &atlas_images,
        AtlasSampling::default(),
        wgpu::TextureFormat::Rgba8UnormSrgb,
        "nea.atlas",
    )
    .map_err(|error| JsValue::from_str(&format!("color atlas upload: {error}")))?;
    let material_atlas = AtlasTexture::upload_mip_chain_with_format(
        &dc.device,
        &dc.queue,
        &material_images,
        AtlasSampling::default(),
        wgpu::TextureFormat::Rgba8Unorm,
        "nea.material-atlas",
    )
    .map_err(|error| JsValue::from_str(&format!("material atlas upload: {error}")))?;
    let bump_atlas = AtlasTexture::upload_mip_chain_with_format(
        &dc.device,
        &dc.queue,
        &bump_images,
        AtlasSampling::default(),
        wgpu::TextureFormat::Rgba8Unorm,
        "nea.bump-atlas",
    )
    .map_err(|error| JsValue::from_str(&format!("bump atlas upload: {error}")))?;
    let water_image = if let Some(url) = asset_overrides.replacement("water.bump") {
        let water_png = fetch_bytes(url).await?;
        AtlasImage::from_png(&water_png)
            .map_err(|error| JsValue::from_str(&format!("water bump decode: {error}")))?
    } else {
        crate::sanitized_assets::water_bump()
    };
    let water_bump = AtlasTexture::upload_with_format(
        &dc.device,
        &dc.queue,
        &water_image,
        AtlasSampling {
            mag_filter: wgpu::FilterMode::Linear,
            min_filter: wgpu::FilterMode::Linear,
            address_u: wgpu::AddressMode::Repeat,
            address_v: wgpu::AddressMode::Repeat,
        },
        wgpu::TextureFormat::Rgba8Unorm,
        "nea.water-bump",
    );
    jslog!("[nea] color + material + preserved water textures uploaded");
    loading.set_status("材质已就绪，正在连接游戏服务器…");
    loading.set_progress(0.4);

    // 6) sockets + protocol table
    let ws_url = socket_url_with_sid(&socket_url, &session_id);
    jslog!("[nea] connecting sockets: {ws_url}");
    let sockets = Rc::new(BrowserSockets::connect(&ws_url, max_sockets)?);
    jslog!("[nea] sockets connected");
    let (table, client_json_str, server_json_str) = load_protocol_table();
    jslog!("[nea] protocol table loaded");
    loading.set_status("正在进入世界…");
    loading.set_progress(0.5);

    // 7) session + terrain state
    let driver = Rc::new(RefCell::new(SessionDriver::new()));
    let mut terrain: Option<RenderTerrain> = None;
    let mut loading_finished = false;
    let mut fetch_sent = false;
    let mut ready_sent = false;
    let mut last_log_ms = now_ms();
    // 5×5 xz × full-height chunk area around spawn: collect cells per chunk.
    // Populated after the terrain reset arrives (spawn + world shape are
    // authoritative there); each entry is (cx, cy, cz).
    let mut pending_chunks: Vec<(u32, u32, u32)> = Vec::new();
    let mut near_count: usize = 0;
    let mut chunk_cells: Vec<(u32, u32, u32, Vec<u16>)> = Vec::new();
    // net-state: incremental base + decoded player body position
    let mut ns_base = voxweb_protocol::netstate::NetStateBase::default();
    let mut avatar_catalog = voxweb_protocol::AvatarCatalog::default();
    let mut avatar_renderer: Option<NeaAvatarRenderer> = None;
    let mut avatar_load_attempted = false;
    let mut local_avatar_part_ids: Option<[u32; 18]> = None;
    let mut local_avatar_scale = 1.0f32;
    let mut local_player_name = String::from("Guest");
    let mut local_body_half_extents = [0.45, 1.1, 0.45];
    let mut local_body_properties = [voxweb_protocol::player::PLAYER_MASS, 0.1, 0.0];
    let mut local_runtime_player: Option<voxweb_protocol::netstate::RuntimePlayerState> = None;
    let mut player_pos: Option<[f32; 3]> = None;
    // Remote bodies are buffered independently from render frames so packet
    // cadence cannot make avatars snap between authoritative samples.
    let mut remote_players = crate::remote_players::RemotePlayers::default();
    let mut collision_bodies: Vec<voxweb_protocol::netstate::RigidBody> = Vec::new();
    let mut last_input_tick: Option<u32> = None;
    let mut prediction_history = PredictionHistory::new();
    // Local body state used by the recovered dirty-tick prediction replay.
    let mut local_pos: [f32; 3] = [128.0, 64.0, 128.0];
    let mut local_vel: [f32; 3] = [0.0, 0.0, 0.0];
    let mut local_physics: Option<NeaPlayerPhysics> = None;
    let mut last_physics_ms = now_ms();
    let mut unsubmitted_jump_edge = false;
    let mut follow_camera_anchor = crate::nea_follow_camera::FollowCameraAnchor::default();
    let mut avatar_walk_phase = 0.0f32;
    let mut avatar_was_grounded = false;
    let mut avatar_landing_amount = 0.0f32;
    let mut avatar_roll_state = AvatarRollState::default();
    let mut follow_camera_ray_distance = 9.5f32;
    let eye_ambient_sampler = EyeAmbientSampler::recovered_random();
    let default_environment = voxweb_render::nea_environment::NeaEnvironment::recovered_default();
    let mut eye_exposure = EyeExposure::new(RECOVERED_INITIAL_EXPOSURE);
    let mut eye_ambient = 1.0f32;
    let mut last_eye_ambient_ms = 0u32;
    // keyboard input state (shared with the JS event closures)
    let input = Rc::new(RefCell::new(InputState::default()));
    install_keyboard(&canvas, &input);

    // 8) driver loop: poll, advance state machine, decode chunk
    let deadline_ms = 45000u32;
    let start_ms = now_ms();
    jslog!("[nea] entering event loop");
    while (now_ms() - start_ms < deadline_ms) || terrain.is_some() {
        let events = sockets.poll();
        for evt in events {
            match evt {
                SessionEvent::ReliableOpen => {
                    jslog!("[nea] reliable socket open — negotiating");
                    let mut d = driver.borrow_mut();
                    let frames = d.on_reliable_open(&table, &client_json_str, &server_json_str);
                    send_frames(&sockets, frames);
                }
                SessionEvent::Binary(bytes) => {
                    // secret sniff + state machine (driver borrow kept in
                    // the smallest scope so the render loop below can
                    // borrow the driver without panicking)
                    {
                        let mut d = driver.borrow_mut();
                        match d.on_frame(&table, &bytes) {
                            Ok(frames) => send_frames(&sockets, frames),
                            Err(e) => jslog!("[nea] driver frame error: {e}"),
                        }
                    }
                    // decode the player body from the net-state tail
                    let mut s = voxweb_protocol::ReadStream::new(&bytes);
                    let id = s.read_varint().unwrap_or(0);
                    if id == 10 {
                        let payload = &bytes[s.offset..];
                        // skip the secret (1 'E' 0 playerId)
                        let is_secret = payload.len() >= 3
                            && payload[0] == 1
                            && payload[1] == 69
                            && payload[2] == 0;
                        if !is_secret && !payload.is_empty() {
                            let mut candidate_base = ns_base.clone();
                            match voxweb_protocol::netstate::decode_net_public_frame(
                                payload,
                                &mut candidate_base,
                            ) {
                                Ok(f) => {
                                    // re-borrow the driver for the
                                    // net-state tail (the on_frame borrow
                                    // above is already released)
                                    let mut d = driver.borrow_mut();
                                    if !network_tick_is_newer(ns_base.tick, f.tick) {
                                        continue;
                                    }
                                    ns_base = candidate_base;
                                    d.last_server_tick = f.tick;
                                    let local_display = f
                                        .players
                                        .iter()
                                        .find(|player| player.id == u64::from(d.player_id));
                                    local_avatar_part_ids =
                                        local_display.map(|player| player.avatar_skin);
                                    local_avatar_scale =
                                        local_display.map_or(1.0, |player| player.scale);
                                    if let Some(display) = local_display {
                                        local_player_name.clone_from(&display.name);
                                    }
                                    local_runtime_player = f
                                        .runtime_players
                                        .iter()
                                        .find(|player| player.id == u64::from(d.player_id))
                                        .cloned();
                                    // This backend echoes client transforms but
                                    // does not simulate player contacts. Its
                                    // schema-default contact values must not
                                    // overwrite locally solved ground state.
                                    collision_bodies = f
                                        .bodies
                                        .iter()
                                        .filter(|body| {
                                            body.id != d.player_id as u32
                                                && body.flags & 2 != 0
                                                && (body.flags & 32 == 0 || body.flags & 64 != 0)
                                        })
                                        .cloned()
                                        .collect();
                                    remote_players.update(
                                        &f.bodies,
                                        &f.players,
                                        u32::from(d.player_id),
                                        now_ms(),
                                    );
                                    if now_ms() - last_log_ms > 2000 {
                                        jslog!(
                                            "[nea] other players: {}",
                                            remote_players
                                                .sample(now_ms())
                                                .iter()
                                                .map(|player| format!(
                                                    "({:.0},{:.0},{:.0})",
                                                    player.body.px, player.body.py, player.body.pz
                                                ))
                                                .collect::<Vec<_>>()
                                                .join(" ")
                                        );
                                    }
                                    if let Some(b) =
                                        f.bodies.iter().find(|b| b.id == d.player_id as u32)
                                    {
                                        local_body_half_extents =
                                            recovered_player_collision_half_extents(b);
                                        local_body_properties = [b.mass, b.friction, b.restitution];
                                        // seed the local position once;
                                        // the echo lags local prediction
                                        if player_pos.is_none() {
                                            player_pos = Some([b.px, b.py, b.pz]);
                                        }
                                        if let Some(physics) = local_physics.as_mut() {
                                            physics.set_body_properties(
                                                b.mass,
                                                b.friction,
                                                b.restitution,
                                            );
                                            // The compatibility backend copies the
                                            // transform authored by this client into
                                            // the next net-state frame. Replaying that
                                            // echo as authoritative state discards the
                                            // fractional render-frame motion accumulated
                                            // after submission and creates a periodic
                                            // one-tick hitch. Keep local physics
                                            // authoritative until the backend implements
                                            // independent player simulation.
                                            prediction_history.discard_echo_through(f.tick);
                                        }
                                        if now_ms() - last_log_ms > 2000 {
                                            jslog!(
                                                "[nea] player body id={} pos=({:.1},{:.1},{:.1}) tick={}",
                                                b.id,
                                                b.px,
                                                b.py,
                                                b.pz,
                                                f.tick
                                            );
                                        }
                                    }
                                }
                                Err(e) => {
                                    if now_ms() - last_log_ms > 2000 {
                                        jslog!(
                                            "[nea] net-state decode err: {e} (payload {}B tickbytes={:x?})",
                                            payload.len(),
                                            &payload[..payload.len().min(8)]
                                        );
                                    }
                                }
                            }
                        }
                    }
                    // decode game-terrain messages for rendering
                    if let Ok((proto, name, parsed)) = table.parse_client_frame(&bytes) {
                        let parsed_v = match parsed {
                            voxweb_protocol::ParsedMessage::Value(v) => Some(v),
                            _ => None,
                        };
                        if proto == "models"
                            && let Some(value) = parsed_v.as_ref()
                            && avatar_catalog.apply_models_message(&name, value)
                        {
                            jslog!("[nea] avatar catalog updated by models.{name}");
                        }
                        if proto == "game-terrain" && name == "reset" {
                            if let Some(v) = parsed_v.as_ref() {
                                let reset = voxweb_protocol::session::decode_reset(&v);
                                jslog!(
                                    "[nea] terrain reset origin=({},{},{}) counts=({},{},{})",
                                    reset.origin[0],
                                    reset.origin[1],
                                    reset.origin[2],
                                    reset.counts[0],
                                    reset.counts[1],
                                    reset.counts[2]
                                );
                                // Local player starts at the authoritative
                                // spawn carried by the reset frame.
                                local_pos = [
                                    reset.origin[0] as f32,
                                    reset.origin[1] as f32,
                                    reset.origin[2] as f32,
                                ];
                                player_pos = Some(local_pos);
                                // Chunk grid + spawn chunk from the reset shape.
                                let grid = voxweb_protocol::adapter::nea_chunk_grid();
                                let scx = (reset.origin[0] as u32 / 32).clamp(0, grid[0] - 1);
                                let scy = (reset.origin[1] as u32 / 32).clamp(0, grid[1] - 1);
                                let scz = (reset.origin[2] as u32 / 32).clamp(0, grid[2] - 1);
                                if pending_chunks.is_empty() {
                                    // 全图拉取（minecraft 8×8×4=256 chunks）：所有 xz × 全高。
                                    // near（出生点周围 5×5×全高）排序在前，先渲染出生区域，
                                    // 其余后台补全后重建全图。
                                    let x1 = grid[0] - 1;
                                    let z1 = grid[2] - 1;
                                    let mut near = Vec::new();
                                    let mut rest = Vec::new();
                                    for cy in 0..grid[1] {
                                        for cx in 0..=x1 {
                                            for cz in 0..=z1 {
                                                let entry = (cx, cy, cz);
                                                if cx.abs_diff(scx) <= 2 && cz.abs_diff(scz) <= 2 {
                                                    near.push(entry);
                                                } else {
                                                    rest.push(entry);
                                                }
                                            }
                                        }
                                    }
                                    pending_chunks = near;
                                    near_count = pending_chunks.len();
                                    pending_chunks.extend(rest);
                                    jslog!(
                                        "[nea] fetch plan: {} chunks (full map, near={}, spawn chunk {},{},{})",
                                        pending_chunks.len(),
                                        near_count,
                                        scx,
                                        scy,
                                        scz
                                    );
                                }
                                loading.set_status("世界数据已就绪，正在请求地形区块…");
                                loading.set_progress(0.62);
                                if !ready_sent {
                                    let ready = voxweb_protocol::session::encode_outbound(
                                        &table,
                                        &voxweb_protocol::session::Outbound::TerrainReady(
                                            reset.reset_counter,
                                        ),
                                    )
                                    .expect("terrain ready");
                                    let _ = sockets.send_reliable(&ready);
                                    ready_sent = true;
                                    jslog!(
                                        "[nea] terrain ready sent (counter={})",
                                        reset.reset_counter
                                    );
                                }
                            }
                        }
                        if proto == "game-terrain" && name == "chunkResponse" {
                            if let Some(voxweb_protocol::Value::Struct(fields)) = parsed_v.as_ref()
                            {
                                if let Some(voxweb_protocol::Value::Varint(rpc_id)) = fields.get(0)
                                {
                                    let boxes = boxes_from_value(&fields[1]);
                                    // VW-003 debug: block distribution in the chunk
                                    {
                                        use std::collections::HashMap;
                                        let mut dist: HashMap<u32, usize> = HashMap::new();
                                        for b in &boxes {
                                            *dist.entry(b.block).or_insert(0) += 1;
                                        }
                                        let mut v: Vec<_> = dist.into_iter().collect();
                                        v.sort_by(|a, b| b.1.cmp(&a.1));
                                        let top: Vec<String> = v
                                            .iter()
                                            .take(5)
                                            .map(|(id, n)| format!("{id}x{n}"))
                                            .collect();
                                        jslog!(
                                            "[nea] chunk boxes={} topBlocks={}",
                                            boxes.len(),
                                            top.join(" ")
                                        );
                                    }
                                    let cells = boxes_to_cells(&boxes);
                                    let non_air = cells.iter().filter(|&&c| c != 0).count();
                                    jslog!(
                                        "[nea] chunkResponse rpcId={rpc_id} boxes={} nonAirCells={non_air}",
                                        boxes.len()
                                    );
                                    // record every response (even empty chunks)
                                    // so the all-arrived completion check fires
                                    let idx = rpc_id.saturating_sub(1) as usize;
                                    if let Some(&(cx, cy, cz)) = pending_chunks.get(idx) {
                                        if !chunk_cells
                                            .iter()
                                            .any(|(c, y, z, _)| *c == cx && *y == cy && *z == cz)
                                        {
                                            chunk_cells.push((cx, cy, cz, cells.clone()));
                                            let got = chunk_cells.len();
                                            loading.set_status(&format!(
                                                "正在加载地形区块 {got}/{}…",
                                                pending_chunks.len()
                                            ));
                                            loading.set_progress(
                                                0.62 + 0.33 * (got as f32 / pending_chunks.len() as f32),
                                            );
                                            if non_air > 0 {
                                                jslog!(
                                                    "[nea] chunk {cx},{cy},{cz} cells={non_air} ({}/{})",
                                                    chunk_cells.len(),
                                                    pending_chunks.len()
                                                );
                                            }
                                        }
                                    }
                                    // 分批渐进构建：near（出生点周围）全部到达即先渲染，
                                    // 全图（256 chunks）到达后重建补全其余区域。
                                    let arrived = chunk_cells.len();
                                    let near_done = near_count > 0 && arrived >= near_count;
                                    if !pending_chunks.is_empty() && near_done {
                                        if terrain.is_none() {
                                            terrain = Some(RenderTerrain::build_chunks(
                                                &dc.device,
                                                &atlas,
                                                &material_atlas,
                                                &bump_atlas,
                                                &water_bump,
                                                &chunk_cells,
                                                dc.surface_format,
                                                width,
                                                height,
                                            ));
                                            // place the player on the terrain
                                            // top (solid block with 4 AIR
                                            // blocks above so the standing
                                            // player at eye 1.62 has clear
                                            // view — probing only y+1 left
                                            // the head inside a ceiling,
                                            // rendering black)
                                            for gy in 0..=128 {
                                                if solid_at(
                                                    &chunk_cells,
                                                    local_pos[0],
                                                    gy as f32,
                                                    local_pos[2],
                                                ) && !solid_at(
                                                    &chunk_cells,
                                                    local_pos[0],
                                                    gy as f32 + 1.0,
                                                    local_pos[2],
                                                ) && !solid_at(
                                                    &chunk_cells,
                                                    local_pos[0],
                                                    gy as f32 + 2.0,
                                                    local_pos[2],
                                                ) && !solid_at(
                                                    &chunk_cells,
                                                    local_pos[0],
                                                    gy as f32 + 3.0,
                                                    local_pos[2],
                                                ) && !solid_at(
                                                    &chunk_cells,
                                                    local_pos[0],
                                                    gy as f32 + 4.0,
                                                    local_pos[2],
                                                ) {
                                                    // 玩家脚底应落在「脚下 solid 方块顶面」(gy+1)，
                                                    // center = 顶面 + body 半高。旧公式 gy+1.1 让脚底
                                                    // 落在方块内部 (gy)，物理会把玩家顶出/弹飞（悬空下落）。
                                                    local_pos[1] =
                                                        gy as f32 + 1.0 + local_body_half_extents[1];
                                                    local_vel[1] = 0.0;
                                                    // 若本地物理已初始化（地形重建等），同步其位置，
                                                    // 避免旧位置继续主导（悬空/下落）。
                                                    if let Some(p) = local_physics.as_mut() {
                                                        p.position = local_pos;
                                                        p.velocity = [0.0, 0.0, 0.0];
                                                        p.grounded = true;
                                                    }
                                                    player_pos = Some(local_pos);
                                                    break;
                                                }
                                            }
                                            jslog!(
                                                "[nea] spawn ground: pos=({:.1},{:.1},{:.1})",
                                                local_pos[0],
                                                local_pos[1],
                                                local_pos[2]
                                            );
                                            let foot_block = block_voxel_at(
                                                &chunk_cells,
                                                local_pos[0].floor() as i32,
                                                (local_pos[1] - local_body_half_extents[1]).floor() as i32,
                                                local_pos[2].floor() as i32,
                                            );
                                            jslog!(
                                                "[nea] spawn foot block={} half_h={:.2}",
                                                foot_block,
                                                local_body_half_extents[1]
                                            );
                                            loading.set_status("地形渲染完成，进入世界…");
                                            loading.set_progress(0.98);
                                        } else if arrived == pending_chunks.len() {
                                            // 全图到达 → 重建补全其余区域（位置保持）
                                            jslog!(
                                                "[nea] rebuilding full map terrain ({} chunks)",
                                                arrived
                                            );
                                            terrain = Some(RenderTerrain::build_chunks(
                                                &dc.device,
                                                &atlas,
                                                &material_atlas,
                                                &bump_atlas,
                                                &water_bump,
                                                &chunk_cells,
                                                dc.surface_format,
                                                width,
                                                height,
                                            ));
                                            loading.set_status("全图加载完成");
                                            loading.set_progress(1.0);
                                        }
                                    }
                                }
                            }
                        }
                    }
                    // fetch the chunk area once the driver is playing
                    if !fetch_sent
                        && matches!(driver.borrow().stage, SessionStage::Playing)
                        && ready_sent
                    {
                        let grid = voxweb_protocol::adapter::nea_chunk_grid();
                        for (i, (cx, cy, cz)) in pending_chunks.iter().enumerate() {
                            // chunkId = cx + gridI*(cy + gridJ*cz)
                            let chunk_id = cx + grid[0] * (cy + grid[1] * cz);
                            let fetch = voxweb_protocol::session::encode_outbound(
                                &table,
                                &voxweb_protocol::session::Outbound::FetchChunk {
                                    chunk_id,
                                    rpc_id: (i + 1) as u32,
                                },
                            )
                            .expect("fetchChunk");
                            let _ = sockets.send_reliable(&fetch);
                        }
                        fetch_sent = true;
                        jslog!(
                            "[nea] fetchChunk sent {} chunks",
                            pending_chunks.len()
                        );
                    }
                }
                SessionEvent::Text(_) => {}
                SessionEvent::UnreliableBinary(_) => {}
                SessionEvent::SocketError(e) => jslog!("[nea] socket error: {e}"),
                SessionEvent::Closed => {
                    jslog!("[nea] socket closed");
                    return Err(JsValue::from_str("socket closed before terrain"));
                }
            }
        }
        if avatar_renderer.is_none()
            && !avatar_load_attempted
            && let Some(part_ids) = local_avatar_part_ids.as_ref()
            && let Some(render_terrain) = terrain.as_ref()
            && avatar_catalog.part_ids_are_fully_resolved(part_ids)
        {
            let resolved = avatar_catalog.resolved_part_ids(part_ids);
            avatar_load_attempted = true;
            let assets: Vec<(String, String)> = resolved
                .into_iter()
                .map(|(name, hash)| (name.to_string(), hash.to_string()))
                .collect();
            match load_avatar_renderer(
                &origin,
                &assets,
                &asset_overrides,
                &dc.device,
                &dc.queue,
                dc.surface_format,
                &render_terrain.shadow_map,
            )
            .await
            {
                Ok(renderer) => {
                    jslog!("[nea] recovered avatar renderer ready");
                    avatar_renderer = Some(renderer);
                }
                Err(error) => jslog!("[nea] recovered avatar load failed: {error}"),
            }
        }
        // Render once per browser animation frame. Network polling, physics,
        // and presentation share the display cadence instead of busy-spinning
        // whenever the WebSocket queue remains non-empty.
        if let Some(t) = terrain.as_ref() {
            // The preserved Player advances a fractional deltaTick on every
            // render frame, splitting only when a step crosses a full tick.
            let dt_ms = now_ms() - last_physics_ms;
            last_physics_ms = now_ms();
            let dt = (dt_ms as f32 / 1000.0).min(0.1);
            let frame_delta_seconds = dt;
            let mut inp = input.borrow_mut();
            inp.update_orientation();
            let input_direction_state = local_runtime_player
                .as_ref()
                .map_or(0, |player| player.input_direction_state);
            let movement = inp.movement_vector_with_state(input_direction_state);
            let move_mode = inp.move_mode();
            let jump_edge = inp.jump_edge && dt > 0.0;
            unsubmitted_jump_edge |= jump_edge;
            let flight_toggle = inp.flight_toggle;
            if dt > 0.0 {
                inp.jump_edge = false;
            }
            inp.flight_toggle = false;
            let physics = local_physics.get_or_insert_with(|| {
                let mut physics = NeaPlayerPhysics::new(local_pos);
                physics.observe(&|x, y, z| solid_voxel_at(&chunk_cells, x, y, z));
                physics
            });
            physics.set_half_extents(local_body_half_extents);
            physics.set_body_properties(
                local_body_properties[0],
                local_body_properties[1],
                local_body_properties[2],
            );
            if let Some(runtime_player) = local_runtime_player.as_ref() {
                physics.apply_runtime_state(runtime_player);
            }
            if flight_toggle {
                physics.request_flight_toggle();
            }
            physics.set_fluid_volume_fraction(fluid_volume_fraction(
                physics.position,
                local_body_half_extents,
                &chunk_cells,
            ));
            let support_block = block_voxel_at(
                &chunk_cells,
                physics.position[0].floor() as i32,
                (physics.position[1] - local_body_half_extents[1] - 1.0e-4).floor() as i32,
                physics.position[2].floor() as i32,
            );
            physics.set_surface_friction(block_surface_friction(support_block));
            physics.step_with_bodies(
                movement,
                move_mode,
                jump_edge,
                inp.jump,
                dt,
                &|x, y, z| solid_voxel_at(&chunk_cells, x, y, z),
                &mut collision_bodies,
            );
            local_pos = physics.position;
            local_vel = physics.velocity;
            player_pos = Some(physics.position);
            if now_ms() - last_log_ms > 2000 {
                last_log_ms = now_ms();
                let foot = block_voxel_at(
                    &chunk_cells,
                    physics.position[0].floor() as i32,
                    (physics.position[1] - local_body_half_extents[1] - 1.0e-4).floor() as i32,
                    physics.position[2].floor() as i32,
                );
                jslog!(
                    "[nea] player pos=({:.1},{:.1},{:.1}) vel_y={:.2} grounded={} foot_block={}",
                    physics.position[0],
                    physics.position[1],
                    physics.position[2],
                    physics.velocity[1],
                    physics.grounded,
                    foot
                );
            }
            drop(inp);
            // The preserved client submits once when the integer game tick
            // crosses. The local compatibility backend applies N at N+1.
            let server_tick = driver.borrow().last_server_tick;
            if matches!(driver.borrow().stage, SessionStage::Playing)
                && server_tick > 0
                && last_input_tick != Some(server_tick)
            {
                last_input_tick = Some(server_tick);
                let inp = input.borrow();
                let moving = movement[0] != 0.0 || movement[1] != 0.0;
                let state = recovered_player_state(
                    moving,
                    inp.jump,
                    move_mode,
                    physics.is_flying(),
                    physics.grounded,
                    local_vel[1],
                );
                // snapshot driver values BEFORE the mutable borrow so the
                // log below never touches a borrowed driver
                let (pid, tick_now) = {
                    let d = driver.borrow();
                    (d.player_id, d.last_server_tick)
                };
                let ci = voxweb_protocol::player::ClientInput {
                    input_state: state,
                    input_angle: voxweb_protocol::player::wire_angle(
                        (moving && (movement[0] != 0.0 || movement[1] != 0.0)).then_some(movement),
                        inp.local_pitch,
                    ),
                    input_camera_angle: inp.wire_camera_angle(),
                    input_pitch: inp.wire_pitch(),
                    bodies: vec![voxweb_protocol::player::ClientInputBody {
                        px: local_pos[0],
                        py: local_pos[1],
                        pz: local_pos[2],
                        qx: 0.0,
                        qy: 0.0,
                        qz: 0.0,
                        vx: local_vel[0] * voxweb_protocol::player::TICK_SECONDS,
                        vy: local_vel[1] * voxweb_protocol::player::TICK_SECONDS,
                        vz: local_vel[2] * voxweb_protocol::player::TICK_SECONDS,
                        id: pid as u64,
                    }],
                };
                let send_result = {
                    let mut d = driver.borrow_mut();
                    d.send_input(&table, &ci)
                };
                if let Ok(frame) = send_result {
                    let _ = sockets.send_reliable(&frame);
                    prediction_history.record_submitted(
                        tick_now,
                        physics,
                        &collision_bodies,
                        PredictionInput {
                            movement,
                            mode: move_mode,
                            jump_edge: unsubmitted_jump_edge,
                            jump_held: inp.jump,
                        },
                    );
                    unsubmitted_jump_edge = false;
                    if now_ms() - last_log_ms > 2000 {
                        jslog!(
                            "[nea] input state={:04x} angle={} cam={} pitch={} pressed={} tick={} pos=({:.1},{:.1},{:.1})",
                            state,
                            ci.input_angle,
                            ci.input_camera_angle,
                            ci.input_pitch,
                            moving,
                            tick_now,
                            local_pos[0],
                            local_pos[1],
                            local_pos[2]
                        );
                    }
                }
            }
            let (inp_pitch, inp_yaw, inp_crouching) = {
                let inp = input.borrow();
                (inp.local_pitch, inp.local_yaw, inp.crouching)
            };
            let frame = match dc.surface.get_current_texture() {
                wgpu::CurrentSurfaceTexture::Success(t)
                | wgpu::CurrentSurfaceTexture::Suboptimal(t) => t,
                _ => {
                    let _ = yield_animation_frame().await;
                    continue;
                }
            };
            let view = frame
                .texture
                .create_view(&wgpu::TextureViewDescriptor::default());
            let mut encoder = dc
                .device
                .create_command_encoder(&wgpu::CommandEncoderDescriptor::default());
            let camera_player_pos = follow_camera_anchor.update(player_pos, frame_delta_seconds);
            let (mvp, eye, first_person) = make_camera(
                width,
                height,
                camera_player_pos,
                local_body_half_extents[1],
                inp_crouching,
                inp_pitch,
                inp_yaw,
                &chunk_cells,
                &mut follow_camera_ray_distance,
            );
            let sampled_remote_players = remote_players.sample(now_ms());
            let other_players: Vec<AvatarInstance> = sampled_remote_players
                .iter()
                .map(|player| avatar_instance_from_body(&player.body, player.scale))
                .collect();
            let other_player_nameplates: Vec<(u64, String, [f32; 3])> = sampled_remote_players
                .iter()
                .map(|player| {
                    (
                        u64::from(player.id),
                        player.name.clone(),
                        [
                            player.body.px,
                            player.body.py + player.body.hsy + 0.45,
                            player.body.pz,
                        ],
                    )
                })
                .collect();
            let local_player_id = u64::from(driver.borrow().player_id);
            let mut nameplates: Vec<crate::nea_nameplates::NameplateEntry<'_>> =
                other_player_nameplates
                    .iter()
                    .map(|(id, name, world)| crate::nea_nameplates::NameplateEntry {
                        id: *id,
                        name,
                        world: *world,
                    })
                    .collect();
            if !first_person && let Some(position) = camera_player_pos {
                nameplates.push(crate::nea_nameplates::NameplateEntry {
                    id: local_player_id,
                    name: &local_player_name,
                    world: [
                        position[0],
                        position[1] + local_body_half_extents[1] + 0.45,
                        position[2],
                    ],
                });
            }
            nameplate_overlay.update(&nameplates, mvp, width, height)?;
            let aspect = width as f32 / height.max(1) as f32;
            let projection = glam::Mat4::perspective_rh(
                voxweb_protocol::player::CAMERA_FOV_Y_RADIANS,
                aspect,
                0.1,
                2000.0,
            );
            let camera_view = projection.inverse() * glam::Mat4::from_cols_array(&mvp);
            let environment = voxweb_render::nea_environment::NeaEnvironment::recovered_default();
            let skybox_globals = SkyboxGlobals {
                inv_view_proj: glam::Mat4::from_cols_array(&mvp)
                    .inverse()
                    .to_cols_array_2d(),
                sun_dir_time: [
                    environment.sun_direction[0],
                    environment.sun_direction[1],
                    environment.sun_direction[2],
                    4.0 / 24.0,
                ],
                fog_color: [
                    environment.sky_front[0] / 255.0,
                    environment.sky_front[1] / 255.0,
                    environment.sky_front[2] / 255.0,
                    1.0,
                ],
            };
            dc.queue.write_buffer(
                &skybox.globals_buffer,
                0,
                bytemuck::bytes_of(&skybox_globals),
            );
            let shadow_frame = voxweb_render::nea_shadow::recovered_shadow_frame(
                glam::Vec3::from(eye),
                camera_view,
                voxweb_protocol::player::CAMERA_FOV_Y_RADIANS,
                aspect,
                0.1,
                2000.0,
                glam::Vec3::from(environment.sun_direction),
                t.shadow_map.resolution(),
            );
            t.shadow_map.update(&dc.queue, &shadow_frame);
            t.shadow_map.render_terrain(
                &mut encoder,
                &dc.queue,
                &shadow_frame,
                &t.pipeline.vertex_buffer,
                &t.pipeline.index_buffer,
                t.pipeline.index_count,
            );
            if let Some(renderer) = avatar_renderer.as_mut() {
                if physics.grounded && !avatar_was_grounded && local_vel[1] < 0.0 {
                    avatar_landing_amount = 1.0;
                } else {
                    const RECOVERED_LAND_RATE_PER_SECOND: f32 = 0.12 * 15.625;
                    avatar_landing_amount = (avatar_landing_amount
                        - RECOVERED_LAND_RATE_PER_SECOND * frame_delta_seconds)
                        .max(0.0);
                }
                avatar_was_grounded = physics.grounded;
                let avatar_roll_phase = avatar_roll_state.update(
                    physics.is_double_jumping(),
                    physics.grounded,
                    frame_delta_seconds,
                );
                let horizontal_speed = local_vel[0].hypot(local_vel[2]);
                let tick_speed = horizontal_speed * voxweb_protocol::player::TICK_SECONDS;
                let movement_amount =
                    (tick_speed / RECOVERED_WALK_VELOCITY_PER_TICK).clamp(0.0, 1.0);
                if movement_amount > 0.01 {
                    avatar_walk_phase = (avatar_walk_phase
                        + recovered_walk_phase_delta(frame_delta_seconds, move_mode)
                            * movement_amount)
                        % 1.0;
                }
                renderer.update_locomotion(
                    &dc.queue,
                    avatar_walk_phase,
                    movement_amount,
                    physics.grounded,
                    move_mode == voxweb_protocol::player::MoveMode::Run,
                    move_mode == voxweb_protocol::player::MoveMode::Crouch,
                    avatar_landing_amount,
                    local_vel[1],
                    physics.is_swimming(),
                    avatar_roll_phase,
                );
                let mut avatar_instances = other_players.clone();
                if let Some(position) = camera_player_pos.filter(|_| !first_person) {
                    let half_angle = recovered_avatar_yaw(movement, inp_pitch) * 0.5;
                    avatar_instances.push(AvatarInstance::new(
                        [
                            position[0],
                            position[1] - local_body_half_extents[1],
                            position[2],
                        ],
                        [0.0, half_angle.sin(), 0.0, half_angle.cos()],
                        local_avatar_scale,
                    ));
                }
                for instance in &mut avatar_instances {
                    instance.ambient = t.voxel_light.sample_continuous(
                        instance.position[0],
                        instance.position[1] + local_body_half_extents[1],
                        instance.position[2],
                    );
                }
                renderer.update_instances(&dc.device, &dc.queue, &avatar_instances);
                renderer.render_shadows(&mut encoder, &dc.queue, &t.shadow_map, &shadow_frame);
            }
            let eye_block = block_voxel_at(
                &chunk_cells,
                eye[0].floor() as i32,
                eye[1].floor() as i32,
                eye[2].floor() as i32,
            );
            let eye_fluid = recovered_fluid_info(eye_block);
            if now_ms() - last_eye_ambient_ms >= voxweb_protocol::player::TICK_MS {
                eye_ambient = eye_ambient_sampler.sample(eye, &t.voxel_light, &|x, y, z| {
                    solid_voxel_at(&chunk_cells, x, y, z)
                });
                last_eye_ambient_ms = now_ms();
            }
            let exposure =
                eye_exposure.update(default_environment.target_exposure(eye_ambient), false);
            t.fluid_pipeline.set_frame(
                &dc.queue,
                &mvp,
                &eye,
                now_ms() as f32 / 1000.0,
                eye_fluid,
                exposure,
            );
            t.alpha_pipeline
                .set_frame(&dc.queue, &mvp, &eye, eye_fluid, exposure);
            {
                let mut sky_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                    label: Some("nea.skybox"),
                    color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                        view: t.fluid_pipeline.opaque_view(),
                        resolve_target: None,
                        depth_slice: None,
                        ops: wgpu::Operations {
                            load: wgpu::LoadOp::Clear(wgpu::Color::BLACK),
                            store: wgpu::StoreOp::Store,
                        },
                    })],
                    depth_stencil_attachment: None,
                    timestamp_writes: None,
                    occlusion_query_set: None,
                    multiview_mask: None,
                });
                sky_pass.set_pipeline(&skybox.pipeline);
                sky_pass.set_bind_group(0, &skybox.globals_bind_group, &[]);
                sky_pass.draw(0..3, 0..1);
            }
            {
                let mut pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                    label: Some("nea.terrain"),
                    color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                        view: t.fluid_pipeline.opaque_view(),
                        resolve_target: None,
                        depth_slice: None,
                        ops: wgpu::Operations {
                            load: wgpu::LoadOp::Load,
                            store: wgpu::StoreOp::Store,
                        },
                    })],
                    depth_stencil_attachment: Some(wgpu::RenderPassDepthStencilAttachment {
                        view: &depth_view,
                        depth_ops: Some(wgpu::Operations {
                            load: wgpu::LoadOp::Clear(1.0),
                            store: wgpu::StoreOp::Store,
                        }),
                        stencil_ops: None,
                    }),
                    timestamp_writes: None,
                    occlusion_query_set: None,
                    multiview_mask: None,
                });
                let inp_debug_view = input.borrow().debug_view;
                t.pipeline
                    .set_camera(&dc.queue, &mvp, &eye, eye_fluid, exposure, inp_debug_view);
                t.pipeline.draw(&mut pass);
                if let Some(renderer) = avatar_renderer.as_ref() {
                    renderer.set_environment(&dc.queue, &mvp, &eye, eye_fluid, exposure);
                    renderer.draw(&mut pass);
                }
                t.alpha_pipeline.draw(&mut pass, t.fluid_pipeline.oit());
                t.fluid_pipeline.draw(&mut pass);
            }
            t.fluid_pipeline.resolve(&mut encoder, &view);
            dc.queue.submit(Some(encoder.finish()));
            frame.present();
            fps_overlay.record_frame(now_ms() as f64);
            if !loading_finished {
                loading_finished = true;
                loading.finish();
            }
            if now_ms() - last_log_ms > 2000 {
                jslog!(
                    "[nea] rendering tick={} playerId={} fps~60",
                    driver.borrow().last_server_tick,
                    driver.borrow().player_id
                );
                last_log_ms = now_ms();
            }
        }
        if let SessionStage::Failed(e) = driver.borrow().stage.clone() {
            return Err(JsValue::from_str(&format!("session failed: {e}")));
        }
        let _ = yield_animation_frame().await;
    }
    Err(JsValue::from_str("nea smoke timed out before terrain"))
}

/// Packed terrain mesh + pipeline for the decoded chunk cells.
struct RenderTerrain {
    mesh: MeshBuffers,
    pipeline: NeaTerrainPipeline,
    alpha_pipeline: NeaAlphaPipeline,
    fluid_pipeline: NeaFluidPipeline,
    voxel_light: StaticVoxelLight,
    shadow_map: voxweb_render::nea_shadow::NeaShadowMap,
}

impl RenderTerrain {
    /// Build the terrain mesh from multiple NEA chunks. Each chunk entry is
    /// (grid_cx, grid_cy, grid_cz, 32³ cells); world position =
    /// (cx*32, cy*32+y, cz*32).
    fn build_chunks(
        device: &wgpu::Device,
        atlas: &AtlasTexture,
        material_atlas: &AtlasTexture,
        bump_atlas: &AtlasTexture,
        water_bump: &AtlasTexture,
        chunks: &[(u32, u32, u32, Vec<u16>)],
        surface_format: wgpu::TextureFormat,
        width: u32,
        height: u32,
    ) -> Self {
        let catalog_json = include_str!(concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../../tools/parity/fixtures/block-texture-map.json"
        ));
        let catalog_v: serde_json::Value =
            serde_json::from_str(catalog_json).expect("embedded block catalog json");
        let mut catalog = voxweb_protocol::blockinfo::BlockCatalog::from_json(&catalog_v)
            .expect("embedded block catalog");
        let emissive_json = include_str!(concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../../tools/parity/fixtures/block-emissive-map.json"
        ));
        let emissive_value: serde_json::Value =
            serde_json::from_str(emissive_json).expect("embedded block emissive fixture");
        catalog
            .apply_emissive_json(&emissive_value)
            .expect("block emissive fixture matches catalog");

        let mut all_verts = Vec::new();
        let mut all_idx = Vec::new();
        let mut base = 0u32;
        let mut alpha_verts = Vec::new();
        let mut alpha_idx = Vec::new();
        let mut alpha_base = 0u32;
        let mut fluid_verts = Vec::new();
        let mut fluid_idx = Vec::new();
        let mut fluid_base = 0u32;
        let mut solid = 0usize;
        let mut fluid_cells = 0usize;
        let chunk_index: HashMap<(u32, u32, u32), &[u16]> = chunks
            .iter()
            .map(|(x, y, z, cells)| ((*x, *y, *z), cells.as_slice()))
            .collect();
        let min_chunk_x = chunks.iter().map(|(x, _, _, _)| *x).min().unwrap_or(0);
        let max_chunk_x = chunks
            .iter()
            .map(|(x, _, _, _)| *x)
            .max()
            .unwrap_or(min_chunk_x);
        let min_chunk_z = chunks.iter().map(|(_, _, z, _)| *z).min().unwrap_or(0);
        let max_chunk_z = chunks
            .iter()
            .map(|(_, _, z, _)| *z)
            .max()
            .unwrap_or(min_chunk_z);
        let light_min_x = (min_chunk_x * 32) as i32;
        let light_min_z = (min_chunk_z * 32) as i32;
        let light_size_x = ((max_chunk_x - min_chunk_x + 1) * 32) as usize;
        let light_size_z = ((max_chunk_z - min_chunk_z + 1) * 32) as usize;
        // 光照只覆盖到「最高非空 slab + 1」：minecraft 地形 y≈0-30、parkour y≈0-64，
        // 全图 256×128×256 时按 128 算光照比 256 快一倍且效果不变。
        let light_height = chunks
            .iter()
            .map(|(_, cy, _, _)| (*cy as usize + 1) * 32)
            .max()
            .unwrap_or(64)
            .min(128)
            .max(64);
        let voxel_light = StaticVoxelLight::build(
            light_min_x,
            light_min_z,
            light_size_x,
            light_size_z,
            light_height,
            &|x, y, z| solid_voxel_indexed(&chunk_index, x, y, z),
            &|x, y, z| {
                let block = block_voxel_indexed(&chunk_index, x, y, z);
                catalog.get(block).map_or(0, |entry| entry.emissive)
            },
        );

        for (cx, cy, cz, cells) in chunks {
            // NEA 32³ cells -> 4 VoxWeb 16×256×16 columns
            let mut columns = [[0u16; CHUNK_SIZE]; 4];
            let cells32: [u16; 32768] = {
                let mut a = [0u16; 32768];
                let n = cells.len().min(32768);
                a[..n].copy_from_slice(&cells[..n]);
                a
            };
            voxweb_protocol::adapter::write_voxweb_chunks(&cells32, &mut columns, true);
            let positions = voxweb_protocol::adapter::voxweb_chunk_positions(*cx, *cy, *cz);

            for (ci, col) in columns.iter().enumerate() {
                let (bx, bz) = positions[ci];
                // world origin of this chunk: (cx*32, cy*32, cz*32)
                let world_base_x = (cx * 32) as f32;
                let world_base_y = (cy * 32) as f32;
                let world_base_z = (cz * 32) as f32;
                let _ = (bx, bz);
                for y in 0..32usize {
                    for z in 0..16usize {
                        for x in 0..16usize {
                            let block = col[voxweb_protocol::adapter::voxweb_cell_index(x, y, z)];
                            if block == 0 {
                                continue;
                            }
                            let block_id = block & voxweb_protocol::geometry::BLOCK_ID_MASK;
                            let rotation = block >> 14;
                            let Some(entry) = catalog.get(block_id) else {
                                continue;
                            };
                            let unrotated_rects = [
                                voxweb_protocol::geometry::face_uv_rect(entry.faces.px, 512.0),
                                voxweb_protocol::geometry::face_uv_rect(entry.faces.nx, 512.0),
                                voxweb_protocol::geometry::face_uv_rect(entry.faces.py, 512.0),
                                voxweb_protocol::geometry::face_uv_rect(entry.faces.ny, 512.0),
                                voxweb_protocol::geometry::face_uv_rect(entry.faces.pz, 512.0),
                                voxweb_protocol::geometry::face_uv_rect(entry.faces.nz, 512.0),
                            ];
                            let rects = recovered_rotated_face_rects(unrotated_rects, rotation);
                            // column ci covers quadrant (ci&1)*16 x, (ci>>1)*16 z
                            let local_x = (ci & 1) * 16 + x;
                            let local_z = (ci >> 1) * 16 + z;
                            let wx = world_base_x + local_x as f32;
                            let wy = world_base_y + y as f32;
                            let wz = world_base_z + local_z as f32;
                            if entry.fluid {
                                let world_x = wx as i32;
                                let world_y = wy as i32;
                                let world_z = wz as i32;
                                let air = |dx: i32, dy: i32, dz: i32| {
                                    block_voxel_indexed(
                                        &chunk_index,
                                        world_x + dx,
                                        world_y + dy,
                                        world_z + dz,
                                    ) == 0
                                };
                                let mut fluid_mask = 0u8;
                                for (bit, offset) in [
                                    (0, [1, 0, 0]),
                                    (1, [-1, 0, 0]),
                                    (2, [0, 1, 0]),
                                    (3, [0, -1, 0]),
                                    (4, [0, 0, 1]),
                                    (5, [0, 0, -1]),
                                ] {
                                    if air(offset[0], offset[1], offset[2]) {
                                        fluid_mask |= 1 << bit;
                                    }
                                }
                                if fluid_mask != 0 {
                                    let geometry =
                                        voxweb_protocol::geometry::build_box_geometry_masked(
                                            wx, wy, wz, 1.0, 1.0, 1.0, &rects, fluid_mask,
                                        );
                                    let mut packed = MeshBuffers::from_box_mesh(&geometry);
                                    apply_recovered_fluid_heights(
                                        &mut packed.vertices,
                                        world_y,
                                        &voxel_light,
                                    );
                                    let info = recovered_fluid_info(block_id).unwrap_or([0.0; 4]);
                                    for vertex in
                                        packed.vertices.chunks_exact_mut(FLOATS_PER_VERTEX)
                                    {
                                        vertex[8..12].copy_from_slice(&info);
                                    }
                                    fluid_verts.extend_from_slice(&packed.vertices);
                                    fluid_idx.extend(
                                        packed.indices.iter().map(|index| index + fluid_base),
                                    );
                                    fluid_base +=
                                        (packed.vertices.len() / FLOATS_PER_VERTEX) as u32;
                                    fluid_cells += 1;
                                }
                                continue;
                            }
                            // Recovered worker 278 classifies odd ids as opaque
                            // geometry and non-zero even ids as alpha geometry.
                            // Opaque faces survive beside alpha/air; alpha faces
                            // survive only beside air.
                            let neighbour = |dx: i32, dy: i32, dz: i32| {
                                block_voxel_indexed(
                                    &chunk_index,
                                    wx as i32 + dx,
                                    wy as i32 + dy,
                                    wz as i32 + dz,
                                )
                            };
                            let mut mask: u8 = 0;
                            if recovered_voxel_face_visible(block, neighbour(1, 0, 0)) {
                                mask |= 1 << 0;
                            } // +X
                            if recovered_voxel_face_visible(block, neighbour(-1, 0, 0)) {
                                mask |= 1 << 1;
                            } // -X
                            if recovered_voxel_face_visible(block, neighbour(0, 1, 0)) {
                                mask |= 1 << 2;
                            } // +Y
                            if recovered_voxel_face_visible(block, neighbour(0, -1, 0)) {
                                mask |= 1 << 3;
                            } // -Y
                            if recovered_voxel_face_visible(block, neighbour(0, 0, 1)) {
                                mask |= 1 << 4;
                            } // +Z
                            if recovered_voxel_face_visible(block, neighbour(0, 0, -1)) {
                                mask |= 1 << 5;
                            } // -Z
                            if mask == 0 {
                                continue; // fully enclosed
                            }
                            let m = voxweb_protocol::geometry::build_box_geometry_masked(
                                wx, wy, wz, 1.0, 1.0, 1.0, &rects, mask,
                            );
                            let mut packed = MeshBuffers::from_box_mesh(&m);
                            write_recovered_texture_rotation(&mut packed.vertices, rotation);
                            write_recovered_corner_light(
                                &mut packed.vertices,
                                &voxel_light,
                                &chunk_index,
                            );
                            // barrier 按不透明渲染（其余偶数 id 才是 alpha 透明方块）
                            let uses_alpha = block_id & 1 == 0 && !is_barrier_block(block_id);
                            if uses_alpha {
                                alpha_verts.extend_from_slice(&packed.vertices);
                                alpha_idx
                                    .extend(packed.indices.iter().map(|index| index + alpha_base));
                                alpha_base += (packed.vertices.len() / FLOATS_PER_VERTEX) as u32;
                            } else {
                                all_verts.extend_from_slice(&packed.vertices);
                                all_idx.extend(packed.indices.iter().map(|index| index + base));
                                base += (packed.vertices.len() / FLOATS_PER_VERTEX) as u32;
                            }
                            solid += 1;
                        }
                    }
                }
            }
        }

        let mesh = MeshBuffers {
            vertices: all_verts,
            indices: all_idx,
        };
        let shadow_map = voxweb_render::nea_shadow::NeaShadowMap::new(
            device,
            voxweb_render::nea_shadow::DEFAULT_SHADOW_RESOLUTION,
        );
        let pipeline = NeaTerrainPipeline::new(
            device,
            atlas,
            material_atlas,
            bump_atlas,
            &shadow_map,
            &mesh,
            surface_format,
            Some(wgpu::TextureFormat::Depth32Float),
            "nea.terrain",
        );
        let fluid_mesh = MeshBuffers {
            vertices: fluid_verts,
            indices: fluid_idx,
        };
        let fluid_pipeline = NeaFluidPipeline::new(
            device,
            water_bump,
            &fluid_mesh,
            surface_format,
            wgpu::TextureFormat::Depth32Float,
            width,
            height,
        );
        let alpha_mesh = MeshBuffers {
            vertices: alpha_verts,
            indices: alpha_idx,
        };
        let alpha_pipeline = NeaAlphaPipeline::new(
            device,
            atlas,
            material_atlas,
            bump_atlas,
            &alpha_mesh,
            fluid_pipeline.oit(),
            &shadow_map,
            surface_format,
            wgpu::TextureFormat::Depth32Float,
        );
        jslog!(
            "[nea] terrain mesh built: {} verts {} idx ({} solid, {} fluid cells)",
            mesh.vertices.len(),
            mesh.indices.len(),
            solid,
            fluid_cells,
        );
        Self {
            mesh,
            pipeline,
            alpha_pipeline,
            fluid_pipeline,
            voxel_light,
            shadow_map,
        }
    }
}

fn apply_recovered_fluid_heights(
    vertices: &mut [f32],
    block_y: i32,
    voxel_light: &StaticVoxelLight,
) {
    for vertex in vertices.chunks_exact_mut(FLOATS_PER_VERTEX) {
        if vertex[1] < block_y as f32 + 0.5 {
            continue;
        }
        let vertex_x = vertex[0].round() as i32;
        let vertex_z = vertex[2].round() as i32;
        let mut sky_sum = 0u32;
        for offset_z in [-1, 0] {
            for offset_x in [-1, 0] {
                sky_sum += voxel_light.sky_nibble(vertex_x + offset_x, block_y, vertex_z + offset_z)
                    as u32;
            }
        }
        // Recovered worker encoding: X(sum) = (sum >> 1) << 27 in a
        // position word whose upper five bits represent 1/32 voxel units.
        vertex[1] = block_y as f32 + recovered_fluid_height(sky_sum);
    }
}

fn recovered_fluid_height(sky_sum: u32) -> f32 {
    (sky_sum >> 1) as f32 / 32.0
}

fn write_recovered_corner_light(
    vertices: &mut [f32],
    voxel_light: &StaticVoxelLight,
    chunk_index: &HashMap<(u32, u32, u32), &[u16]>,
) {
    for face in vertices.chunks_exact_mut(4 * FLOATS_PER_VERTEX) {
        let mut corners = [[0.0; 4]; 4];
        for (index, vertex) in face.chunks_exact(FLOATS_PER_VERTEX).enumerate() {
            corners[index] = corner_light(
                [vertex[0], vertex[1], vertex[2]],
                [vertex[3], vertex[4], vertex[5]],
                voxel_light,
                chunk_index,
            );
        }
        let ordered = [corners[0], corners[3], corners[1], corners[2]];
        for vertex in face.chunks_exact_mut(FLOATS_PER_VERTEX) {
            for (index, light) in ordered.iter().enumerate() {
                let offset = 8 + index * 4;
                vertex[offset..offset + 4].copy_from_slice(light);
            }
        }
    }
}

fn corner_light(
    position: [f32; 3],
    normal: [f32; 3],
    voxel_light: &StaticVoxelLight,
    chunk_index: &HashMap<(u32, u32, u32), &[u16]>,
) -> [f32; 4] {
    let normal_axis = normal
        .iter()
        .position(|component| component.abs() > 0.5)
        .unwrap_or(1);
    let tangent_axes = match normal_axis {
        0 => [1, 2],
        1 => [0, 2],
        _ => [0, 1],
    };
    let mut visible = [0.0; 4];
    for first_offset in [-1, 0] {
        for second_offset in [-1, 0] {
            let mut cell = [0i32; 3];
            for axis in 0..3 {
                cell[axis] = position[axis].floor() as i32;
            }
            if normal[normal_axis] < 0.0 {
                cell[normal_axis] -= 1;
            }
            cell[tangent_axes[0]] += first_offset;
            cell[tangent_axes[1]] += second_offset;
            if solid_voxel_indexed(chunk_index, cell[0], cell[1], cell[2]) {
                continue;
            }
            let sample = voxel_light.sample(cell[0], cell[1], cell[2]);
            for channel in 0..4 {
                visible[channel] += sample[channel];
            }
        }
    }
    visible.map(|channel| channel / 4.0)
}

/// Is the voxel at world (x, y, z) solid? Uses the loaded chunk cells
/// (32³ per chunk, chunk_cell_index layout). Unloaded areas are air.
fn solid_at(chunks: &[(u32, u32, u32, Vec<u16>)], x: f32, y: f32, z: f32) -> bool {
    let vx = x.floor() as i32;
    let vy = y.floor() as i32;
    let vz = z.floor() as i32;
    if vy < 0 {
        return true; // bedrock floor
    }
    if vy >= 256 {
        return false;
    }
    let cx = vx.div_euclid(32) as u32;
    let cy = vy.div_euclid(32) as u32;
    let cz = vz.div_euclid(32) as u32;
    let lx = vx.rem_euclid(32) as u32;
    let ly = vy.rem_euclid(32) as u32;
    let lz = vz.rem_euclid(32) as u32;
    chunks
        .iter()
        .find(|(c, j, k, _)| *c == cx && *j == cy && *k == cz)
        .map(|(_, _, _, cells)| {
            let idx = voxweb_protocol::terrain::chunk_cell_index(lx, ly, lz);
            cells.get(idx).copied().is_some_and(block_is_solid)
        })
        .unwrap_or(false)
}

fn solid_voxel_at(chunks: &[(u32, u32, u32, Vec<u16>)], vx: i32, vy: i32, vz: i32) -> bool {
    if vy < 0 {
        return true;
    }
    block_is_solid(block_voxel_at(chunks, vx, vy, vz))
}

fn block_voxel_at(chunks: &[(u32, u32, u32, Vec<u16>)], vx: i32, vy: i32, vz: i32) -> u16 {
    if !(0..256).contains(&vy) {
        return 0;
    }
    let cx = vx.div_euclid(32) as u32;
    let cy = vy.div_euclid(32) as u32;
    let cz = vz.div_euclid(32) as u32;
    let lx = vx.rem_euclid(32) as u32;
    let ly = vy.rem_euclid(32) as u32;
    let lz = vz.rem_euclid(32) as u32;
    chunks
        .iter()
        .find(|(x, y, z, _)| *x == cx && *y == cy && *z == cz)
        .and_then(|(_, _, _, cells)| {
            cells.get(voxweb_protocol::terrain::chunk_cell_index(lx, ly, lz))
        })
        .copied()
        .unwrap_or(0)
}

fn fluid_volume_fraction(
    position: [f32; 3],
    half_extents: [f32; 3],
    chunks: &[(u32, u32, u32, Vec<u16>)],
) -> f32 {
    let min: [f32; 3] = std::array::from_fn(|axis| position[axis] - half_extents[axis]);
    let max: [f32; 3] = std::array::from_fn(|axis| position[axis] + half_extents[axis]);
    let body_volume = (2.0 * half_extents[0]) * (2.0 * half_extents[1]) * (2.0 * half_extents[2]);
    if body_volume <= 0.0 {
        return 0.0;
    }
    let mut fluid_volume = 0.0;
    for y in min[1].floor() as i32..max[1].ceil() as i32 {
        for z in min[2].floor() as i32..max[2].ceil() as i32 {
            for x in min[0].floor() as i32..max[0].ceil() as i32 {
                if recovered_fluid_info(block_voxel_at(chunks, x, y, z)).is_none() {
                    continue;
                }
                let overlap_x = (max[0].min(x as f32 + 1.0) - min[0].max(x as f32)).max(0.0);
                let overlap_y = (max[1].min(y as f32 + 1.0) - min[1].max(y as f32)).max(0.0);
                let overlap_z = (max[2].min(z as f32 + 1.0) - min[2].max(z as f32)).max(0.0);
                fluid_volume += overlap_x * overlap_y * overlap_z;
            }
        }
    }
    fluid_volume / body_volume
}

fn solid_voxel_indexed(
    chunks: &HashMap<(u32, u32, u32), &[u16]>,
    vx: i32,
    vy: i32,
    vz: i32,
) -> bool {
    if vy < 0 {
        return true;
    }
    if vy >= 256 {
        return false;
    }
    block_is_solid(block_voxel_indexed(chunks, vx, vy, vz))
}

fn block_voxel_indexed(
    chunks: &HashMap<(u32, u32, u32), &[u16]>,
    vx: i32,
    vy: i32,
    vz: i32,
) -> u16 {
    if !(0..256).contains(&vy) {
        return 0;
    }
    let chunk = (
        vx.div_euclid(32) as u32,
        vy.div_euclid(32) as u32,
        vz.div_euclid(32) as u32,
    );
    let local_x = vx.rem_euclid(32) as u32;
    let local_y = vy.rem_euclid(32) as u32;
    let local_z = vz.rem_euclid(32) as u32;
    chunks
        .get(&chunk)
        .and_then(|cells| {
            cells.get(voxweb_protocol::terrain::chunk_cell_index(
                local_x, local_y, local_z,
            ))
        })
        .copied()
        .unwrap_or(0)
}

fn recovered_player_state(
    moving: bool,
    jumping: bool,
    mode: voxweb_protocol::player::MoveMode,
    flying: bool,
    grounded: bool,
    vertical_velocity: f32,
) -> u16 {
    use voxweb_protocol::player::{
        PLAYER_BUTTON_CROUCH, PLAYER_BUTTON_JUMP, PLAYER_BUTTON_WALK, PLAYER_FLY_STATE_FLYING,
        PLAYER_JUMP_STATE_FALL, PLAYER_JUMP_STATE_JUMP, PLAYER_WALK_STATE_RUN,
        PLAYER_WALK_STATE_WALK,
    };

    let walk_state = match mode {
        voxweb_protocol::player::MoveMode::Crouch => 0,
        voxweb_protocol::player::MoveMode::Run => PLAYER_WALK_STATE_RUN,
        _ => PLAYER_WALK_STATE_WALK,
    };
    let jump_state = if flying {
        PLAYER_JUMP_STATE_JUMP
    } else if grounded {
        0
    } else if vertical_velocity > 0.0 {
        PLAYER_JUMP_STATE_JUMP
    } else {
        PLAYER_JUMP_STATE_FALL
    };
    let mut state = walk_state | jump_state;
    if flying {
        state |= PLAYER_FLY_STATE_FLYING;
    }
    if moving {
        state |= PLAYER_BUTTON_WALK;
    }
    if jumping {
        state |= PLAYER_BUTTON_JUMP;
    }
    if mode == voxweb_protocol::player::MoveMode::Crouch {
        state |= PLAYER_BUTTON_CROUCH;
    }
    state
}

/// Build the preserved FOLLOW camera including its nine obstruction rays and
/// gradual outward distance recovery.
fn make_camera(
    width: u32,
    height: u32,
    player: Option<[f32; 3]>,
    body_half_height: f32,
    crouching: bool,
    pitch: f32,
    yaw: f32,
    chunks: &[(u32, u32, u32, Vec<u16>)],
    current_ray_distance: &mut f32,
) -> ([f32; 16], [f32; 3], bool) {
    let aspect = width as f32 / height.max(1) as f32;
    let proj = glam::Mat4::perspective_rh(
        voxweb_protocol::player::CAMERA_FOV_Y_RADIANS,
        aspect,
        0.1,
        2000.0,
    );
    let (eye, target, first_person) = match player {
        Some(body) => {
            let pose = crate::nea_follow_camera::follow_camera_pose(
                body,
                body_half_height,
                crouching,
                pitch,
                yaw,
                *current_ray_distance,
                &|x, y, z| solid_voxel_at(chunks, x, y, z),
            );
            *current_ray_distance = pose.ray_distance;
            (
                glam::Vec3::from(pose.eye),
                glam::Vec3::from(pose.target),
                pose.first_person,
            )
        }
        // pre-player fallback: the spawn island
        None => (
            glam::Vec3::new(144.0, 75.0, 70.0),
            glam::Vec3::new(144.0, 20.0, 144.0),
            false,
        ),
    };
    let view = glam::Mat4::look_at_rh(eye, target, glam::Vec3::Y);
    ((proj * view).to_cols_array(), eye.to_array(), first_person)
}

fn avatar_instance_from_body(
    body: &voxweb_protocol::netstate::RigidBody,
    scale: f32,
) -> AvatarInstance {
    let transmitted = glam::Quat::from_xyzw(body.qx, body.qy, body.qz, body.qw);
    let rotation = if body.vx.hypot(body.vz) > 1.0e-4 {
        let half_angle = recovered_avatar_yaw([body.vx, body.vz], 0.0) * 0.5;
        glam::Quat::from_xyzw(0.0, half_angle.sin(), 0.0, half_angle.cos())
    } else if transmitted.length_squared() > 1e-6 {
        transmitted.normalize()
    } else {
        glam::Quat::IDENTITY
    };
    AvatarInstance::new(
        [body.px, body.py - body.hsy, body.pz],
        rotation.to_array(),
        scale.max(0.01),
    )
}

fn recovered_player_collision_half_extents(
    body: &voxweb_protocol::netstate::RigidBody,
) -> [f32; 3] {
    normalize_player_collision_half_extents([body.hsx, body.hsy, body.hsz])
}

fn normalize_player_collision_half_extents(transmitted: [f32; 3]) -> [f32; 3] {
    const RECOVERED_PLAYER_HALF_EXTENTS: [f32; 3] = [
        voxweb_protocol::player::PLAYER_RADIUS,
        voxweb_protocol::player::PLAYER_HEIGHT,
        voxweb_protocol::player::PLAYER_RADIUS,
    ];
    const SCHEMA_IDENTITY_HALF_EXTENTS: [f32; 3] = [1.0, 1.0, 1.0];
    let is_schema_identity = transmitted
        .iter()
        .zip(SCHEMA_IDENTITY_HALF_EXTENTS)
        .all(|(actual, identity)| (actual - identity).abs() < 1.0e-6);
    if is_schema_identity {
        // RigidBodySchema uses [1, 1, 1] as its generic identity. A local
        // backend without an admitted Player body profile can therefore send
        // a two-block-wide placeholder. The preserved Player constants prove
        // the default upright player shape is [0.45, 1.1, 0.45].
        RECOVERED_PLAYER_HALF_EXTENTS
    } else if transmitted
        .iter()
        .all(|value| value.is_finite() && *value > 0.0)
    {
        transmitted
    } else {
        RECOVERED_PLAYER_HALF_EXTENTS
    }
}

/// Keyboard/mouse state following the recovered 734.js input chain
/// (m76459 + m51531): localPitch = HORIZONTAL turn (mouse X), localYaw =
/// VERTICAL pitch (mouse Y, clamped ±π/2). Radians, not wire bytes.
#[derive(Clone, Copy)]
struct InputState {
    forward: bool,
    back: bool,
    left: bool,
    right: bool,
    jump: bool,
    crouching: bool,
    running: bool,
    last_movement_press_ms: [u32; 4],
    /// edge-triggered jump (set by keydown, consumed by physics) — holding
    /// Space jumps once per press instead of bouncing at every landing
    jump_edge: bool,
    flight_toggle: bool,
    last_jump_press_ms: u32,
    /// horizontal turn (mouse X), radians
    local_pitch: f32,
    /// vertical pitch (mouse Y), radians, clamped ±(π/2 - 1e-3)
    local_yaw: f32,
    /// accumulated mouse deltas (m76459:11081 lookAxisMovement)
    look_axis: [f32; 2],
    /// Debug view 模式：F1=Albedo F2=Direct F3=Ambient/Sky F4=Shadow F5=Fog F6=Final
    debug_view: f32,
}

impl Default for InputState {
    fn default() -> Self {
        Self {
            forward: false,
            back: false,
            left: false,
            right: false,
            jump: false,
            crouching: false,
            running: false,
            last_movement_press_ms: [0; 4],
            jump_edge: false,
            flight_toggle: false,
            last_jump_press_ms: 0,
            // The recovered FPS camera starts level. Do not add a showcase
            // tilt here: it changes the player's initial view direction.
            local_pitch: 0.0,
            local_yaw: 0.0,
            look_axis: [0.0, 0.0],
            debug_view: 0.0,
        }
    }
}

/// m76459:11081 — accumulate mouse deltas (AXIS_SCALE=4, divided by the
/// element width so the turn rate is resolution-independent).
const AXIS_SCALE: f32 = 4.0;
const MOVEMENT_DOUBLE_TAP_MS: u32 = 200;
/// m76459:11035 — vertical pitch clamp.
const PITCH_CLAMP: f32 = std::f32::consts::FRAC_PI_2 - 1e-3;

impl InputState {
    fn movement_pressed(&self) -> bool {
        self.forward || self.back || self.left || self.right
    }
    fn press_movement(&mut self, index: usize) {
        self.press_movement_at(index, now_ms());
    }
    fn press_movement_at(&mut self, index: usize, now: u32) {
        let already_pressed = match index {
            0 => self.forward,
            1 => self.back,
            2 => self.left,
            3 => self.right,
            _ => return,
        };
        if already_pressed {
            return;
        }
        let previous = self.last_movement_press_ms[index];
        if previous > 0 && now.saturating_sub(previous) < MOVEMENT_DOUBLE_TAP_MS {
            self.running = true;
        }
        self.last_movement_press_ms[index] = now;
    }
    fn move_mode(&mut self) -> voxweb_protocol::player::MoveMode {
        if !self.movement_pressed() {
            self.running = false;
        }
        if self.crouching {
            voxweb_protocol::player::MoveMode::Crouch
        } else if self.running {
            voxweb_protocol::player::MoveMode::Run
        } else {
            voxweb_protocol::player::MoveMode::Walk
        }
    }
    fn press_jump(&mut self) {
        self.press_jump_at(now_ms());
    }
    fn press_jump_at(&mut self, now: u32) {
        if self.jump {
            return;
        }
        if self.last_jump_press_ms > 0
            && now.saturating_sub(self.last_jump_press_ms) < MOVEMENT_DOUBLE_TAP_MS
        {
            self.flight_toggle = true;
        }
        self.last_jump_press_ms = now;
        self.jump = true;
        self.jump_edge = true;
    }
    fn apply_mouse_delta(&mut self, dx: f32, dy: f32, element_width: f32) {
        let w = element_width.max(1.0);
        self.look_axis[0] += dx / w * AXIS_SCALE;
        self.look_axis[1] += dy / w * AXIS_SCALE;
    }
    /// m76459:11032-11035 — integrate lookAxisMovement into orientation.
    fn update_orientation(&mut self) {
        self.local_pitch += self.look_axis[0];
        self.local_yaw = (self.local_yaw + self.look_axis[1]).clamp(-PITCH_CLAMP, PITCH_CLAMP);
        self.look_axis = [0.0, 0.0];
    }
    /// m76459:11044 — forward vector we = (cos(pitch), sin(pitch)) in (x, z).
    fn forward(&self) -> [f32; 2] {
        [self.local_pitch.cos(), self.local_pitch.sin()]
    }
    /// m76459:11045 — right (strafe) vector, we rotated +90°.
    fn right(&self) -> [f32; 2] {
        let [fx, fz] = self.forward();
        [-fz, fx]
    }
    /// m76459:11047 — composed movement vector from held keys.
    fn movement_vector(&self) -> [f32; 2] {
        self.movement_vector_with_state(0)
    }
    fn movement_vector_with_state(&self, state: u64) -> [f32; 2] {
        let mut we = self.forward();
        let mut se = self.right();
        if state & 1 != 0 {
            std::mem::swap(&mut we, &mut se);
        }
        if state & 8 != 0 {
            we = [0.0; 2];
        } else if state & 2 != 0 {
            we = [-we[0], -we[1]];
        }
        if state & 16 != 0 {
            se = [0.0; 2];
        } else if state & 4 != 0 {
            se = [-se[0], -se[1]];
        }
        let (mut mx, mut mz) = (0.0f32, 0.0f32);
        if self.left {
            mx -= se[0];
            mz -= se[1];
        }
        if self.right {
            mx += se[0];
            mz += se[1];
        }
        if self.forward {
            mx += we[0];
            mz += we[1];
        }
        if self.back {
            mx -= we[0];
            mz -= we[1];
        }
        [mx, mz]
    }
    /// Wire angle: movement direction when keys held, else camera turn.
    fn angle(&self) -> u8 {
        let me = self.movement_vector();
        voxweb_protocol::player::wire_angle(
            if me[0] != 0.0 || me[1] != 0.0 {
                Some(me)
            } else {
                None
            },
            self.local_pitch,
        )
    }
    fn wire_pitch(&self) -> u8 {
        voxweb_protocol::player::wire_pitch(self.local_yaw)
    }
    fn wire_camera_angle(&self) -> u8 {
        voxweb_protocol::player::wire_camera_angle(self.local_pitch)
    }
}

/// Install keydown/keyup/mousemove listeners that mutate the shared input
/// state. Camera follows the mouse; WASD moves relative to the camera yaw.
fn install_keyboard(canvas: &HtmlCanvasElement, input: &Rc<RefCell<InputState>>) {
    let window = match web_sys::window() {
        Some(w) => w,
        None => return,
    };
    let down_state = Rc::clone(input);
    let up_state = Rc::clone(input);
    let mouse_state = Rc::clone(input);
    let mouse_window = window.clone();
    let mouse_document = window.document();
    let lock_canvas = canvas.clone();
    let on_click =
        Closure::<dyn FnMut(web_sys::MouseEvent)>::new(move |ev: web_sys::MouseEvent| {
            lock_canvas.request_pointer_lock();
            ev.prevent_default();
        });
    let on_down =
        Closure::<dyn FnMut(web_sys::KeyboardEvent)>::new(move |ev: web_sys::KeyboardEvent| {
            let code = ev.code();
            let mut s = match down_state.try_borrow_mut() {
                Ok(s) => s,
                Err(_) => return, // main loop holds the state; skip this event
            };
            let mut handled = false;
            match code.as_str() {
                "KeyW" => {
                    s.press_movement(0);
                    s.forward = true;
                    handled = true;
                }
                "KeyS" => {
                    s.press_movement(1);
                    s.back = true;
                    handled = true;
                }
                "KeyA" => {
                    s.press_movement(2);
                    s.left = true;
                    handled = true;
                }
                "KeyD" => {
                    s.press_movement(3);
                    s.right = true;
                    handled = true;
                }
                "Space" => {
                    s.press_jump();
                    handled = true;
                }
                "ShiftLeft" | "ShiftRight" => {
                    s.crouching = true;
                    handled = true;
                }
                // Debug view 切换：F1..F6（再按同键回到 Final）
                "F1" | "F2" | "F3" | "F4" | "F5" | "F6" => {
                    let index = code.as_str().chars().nth(1).and_then(|c| c.to_digit(10));
                    if let Some(i) = index {
                        let value = i as f32;
                        s.debug_view = if (s.debug_view - value).abs() < 0.5 { 0.0 } else { value };
                        web_sys::console::log_1(&wasm_bindgen::JsValue::from_str(&format!(
                            "[nea] debug view F{i}: {}",
                            match i {
                                1 => "Albedo",
                                2 => "Direct",
                                3 => "Ambient/Sky",
                                4 => "Shadow",
                                5 => "Fog",
                                _ => "Final",
                            }
                        )));
                    }
                    handled = true;
                }
                _ => {}
            }
            if !handled {
                jslog!("[nea] keydown code='{code}'");
            } else {
                ev.prevent_default();
            }
        });
    let on_up =
        Closure::<dyn FnMut(web_sys::KeyboardEvent)>::new(move |ev: web_sys::KeyboardEvent| {
            let mut s = match up_state.try_borrow_mut() {
                Ok(s) => s,
                Err(_) => return,
            };
            match ev.code().as_str() {
                "KeyW" => s.forward = false,
                "KeyS" => s.back = false,
                "KeyA" => s.left = false,
                "KeyD" => s.right = false,
                "Space" => s.jump = false,
                "ShiftLeft" | "ShiftRight" => s.crouching = false,
                _ => {}
            }
            ev.prevent_default();
        });
    let on_mouse =
        Closure::<dyn FnMut(web_sys::MouseEvent)>::new(move |ev: web_sys::MouseEvent| {
            if !mouse_document
                .as_ref()
                .is_some_and(|document| document.pointer_lock_element().is_some())
            {
                return;
            }
            let dx = ev.movement_x();
            let dy = ev.movement_y();
            if dx != 0 || dy != 0 {
                let mut s = match mouse_state.try_borrow_mut() {
                    Ok(s) => s,
                    Err(_) => return,
                };
                // Preserved _applyAxisMovement: movement / element width *
                // 4 * cameraSensitivity. SettingsSchema defaults sensitivity
                // to 1, so use the real viewport width here.
                let width = mouse_window
                    .inner_width()
                    .ok()
                    .and_then(|value| value.as_f64())
                    .unwrap_or(1.0) as f32;
                s.apply_mouse_delta(dx as f32, dy as f32, width);
            }
        });
    let r0 = canvas.add_event_listener_with_callback("click", on_click.as_ref().unchecked_ref());
    let r1 = window.add_event_listener_with_callback("keydown", on_down.as_ref().unchecked_ref());
    let r2 = window.add_event_listener_with_callback("keyup", on_up.as_ref().unchecked_ref());
    let r3 =
        window.add_event_listener_with_callback("mousemove", on_mouse.as_ref().unchecked_ref());
    jslog!(
        "[nea] listener reg: click={} keydown={} keyup={} mousemove={}",
        r0.is_ok(),
        r1.is_ok(),
        r2.is_ok(),
        r3.is_ok()
    );
    on_click.forget();
    on_down.forget();
    on_up.forget();
    on_mouse.forget();
    jslog!("[nea] keyboard + mouse listeners installed");
}

fn origin_of(url: &str) -> String {
    if let Some(scheme_end) = url.find("://") {
        // Absolute URL: keep its own scheme so HTTPS pages never downgrade to
        // http:// (browsers block that as mixed content).
        let scheme = &url[..scheme_end];
        let rest = &url[scheme_end + 3..];
        let end = rest.find('/').unwrap_or(rest.len());
        format!("{scheme}://{}", &rest[..end])
    } else {
        // Relative URL (e.g. ?nea=/api/createSession): assets are same-origin,
        // served by the nginx proxy, so use the page origin as-is.
        web_sys::window()
            .and_then(|window| window.location().origin().ok())
            .unwrap_or_default()
    }
}

/// Read `?contentId=` from the page URL. Defaults to the historical BedWars
/// content id so map selection no longer requires a client rebuild.
fn page_content_id() -> String {
    web_sys::window()
        .and_then(|window| window.location().search().ok())
        .and_then(|search| {
            let query = search.trim_start_matches('?');
            query.split('&').find_map(|pair| {
                let mut parts = pair.splitn(2, '=');
                match (parts.next(), parts.next()) {
                    (Some("contentId"), Some(value)) if !value.is_empty() => {
                        Some(value.to_string())
                    }
                    _ => None,
                }
            })
        })
        .unwrap_or_else(|| "100110008".to_string())
}

async fn create_session(url: &str, content_id: &str) -> Result<(String, String, usize), JsValue> {
    let mut opts = RequestInit::new();
    opts.method("POST");
    let body = format!(
        r#"{{"mode":"play","contentId":"{content_id}","fingerPrint":"voxweb-smoke","serverId":""}}"#
    );
    opts.body(Some(&JsValue::from_str(&body)));
    let request = Request::new_with_str_and_init(url, &opts)?;
    request.headers().set("Content-Type", "application/json")?;
    let window = web_sys::window().ok_or_else(|| JsValue::from_str("no window"))?;
    let resp = JsFuture::from(window.fetch_with_request(&request)).await?;
    let resp: Response = resp.dyn_into()?;
    let text = JsFuture::from(resp.text()?).await?;
    let text: String = text
        .as_string()
        .ok_or_else(|| JsValue::from_str("resp not text"))?;
    if !resp.ok() {
        return Err(JsValue::from_str(&format!(
            "createSession HTTP {}: {}",
            resp.status(),
            text.trim()
        )));
    }
    let config: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| JsValue::from_str(&format!("bad config json: {e}")))?;
    let cfg = config
        .get("config")
        .ok_or_else(|| JsValue::from_str("no config key"))?;
    let session_id = cfg
        .get("sessionId")
        .and_then(|v| v.as_str())
        .ok_or_else(|| JsValue::from_str("no sessionId"))?
        .to_string();
    let socket_url = cfg
        .get("socketServerUrl")
        .and_then(|v| v.as_str())
        .ok_or_else(|| JsValue::from_str("no socketServerUrl"))?
        .to_string();
    let max_sockets = cfg.get("maxSockets").and_then(|v| v.as_u64()).unwrap_or(3) as usize;
    Ok((session_id, socket_url, max_sockets))
}

async fn load_asset_overrides() -> Result<AssetOverrides, JsValue> {
    let window = web_sys::window().ok_or_else(|| JsValue::from_str("no window"))?;
    let resp = JsFuture::from(window.fetch_with_str("/asset-overrides/manifest.json")).await?;
    let resp: Response = resp.dyn_into()?;
    if resp.status() == 404 {
        return Ok(AssetOverrides::default());
    }
    if !resp.ok() {
        return Err(JsValue::from_str(&format!(
            "asset manifest status {}",
            resp.status()
        )));
    }
    let text = JsFuture::from(resp.text()?).await?;
    let text = text
        .as_string()
        .ok_or_else(|| JsValue::from_str("asset manifest response is not text"))?;
    crate::asset_overrides::parse_optional(&text).map_err(|error| JsValue::from_str(&error))
}

async fn fetch_atlas_mips(
    mip_count: usize,
    overrides: &AssetOverrides,
    slot_prefix: &str,
) -> Result<Vec<AtlasImage>, JsValue> {
    let mut images = Vec::with_capacity(mip_count);
    for level in 0..mip_count {
        let slot = format!("{slot_prefix}.{level}");
        let image = if let Some(url) = overrides.replacement(&slot) {
            let bytes = fetch_bytes(url).await?;
            AtlasImage::from_png(&bytes).map_err(|error| {
                JsValue::from_str(&format!("atlas mip {level} decode failed: {error}"))
            })?
        } else {
            let kind = match slot_prefix {
                "terrain.color" => SanitizedAtlasKind::Color,
                "terrain.material" => SanitizedAtlasKind::Material,
                "terrain.bump" => SanitizedAtlasKind::Bump,
                _ => {
                    return Err(JsValue::from_str("unknown sanitized atlas slot"));
                }
            };
            crate::sanitized_assets::atlas_mip(kind, level)
        };
        images.push(image);
    }
    Ok(images)
}

async fn fetch_bytes(url: &str) -> Result<Vec<u8>, JsValue> {
    let window = web_sys::window().ok_or_else(|| JsValue::from_str("no window"))?;
    let resp = JsFuture::from(window.fetch_with_str(url)).await?;
    let resp: Response = resp.dyn_into()?;
    if !resp.ok() {
        return Err(JsValue::from_str(&format!(
            "fetch {url}: status {}",
            resp.status()
        )));
    }
    let buf = JsFuture::from(resp.array_buffer()?).await?;
    let arr = js_sys::Uint8Array::new(&buf);
    Ok(arr.to_vec())
}

async fn load_avatar_renderer(
    origin: &str,
    assets: &[(String, String)],
    overrides: &AssetOverrides,
    device: &wgpu::Device,
    queue: &wgpu::Queue,
    surface_format: wgpu::TextureFormat,
    shadow_map: &voxweb_render::nea_shadow::NeaShadowMap,
) -> Result<NeaAvatarRenderer, String> {
    let mut parts = Vec::with_capacity(assets.len());
    for (name, hash) in assets {
        if !hash
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || b"._-".contains(&byte))
        {
            return Err(format!("invalid avatar hash for {name}"));
        }
        let slot = format!("avatar.{name}");
        let fallback = format!("{origin}/avatar/m/{hash}");
        let url = overrides.replacement(&slot).unwrap_or(&fallback);
        let bytes = fetch_bytes(url)
            .await
            .map_err(|_| format!("avatar part fetch failed for {name}"))?;
        let mut part = voxweb_protocol::decode_avatar_part(&bytes)
            .map_err(|error| format!("avatar part {name}: {error}"))?;
        if overrides.replacement(&slot).is_none() {
            anonymize_avatar_palette(name, &mut part.texture.palette);
        }
        parts.push((name.clone(), part));
    }
    NeaAvatarRenderer::new(
        device,
        queue,
        &parts,
        surface_format,
        wgpu::TextureFormat::Depth32Float,
        shadow_map,
    )
}

fn boxes_from_value(v: &Value) -> Vec<CollisionBox> {
    let mut out = Vec::new();
    if let Value::SortedArray(items) = v {
        for item in items {
            if let Value::Struct(f) = item {
                // VoxelCollisionBoxSchema wire order (MuStruct sort): block
                // (varint), then uint8s alphabetically: faces, maxX, maxY,
                // maxZ, minX, minY, minZ
                let get = |i: usize| -> u32 {
                    match f.get(i) {
                        Some(Value::Varint(x)) => *x,
                        Some(Value::U8(x)) => *x as u32,
                        _ => 0,
                    }
                };
                out.push(CollisionBox {
                    block: get(0),
                    min_x: get(5),
                    min_y: get(6),
                    min_z: get(7),
                    max_x: get(2),
                    max_y: get(3),
                    max_z: get(4),
                });
            }
        }
    }
    out
}

fn send_frames(sockets: &Rc<BrowserSockets>, frames: Vec<voxweb_protocol::driver::SendFrame>) {
    for f in frames {
        if let Some(text) = f.text {
            let _ = sockets.send_reliable_text(&text);
        } else {
            let _ = sockets.send_reliable(&f.bytes);
        }
    }
}

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

fn now_ms() -> u32 {
    web_sys::window()
        .and_then(|w| w.performance())
        .map(|p| p.now() as u32)
        .unwrap_or(0)
}

fn yield_animation_frame() -> js_sys::Promise {
    js_sys::Promise::new(&mut |resolve, reject| {
        if let Some(window) = web_sys::window() {
            if window.request_animation_frame(&resolve).is_err() {
                let _ = reject.call1(&JsValue::UNDEFINED, &JsValue::from_str("RAF unavailable"));
            }
        } else {
            let _ = reject.call1(
                &JsValue::UNDEFINED,
                &JsValue::from_str("window unavailable"),
            );
        }
    })
}

#[cfg(test)]
mod tests {
    use super::{
        AvatarRollState, InputState, block_is_solid, fluid_volume_fraction, make_camera,
        network_tick_is_newer, normalize_player_collision_half_extents, recovered_avatar_yaw,
        recovered_fluid_height, recovered_fluid_info, recovered_player_state,
        recovered_rotated_face_rects, recovered_voxel_face_visible, recovered_walk_phase_delta,
        write_recovered_texture_rotation,
    };
    use voxweb_physics::NeaPlayerPhysics;
    use voxweb_protocol::player::MoveMode;
    use voxweb_render::nea_mesh::{FLOATS_PER_VERTEX, MeshBuffers};

    #[test]
    fn network_ticks_are_monotonic_across_duplicates_and_wraparound() {
        assert!(network_tick_is_newer(10, 11));
        assert!(!network_tick_is_newer(10, 10));
        assert!(!network_tick_is_newer(10, 9));
        assert!(network_tick_is_newer(u32::MAX, 1));
    }

    #[test]
    fn recovered_voxel_rotation_reselects_side_faces() {
        let face = |value| voxweb_protocol::geometry::UvRect {
            u0: value as f32,
            v0: 0.0,
            u1: 0.0,
            v1: 0.0,
        };
        let faces = [face(0), face(1), face(2), face(3), face(4), face(5)];
        let rotated = recovered_rotated_face_rects(faces, 1);
        assert_eq!(rotated[0].u0, 5.0);
        assert_eq!(rotated[1].u0, 4.0);
        assert_eq!(rotated[4].u0, 0.0);
        assert_eq!(rotated[5].u0, 1.0);
        assert_eq!(rotated[2].u0, 2.0);
        assert_eq!(rotated[3].u0, 3.0);
    }

    #[test]
    fn recovered_voxel_rotation_reverses_bottom_uv() {
        let rects = [voxweb_protocol::geometry::face_uv_rect(0, 512.0); 6];
        let mesh =
            voxweb_protocol::geometry::build_box_geometry(0.0, 0.0, 0.0, 1.0, 1.0, 1.0, &rects);
        let mut packed = MeshBuffers::from_box_mesh(&mesh);
        write_recovered_texture_rotation(&mut packed.vertices, 1);
        let rotations: Vec<f32> = packed
            .vertices
            .chunks_exact(FLOATS_PER_VERTEX)
            .map(|vertex| vertex[24])
            .collect();
        assert!(rotations.iter().any(|value| *value == 1.0));
        assert!(rotations.iter().any(|value| *value == 3.0));
    }

    #[test]
    fn air_fluid_sentinel_does_not_enable_underwater_environment() {
        assert_eq!(recovered_fluid_info(0), None);
    }

    #[test]
    fn empty_air_volume_has_no_buoyancy_and_player_falls() {
        let chunks = Vec::new();
        let mut physics = NeaPlayerPhysics::new([0.5, 10.0, 0.5]);
        let fluid = fluid_volume_fraction(physics.position, [0.45, 1.1, 0.45], &chunks);
        assert_eq!(fluid, 0.0);
        physics.set_fluid_volume_fraction(fluid);
        physics.step(
            [0.0, 0.0],
            MoveMode::Walk,
            false,
            false,
            0.05,
            &|_, _, _| false,
        );
        assert!(physics.velocity[1] < 0.0);
    }

    #[test]
    fn render_frames_advance_fractional_recovered_physics_ticks() {
        let tick = voxweb_protocol::player::TICK_SECONDS;
        let mut physics = NeaPlayerPhysics::new([0.5, 2.1, 0.5]);
        let floor = |_: i32, y: i32, _: i32| y == 0;
        physics.observe(&floor);
        let initial_x = physics.position[0];
        physics.step(
            [1.0, 0.0],
            MoveMode::Walk,
            false,
            false,
            tick * 0.25,
            &floor,
        );
        assert!(physics.position[0] < initial_x);
    }

    #[test]
    fn schema_identity_does_not_expand_recovered_player_collision() {
        assert_eq!(
            normalize_player_collision_half_extents([1.0, 1.0, 1.0]),
            [
                voxweb_protocol::player::PLAYER_RADIUS,
                voxweb_protocol::player::PLAYER_HEIGHT,
                voxweb_protocol::player::PLAYER_RADIUS,
            ],
        );
        assert_eq!(
            normalize_player_collision_half_extents([0.3, 0.8, 0.3]),
            [0.3, 0.8, 0.3],
        );
    }

    #[test]
    fn animation_phase_uses_recovered_walk_and_run_cycles() {
        let frame = voxweb_protocol::player::TICK_SECONDS;
        let walk = recovered_walk_phase_delta(frame, MoveMode::Walk);
        let run = recovered_walk_phase_delta(frame, MoveMode::Run);
        assert!((walk - 1.0 / 13.45).abs() < 1.0e-6);
        assert!((run - 1.0 / 5.75).abs() < 1.0e-6);
        assert!(run > walk);
    }

    #[test]
    fn roll_animation_completes_even_when_double_jump_state_is_stale() {
        let mut roll = AvatarRollState::default();
        let frame = voxweb_protocol::player::TICK_SECONDS;
        let mut rendered_frames = 0;
        for _ in 0..32 {
            rendered_frames += usize::from(roll.update(true, false, frame).is_some());
        }
        assert!(rendered_frames > 0);
        assert!(rendered_frames < 32);
        assert!(roll.update(true, false, frame).is_none());
        assert!(roll.update(false, false, frame).is_none());
        assert!(roll.update(true, false, frame).is_none());
        assert!(roll.update(false, true, frame).is_none());
        assert!(roll.update(true, false, frame).is_some());
    }

    #[test]
    fn avatar_yaw_maps_world_direction_to_bind_pose_forward() {
        let epsilon = 1.0e-6;
        assert!(
            (recovered_avatar_yaw([1.0, 0.0], 0.0) + std::f32::consts::FRAC_PI_2).abs() < epsilon
        );
        assert!((recovered_avatar_yaw([0.0, 1.0], 0.0) + std::f32::consts::PI).abs() < epsilon);
        assert!(
            (recovered_avatar_yaw([0.0, 0.0], 0.25)
                - (std::f32::consts::FRAC_PI_2 - (0.25 + std::f32::consts::PI)))
                .abs()
                < epsilon
        );
    }

    #[test]
    fn locally_landed_player_keeps_walking_across_transform_echo_ticks() {
        let floor = |_: i32, y: i32, _: i32| y == 0;
        let mut physics = NeaPlayerPhysics::new([0.5, 2.1, 0.5]);
        physics.observe(&floor);
        let initial_x = physics.position[0];
        for _ in 0..8 {
            // The local backend's acknowledgement carries position and
            // velocity only. Schema-default contact fields are intentionally
            // not applied between these fixed simulation ticks.
            physics.step(
                [1.0, 0.0],
                MoveMode::Walk,
                false,
                false,
                voxweb_protocol::player::TICK_SECONDS,
                &floor,
            );
            assert!(physics.grounded);
        }
        assert!(physics.position[0] < initial_x - 0.01);
    }

    #[test]
    fn recovered_fluid_blocks_do_not_collide_as_solid_voxels() {
        assert!(!block_is_solid(0));
        assert!(!block_is_solid(364));
        assert!(!block_is_solid(412));
        assert!(block_is_solid(259));
    }

    #[test]
    fn voxel_face_rules_match_recovered_worker_id_parity() {
        assert!(recovered_voxel_face_visible(259, 0));
        assert!(recovered_voxel_face_visible(259, 160));
        assert!(!recovered_voxel_face_visible(259, 261));
        assert!(recovered_voxel_face_visible(160, 0));
        assert!(!recovered_voxel_face_visible(160, 259));
        assert!(!recovered_voxel_face_visible(160, 162));
    }

    #[test]
    fn recovered_fluid_surface_uses_worker_five_bit_height_encoding() {
        assert_eq!(recovered_fluid_height(4 * 15), 30.0 / 32.0);
        assert_eq!(recovered_fluid_height(4), 2.0 / 32.0);
    }

    #[test]
    fn recovered_camera_starts_level() {
        let input = InputState::default();

        assert_eq!(input.local_pitch, 0.0);
        assert_eq!(input.local_yaw, 0.0);
    }

    #[test]
    fn movement_double_tap_uses_preserved_200_ms_window() {
        let mut input = InputState::default();
        input.press_movement_at(0, 1_000);
        input.forward = true;
        input.forward = false;
        input.press_movement_at(0, 1_199);
        input.forward = true;
        assert_eq!(input.move_mode(), MoveMode::Run);

        let mut boundary = InputState::default();
        boundary.press_movement_at(0, 1_000);
        boundary.forward = true;
        boundary.forward = false;
        boundary.press_movement_at(0, 1_200);
        boundary.forward = true;
        assert_eq!(boundary.move_mode(), MoveMode::Walk);

        boundary.forward = false;
        assert_eq!(boundary.move_mode(), MoveMode::Walk);
        assert!(!boundary.running);
    }

    #[test]
    fn network_input_uses_recovered_player_state_masks() {
        assert_eq!(
            recovered_player_state(false, false, MoveMode::Walk, false, true, 0.0),
            4
        );
        assert_eq!(
            recovered_player_state(true, false, MoveMode::Walk, false, true, 0.0),
            20
        );
        assert_eq!(
            recovered_player_state(false, true, MoveMode::Walk, false, false, 1.0),
            4 | 32 | 1024,
        );
        assert_eq!(
            recovered_player_state(true, false, MoveMode::Crouch, false, false, -1.0),
            16 | 64 | 1536,
        );
        assert_eq!(
            recovered_player_state(true, false, MoveMode::Run, false, true, 0.0),
            8 | 16
        );
        assert_eq!(
            recovered_player_state(false, false, MoveMode::Walk, true, false, 0.0),
            4 | 1 | 1024
        );
    }

    #[test]
    fn jump_double_tap_requests_flight_at_the_preserved_boundary() {
        let mut input = InputState::default();
        input.press_jump_at(1_000);
        input.jump = false;
        input.press_jump_at(1_199);
        assert!(input.flight_toggle);

        let mut boundary = InputState::default();
        boundary.press_jump_at(1_000);
        boundary.jump = false;
        boundary.press_jump_at(1_200);
        assert!(!boundary.flight_toggle);
    }

    #[test]
    fn authoritative_input_direction_flags_transform_camera_axes() {
        let mut input = InputState::default();
        input.forward = true;
        assert_eq!(input.movement_vector_with_state(0), [1.0, 0.0]);
        assert_eq!(input.movement_vector_with_state(2), [-1.0, 0.0]);
        assert_eq!(input.movement_vector_with_state(8), [0.0, 0.0]);
        assert_eq!(input.movement_vector_with_state(1), [0.0, 1.0]);

        input.forward = false;
        input.right = true;
        assert_eq!(input.movement_vector_with_state(4), [0.0, -1.0]);
        assert_eq!(input.movement_vector_with_state(16), [0.0, 0.0]);
    }

    #[test]
    fn third_person_camera_uses_preserved_follow_defaults() {
        let mut distance = 9.5;
        let (_, eye, first_person) = make_camera(
            1920,
            1080,
            Some([1.0, 2.0, 3.0]),
            1.1,
            false,
            0.0,
            0.0,
            &[],
            &mut distance,
        );
        assert!((eye[0] - 9.5).abs() < 1.0e-5);
        assert!((eye[1] - 3.6).abs() < 1.0e-5);
        assert!((eye[2] - 3.0).abs() < 1.0e-5);
        assert!(!first_person);
    }
}
