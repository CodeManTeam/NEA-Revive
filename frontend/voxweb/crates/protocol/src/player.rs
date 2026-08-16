//! Player physics/movement constants recovered from the preserved client
//! (cleanroom player.mjs PlayerSchema + player-babylon render/entities.mjs +
//! camera-control.mjs). Pure constants + derived movement math — no IO, so
//! it is unit-testable natively.
//!
//! Sources:
//! - PlayerSchema (cleanroom player.mjs): all speed/acceleration/jump
//!   values are MuQuantizedFloat with PLAYER_CONFIG_PRECISION = 1/1024.
//! - Rigid body: PLAYER_HEIGHT 1.1 and PLAYER_WIDTH 0.45 are half extents
//!   (m7166); FOLLOW camera distance=8.5 and fovY=0.25*pi (camera controller).
//! - Tick: game-clock 64 ms (15.625 Hz) server physics cadence.

/// 1/1024 — MuQuantizedFloat precision for every player config value.
pub const PLAYER_CONFIG_PRECISION: f32 = 1.0 / 1024.0;

/// Quantize a f32 to the wire precision (round to nearest 1/1024).
pub fn qf(precision: f32, value: f32) -> f32 {
    (value / precision).round() * precision
}

// --- movement speeds (wire-quantized defaults from PlayerSchema) ---
pub const WALK_SPEED: f32 = 0.2197265625;
pub const WALK_ACCELERATION: f32 = 0.189453125;
pub const RUN_SPEED: f32 = 0.3994140625;
pub const RUN_ACCELERATION: f32 = 0.349609375;
pub const CROUCH_SPEED: f32 = 0.099609375;
pub const CROUCH_ACCELERATION: f32 = 0.08984375;
pub const SWIM_SPEED: f32 = 0.3994140625;
pub const SWIM_ACCELERATION: f32 = 0.099609375;
pub const FLY_SPEED: f32 = 2.0;
pub const FLY_ACCELERATION: f32 = 2.0;
pub const JUMP_SPEED_FACTOR: f32 = 0.849609375;
pub const JUMP_ACCELERATION_FACTOR: f32 = 0.5498046875;
pub const JUMP_POWER: f32 = 0.9599609375;
pub const DOUBLE_JUMP_POWER: f32 = 0.8994140625;
pub const STEP_HEIGHT: f32 = 1.25;

// --- body and default camera (m7166 + GamePlayer defaults) ---
pub const PLAYER_HEIGHT: f32 = 1.1;
pub const PLAYER_RADIUS: f32 = 0.45;
pub const PLAYER_MASS: f32 = 1.75;
pub const FOLLOW_CAMERA_DISTANCE: f32 = 8.5;
pub const CAMERA_FOV_Y_RADIANS: f32 = 0.25 * std::f32::consts::PI;

/// Eye height fraction of body height (camera-control.mjs m51531 FPS camera).
pub const EYE_HEIGHT_STANDING: f32 = 0.6;
pub const EYE_HEIGHT_CROUCHING: f32 = 0.25;

// --- tick ---
/// Server physics cadence: 64 ms per game-clock tick.
pub const TICK_MS: u32 = 64;

/// Recovered eye position: body + eyeFraction * bodyHeight.
pub fn eye_position(body: [f32; 3], body_height: f32, crouching: bool) -> [f32; 3] {
    let frac = if crouching {
        EYE_HEIGHT_CROUCHING
    } else {
        EYE_HEIGHT_STANDING
    };
    [body[0], body[1] + frac * body_height, body[2]]
}

/// Horizontal speed for the given movement mode (walk/run/crouch/swim/fly),
/// quantized to wire precision like the JS defaults.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum MoveMode {
    Walk,
    Run,
    Crouch,
    Swim,
    Fly,
}

pub fn move_speed(mode: MoveMode) -> f32 {
    qf(
        PLAYER_CONFIG_PRECISION,
        match mode {
            MoveMode::Walk => WALK_SPEED,
            MoveMode::Run => RUN_SPEED,
            MoveMode::Crouch => CROUCH_SPEED,
            MoveMode::Swim => SWIM_SPEED,
            MoveMode::Fly => FLY_SPEED,
        },
    )
}

