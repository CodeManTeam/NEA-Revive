//! Net-state RUNTIME decode — the server's reduced-authoritative wire
//! contract (box3-server.cjs encodeNetPublicPacket), ported 1:1 from
//! cleanroom net-state-runtime.mjs (itself black-box verified against live
//! server frames).
//!
//! Why hand-written instead of the generic Schema system: the server encodes
//! most replica sections as MuVoid and rigid bodies as an EMPTY-struct with a
//! hand-rolled 32-bit mask + relative-delta encoding (NOT the MuStruct
//! tracker bitmap). PlayerSchema / PlayerInputSchema bodies are standard
//! MuStructs, but the surrounding frame layout is bespoke.
//!
//! Frame: varint(tick*2|frameSkip) + NetPublicRuntimeSchema.patch(base) +
//! varint(pauseCounter). Deltas are relative to the previous frame's decoded
//! state (incremental), so the caller must keep the base state across frames.
//!
//! Field order inside NetPublicRuntimeSchema (MuStruct sort, size desc then
//! name asc): frameSkip(rvarint,5), tick(rvarint,5), replica(struct,-1),
//! state(struct,-1). NOTE replica sorts BEFORE state.

use crate::ReadStream;

/// Relative varint schroeppel bias (matches rvarint.js).
const RELATIVE_BIAS: i32 = 0xAAAAAAAAu32 as i32;

/// Fixed quantization for rigid-body scalar fields (BODY_Q = 256).
const BODY_Q: f32 = 256.0;

/// decodeRelative: ((BIAS ^ encoded) - BIAS) >> 0 as i32.
fn decode_relative(encoded: u32) -> i32 {
    ((RELATIVE_BIAS as u32 ^ encoded).wrapping_sub(RELATIVE_BIAS as u32)) as i32
}

/// readRelative: read a varint then schroeppel-decode it.
fn read_relative(s: &mut ReadStream) -> Result<i32, String> {
    let enc = s.read_varint().map_err(|e| e.to_string())?;
    Ok(decode_relative(enc))
}

/// applyQuantizedDelta: (round(base*Q) + delta) / Q.
fn apply_quantized_delta(base: f32, delta: i32) -> f32 {
    ((base * BODY_Q).round() + delta as f32) / BODY_Q
}

/// One decoded rigid body (player physics body).
#[derive(Clone, Debug, PartialEq)]
pub struct RigidBody {
    pub id: u32,
    pub flags: u32,
    pub group: u32,
    pub mass: f32,
    pub friction: f32,
    pub restitution: f32,
    pub rx: f32,
    pub ry: f32,
    pub rz: f32,
    pub px: f32,
    pub py: f32,
    pub pz: f32,
    pub vx: f32,
    pub vy: f32,
    pub vz: f32,
    pub qx: f32,
    pub qy: f32,
    pub qz: f32,
    pub qw: f32,
    pub hsx: f32,
    pub hsy: f32,
    pub hsz: f32,
    pub ax: f32,
    pub ay: f32,
    pub az: f32,
}

impl RigidBody {
    fn identity() -> Self {
        Self {
            id: 0,
            flags: 6,
            group: 0,
            mass: 1.0,
            friction: 0.0,
            restitution: 0.0,
            rx: 1.0,
            ry: 1.0,
            rz: 1.0,
            px: 0.0,
            py: 0.0,
            pz: 0.0,
            vx: 0.0,
            vy: 0.0,
            vz: 0.0,
            qx: 0.0,
            qy: 0.0,
            qz: 0.0,
            qw: 1.0,
            hsx: 1.0,
            hsy: 1.0,
            hsz: 1.0,
            ax: 0.0,
            ay: 0.0,
            az: 0.0,
        }
    }
}

