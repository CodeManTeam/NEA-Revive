//! Session state machine — drives the full startup + gameplay chain.
//!
//! Mirrors cleanroom MuClientSession (session.mjs): the client-side driver
//! that consumes decoded frames and emits the right outbound messages. Pure
//! state — the transport is injected, so this runs under native tests and
//! the browser alike. The byte-level chain itself is E2E-verified; this
//! module packages it into a reusable state machine.

use crate::player::ClientInput;
use crate::session::{encode_outbound, Outbound, SessionCtx};
use crate::ProtocolTable;

/// Session lifecycle stages (recovered from the preserved client).
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum SessionStage {
    /// createSession HTTP done, sockets opening.
    Connecting,
    /// Reliable socket open, protocol negotiation pending.
    Negotiating,
    /// Protocols configured; join sent.
    Joining,
    /// Secret received (playerId known); synchronize+unpause sent.
    Ready,
    /// net-state frames flowing; gameplay active.
    Playing,
    /// Terminal failure.
    Failed(String),
}

/// A frame to send on the reliable socket.
#[derive(Clone, Debug)]
pub struct SendFrame {
    pub bytes: Vec<u8>,
    pub text: Option<String>,
}

/// The session driver: feed it events (socket open, frames), it returns
/// frames to send and advances the stage.
#[derive(Clone, Debug)]
pub struct SessionDriver {
    pub stage: SessionStage,
    pub player_id: u32,
    pub last_server_tick: u32,
    pub pause_counter: u32,
    /// Outbound tick the next input frame should carry (serverTick+1).
    pub next_input_tick: u32,
    ctx: SessionCtx,
    sent_join: bool,
    sent_sync_unpause: bool,
}

impl SessionDriver {
    pub fn new() -> Self {
        Self {
            stage: SessionStage::Connecting,
            player_id: 0,
            last_server_tick: 0,
            pause_counter: 0,
            next_input_tick: 1,
            ctx: SessionCtx::default(),
            sent_join: false,
            sent_sync_unpause: false,
        }
    }

    /// The reliable socket opened — send the jsonStr validation text.
    pub fn on_reliable_open(
        &mut self,
        _table: &ProtocolTable,
        client_json_str: &str,
        server_json_str: &str,
    ) -> Vec<SendFrame> {
        if !matches!(self.stage, SessionStage::Connecting) {
            return Vec::new();
        }
        self.stage = SessionStage::Negotiating;
        let json = format!(
            "{{\"clientJsonStr\":{},\"serverJsonStr\":{}}}",
            serde_json::to_string(client_json_str).unwrap_or_else(|_| "\"\"".into()),
            serde_json::to_string(server_json_str).unwrap_or_else(|_| "\"\"".into())
        );
        vec![SendFrame {
            bytes: Vec::new(),
            text: Some(json),
        }]
    }

    /// Inbound frame from the reliable socket. Returns frames to send
    /// (e.g. join after negotiation, sync+unpause after secret).
    pub fn on_frame(
        &mut self,
        table: &ProtocolTable,
        bytes: &[u8],
    ) -> Result<Vec<SendFrame>, String> {
        // secret sniff first (matches E2E order)
        if bytes.len() >= 4 && bytes[1] == 1 && bytes[2] == 69 && bytes[3] == 0 {
            let mut s = crate::ReadStream::new(bytes);
            let _ = s.read_varint(); // id 10
            let _ = s.read_varint(); // 1
            let _ = s.read_u8(); // 'E'
            let _ = s.read_u8(); // 0
            let player_id = s.read_varint().map_err(|e| e.to_string())?;
            self.player_id = player_id;
            self.ctx.player_id = player_id;
            self.stage = SessionStage::Ready;
            self.sent_join = true;
            let mut frames = Vec::new();
            if !self.sent_sync_unpause {
                frames.push(self.encode(table, &Outbound::GameNetSynchronize)?);
                frames.push(self.encode(table, &Outbound::GameNetUnpause)?);
                self.sent_sync_unpause = true;
            }
            self.stage = SessionStage::Playing;
            return Ok(frames);
        }
        // else parse as a protocol frame (pong/tick/etc)
        let mut frames = Vec::new();
        match table.parse_client_frame(bytes) {
            Ok((_proto, _name, _parsed)) => {
                if !self.sent_join && matches!(self.stage, SessionStage::Negotiating) {
                    // negotiation done — join
                    frames.push(self.encode(table, &Outbound::GameNetJoin)?);
                    self.sent_join = true;
                    self.stage = SessionStage::Joining;
                }
            }
            Err(_) => {
                // raw net-state tail — update tick from the first varint
                let mut s = crate::ReadStream::new(bytes);
                let id = s.read_varint().unwrap_or(0);
                if id == 10 {
                    // game-net raw payload (strip id)
                    let payload = &bytes[s.offset..];
                    if !payload.is_empty() {
                        let head = crate::ReadStream::new(payload).read_varint().unwrap_or(0);
                        let tick = head >> 1;
                        if tick > 0 && tick_is_newer(self.last_server_tick, tick) {
                            self.last_server_tick = tick;
                            self.next_input_tick = tick.wrapping_add(1);
                        }
                    }
                }
            }
        }
        Ok(frames)
    }