pub fn move_acceleration(mode: MoveMode) -> f32 {
    qf(
        PLAYER_CONFIG_PRECISION,
        match mode {
            MoveMode::Walk => WALK_ACCELERATION,
            MoveMode::Run => RUN_ACCELERATION,
            MoveMode::Crouch => CROUCH_ACCELERATION,
            MoveMode::Swim => SWIM_ACCELERATION,
            MoveMode::Fly => FLY_ACCELERATION,
        },
    )
}

/// Jump vertical velocity = jumpPower * (1 + jumpSpeedFactor * horizontal
/// speed ratio), matching the recovered jump power semantics.
pub fn jump_velocity(horizontal_speed_ratio: f32) -> f32 {
    JUMP_POWER * (1.0 + JUMP_SPEED_FACTOR * horizontal_speed_ratio)
}

// --- input (cleanroom net-input.mjs) ---

/// Recovered NetInputEventBits (inputState bit layout).
pub const INPUT_ACTION0: u16 = 1;
pub const INPUT_ACTION1: u16 = 2;
pub const INPUT_JUMP: u16 = 4;
pub const INPUT_WALK: u16 = 8;
pub const INPUT_CROUCH: u16 = 16;
pub const INPUT_RUN: u16 = 32;
pub const INPUT_DOUBLE_JUMP: u16 = 64;
pub const INPUT_FLY: u16 = 128;

/// Recovered PlayerInputSchema.state masks. These are distinct from the
/// NetInputEventBits above and must not be interchanged.
pub const PLAYER_WALK_STATE_WALK: u16 = 4;
pub const PLAYER_WALK_STATE_RUN: u16 = 8;
pub const PLAYER_FLY_STATE_FLYING: u16 = 1;
pub const PLAYER_BUTTON_WALK: u16 = 16;
pub const PLAYER_BUTTON_JUMP: u16 = 32;
pub const PLAYER_BUTTON_CROUCH: u16 = 64;
pub const PLAYER_JUMP_STATE_JUMP: u16 = 1024;
pub const PLAYER_JUMP_STATE_FALL: u16 = 1536;

pub const MAX_CLIENT_INPUT_ENTITIES: usize = 32;
pub const MAX_INPUT_EVENTS: usize = 256;
pub const PUBLIC_BUFFER_DIVISOR: u32 = 4;

/// inputAngle/inputCameraAngle/inputPitch are 8-bit; recovered decode
/// (m76459-ax.mjs:1647, m7166.mjs:101-104): server look u =
/// (-cos(2π*angle/256), -sin(2π*angle/256)); render facing =
/// rotateY(-2π*angle/255). NO +0.5 bias — the byte maps directly.
pub fn angle_byte_to_radians(byte: u8) -> f32 {
    2.0 * std::f32::consts::PI * byte as f32 / 256.0
}

/// Inverse of angle_byte_to_radians (256-slot quantization, no bias).
pub fn radians_to_angle_byte(rad: f32) -> u8 {
    let norm = rad.rem_euclid(2.0 * std::f32::consts::PI) / (2.0 * std::f32::consts::PI);
    ((norm * 256.0).floor() as u16 % 256) as u8
}

/// Server look direction from the wire angle: u = (-cos, -sin) in the XZ
/// plane (m7166.mjs:101-104).
pub fn look_direction(angle_byte: u8) -> [f32; 2] {
    let t = 2.0 * std::f32::consts::PI * angle_byte as f32 / 256.0;
    [-t.cos(), -t.sin()]
}

/// One client input entity (NetClientInputSchema body entry).
#[derive(Clone, Debug, PartialEq)]
pub struct ClientInputBody {
    pub px: f32,
    pub py: f32,
    pub pz: f32,
    pub qx: f32,
    pub qy: f32,
    pub qz: f32,
    pub vx: f32,
    pub vy: f32,
    pub vz: f32,
    pub id: u64,
}

/// NetClientInputSchema (client -> server).
#[derive(Clone, Debug, PartialEq)]
pub struct ClientInput {
    pub input_state: u16,
    pub input_angle: u8,
    pub input_camera_angle: u8,
    pub input_pitch: u8,
    pub bodies: Vec<ClientInputBody>,
}

