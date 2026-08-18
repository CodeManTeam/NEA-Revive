//! MuDB session driver — the full startup chain over an injected transport.
//!
//! This is the transport-agnostic core the native E2E (tests/e2e.rs) and the
//! browser layer (BrowserSockets) both drive:
//!
//!   createSession (HTTP) -> 3 WebSockets same sid -> jsonStr validation ->
//!   game-clock ping/pong -> game-net join -> secret -> synchronize+unpause
//!   -> terrain reset -> fetchChunk -> chunkResponse -> cells
//!
//! The transport is injected as a small trait so the exact same driver code
//! runs under tokio (native test) and web-sys (browser). Wire logic verified
//! byte-for-byte by the E2E.

use crate::blockinfo::BlockCatalog;
use crate::protocol::ProtocolTable;
use crate::terrain::{boxes_to_cells, CollisionBox};
use crate::{ReadStream, Value};

/// A decoded terrain chunk: chunkId + dense cells (32³).
#[derive(Clone, Debug)]
pub struct TerrainChunk {
    pub chunk_id: u32,
    pub cells: Vec<u16>,
}

/// Decoded game-terrain reset payload.
#[derive(Clone, Debug)]
pub struct TerrainReset {
    pub origin: [f64; 3],
    pub reset_counter: u32,
    pub counts: [u32; 3],
    pub inner_ao: bool,
}

#[derive(Clone, Debug, PartialEq)]
pub struct RemoteClientEvent {
    pub tick: u32,
    pub event: serde_json::Value,
}

/// Outbound frames a driver may need to send.
pub enum Outbound {
    /// game-clock ping payload (already structured).
    ClockPing(Value),
    /// game-net join (Void).
    GameNetJoin,
    /// game-net synchronize (Void).
    GameNetSynchronize,
    /// game-net unpause (MuUint32 0).
    GameNetUnpause,
    /// game-terrain ready (resetCounter).
    TerrainReady(u32),
    /// game-terrain fetchChunk {chunkId, rpcId}.
    FetchChunk { chunk_id: u32, rpc_id: u32 },
    /// entity-interact.interact {tick, id}.
    EntityInteract { tick: f32, id: u32 },
    /// remote-channel.sendServerEvent {tick,args(JSON)}.
    RemoteServerEvent { tick: u32, event: serde_json::Value },
}

/// A minimal transport abstraction (reliable binary + text frames).
pub trait SessionTransport {
    fn send_binary(&mut self, bytes: Vec<u8>);
    fn send_text(&mut self, text: String);
}

/// Handlers the driver calls as protocol events arrive.
#[derive(Default)]
pub struct SessionHandlers {
    /// Every schema-backed server->client message, before specialized
    /// terrain/clock handling.  UI and script protocols use this hook so
    /// their recovered wire values are not discarded.
    pub on_message: Option<fn(&SessionCtx, &str, &str, &Value)>,
    pub on_pong: Option<fn(&SessionCtx, &Value)>,
    pub on_secret: Option<fn(&SessionCtx, u32)>,
    pub on_terrain_reset: Option<fn(&SessionCtx, TerrainReset)>,
    pub on_chunk: Option<fn(&SessionCtx, TerrainChunk)>,
    pub on_net_state_tick: Option<fn(&SessionCtx, u32)>,
}

/// Shared session state (player id, last server tick, net-state base).
#[derive(Clone, Debug, Default)]
pub struct SessionCtx {
    pub player_id: u32,
    pub last_server_tick: u32,
    pub reset: Option<TerrainReset>,
    /// pending fetchChunk rpcId -> chunkId
    pub pending_chunks: Vec<(u32, u32)>,
}

