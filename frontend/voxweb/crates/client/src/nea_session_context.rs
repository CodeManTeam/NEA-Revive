//! State owned by the NEA project session orchestration layer.

use voxweb_protocol::player::MoveMode;

pub(crate) const RECOVERED_WALK_CYCLE_TICKS: f32 = 13.45;
pub(crate) const RECOVERED_RUN_CYCLE_TICKS: f32 = 5.75;
pub(crate) const RECOVERED_CROUCH_CYCLE_TICKS: f32 = 17.31;
pub(crate) const RECOVERED_WALK_VELOCITY_PER_TICK: f32 = 0.324;
pub(crate) const RECOVERED_ROLL_START_PHASE: f32 = 0.84;
pub(crate) const RECOVERED_ROLL_END_PHASE: f32 = RECOVERED_ROLL_START_PHASE + 1.0;

#[derive(Clone, Debug)]
pub(crate) struct RuntimeCameraState {
    pub mode: String,
    pub fov_y_ratio: f32,
    pub yaw: f32,
    pub pitch: f32,
    pub authoritative_orientation: bool,
    pub distance: f32,
    pub position: [f32; 3],
    pub target: [f32; 3],
    pub up: [f32; 3],
    pub entity_position: Option<[f32; 3]>,
}

impl Default for RuntimeCameraState {
    fn default() -> Self {
        Self {
            mode: "FOLLOW".into(),
            fov_y_ratio: 0.25,
            yaw: 0.0,
            pitch: 0.0,
            authoritative_orientation: false,
            distance: voxweb_protocol::player::FOLLOW_CAMERA_DISTANCE,
            position: [0.0; 3],
            target: [0.0; 3],
            up: [0.0, 1.0, 0.0],
            entity_position: None,
        }
    }
}

#[derive(Clone, Copy, Debug)]
pub(crate) struct AvatarRollState {
    pub phase: f32,
    pub completed: bool,
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
    pub(crate) fn update(
        &mut self,
        double_jumping: bool,
        grounded: bool,
        frame_seconds: f32,
    ) -> Option<f32> {
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

pub(crate) fn walk_phase_delta(frame_seconds: f32, mode: MoveMode) -> f32 {
    let cycle = match mode {
        MoveMode::Run => RECOVERED_RUN_CYCLE_TICKS,
        MoveMode::Crouch => RECOVERED_CROUCH_CYCLE_TICKS,
        _ => RECOVERED_WALK_CYCLE_TICKS,
    };
    frame_seconds.max(0.0) / voxweb_protocol::player::TICK_SECONDS / cycle
}