/// RigidBodyRuntimeSchema.patch: 32-bit mask + relative deltas (1:1 port).
fn patch_rigid_body(base: &RigidBody, s: &mut ReadStream) -> Result<RigidBody, String> {
    let mask = s.read_varint().map_err(|e| e.to_string())?;
    let mut t = base.clone();
    t.flags = base.flags ^ ((mask >> 6) & 31);
    if mask & (1 << 18) != 0 {
        t.id = (base.id as i64 + read_relative(s)? as i64) as u32;
    }
    if mask & (1 << 14) != 0 {
        t.group = (base.group as i64 + read_relative(s)? as i64) as u32;
    }
    if mask & (1 << 15) != 0 {
        t.mass = apply_quantized_delta(base.mass, read_relative(s)?);
    }
    if mask & (1 << 16) != 0 {
        t.friction = apply_quantized_delta(base.friction, read_relative(s)?);
    }
    if mask & (1 << 17) != 0 {
        t.restitution = apply_quantized_delta(base.restitution, read_relative(s)?);
    }
    if mask & (1 << 11) != 0 {
        t.rx = apply_quantized_delta(base.rx, read_relative(s)?);
    }
    if mask & (2 << 11) != 0 {
        t.ry = apply_quantized_delta(base.ry, read_relative(s)?);
    }
    if mask & (4 << 11) != 0 {
        t.rz = apply_quantized_delta(base.rz, read_relative(s)?);
    }
    if mask & 1 != 0 {
        t.px = apply_quantized_delta(base.px, read_relative(s)?);
    }
    if mask & 2 != 0 {
        t.py = apply_quantized_delta(base.py, read_relative(s)?);
    }
    if mask & 4 != 0 {
        t.pz = apply_quantized_delta(base.pz, read_relative(s)?);
    }
    if mask & (1 << 3) != 0 {
        t.vx = apply_quantized_delta(base.vx, read_relative(s)?);
    }
    if mask & (2 << 3) != 0 {
        t.vy = apply_quantized_delta(base.vy, read_relative(s)?);
    }
    if mask & (4 << 3) != 0 {
        t.vz = apply_quantized_delta(base.vz, read_relative(s)?);
    }
    if mask & (1 << 19) != 0 {
        t.qx = apply_quantized_delta(base.qx, read_relative(s)?);
    }
    if mask & (2 << 19) != 0 {
        t.qy = apply_quantized_delta(base.qy, read_relative(s)?);
    }
    if mask & (4 << 19) != 0 {
        t.qz = apply_quantized_delta(base.qz, read_relative(s)?);
    }
    if mask & (8 << 19) != 0 {
        t.qw = apply_quantized_delta(base.qw, read_relative(s)?);
    }
    if mask & (1 << 23) != 0 {
        t.hsx = apply_quantized_delta(base.hsx, read_relative(s)?);
    }
    if mask & (2 << 23) != 0 {
        t.hsy = apply_quantized_delta(base.hsy, read_relative(s)?);
    }
    if mask & (4 << 23) != 0 {
        t.hsz = apply_quantized_delta(base.hsz, read_relative(s)?);
    }
    if mask & (1 << 26) != 0 {
        t.ax = apply_quantized_delta(base.ax, read_relative(s)?);
    }
    if mask & (2 << 26) != 0 {
        t.ay = apply_quantized_delta(base.ay, read_relative(s)?);
    }
    if mask & (4 << 26) != 0 {
        t.az = apply_quantized_delta(base.az, read_relative(s)?);
    }
    Ok(t)
}

