//! Input state and recovered movement encoding for the NEA project path.

use voxweb_protocol::player::MoveMode;

pub(crate) const AXIS_SCALE: f32 = 4.0;
pub(crate) const MOVEMENT_DOUBLE_TAP_MS: u32 = 200;
pub(crate) const PITCH_CLAMP: f32 = std::f32::consts::FRAC_PI_2 - 1e-3;

#[derive(Clone, Copy)]
pub(crate) struct InputState {
    pub forward: bool,
    pub back: bool,
    pub left: bool,
    pub right: bool,
    pub jump: bool,
    pub crouching: bool,
    pub running: bool,
    pub last_movement_press_ms: [u32; 4],
    pub jump_edge: bool,
    pub flight_toggle: bool,
    pub last_jump_press_ms: u32,
    pub local_pitch: f32,
    pub local_yaw: f32,
    pub look_axis: [f32; 2],
    pub debug_view: f32,
    pub interact_edge: bool,
    pub action0: bool,
    pub action1: bool,
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
            local_pitch: 0.0,
            local_yaw: 0.0,
            look_axis: [0.0, 0.0],
            debug_view: 0.0,
            interact_edge: false,
            action0: false,
            action1: false,
        }
    }
}

impl InputState {
    pub(crate) fn press_movement(&mut self, index: usize) {
        self.press_movement_at(index, crate::nea_session::now_ms());
    }

    pub(crate) fn clear_held(&mut self) {
        self.forward = false;
        self.back = false;
        self.left = false;
        self.right = false;
        self.jump = false;
        self.crouching = false;
        self.running = false;
        self.jump_edge = false;
        self.flight_toggle = false;
        self.interact_edge = false;
        self.action0 = false;
        self.action1 = false;
        self.look_axis = [0.0, 0.0];
    }

    pub(crate) fn movement_pressed(&self) -> bool {
        self.forward || self.back || self.left || self.right
    }

    pub(crate) fn press_movement_at(&mut self, index: usize, now: u32) {
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

    pub(crate) fn move_mode(&mut self) -> MoveMode {
        if !self.movement_pressed() {
            self.running = false;
        }
        if self.crouching {
            MoveMode::Crouch
        } else if self.running {
            MoveMode::Run
        } else {
            MoveMode::Walk
        }
    }

    pub(crate) fn press_jump_at(&mut self, now: u32) {
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

    pub(crate) fn press_jump(&mut self) {
        self.press_jump_at(crate::nea_session::now_ms());
    }

    pub(crate) fn apply_mouse_delta(&mut self, dx: f32, dy: f32, element_width: f32) {
        let width = element_width.max(1.0);
        self.look_axis[0] += dx / width * AXIS_SCALE;
        self.look_axis[1] += dy / width * AXIS_SCALE;
    }

    pub(crate) fn update_orientation(&mut self) {
        self.local_pitch += self.look_axis[0];
        self.local_yaw = (self.local_yaw + self.look_axis[1]).clamp(-PITCH_CLAMP, PITCH_CLAMP);
        self.look_axis = [0.0, 0.0];
    }

    pub(crate) fn forward(&self) -> [f32; 2] {
        [self.local_pitch.cos(), self.local_pitch.sin()]
    }

    pub(crate) fn right(&self) -> [f32; 2] {
        let [fx, fz] = self.forward();
        [-fz, fx]
    }

    pub(crate) fn movement_vector_with_state(&self, state: u64) -> [f32; 2] {
        let mut forward = self.forward();
        let mut right = self.right();
        if state & 1 != 0 {
            std::mem::swap(&mut forward, &mut right);
        }
        if state & 8 != 0 {
            forward = [0.0; 2];
        } else if state & 2 != 0 {
            forward = [-forward[0], -forward[1]];
        }
        if state & 16 != 0 {
            right = [0.0; 2];
        } else if state & 4 != 0 {
            right = [-right[0], -right[1]];
        }
        let (mut x, mut z) = (0.0, 0.0);
        if self.left {
            x -= right[0];
            z -= right[1];
        }
        if self.right {
            x += right[0];
            z += right[1];
        }
        if self.forward {
            x += forward[0];
            z += forward[1];
        }
        if self.back {
            x -= forward[0];
            z -= forward[1];
        }
        [x, z]
    }

    pub(crate) fn wire_pitch(&self) -> u8 {
        voxweb_protocol::player::wire_pitch(self.local_yaw)
    }

    pub(crate) fn wire_camera_angle(&self) -> u8 {
        voxweb_protocol::player::wire_camera_angle(self.local_pitch)
    }
}