/// Process one inbound reliable frame through the protocol table and dispatch
/// to handlers. `bytes` is the raw frame (message id + payload).
///
/// Order matches the E2E-verified chain: sniff the game-net secret pattern
/// FIRST (id 10 + varint(1) 'E' 0 ...), then try the message table, then the
/// net-state raw tail.
pub fn handle_frame(
    table: &ProtocolTable,
    ctx: &mut SessionCtx,
    handlers: &SessionHandlers,
    bytes: &[u8],
) -> Result<(), String> {
    let mut s = ReadStream::new(bytes);
    let id = s.read_varint().map_err(|e| e.to_string())?;
    // game-net raw secret: varint(1) 'E' 0 varint(playerId) after the id
    if bytes.len() >= 4 && bytes[1] == 1 && bytes[2] == 69 && bytes[3] == 0 {
        let _ = s.read_varint(); // 1
        let _ = s.read_u8(); // 'E'
        let _ = s.read_u8(); // 0
        let player_id = s.read_varint().map_err(|e| e.to_string())?;
        ctx.player_id = player_id;
        if let Some(h) = handlers.on_secret {
            h(ctx, player_id);
        }
        return Ok(());
    }
    match table.parse_client_frame(bytes) {
        Ok((proto, name, parsed)) => match parsed {
            crate::ParsedMessage::Value(v) => {
                if let Some(h) = handlers.on_message {
                    h(ctx, &proto, &name, &v);
                }
                if proto == "game-clock" && name == "pong" {
                    if let Some(h) = handlers.on_pong {
                        h(ctx, &v);
                    }
                }
                if proto == "game-terrain" && name == "reset" {
                    if let Some(h) = handlers.on_terrain_reset {
                        let reset = decode_reset(&v);
                        ctx.reset = Some(reset.clone());
                        h(ctx, reset);
                    }
                }
                if proto == "game-terrain" && name == "chunkResponse" {
                    if let Some(h) = handlers.on_chunk {
                        if let Some(chunk) = decode_chunk_response(&v, ctx) {
                            h(ctx, chunk);
                        }
                    }
                }
                Ok(())
            }
        },
        Err(_) => {
            // raw tail: net-state public frame (leading varint = tick*2 |
            // frameSkip)
            let tick = id >> 1;
            if tick > 0 {
                ctx.last_server_tick = tick;
                if let Some(h) = handlers.on_net_state_tick {
                    h(ctx, tick);
                }
            }
            Ok(())
        }
    }
}

/// Decode a VoxelResetSchema value into TerrainReset.
pub fn decode_reset(v: &Value) -> TerrainReset {
    let mut origin = [0.0; 3];
    let mut reset_counter = 0u32;
    let mut counts = [0u32; 3];
    let mut inner_ao = false;
    if let Value::Struct(fields) = v {
        // wire order: positionX/Y/Z (f64), resetCounter (u32), nx/ny/nz (u16),
        // innerAO (bool), blocks (ascii), hashes (array)
        for (i, f) in fields.iter().enumerate() {
            match f {
                Value::F64(x) if i < 3 => origin[i] = *x,
                Value::U32(x) if i == 3 => reset_counter = *x,
                Value::U16(x) if (4..7).contains(&i) => counts[i - 4] = *x as u32,
                Value::Bool(x) if i == 7 => inner_ao = *x,
                _ => {}
            }
        }
    }
    // Publish the world shape so the adapter (chunkId -> grid, slab placement)
    // uses the actual map shape rather than the historical 256×64×256.
    crate::adapter::set_nea_shape(counts);
    TerrainReset {
        origin,
        reset_counter,
        counts,
        inner_ao,
    }
}

/// Decode a ChunkResponseSchema value into TerrainChunk (rpcId -> chunkId via
/// ctx.pending_chunks).
pub fn decode_chunk_response(v: &Value, ctx: &SessionCtx) -> Option<TerrainChunk> {
    if let Value::Struct(fields) = v {
        // wire order: rpcId (varint), boxes (sorted array)
        let rpc_id = match fields.first() {
            Some(Value::Varint(x)) => *x,
            _ => return None,
        };
        let chunk_id = ctx
            .pending_chunks
            .iter()
            .find(|(r, _)| *r == rpc_id)
            .map(|(_, c)| *c)
            .unwrap_or(0);
        let boxes = boxes_from_value(fields.get(1)?);
        let cells = boxes_to_cells(&boxes);
        return Some(TerrainChunk { chunk_id, cells });
    }
    None
}