impl ClientInput {
    pub fn has(&self, bit: u16) -> bool {
        self.input_state & bit != 0
    }
    pub fn forward(&self) -> f32 {
        self.input_angle as f32
    }
}

// --- NEA movement semantics (server-authoritative physics contract) ---

/// Horizontal velocity for a client input on ground, using the recovered
/// acceleration semantics: velocity approaches mode speed at the mode's
/// acceleration rate per tick (64 ms). Pure math — testable natively.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct MovementFrame {
    pub speed: f32,
    pub acceleration: f32,
    /// Input state bits active this frame (RUN/CROUCH/SWIM/FLY choose mode).
    pub input_state: u16,
}

impl MovementFrame {
    /// Pick the movement mode from input bits (FLY > SWIM > RUN > CROUCH >
    /// WALK), matching the preserved client's mode priority.
    pub fn from_input(input_state: u16) -> Self {
        let mode = if input_state & INPUT_FLY != 0 {
            MoveMode::Fly
        } else if input_state & INPUT_SWIM != 0 {
            MoveMode::Swim
        } else if input_state & INPUT_RUN != 0 {
            MoveMode::Run
        } else if input_state & INPUT_CROUCH != 0 {
            MoveMode::Crouch
        } else {
            MoveMode::Walk
        };
        Self {
            speed: move_speed(mode),
            acceleration: move_acceleration(mode),
            input_state,
        }
    }

    /// Approach `speed` from `current` at `acceleration` (per tick units).
    pub fn approach(current: f32, target: f32, acceleration: f32) -> f32 {
        let delta = target - current;
        if delta.abs() <= acceleration {
            target
        } else {
            current + delta.signum() * acceleration
        }
    }
}

/// INPUT_SWIM bit — not part of NetInputEventBits (client UI bit); used for
/// mode selection when swimming (water). Recovered from the preserved client
/// input composition (player-babylon input.mjs swim handling).
pub const INPUT_SWIM: u16 = 256;

/// NEA server tick cadence in seconds (TICK_MS / 1000).
pub const TICK_SECONDS: f32 = TICK_MS as f32 / 1000.0;

/// Horizontal displacement per tick for a movement frame: direction unit
/// vector (from angle byte) * speed * tick seconds.
pub fn per_tick_displacement(angle_byte: u8, frame: &MovementFrame) -> [f32; 2] {
    let dir = look_direction(angle_byte); // (-cos, -sin) — server convention
    [
        dir[0] * frame.speed * TICK_SECONDS,
        dir[1] * frame.speed * TICK_SECONDS,
    ]
}

/// Vertical jump velocity (voxels/tick) from the recovered jumpPower and the
/// horizontal speed ratio (current speed / mode speed).
pub fn jump_velocity_for(frame: &MovementFrame, current_speed: f32) -> f32 {
    let ratio = if frame.speed > 0.0 {
        (current_speed / frame.speed).clamp(0.0, 1.0)
    } else {
        0.0
    };
    jump_velocity(ratio)
}

// --- camera (recovered m51531-kb.mjs FPS camera + m76459 wire encodings) ---

/// Camera forward axis from (pitch=horizontal, yaw=vertical):
/// e = [cos(yaw)*cos(pitch), sin(yaw), cos(yaw)*sin(pitch)]
/// (m51531-kb.mjs:52-55, f(e, t2=pitch, n2=yaw, 1)).
pub fn camera_axis(pitch: f32, yaw: f32) -> [f32; 3] {
    let cp = pitch.cos();
    let sp = pitch.sin();
    let cy = yaw.cos();
    let sy = yaw.sin();
    [cy * cp, sy, cy * sp]
}