    /// Build the next input frame from a client input (client->server).
    pub fn send_input(
        &mut self,
        table: &ProtocolTable,
        input: &ClientInput,
    ) -> Result<Vec<u8>, String> {
        let schema = table
            .server_schema("game-net", "input")
            .ok_or("input schema")?;
        let mut payload = schema.clone_value(&schema.identity());
        if let crate::Value::Struct(fields) = &mut payload {
            // TimestampedClientInputSchema wire order: pauseCounter(rvarint),
            // tick(rvarint), events(array), input(struct)
            if let crate::Value::RVarint(x) = &mut fields[0] {
                *x = self.pause_counter;
            }
            if let crate::Value::RVarint(x) = &mut fields[1] {
                // server applies inputs by exact tick match
                // (applyInputsAt), so send tick = last server tick + 1
                *x = self.last_server_tick + 1;
            }
            if let crate::Value::Struct(input_v) = &mut fields[3] {
                // NetClientInputSchema: inputState(u16), inputAngle(u8),
                // inputCameraAngle(u8), inputPitch(u8), bodies(sorted)
                if let crate::Value::U16(x) = &mut input_v[0] {
                    *x = input.input_state;
                }
                if let crate::Value::U8(x) = &mut input_v[1] {
                    *x = input.input_angle;
                }
                if let crate::Value::U8(x) = &mut input_v[2] {
                    *x = input.input_camera_angle;
                }
                if let crate::Value::U8(x) = &mut input_v[3] {
                    *x = input.input_pitch;
                }
                // bodies: the server matches body.id against the session
                // playerId (decodeTemporaryLegacyPositionTransformCommand) —
                // an empty body list makes it reject the whole input.
                // RigidBodySchema wire order is 7 fields: px,py,pz,vx,vy,
                // vz,id (NO quaternion) — extra fields shift the id.
                if let crate::Value::SortedArray(bodies) = &mut input_v[4] {
                    *bodies = input
                        .bodies
                        .iter()
                        .map(|b| {
                            crate::Value::Struct(vec![
                                // quantized-float fields (must be Value::Quantized)
                                crate::Value::Quantized(b.px),
                                crate::Value::Quantized(b.py),
                                crate::Value::Quantized(b.pz),
                                crate::Value::Quantized(b.vx),
                                crate::Value::Quantized(b.vy),
                                crate::Value::Quantized(b.vz),
                                // id is a MuVarint field
                                crate::Value::Varint(b.id as u32),
                            ])
                        })
                        .collect();
                }
            }
        }
        encode_outbound_raw(table, "game-net", "input", &payload)
    }

    /// Encode a client Script Runtime event for remoteChannel.sendServerEvent.
    pub fn send_remote_event(
        &self,
        table: &ProtocolTable,
        tick: u32,
        event: serde_json::Value,
    ) -> Result<Vec<u8>, String> {
        encode_outbound(table, &Outbound::RemoteServerEvent { tick, event })
    }

    fn encode(&self, table: &ProtocolTable, outbound: &Outbound) -> Result<SendFrame, String> {
        Ok(SendFrame {
            bytes: encode_outbound(table, outbound)?,
            text: None,
        })
    }
}

fn tick_is_newer(last: u32, next: u32) -> bool {
    if last == 0 {
        return true;
    }
    let delta = next.wrapping_sub(last);
    delta != 0 && delta < (1 << 31)
}