/// MuSortedArray patch for rigid bodies (opcodes: SKIP=0 PATCH=1 INSERT=2
/// INSERT_IDENTITY=3 COPY=4; op = (count<<3)|code). 1:1 port of
/// Shared/mudb sorted-array.js patch().
fn patch_sorted_rigid_bodies(
    base: &[RigidBody],
    s: &mut ReadStream,
) -> Result<Vec<RigidBody>, String> {
    let num_ops = s.read_u32().map_err(|e| e.to_string())?;
    let mut result: Vec<RigidBody> = Vec::new();
    let mut ptr = 0usize;
    for _ in 0..num_ops {
        let code = s.read_u32().map_err(|e| e.to_string())?;
        let count = (code >> 3) as usize;
        match code & 0x7 {
            3 => {
                // INSERT_IDENTITY
                for _ in 0..count {
                    result.push(RigidBody::identity());
                }
            }
            2 => {
                // INSERT: patch(identity, inp)
                for _ in 0..count {
                    result.push(patch_rigid_body(&RigidBody::identity(), s)?);
                }
            }
            1 => {
                // PATCH: patch(base[ptr++], inp)
                for _ in 0..count {
                    let prev = base.get(ptr).cloned().unwrap_or_else(RigidBody::identity);
                    ptr += 1;
                    result.push(patch_rigid_body(&prev, s)?);
                }
            }
            4 => {
                // COPY: clone(base[ptr++])
                for _ in 0..count {
                    result.push(base.get(ptr).cloned().unwrap_or_else(RigidBody::identity));
                    ptr += 1;
                }
            }
            0 => {
                // SKIP: ptr += count
                ptr += count;
            }
            other => return Err(format!("unknown sorted opcode {other}")),
        }
    }
    Ok(result)
}