/// FPS camera: eye = body + eyeFraction*ry (stand 0.6, crouch 0.25);
/// look target = eye - axis (m51531-kb.mjs:89-99 lookAt(eye, eye-axis)).
pub fn fps_camera(
    body: [f32; 3],
    body_ry: f32,
    crouching: bool,
    pitch: f32,
    yaw: f32,
) -> ([f32; 3], [f32; 3]) {
    let frac = if crouching {
        EYE_HEIGHT_CROUCHING
    } else {
        EYE_HEIGHT_STANDING
    };
    let eye = [body[0], body[1] + frac * body_ry, body[2]];
    let ax = camera_axis(pitch, yaw);
    let look = [eye[0] - ax[0], eye[1] - ax[1], eye[2] - ax[2]];
    (eye, look)
}

/// Default FOLLOW camera before the preserved controller applies its voxel
/// obstruction raycasts. The target is the body center plus 0.5+ry, and the
/// eye is cameraDistance along the recovered camera axis.
pub fn follow_camera(
    body: [f32; 3],
    body_half_height: f32,
    pitch: f32,
    yaw: f32,
) -> ([f32; 3], [f32; 3]) {
    let target = [body[0], body[1] + 0.5 + body_half_height, body[2]];
    let axis = camera_axis(pitch, yaw);
    let eye = [
        target[0] + FOLLOW_CAMERA_DISTANCE * axis[0],
        target[1] + FOLLOW_CAMERA_DISTANCE * axis[1],
        target[2] + FOLLOW_CAMERA_DISTANCE * axis[2],
    ];
    (eye, target)
}

/// Wire angle (256 slots): movement direction when keys held (atan2 of the
/// movement vector), else the camera horizontal turn; wraps negative
/// (m76459:11047).
pub fn wire_angle(movement: Option<[f32; 2]>, local_pitch: f32) -> u8 {
    let a = match movement {
        Some(m) if m[0] != 0.0 || m[1] != 0.0 => {
            (256.0 * m[1].atan2(m[0]) / (2.0 * std::f32::consts::PI)).round() as i32 % 256
        }
        _ => (256.0 * local_pitch / (2.0 * std::f32::consts::PI)).round() as i32 % 256,
    };
    (if a < 0 { a + 256 } else { a }) as u8
}

/// Wire pitch: 255 slots over ±π/2 vertical pitch (m76459:11047).
pub fn wire_pitch(local_yaw: f32) -> u8 {
    (255.0 * (local_yaw + std::f32::consts::PI / 2.0) / std::f32::consts::PI).round() as u8
}