impl Default for SessionDriver {
    fn default() -> Self {
        Self::new()
    }
}

fn encode_outbound_raw(
    table: &ProtocolTable,
    proto: &str,
    msg: &str,
    payload: &crate::Value,
) -> Result<Vec<u8>, String> {
    table.encode_server_message(proto, msg, payload)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::player::{INPUT_JUMP, INPUT_RUN};

    fn table() -> ProtocolTable {
        let raw = std::fs::read_to_string(concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../../tools/parity/fixtures/protocols.json"
        ))
        .expect("protocols.json");
        let j: serde_json::Value = serde_json::from_str(&raw).unwrap();
        let (table, _, _) = ProtocolTable::from_json(&j).unwrap();
        table
    }

    #[test]
    fn negotiation_sends_validation_json() {
        let table = table();
        let mut d = SessionDriver::new();
        let frames = d.on_reliable_open(&table, r#"[]"#, r#"[]"#);
        assert_eq!(frames.len(), 1);
        let text = frames[0].text.as_ref().expect("text frame");
        assert!(text.contains("clientJsonStr"), "validation json: {text}");
        assert!(matches!(d.stage, SessionStage::Negotiating));
    }

    #[test]
    fn secret_advances_to_playing_and_sends_sync_unpause() {
        let table = table();
        let mut d = SessionDriver::new();
        d.stage = SessionStage::Joining;
        // secret frame: id 10, varint(1), 'E', 0, varint(playerId=7)
        let raw = {
            let mut w = crate::WriteStream::new(16);
            w.write_varint(10);
            w.write_varint(1);
            w.write_u8(69);
            w.write_u8(0);
            w.write_varint(7);
            w.bytes
        };
        let frames = d.on_frame(&table, &raw).expect("handle secret");
        assert_eq!(frames.len(), 2, "synchronize + unpause");
        assert_eq!(d.player_id, 7);
        assert_eq!(d.stage, SessionStage::Playing);
        // both frames are server-direction game-net messages
        for f in &frames {
            assert!(f.text.is_none());
            assert!(!f.bytes.is_empty());
        }
    }

    #[test]
    fn input_frame_uses_server_tick_plus_one() {
        let table = table();
        let mut d = SessionDriver::new();
        d.last_server_tick = 10;
        d.next_input_tick = 11;
        let input = ClientInput {
            input_state: INPUT_RUN | INPUT_JUMP,
            input_angle: 64,
            input_camera_angle: 64,
            input_pitch: 0,
            bodies: vec![],
        };
        let bytes = d.send_input(&table, &input).expect("encode input");
        // frame = id varint (6) + payload; parse payload and check tick=11
        assert_eq!(bytes[0], 6, "input message id");
        let mut s = crate::ReadStream::new(&bytes[1..]);
        let schema = table.server_schema("game-net", "input").unwrap();
        let decoded = schema.patch(&schema.identity(), &mut s).expect("patch");
        if let crate::Value::Struct(fields) = decoded {
            assert_eq!(fields[1], crate::Value::RVarint(11), "tick = serverTick+1");
            if let crate::Value::Struct(input_v) = &fields[3] {
                assert_eq!(input_v[0], crate::Value::U16(INPUT_RUN | INPUT_JUMP));
                assert_eq!(input_v[1], crate::Value::U8(64));
            }
        }
    }

    #[test]
    fn net_state_tail_updates_tick() {
        let table = table();
        let mut d = SessionDriver::new();
        // game-net raw id 10 + payload starting with varint(22) = tick 11
        let raw = {
            let mut w = crate::WriteStream::new(16);
            w.write_varint(10); // id
            w.write_varint(22); // tickTwice (tick=11, frameSkip=0)
            w.bytes
        };
        let _ = d.on_frame(&table, &raw).expect("handle");
        assert_eq!(d.last_server_tick, 11);
        assert_eq!(d.next_input_tick, 12);

        let stale = {
            let mut w = crate::WriteStream::new(16);
            w.write_varint(10);
            w.write_varint(18);
            w.bytes
        };
        let _ = d.on_frame(&table, &stale).expect("handle stale frame");
        assert_eq!(d.last_server_tick, 11);
        assert_eq!(d.next_input_tick, 12);
    }
}