/// A decoded net-public frame (minimal fields the runtime needs).
#[derive(Clone, Debug, Default)]
pub struct NetPublicFrame {
    pub tick: u32,
    pub frame_skip: u32,
    pub pause_counter: u32,
    pub bodies: Vec<RigidBody>,
    /// Decoded replica players (ServerPlayerDisplaySchema) — names/tags/ids
    /// for the player list UI.
    pub players: Vec<ServerPlayerDisplay>,
    /// Decoded net-state players (PlayerSchema) — full movement config.
    pub player_states: Vec<crate::Value>,
    pub runtime_players: Vec<RuntimePlayerState>,
    /// Decoded player inputs (PlayerInputSchema).
    pub player_inputs: Vec<crate::Value>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct RuntimePlayerState {
    pub id: u64,
    pub flags: u64,
    pub phys_ground: bool,
    pub phys_fluid: f32,
    pub input_direction_state: u64,
    pub occupancy: u64,
    pub platform_velocity: [f32; 3],
    pub walk_speed: f32,
    pub walk_acceleration: f32,
    pub run_speed: f32,
    pub run_acceleration: f32,
    pub crouch_speed: f32,
    pub crouch_acceleration: f32,
    pub swim_speed: f32,
    pub swim_acceleration: f32,
    pub fly_speed: f32,
    pub fly_acceleration: f32,
    pub jump_speed_factor: f32,
    pub jump_acceleration_factor: f32,
    pub jump_power: f32,
    pub double_jump_power: f32,
    pub step_height: f32,
}

/// ServerPlayerDisplaySchema decoded value (replica section).
#[derive(Clone, Debug, PartialEq)]
pub struct ServerPlayerDisplay {
    pub id: u64,
    pub flags: u64,
    pub tag: u64,
    pub name: String,
    pub scale: f32,
    pub avatar_skin: [u32; 18],
    pub map_skin: [u32; 18],
    pub skin_invisible: [bool; 18],
}

/// Incremental net-state base — keep across frames; first frame patches the
/// schema identity.
#[derive(Clone, Debug)]
pub struct NetStateBase {
    pub tick: u32,
    pub frame_skip: u32,
    pub bodies: Vec<RigidBody>,
    /// replica players sorted-array base (ServerPlayerDisplaySchema).
    pub replica_players: crate::Value,
    /// net-state playerInputs sorted-array base.
    pub player_inputs: crate::Value,
    /// net-state players sorted-array base (PlayerSchema).
    pub player_states: crate::Value,
}

impl Default for NetStateBase {
    fn default() -> Self {
        Self {
            tick: 0,
            frame_skip: 0,
            bodies: Vec::new(),
            replica_players: crate::Value::SortedArray(Vec::new()),
            player_inputs: crate::Value::SortedArray(Vec::new()),
            player_states: crate::Value::SortedArray(Vec::new()),
        }
    }
}

/// Decode one net-public frame, updating `base` in place.
///
/// 1:1 port of decodeNetPublicFrame. Wire order (MuStruct sort, size desc
/// then name asc):
/// - NetPublicRuntime: [frameSkip(rvarint), tick(rvarint), replica(struct),
///   state(struct)] — note replica BEFORE state.
/// - NetStateRuntime: [bodies, collisionFilter, physics, playerInputs,
///   players, zoneSelectors, zones] (all non-primitive -> alphabetical).
/// - GameReplicaRuntime: [running, sync (boolean), damage, entities,
///   entityName, environment, interactive, keyframes, models, particles,
///   players, sound] — 12 fields -> TWO tracker bytes.
///
/// Standard fields (damage/entities/players/playerInputs) are consumed via
/// the generic Schema system; rigid bodies use the mask patch above.
/// entityName/models use the replica-quantized-vec3 type which is not yet
/// supported — those tracker bits return an error (not set on the verified
/// server frames).
pub fn decode_net_public_frame(
    bytes: &[u8],
    base: &mut NetStateBase,
) -> Result<NetPublicFrame, String> {
    let mut s = ReadStream::new(bytes);
    let tick_twice = s.read_varint().map_err(|e| e.to_string())?;
    let frame_skip = tick_twice & 1;
    base.frame_skip = frame_skip;

    // NetPublicSchema (mudb struct sort: primitive types by descending
    // primitive index, then non-primitives by property name — replica
    // sorts BEFORE state): field0 frameSkip (rvarint, bit0), field1 tick
    // (rvarint, bit1), field2 replica (struct, bit2), field3 state
    // (struct, bit3)
    let tracker = s.read_u8().map_err(|e| e.to_string())?;
    let mut tick = base.tick;
    // field 0: frameSkip (rvarint)
    if tracker & 0x01 != 0 {
        let _ = read_relative(&mut s)?;
    }
    // field 1: tick (rvarint). The server diffs against the IDENTITY base
    // every frame (verified: identical 271B payloads carry the same delta),
    // so the delta IS the absolute tick — do not accumulate it.
    if tracker & 0x02 != 0 {
        let delta = read_relative(&mut s)?;
        tick = delta as u32;
    }
    // field 2: replica (struct) — 2 tracker bytes (12 fields)
    let mut replica_players = base.replica_players.clone();
    if tracker & 0x04 != 0 {
        let rep0 = s.read_u8().map_err(|e| e.to_string())?;
        let rep1 = s.read_u8().map_err(|e| e.to_string())?;
        // running (bit0) / sync (bit1): boolean, no bytes
        // damage (bit2): sorted-array<DamageSchema>
        if rep0 & 0x04 != 0 {
            consume_sorted(&mut s, "damageSet")?;
        }
        // entities (bit3): sorted-array<MuVarint>
        if rep0 & 0x08 != 0 {
            consume_varint_sorted(&mut s)?;
        }
        // entityName (bit4): contains replica-quantized-vec3 — unsupported
        if rep0 & 0x10 != 0 {
            return Err(format!(
                "replica entityName uses unsupported rqvec3 type (rep0={rep0:#x} rep1={rep1:#x})"
            ));
        }
        // environment(bit5) interactive(bit6) keyframes(bit7): void, no bytes
        // models (byte1 bit0): unsupported (NetModelSetSchema internals)
        if rep1 & 0x01 != 0 {
            return Err(format!(
                "replica models uses unsupported types (rep0={rep0:#x} rep1={rep1:#x})"
            ));
        }
        // particles (byte1 bit1): void
        // players (byte1 bit2): sorted-array<ServerPlayerDisplaySchema>
        if rep1 & 0x04 != 0 {
            let (base_v, new_v) = decode_sorted_field(
                &mut s,
                "gameReplicaRuntime",
                "players",
                &base.replica_players,
            )?;
            base.replica_players = base_v;
            replica_players = new_v;
        }
        // sound (byte1 bit3): void
    }
    // field 3: state (struct) — 1 tracker byte (7 fields)
    let mut bodies = base.bodies.clone();
    let mut player_inputs = base.player_inputs.clone();
    let mut player_states = base.player_states.clone();
    if tracker & 0x08 != 0 {
        let state_tracker = s.read_u8().map_err(|e| e.to_string())?;
        if state_tracker & 0x01 != 0 {
            bodies = patch_sorted_rigid_bodies(&base.bodies, &mut s)?;
        }
        // collisionFilter(bit1) physics(bit2): void
        // playerInputs (bit3): sorted-array<PlayerInputSchema>
        if state_tracker & 0x08 != 0 {
            let (base_v, new_v) = decode_sorted_field(
                &mut s,
                "netStateRuntime",
                "playerInputs",
                &base.player_inputs,
            )?;
            base.player_inputs = base_v;
            player_inputs = new_v;
        }
        // players (bit4): sorted-array<PlayerSchema>
        if state_tracker & 0x10 != 0 {
            let (base_v, new_v) =
                decode_sorted_field(&mut s, "netStateRuntime", "players", &base.player_states)?;
            base.player_states = base_v;
            player_states = new_v;
        }
        // zoneSelectors(bit5) zones(bit6): void
    }
    // replica players (byte1 bit2) — decoded into ServerPlayerDisplay list
    // (handled above in the replica section; value captured via base)
    let players = server_players_from_value(&replica_players);
    let player_states_out = match &player_states {
        crate::Value::SortedArray(items) => items.clone(),
        _ => Vec::new(),
    };
    let player_inputs_out = match &player_inputs {
        crate::Value::SortedArray(items) => items.clone(),
        _ => Vec::new(),
    };
    base.tick = tick;
    base.bodies = bodies.clone();
    base.replica_players = replica_players;

    let pause_counter = if s.offset < bytes.len() {
        s.read_varint().map_err(|e| e.to_string())?
    } else {
        0
    };

    let runtime_players = runtime_players_from_values(&player_states_out);
    Ok(NetPublicFrame {
        tick,
        frame_skip,
        pause_counter,
        bodies,
        players,
        player_states: player_states_out,
        runtime_players,
        player_inputs: player_inputs_out,
    })
}

fn runtime_players_from_values(values: &[crate::Value]) -> Vec<RuntimePlayerState> {
    values
        .iter()
        .filter_map(runtime_player_from_value)
        .collect()
}

fn runtime_player_from_value(value: &crate::Value) -> Option<RuntimePlayerState> {
    let crate::Value::Struct(fields) = value else {
        return None;
    };
    let number = |index: usize| match fields.get(index) {
        Some(crate::Value::Quantized(value)) | Some(crate::Value::F32(value)) => *value,
        Some(crate::Value::F64(value)) => *value as f32,
        _ => 0.0,
    };
    let integer = |index: usize| match fields.get(index) {
        Some(crate::Value::Varint(value)) => *value as u64,
        Some(crate::Value::U32(value)) => *value as u64,
        Some(crate::Value::U16(value)) => *value as u64,
        Some(crate::Value::U8(value)) => *value as u64,
        _ => 0,
    };
    Some(RuntimePlayerState {
        crouch_acceleration: number(0),
        crouch_speed: number(1),
        double_jump_power: number(2),
        fly_acceleration: number(3),
        fly_speed: number(4),
        jump_acceleration_factor: number(5),
        jump_power: number(6),
        jump_speed_factor: number(7),
        phys_fluid: number(8),
        platform_velocity: [number(9), number(10), number(11)],
        run_acceleration: number(12),
        run_speed: number(13),
        step_height: number(14),
        swim_acceleration: number(15),
        swim_speed: number(16),
        walk_acceleration: number(17),
        walk_speed: number(18),
        flags: integer(19),
        id: integer(20),
        input_direction_state: integer(22),
        occupancy: integer(23),
        phys_ground: matches!(fields.get(24), Some(crate::Value::Bool(true))),
    })
}

/// Extract ServerPlayerDisplay records from a replica players sorted-array
/// value (ServerPlayerDisplaySchema wire order: emissive, metalness, scale,
/// shininess, flags, id, tag, attachments(void), avatarSkin, avatar_hash
/// (void), color(void), mapSkin, name, skinInvisible, userId(void)).
fn server_players_from_value(v: &crate::Value) -> Vec<ServerPlayerDisplay> {
    let mut out = Vec::new();
    if let crate::Value::SortedArray(items) = v {
        for item in items {
            if let crate::Value::Struct(f) = item {
                let get_varint = |i: usize| -> u64 {
                    match f.get(i) {
                        Some(crate::Value::Varint(x)) => *x as u64,
                        Some(crate::Value::U32(x)) => *x as u64,
                        _ => 0,
                    }
                };
                let name = match f.get(12) {
                    Some(crate::Value::UTF8(s)) => s.clone(),
                    _ => String::new(),
                };
                let get_skin_ids = |i: usize| -> [u32; 18] {
                    let Some(crate::Value::Struct(parts)) = f.get(i) else {
                        return [0; 18];
                    };
                    std::array::from_fn(|part| match parts.get(part) {
                        Some(crate::Value::Varint(id)) => *id,
                        _ => 0,
                    })
                };
                let skin_invisible = match f.get(13) {
                    Some(crate::Value::Struct(parts)) => std::array::from_fn(|part| {
                        matches!(parts.get(part), Some(crate::Value::Bool(true)))
                    }),
                    _ => [false; 18],
                };
                let scale = match f.get(2) {
                    Some(crate::Value::Quantized(value)) | Some(crate::Value::F32(value)) => *value,
                    _ => 1.0,
                };
                out.push(ServerPlayerDisplay {
                    id: get_varint(5),
                    flags: get_varint(4),
                    tag: get_varint(6),
                    name,
                    scale,
                    avatar_skin: get_skin_ids(8),
                    map_skin: get_skin_ids(11),
                    skin_invisible,
                });
            }
        }
    }
    out
}

/// Consume a MuSortedArray<MuStruct> using the generic Schema system (the
/// value is discarded; only the wire bytes are advanced). The named schema is
/// loaded from tools/parity/fixtures/netstate-schemas.json.
fn consume_sorted(s: &mut ReadStream, name: &str) -> Result<(), String> {
    let schema = netstate_schema(name)?;
    let base = schema.identity();
    let mut scratch = s.clone();
    let _ = schema
        .patch(&base, &mut scratch)
        .map_err(|e| e.to_string())?;
    s.offset = scratch.offset;
    Ok(())
}

/// Consume a MuSortedArray<MuVarint> (entity ids) via the generic entitySet
/// schema (sorted-array of varint).
fn consume_varint_sorted(s: &mut ReadStream) -> Result<(), String> {
    let schema = netstate_schema("entitySet")?;
    let base = schema.identity();
    let mut scratch = s.clone();
    let _ = schema
        .patch(&base, &mut scratch)
        .map_err(|e| e.to_string())?;
    s.offset = scratch.offset;
    Ok(())
}

/// Decode a MuSortedArray field of a parent struct schema, returning the
/// (updated base, patched value) pair so the caller can keep the incremental
/// state across frames.
fn decode_sorted_field(
    s: &mut ReadStream,
    parent: &str,
    field: &str,
    base_value: &crate::Value,
) -> Result<(crate::Value, crate::Value), String> {
    let raw = NETSTATE_SCHEMAS_JSON;
    let j: serde_json::Value = serde_json::from_str(raw).map_err(|e| e.to_string())?;
    let sc = j
        .get("schemas")
        .and_then(|m| m.get(parent))
        .and_then(|p| p.get("subTypes"))
        .and_then(|st| st.get(field))
        .ok_or_else(|| format!("schema {parent}.{field} missing"))?;
    let schema = crate::json::schema_from_json(sc)?;
    let base = if matches!(base_value, crate::Value::SortedArray(_)) {
        base_value.clone()
    } else {
        schema.identity()
    };
    let mut scratch = s.clone();
    let new_v = schema
        .patch(&base, &mut scratch)
        .map_err(|e| e.to_string())?;
    s.offset = scratch.offset;
    Ok((base, new_v))
}

/// Embedded netstate schema catalog (tools/parity/fixtures). include_str!
/// keeps the decoder working on wasm32 where std::fs is unavailable.
const NETSTATE_SCHEMAS_JSON: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../../tools/parity/fixtures/netstate-schemas.json"
));