/// Wire cameraAngle: 256 slots of the horizontal turn, wraps negative
/// (m76459:11047).
pub fn wire_camera_angle(local_pitch: f32) -> u8 {
    let a = (256.0 * local_pitch / (2.0 * std::f32::consts::PI)).round() as i32 % 256;
    (if a < 0 { a + 256 } else { a }) as u8
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wire_quantized_constants_match_js() {
        // every default is already on the 1/1024 grid; quantization is a no-op
        for v in [
            WALK_SPEED,
            WALK_ACCELERATION,
            RUN_SPEED,
            RUN_ACCELERATION,
            CROUCH_SPEED,
            CROUCH_ACCELERATION,
            SWIM_SPEED,
            SWIM_ACCELERATION,
            FLY_SPEED,
            FLY_ACCELERATION,
            JUMP_SPEED_FACTOR,
            JUMP_ACCELERATION_FACTOR,
            JUMP_POWER,
            DOUBLE_JUMP_POWER,
            STEP_HEIGHT,
        ] {
            assert_eq!(qf(PLAYER_CONFIG_PRECISION, v), v, "value {v}");
        }
    }

    #[test]
    fn eye_position_standing_and_crouching() {
        let body = [10.0, 20.0, 30.0];
        let standing = eye_position(body, PLAYER_HEIGHT, false);
        assert!((standing[1] - (20.0 + 0.6 * PLAYER_HEIGHT)).abs() < 1e-6);
        let crouching = eye_position(body, PLAYER_HEIGHT, true);
        assert!((crouching[1] - (20.0 + 0.25 * PLAYER_HEIGHT)).abs() < 1e-6);
    }

    #[test]
    fn move_modes_have_distinct_speeds() {
        assert!(move_speed(MoveMode::Walk) < move_speed(MoveMode::Run));
        assert!(move_speed(MoveMode::Crouch) < move_speed(MoveMode::Walk));
        assert_eq!(move_speed(MoveMode::Fly), 2.0);
    }

    #[test]
    fn jump_velocity_positive() {
        assert!(jump_velocity(0.0) > 0.0);
        assert!(jump_velocity(1.0) > jump_velocity(0.0), "speed boosts jump");
    }

    #[test]
    fn body_dimensions_match_recovered() {
        assert_eq!(PLAYER_HEIGHT, 1.1);
        assert_eq!(PLAYER_RADIUS, 0.45);
        assert_eq!(TICK_MS, 64);
    }

    #[test]
    fn follow_camera_matches_default_preserved_geometry() {
        let (eye, target) = follow_camera([10.0, 20.0, 30.0], PLAYER_HEIGHT, 0.0, 0.0);
        assert_eq!(target, [10.0, 21.6, 30.0]);
        assert_eq!(eye, [18.5, 21.6, 30.0]);
        assert!((CAMERA_FOV_Y_RADIANS - std::f32::consts::FRAC_PI_4).abs() < 1.0e-6);
    }

    #[test]
    fn angle_roundtrip_no_bias() {
        // byte 0 -> 0 rad; byte 64 -> π/2; byte 128 -> π; byte 192 -> 3π/2
        assert!((angle_byte_to_radians(0) - 0.0).abs() < 1e-6);
        assert!((angle_byte_to_radians(64) - std::f32::consts::PI / 2.0).abs() < 1e-6);
        assert!((angle_byte_to_radians(128) - std::f32::consts::PI).abs() < 1e-6);
        assert!((angle_byte_to_radians(192) - 3.0 * std::f32::consts::PI / 2.0).abs() < 1e-6);
        // roundtrip for representative values
        for b in [0u8, 1, 63, 64, 127, 128, 255] {
            let rad = angle_byte_to_radians(b);
            let back = radians_to_angle_byte(rad);
            assert_eq!(back, b, "byte {b} roundtrips");
        }
    }

    #[test]
    fn look_direction_matches_m7166() {
        // byte 0 -> (-cos0, -sin0) = (-1, 0)
        let d = look_direction(0);
        assert!((d[0] - -1.0).abs() < 1e-6 && d[1].abs() < 1e-6);
        // byte 64 (π/2) -> (-cos π/2, -sin π/2) = (0, -1)
        let d = look_direction(64);
        assert!(d[0].abs() < 1e-6 && (d[1] - -1.0).abs() < 1e-6);
    }

    #[test]
    fn input_bits_layout_matches_net_input() {
        let mut input = ClientInput {
            input_state: 0,
            input_angle: 0,
            input_camera_angle: 0,
            input_pitch: 0,
            bodies: vec![],
        };
        assert!(!input.has(INPUT_JUMP));
        input.input_state |= INPUT_JUMP | INPUT_RUN;
        assert!(input.has(INPUT_JUMP));
        assert!(input.has(INPUT_RUN));
        assert!(!input.has(INPUT_CROUCH));
        // values match the JS NetInputEventBits exactly
        assert_eq!(INPUT_ACTION0, 1);
        assert_eq!(INPUT_ACTION1, 2);
        assert_eq!(INPUT_JUMP, 4);
        assert_eq!(INPUT_WALK, 8);
        assert_eq!(INPUT_CROUCH, 16);
        assert_eq!(INPUT_RUN, 32);
        assert_eq!(INPUT_DOUBLE_JUMP, 64);
        assert_eq!(INPUT_FLY, 128);
    }

    #[test]
    fn movement_mode_priority_matches_preserved() {
        // RUN bit -> run speed; RUN|FLY -> fly wins
        let run = MovementFrame::from_input(INPUT_RUN);
        assert_eq!(run.speed, RUN_SPEED);
        let fly = MovementFrame::from_input(INPUT_RUN | INPUT_FLY);
        assert_eq!(fly.speed, FLY_SPEED);
        let crouch = MovementFrame::from_input(INPUT_CROUCH);
        assert_eq!(crouch.speed, CROUCH_SPEED);
        let walk = MovementFrame::from_input(0);
        assert_eq!(walk.speed, WALK_SPEED);
    }

    #[test]
    fn approach_reaches_target() {
        // acceleration 0.01 per tick: from 0 toward 0.2 takes 20 ticks
        let mut v = 0.0f32;
        for _ in 0..100 {
            v = MovementFrame::approach(v, 0.2, 0.01);
        }
        assert!((v - 0.2).abs() < 1e-6);
        // overshoot clamps
        assert_eq!(MovementFrame::approach(0.199, 0.2, 0.01), 0.2);
        // deceleration works too
        let v2 = MovementFrame::approach(0.5, 0.2, 0.01);
        assert!((v2 - 0.49).abs() < 1e-6);
    }

    #[test]
    fn per_tick_displacement_matches_speed_times_tick() {
        // RUN speed 0.3994140625 * 0.064 s = 0.0255625 voxels/tick
        let frame = MovementFrame::from_input(INPUT_RUN);
        let d = per_tick_displacement(64, &frame); // angle π/2 -> (0,-1)
        assert!(d[0].abs() < 1e-6);
        assert!((d[1] - -(RUN_SPEED * TICK_SECONDS)).abs() < 1e-6);
    }

    #[test]
    fn jump_velocity_scales_with_speed_ratio() {
        let frame = MovementFrame::from_input(INPUT_RUN);
        let idle = jump_velocity_for(&frame, 0.0);
        let moving = jump_velocity_for(&frame, frame.speed);
        assert!(moving > idle, "running jump is stronger");
        assert!(idle > 0.0);
    }

    #[test]
    fn camera_axis_matches_m51531() {
        // yaw=0, pitch=0 -> [1, 0, 0] (looking along +X)
        let a = camera_axis(0.0, 0.0);
        assert!((a[0] - 1.0).abs() < 1e-6 && a[1].abs() < 1e-6 && a[2].abs() < 1e-6);
        // yaw=π/2 -> [0, 1, 0] (up)
        let a = camera_axis(0.0, std::f32::consts::PI / 2.0);
        assert!(a[0].abs() < 1e-6 && (a[1] - 1.0).abs() < 1e-6);
        // pitch=π/2 -> [0, 0, 1]
        let a = camera_axis(std::f32::consts::PI / 2.0, 0.0);
        assert!(a[0].abs() < 1e-6 && a[2].abs() > 0.9);
    }

    #[test]
    fn fps_camera_eye_and_look() {
        let body = [10.0, 20.0, 30.0];
        let (eye, look) = fps_camera(body, 1.8, false, 0.0, 0.0);
        assert!((eye[1] - (20.0 + 0.6 * 1.8)).abs() < 1e-6);
        // look = eye - axis(0,0) = eye - (1,0,0)
        assert!((look[0] - (eye[0] - 1.0)).abs() < 1e-6);
        let (eye2, _) = fps_camera(body, 1.8, true, 0.0, 0.0);
        assert!((eye2[1] - (20.0 + 0.25 * 1.8)).abs() < 1e-6, "crouch eye");
    }

    #[test]
    fn wire_angle_matches_m76459() {
        // movement (1,0) -> atan2(0,1)=0 -> byte 0
        assert_eq!(wire_angle(Some([1.0, 0.0]), 0.0), 0);
        // movement (0,1) -> atan2(1,0)=π/2 -> byte 64
        assert_eq!(wire_angle(Some([0.0, 1.0]), 0.0), 64);
        // no movement -> localPitch π -> byte 128
        assert_eq!(wire_angle(None, std::f32::consts::PI), 128);
        // negative wraps
        assert_eq!(
            wire_angle(Some([-1.0, 0.0]), 0.0),
            128,
            "atan2(0,-1)=π -> 128"
        );
    }

    #[test]
    fn wire_pitch_and_camera_angle_slots() {
        // pitch: yaw=0 -> 255*(π/2)/π = 127.5 -> round 128
        assert_eq!(wire_pitch(0.0), 128);
        // yaw=+π/2 -> 255*π/π = 255
        assert_eq!(wire_pitch(std::f32::consts::PI / 2.0), 255);
        // cameraAngle: localPitch π -> 128
        assert_eq!(wire_camera_angle(std::f32::consts::PI), 128);
    }
}