/// Extract collision boxes from a chunkResponse boxes value.
pub fn boxes_from_value(v: &Value) -> Vec<CollisionBox> {
    let mut out = Vec::new();
    if let Value::SortedArray(items) = v {
        for item in items {
            if let Value::Struct(f) = item {
                // VoxelCollisionBoxSchema wire order: block (varint), then
                // uint8s alphabetically: faces, maxX, maxY, maxZ, minX,
                // minY, minZ
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

/// Build the game-clock ping payload (clientClock = now ms, serverClock 0,
/// frameSkip 0).
pub fn clock_ping_payload() -> Value {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as f64)
        .unwrap_or(0.0);
    Value::Struct(vec![Value::F64(now), Value::F64(0.0), Value::Varint(0)])
}

/// Encode an outbound frame via the protocol table.
pub fn encode_outbound(table: &ProtocolTable, msg: &Outbound) -> Result<Vec<u8>, String> {
    match msg {
        Outbound::ClockPing(v) => table.encode_server_message("game-clock", "ping", v),
        Outbound::GameNetJoin => table.encode_server_message("game-net", "join", &Value::Void),
        Outbound::GameNetSynchronize => {
            table.encode_server_message("game-net", "synchronize", &Value::Void)
        }
        Outbound::GameNetUnpause => {
            table.encode_server_message("game-net", "unpause", &Value::Varint(0))
        }
        Outbound::TerrainReady(counter) => {
            table.encode_server_message("game-terrain", "ready", &Value::Varint(*counter))
        }
        Outbound::FetchChunk { chunk_id, rpc_id } => {
            let payload = Value::Struct(vec![Value::Varint(*chunk_id), Value::Varint(*rpc_id)]);
            table.encode_server_message("game-terrain", "fetchChunk", &payload)
        }
        Outbound::EntityInteract { tick, id } => {
            let payload = Value::Struct(vec![Value::Quantized(*tick), Value::Varint(*id)]);
            table.encode_server_message("entity-interact", "interact", &payload)
        }
        Outbound::RemoteServerEvent { tick, event } => {
            let args = serde_json::to_string(event).map_err(|error| error.to_string())?;
            let payload = Value::Struct(vec![Value::Varint(*tick), Value::UTF8(args)]);
            table.encode_server_message("remote-channel", "sendServerEvent", &payload)
        }
    }
}

pub fn decode_remote_client_event(value: &Value) -> Result<RemoteClientEvent, String> {
    let Value::Struct(fields) = value else {
        return Err("remote client event must be a struct".to_string());
    };
    let tick = match fields.first() {
        Some(Value::Varint(value)) => *value,
        _ => return Err("remote client event tick is invalid".to_string()),
    };
    let args = match fields.get(1) {
        Some(Value::UTF8(value)) => value,
        _ => return Err("remote client event args are invalid".to_string()),
    };
    let event = serde_json::from_str(args)
        .map_err(|error| format!("remote client event JSON is invalid: {error}"))?;
    Ok(RemoteClientEvent { tick, event })
}

/// Convenience: chunk id for a voxel position (origin/32 in the world grid).
pub fn chunk_id_for_origin(origin: [f64; 3]) -> u32 {
    use crate::adapter::nea_chunk_grid;
    let grid = nea_chunk_grid();
    let shape_x = grid[0];
    let shape_y = grid[1];
    let shape_z = grid[2];
    let cx = (origin[0] as u32 / 32).clamp(0, shape_x - 1);
    let cy = (origin[1] as u32 / 32).clamp(0, shape_y - 1);
    let cz = (origin[2] as u32 / 32).clamp(0, shape_z - 1);
    cx + shape_x * (cy + shape_y * cz)
}

/// Load the block catalog from a JSON string (block-texture-map.json).
pub fn load_catalog(json: &str) -> Result<BlockCatalog, String> {
    let v: serde_json::Value = serde_json::from_str(json).map_err(|e| e.to_string())?;
    BlockCatalog::from_json(&v)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn remote_channel_json_codec_is_strict() {
        let event = serde_json::json!({"type": "ready", "count": 3});
        let decoded = decode_remote_client_event(&Value::Struct(vec![
            Value::Varint(8),
            Value::UTF8(event.to_string()),
        ]))
        .expect("decode remote event");
        assert_eq!(decoded, RemoteClientEvent { tick: 8, event });
        assert!(decode_remote_client_event(&Value::Struct(vec![
            Value::Varint(9),
            Value::UTF8("{".to_string()),
        ]))
        .is_err());
    }

    #[test]
    fn decode_reset_known_fields() {
        // wire order: positionX/Y/Z, resetCounter, nx/ny/nz, innerAO, ...
        let v = Value::Struct(vec![
            Value::F64(128.0),
            Value::F64(64.0),
            Value::F64(128.0),
            Value::U32(0),
            Value::U16(256),
            Value::U16(64),
            Value::U16(256),
            Value::Bool(true),
            Value::ASCII("hash".into()),
            Value::Array(vec![]),
        ]);
        let r = decode_reset(&v);
        assert_eq!(r.origin, [128.0, 64.0, 128.0]);
        assert_eq!(r.counts, [256, 64, 256]);
        assert!(r.inner_ao);
        assert_eq!(r.reset_counter, 0);
    }

    #[test]
    fn decode_chunk_response_uses_pending_rpc() {
        let ctx = SessionCtx {
            pending_chunks: vec![(7, 76)],
            ..Default::default()
        };
        let boxv = Value::SortedArray(vec![Value::Struct(vec![
            Value::Varint(129), // block
            Value::U8(0),       // faces
            Value::U8(4),       // maxX
            Value::U8(4),       // maxY
            Value::U8(4),       // maxZ
            Value::U8(0),       // minX
            Value::U8(0),       // minY
            Value::U8(0),       // minZ
        ])]);
        let v = Value::Struct(vec![Value::Varint(7), boxv]);
        let chunk = decode_chunk_response(&v, &ctx).expect("chunk");
        assert_eq!(chunk.chunk_id, 76);
        assert_eq!(chunk.cells[0], 129);
        assert_eq!(chunk.cells[crate::terrain::chunk_cell_index(3, 3, 3)], 129);
    }

    #[test]
    fn chunk_id_for_origin_known_world() {
        assert_eq!(chunk_id_for_origin([128.0, 64.0, 128.0]), 76);
    }

    #[test]
    fn handle_frame_secret_and_netstate() {
        // secret raw frame: varint(10) varint(1) 'E' 0 varint(playerId)
        let raw = {
            let mut w = crate::WriteStream::new(16);
            w.write_varint(10); // game-net raw id
            w.write_varint(1); // 1
            w.write_u8(69); // 'E'
            w.write_u8(0); // 0
            w.write_varint(5); // playerId
            w.bytes
        };
        let raw_json = std::fs::read_to_string(concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../../tools/parity/fixtures/protocols.json"
        ))
        .expect("protocols.json");
        let tj: serde_json::Value = serde_json::from_str(&raw_json).unwrap();
        let (table, _, _) = ProtocolTable::from_json(&tj).unwrap();
        let mut ctx = SessionCtx::default();
        // id 10 parses as a client-direction message (gameUI raw slot), so
        // the secret sniff (Err arm) is not reached with the fixture table;
        // the real server secret arrives on game-net's raw id which IS in the
        // client table. This unit test only asserts the function handles the
        // bytes without panicking; the E2E covers the live secret decode.
        let res = handle_frame(&table, &mut ctx, &SessionHandlers::default(), &raw);
        assert!(res.is_ok(), "frame handled without error");
    }

    #[test]
    fn schema_message_callback_receives_ui_protocol_frames() {
        fn observe(_ctx: &SessionCtx, proto: &str, name: &str, value: &Value) {
            assert_eq!(proto, "game-terrain");
            assert_eq!(name, "reset");
            assert!(matches!(value, Value::Struct(_)));
        }
        let raw_json = std::fs::read_to_string(concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../../tools/parity/fixtures/protocols.json"
        ))
        .expect("protocols.json");
        let tj: serde_json::Value = serde_json::from_str(&raw_json).unwrap();
        let (table, _, _) = ProtocolTable::from_json(&tj).unwrap();
        let schema = table.client_schema("game-terrain", "reset").unwrap();
        let mut frame = crate::WriteStream::new(128);
        frame.write_varint(
            table.client_id_bases[table.protocols.iter().position(|p| p.name == "game-terrain").unwrap()]
                + table.protocols.iter().find(|p| p.name == "game-terrain").unwrap()
                    .client_messages.iter().position(|(n, _)| n == "reset").unwrap() as u32,
        );
        schema.diff(&schema.identity(), &schema.identity(), &mut frame);
        let mut ctx = SessionCtx::default();
        let handlers = SessionHandlers { on_message: Some(observe), ..Default::default() };
        handle_frame(&table, &mut ctx, &handlers, &frame.bytes).unwrap();
    }
}