fn netstate_schema(name: &str) -> Result<crate::Schema, String> {
    let j: serde_json::Value =
        serde_json::from_str(NETSTATE_SCHEMAS_JSON).map_err(|e| e.to_string())?;
    let sc = j
        .get("schemas")
        .and_then(|m| m.get(name))
        .ok_or_else(|| format!("schema {name} missing"))?;
    crate::json::schema_from_json(sc)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn relative_decode_matches_js() {
        // schroeppel: encode(delta) = (BIAS + delta) ^ BIAS (as u32 varint)
        for delta in [0i32, 1, -1, 5, -5, 1000, -1000, 1 << 20, -(1 << 20)] {
            let encoded = ((RELATIVE_BIAS as i64 + delta as i64) as u32) ^ (RELATIVE_BIAS as u32);
            let decoded = decode_relative(encoded);
            assert_eq!(decoded, delta, "delta {delta}");
        }
    }

    #[test]
    fn quantized_delta_roundtrip() {
        let base = 128.0f32;
        let delta = 5i32;
        let v = apply_quantized_delta(base, delta);
        assert!((v - 128.0 - 5.0 / 256.0).abs() < 1e-4);
    }

    #[test]
    fn damage_elem_consumes_two_bytes_like_js() {
        // Real frame bytes at offset 5: damage sorted-array
        // numOps=1 code=INSERT(0x0a) elem=[04 01] (tracker bit2=id, varint 1)
        // JS DamageSchema.patch consumes 2 bytes for the element.
        let bytes = [
            0x01u8, 0x00, 0x00, 0x00, // numOps = 1
            0x0a, 0x00, 0x00, 0x00, // code = (1<<3)|2 = INSERT 1
            0x04, 0x01, // elem: tracker bit2 (id), varint 1
        ];
        let schema = netstate_schema("damageSet").unwrap();
        let mut s = ReadStream::new(&bytes);
        let base = schema.identity();
        let out = schema.patch(&base, &mut s).unwrap();
        assert_eq!(
            s.offset, 10,
            "damageSet = numOps(4)+code(4)+elem(2) = 10 bytes (out={out:?})",
        );
        if let crate::Value::SortedArray(items) = out {
            assert_eq!(items.len(), 1);
            if let crate::Value::Struct(f) = &items[0] {
                // wire order [hp, maxHp, id, showHealthBar]
                assert_eq!(f[2], crate::Value::Varint(1), "id = 1");
            }
        }
    }

    #[test]
    fn replica_players_schema_builds() {
        let schema = netstate_schema("serverPlayerDisplay").unwrap();
        let _ = schema.identity();
    }

    #[test]
    fn replica_players_elem_consumes_45_bytes_like_js() {
        // elem at offset 32 of the real frame
        let elem: Vec<u8> = vec![
            0x20, 0x11, 0x01, 0xff, 0xff, 0x03, 0xb7, 0x02, 0xb8, 0x02, 0xb9, 0x02, 0xba, 0x02,
            0xbb, 0x02, 0xbc, 0x02, 0x3a, 0xbd, 0x02, 0xbe, 0x02, 0x3d, 0xbf, 0x02, 0xc0, 0x02,
            0xc1, 0x02, 0xc2, 0x02, 0x42, 0xc3, 0x02, 0xc4, 0x02, 0xc5, 0x02, 0x05, 0x47, 0x75,
            0x65, 0x73, 0x74, 0x19,
        ];
        let schema = netstate_schema("serverPlayerDisplay").unwrap();
        let mut s = ReadStream::new(&elem);
        let base = schema.identity();
        let out = schema.patch(&base, &mut s).unwrap();
        assert_eq!(
            s.offset, 45,
            "serverPlayerDisplay elem consumes 45 bytes like JS (out={out:?})"
        );
    }

    #[test]
    fn rigid_body_patch_identity_mask() {
        // mask 0: no deltas, flags = base.flags ^ ((0>>6)&31) = base.flags
        let mut s = ReadStream::new(&[0u8]);
        let base = RigidBody::identity();
        let out = patch_rigid_body(&base, &mut s).unwrap();
        assert_eq!(out, base);
    }

    /// 自写后端（box-go netstate.ts）生成的完整 net-state 帧必须能被
    /// decode_net_public_frame 解析出 player id=1 + avatar_skin 18 个部位。
    #[test]
    fn decode_self_written_netstate_frame() {
        // hex: 080e040004010000000a000000201101ffff03b702...060100
        let hex = "080e040004010000000a000000201101ffff03b702b802b902ba02bb02bc023abd02be023dbf02c002c102c20242c302c402c50206506c6179657210010000000a000000000e100080800680f8018080060100";
        let bytes: Vec<u8> = (0..hex.len())
            .step_by(2)
            .map(|i| u8::from_str_radix(&hex[i..i + 2], 16).unwrap())
            .collect();
        let mut base = NetStateBase::default();
        let frame = decode_net_public_frame(&bytes, &mut base).unwrap();
        assert_eq!(frame.tick, 4, "tick decoded");
        // replica players 含 id=1 + avatar_skin
        assert!(
            frame.players.iter().any(|p| p.id == 1),
            "player id=1 in replica players"
        );
        let player = frame.players.iter().find(|p| p.id == 1).unwrap();
        // avatar_skin 前几个部位应为 311/312/313/...
        assert_eq!(player.avatar_skin[0], 311, "head skin id");
        assert_eq!(player.avatar_skin[1], 312, "hips skin id");
        assert_eq!(player.avatar_skin[2], 313, "leftFoot skin id");
        assert!(
            player.avatar_skin.iter().any(|&id| id > 0),
            "avatar_skin non-empty"
        );
    }

    #[test]
    fn rigid_body_patch_position_only() {
        // mask: px bit (1) set -> one relative delta follows
        // px bit = 1; delta encoded for +256 (so px = 0 + 256/256 = 1.0)
        let delta = 256i32;
        let encoded = ((RELATIVE_BIAS as i64 + delta as i64) as u32) ^ (RELATIVE_BIAS as u32);
        let mut w = crate::WriteStream::new(8);
        w.write_u8(1); // mask low byte = 1 (px)
        w.write_varint(encoded);
        let bytes = w.bytes;
        let mut s = ReadStream::new(&bytes);
        let base = RigidBody::identity();
        let out = patch_rigid_body(&base, &mut s).unwrap();
        assert!((out.px - 1.0).abs() < 1e-5, "px={}", out.px);
        assert_eq!(out.py, 0.0);
    }

    #[test]
    fn runtime_player_fields_follow_preserved_schema_order() {
        let mut fields = vec![crate::Value::Void; 25];
        for (index, value) in [
            (0, 0.09),
            (1, 0.1),
            (2, 0.9),
            (3, 2.0),
            (4, 2.0),
            (5, 0.55),
            (6, 0.96),
            (7, 0.85),
            (8, 0.25),
            (9, 1.0),
            (10, 2.0),
            (11, 3.0),
            (12, 0.35),
            (13, 0.4),
            (14, 1.25),
            (15, 0.1),
            (16, 0.4),
            (17, 0.19),
            (18, 0.22),
        ] {
            fields[index] = crate::Value::Quantized(value);
        }
        fields[19] = crate::Value::Varint(254);
        fields[20] = crate::Value::Varint(7);
        fields[22] = crate::Value::U8(22);
        fields[23] = crate::Value::U8(23);
        fields[24] = crate::Value::Bool(true);
        let player = runtime_player_from_value(&crate::Value::Struct(fields)).unwrap();
        assert_eq!(player.id, 7);
        assert_eq!(player.flags, 254);
        assert_eq!(player.platform_velocity, [1.0, 2.0, 3.0]);
        assert_eq!(player.input_direction_state, 22);
        assert_eq!(player.occupancy, 23);
        assert_eq!(player.step_height, 1.25);
        assert!(player.phys_ground);
    }
}
