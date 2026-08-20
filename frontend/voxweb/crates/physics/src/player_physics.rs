//! Recovered NEA upright-player collision behavior for the preserved Player path.
//!
//! The player transform is the body center. Terrain uses the recovered default
//! AABB contact-constraint path (`useOBB = false`) and Y/X/Z solve order.

use voxweb_protocol::player::{
    DOUBLE_JUMP_POWER, JUMP_ACCELERATION_FACTOR, JUMP_POWER, JUMP_SPEED_FACTOR, MoveMode,
    PLAYER_MASS, TICK_MS, move_acceleration, move_speed,
};

use crate::contact_solver::{advance_active_bodies, solve_player_contacts};
use crate::voxel_contacts::solve_terrain_contacts;

const DEFAULT_BODY_HALF_EXTENTS: [f32; 3] = [0.45, 1.1, 0.45];
const GRAVITY_PER_TICK: f32 = -0.1;
const VELOCITY_DAMPING_PER_TICK: f32 = 0.01;
const PLAYER_FRICTION: f32 = 0.1;
const DEFAULT_SURFACE_FRICTION: f32 = 1.0;
const GROUND_PROBE: f32 = 0.05;
const SWEEP_EPSILON: f32 = 1.0e-7;
const MAX_FRAME_SECONDS: f32 = 0.1;
const TICKS_PER_SECOND: f32 = 1000.0 / TICK_MS as f32;
const PLAYER_FLAG_ALLOW_MOVE: u64 = 4;
const PLAYER_FLAG_SPECTATOR: u64 = 1;
const PLAYER_FLAG_ALLOW_FLIGHT: u64 = 2;
const PLAYER_FLAG_ALLOW_JUMP: u64 = 32;
const PLAYER_FLAG_ALLOW_DOUBLE_JUMP: u64 = 64;
const PLAYER_FLAG_ALLOW_CROUCH: u64 = 128;
const OCCUPANCY_EDGE_X_NEG: u64 = 1;
const OCCUPANCY_EDGE_X_POS: u64 = 2;
const OCCUPANCY_EDGE_Z_NEG: u64 = 4;
const OCCUPANCY_EDGE_Z_POS: u64 = 8;

#[derive(Clone, Copy)]
struct PlayerPhysicsConfig {
    flags: u64,
    walk: [f32; 2],
    run: [f32; 2],
    crouch: [f32; 2],
    swim: [f32; 2],
    fly: [f32; 2],
    jump_speed_factor: f32,
    jump_acceleration_factor: f32,
    jump_power: f32,
    double_jump_power: f32,
}

impl Default for PlayerPhysicsConfig {
    fn default() -> Self {
        Self {
            // Match the server's non-flight default. Flight must never be
            // available during the short pre-net-state handshake window.
            flags: 252,
            walk: [
                move_speed(MoveMode::Walk),
                move_acceleration(MoveMode::Walk),
            ],
            run: [move_speed(MoveMode::Run), move_acceleration(MoveMode::Run)],
            crouch: [
                move_speed(MoveMode::Crouch),
                move_acceleration(MoveMode::Crouch),
            ],
            swim: [
                move_speed(MoveMode::Swim),
                move_acceleration(MoveMode::Swim),
            ],
            fly: [move_speed(MoveMode::Fly), move_acceleration(MoveMode::Fly)],
            jump_speed_factor: JUMP_SPEED_FACTOR,
            jump_acceleration_factor: JUMP_ACCELERATION_FACTOR,
            jump_power: JUMP_POWER,
            double_jump_power: DOUBLE_JUMP_POWER,
        }
    }
}

#[derive(Clone)]
pub struct NeaPlayerPhysics {
    pub position: [f32; 3],
    pub velocity: [f32; 3],
    pub grounded: bool,
    half_extents: [f32; 3],
    jump_phase: JumpPhase,
    config: PlayerPhysicsConfig,
    phys_fluid: f32,
    platform_velocity: [f32; 3],
    flying: bool,
    occupancy: u64,
    surface_friction: f32,
    surface_restitution: f32,
    body_mass: f32,
    body_friction: f32,
    body_restitution: f32,
    gravity_per_tick: f32,
    velocity_damping_per_tick: f32,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum JumpPhase {
    Ground,
    Jump,
    Fall,
    DoubleJump,
}

impl NeaPlayerPhysics {
    pub fn new(position: [f32; 3]) -> Self {
        Self {
            position,
            velocity: [0.0; 3],
            grounded: false,
            half_extents: DEFAULT_BODY_HALF_EXTENTS,
            jump_phase: JumpPhase::Fall,
            config: PlayerPhysicsConfig::default(),
            phys_fluid: 0.0,
            platform_velocity: [0.0; 3],
            flying: false,
            occupancy: 0,
            surface_friction: DEFAULT_SURFACE_FRICTION,
            surface_restitution: 0.0,
            body_mass: PLAYER_MASS,
            body_friction: PLAYER_FRICTION,
            body_restitution: 0.0,
            gravity_per_tick: GRAVITY_PER_TICK,
            velocity_damping_per_tick: VELOCITY_DAMPING_PER_TICK,
        }
    }

    pub fn set_half_extents(&mut self, half_extents: [f32; 3]) {
        if half_extents
            .iter()
            .all(|value| value.is_finite() && *value > 0.0)
        {
            self.half_extents = half_extents;
        }
    }

    pub fn set_fluid_volume_fraction(&mut self, fraction: f32) {
        self.phys_fluid = if fraction.is_finite() {
            fraction.max(0.0)
        } else {
            0.0
        };
    }

    pub fn set_surface_friction(&mut self, friction: f32) {
        self.surface_friction = if friction.is_finite() && friction >= 0.0 {
            friction
        } else {
            DEFAULT_SURFACE_FRICTION
        };
    }

    pub fn set_surface_restitution(&mut self, restitution: f32) {
        self.surface_restitution = if restitution.is_finite() && restitution >= 0.0 {
            restitution
        } else {
            0.0
        };
    }

    pub fn set_body_properties(&mut self, mass: f32, friction: f32, restitution: f32) {
        if mass.is_finite() && mass > 0.0 {
            self.body_mass = mass;
        }
        if friction.is_finite() && friction >= 0.0 {
            self.body_friction = friction;
        }
        if restitution.is_finite() && restitution >= 0.0 {
            self.body_restitution = restitution;
        }
    }

    pub fn set_world_physics(&mut self, gravity: f32, velocity_damping: f32, tick_rate: f32) {
        if gravity.is_finite() && tick_rate.is_finite() && tick_rate > 0.0 {
            self.gravity_per_tick = gravity * (tick_rate / TICKS_PER_SECOND);
        }
        if velocity_damping.is_finite() && velocity_damping >= 0.0 {
            self.velocity_damping_per_tick = velocity_damping * (tick_rate / TICKS_PER_SECOND);
        }
    }

    pub fn apply_runtime_state(&mut self, state: &voxweb_protocol::netstate::RuntimePlayerState) {
        let positive = |value: f32, fallback: f32| {
            if value.is_finite() && value > 0.0 {
                value
            } else {
                fallback
            }
        };
        let current = self.config;
        self.config = PlayerPhysicsConfig {
            flags: state.flags,
            walk: [
                positive(state.walk_speed, current.walk[0]),
                positive(state.walk_acceleration, current.walk[1]),
            ],
            run: [
                positive(state.run_speed, current.run[0]),
                positive(state.run_acceleration, current.run[1]),
            ],
            crouch: [
                positive(state.crouch_speed, current.crouch[0]),
                positive(state.crouch_acceleration, current.crouch[1]),
            ],
            swim: [
                positive(state.swim_speed, current.swim[0]),
                positive(state.swim_acceleration, current.swim[1]),
            ],
            fly: [
                positive(state.fly_speed, current.fly[0]),
                positive(state.fly_acceleration, current.fly[1]),
            ],
            jump_speed_factor: positive(state.jump_speed_factor, current.jump_speed_factor),
            jump_acceleration_factor: positive(
                state.jump_acceleration_factor,
                current.jump_acceleration_factor,
            ),
            jump_power: positive(state.jump_power, current.jump_power),
            double_jump_power: positive(state.double_jump_power, current.double_jump_power),
        };
        if self.config.flags & PLAYER_FLAG_ALLOW_FLIGHT == 0 {
            self.flying = false;
        }
    }

    pub fn apply_authoritative_contacts(
        &mut self,
        grounded: bool,
        fluid: f32,
        occupancy: u64,
        platform_velocity: [f32; 3],
    ) {
        self.grounded = grounded;
        self.phys_fluid = if fluid.is_finite() {
            fluid.max(0.0)
        } else {
            0.0
        };
        self.occupancy = occupancy;
        self.platform_velocity =
            platform_velocity.map(|value| if value.is_finite() { value } else { 0.0 });
    }

    pub fn request_flight_toggle(&mut self) {
        if self.config.flags & PLAYER_FLAG_ALLOW_FLIGHT != 0 {
            self.flying = !self.flying;
        }
    }

    pub fn is_flying(&self) -> bool {
        self.flying || self.config.flags & PLAYER_FLAG_SPECTATOR != 0
    }

    pub fn is_swimming(&self) -> bool {
        self.phys_fluid >= 0.5
    }

    pub fn is_double_jumping(&self) -> bool {
        self.jump_phase == JumpPhase::DoubleJump
    }

    pub fn observe(&mut self, solid: &impl Fn(i32, i32, i32) -> bool) {
        self.grounded = sweep(self.position, self.half_extents, 1, -GROUND_PROBE, solid).collided;
    }

    pub fn step(
        &mut self,
        movement: [f32; 2],
        mode: MoveMode,
        jump_edge: bool,
        jump_held: bool,
        delta_seconds: f32,
        solid: &impl Fn(i32, i32, i32) -> bool,
    ) {
        let mut bodies = [];
        self.step_with_bodies(
            movement,
            mode,
            jump_edge,
            jump_held,
            delta_seconds,
            solid,
            &mut bodies,
        );
    }

    #[allow(clippy::too_many_arguments)]
    pub fn step_with_bodies(
        &mut self,
        movement: [f32; 2],
        mode: MoveMode,
        jump_edge: bool,
        jump_held: bool,
        delta_seconds: f32,
        solid: &impl Fn(i32, i32, i32) -> bool,
        bodies: &mut [voxweb_protocol::netstate::RigidBody],
    ) {
        let mut remaining = delta_seconds.clamp(0.0, MAX_FRAME_SECONDS);
        if remaining <= 0.0 {
            return;
        }
        let max_step = TICK_MS as f32 / 1000.0;
        let mut first_step = true;
        while remaining > 0.0 {
            let dt = remaining.min(max_step);
            self.step_once(
                movement,
                mode,
                jump_edge && first_step,
                jump_held,
                dt,
                solid,
                bodies,
            );
            first_step = false;
            remaining -= dt;
        }
    }

    fn step_once(
        &mut self,
        movement: [f32; 2],
        mode: MoveMode,
        jump_edge: bool,
        jump_held: bool,
        dt: f32,
        solid: &impl Fn(i32, i32, i32) -> bool,
        bodies: &mut [voxweb_protocol::netstate::RigidBody],
    ) {
        let spectator = self.config.flags & PLAYER_FLAG_SPECTATOR != 0;
        let flying = self.flying || spectator;
        let crouch_held = mode == MoveMode::Crouch;
        let mode = if flying {
            mode
        } else if self.phys_fluid > 1.0 / 16.0 {
            MoveMode::Swim
        } else if mode == MoveMode::Crouch && self.config.flags & PLAYER_FLAG_ALLOW_CROUCH == 0 {
            MoveMode::Walk
        } else {
            mode
        };
        if self.grounded && mode == MoveMode::Crouch {
            self.occupancy = voxel_occupancy(self.position, self.half_extents, solid);
        }
        self.remove_platform_velocity();
        if flying {
            self.update_flight_vertical(mode, jump_held, crouch_held, dt);
        } else if mode == MoveMode::Swim {
            self.update_swim_vertical(jump_held, crouch_held, dt);
        } else {
            self.update_jump_state(mode, jump_edge, jump_held);
        }
        self.update_horizontal_velocity_with_flight(movement, mode, flying, dt);
        self.integrate_velocity(dt, !flying);
        self.restore_platform_velocity(dt);

        self.grounded = false;
        self.platform_velocity = [0.0; 3];
        if !spectator {
            self.resolve_body_contacts(bodies);
        }
        if spectator {
            for axis in 0..3 {
                self.position[axis] += self.velocity[axis] * dt;
            }
            advance_active_bodies(bodies, dt * TICKS_PER_SECOND);
            return;
        }
        let terrain = solve_terrain_contacts(
            self.position,
            self.half_extents,
            self.velocity,
            dt,
            self.body_mass,
            self.body_friction,
            self.surface_friction,
            self.body_restitution.max(self.surface_restitution),
            solid,
        );
        self.velocity = terrain.velocity;
        self.grounded |= terrain.grounded;
        for axis in 0..3 {
            self.position[axis] += self.velocity[axis] * dt;
        }
        advance_active_bodies(bodies, dt * TICKS_PER_SECOND);
        if self.grounded {
            self.jump_phase = JumpPhase::Ground;
        } else if self.jump_phase == JumpPhase::Ground {
            self.jump_phase = JumpPhase::Fall;
        }
    }

    fn resolve_body_contacts(&mut self, bodies: &mut [voxweb_protocol::netstate::RigidBody]) {
        let tick_velocity = glam::Vec3::from_array(self.velocity) / TICKS_PER_SECOND;
        let result = solve_player_contacts(
            self.position,
            self.half_extents,
            tick_velocity,
            self.body_mass,
            self.body_friction,
            self.body_restitution,
            bodies,
        );
        self.velocity = (result.velocity * TICKS_PER_SECOND).to_array();
        self.grounded |= result.grounded;
        self.platform_velocity = result.platform_velocity.to_array();
    }

    fn remove_platform_velocity(&mut self) {
        for axis in 0..3 {
            self.velocity[axis] -= self.platform_velocity[axis] * TICKS_PER_SECOND;
        }
    }

    fn restore_platform_velocity(&mut self, dt: f32) {
        let inverse_damping = (self.velocity_damping_per_tick * TICKS_PER_SECOND * dt).exp();
        for axis in 0..3 {
            self.velocity[axis] +=
                inverse_damping * self.platform_velocity[axis] * TICKS_PER_SECOND;
        }
    }

    fn update_flight_vertical(
        &mut self,
        mode: MoveMode,
        jump_held: bool,
        crouch_held: bool,
        dt: f32,
    ) {
        let flight_mode = if mode == MoveMode::Crouch {
            MoveMode::Walk
        } else {
            mode
        };
        let [base_speed, base_acceleration] = self.base_profile(flight_mode);
        let speed = base_speed * self.config.fly[0];
        let acceleration = base_acceleration * self.config.fly[1];
        if jump_held {
            self.apply_axis_control(1, speed, acceleration, dt);
        } else if crouch_held {
            self.apply_axis_control(1, speed, -acceleration, dt);
        } else {
            self.damp_axis(1, acceleration, dt);
        }
    }

    fn update_jump_state(&mut self, mode: MoveMode, jump_edge: bool, jump_held: bool) {
        let crouch_allowed = self.config.flags & PLAYER_FLAG_ALLOW_CROUCH != 0;
        let jump_allowed = self.config.flags & PLAYER_FLAG_ALLOW_JUMP != 0;
        if self.grounded {
            self.jump_phase = JumpPhase::Ground;
            if jump_held && jump_allowed && (!crouch_allowed || mode != MoveMode::Crouch) {
                self.velocity[1] = self.config.jump_power * TICKS_PER_SECOND;
                self.jump_phase = JumpPhase::Jump;
            }
            return;
        }
        if self.jump_phase == JumpPhase::Jump && !jump_held {
            self.jump_phase = JumpPhase::Fall;
        }
        if jump_edge
            && self.jump_phase == JumpPhase::Fall
            && self.config.flags & PLAYER_FLAG_ALLOW_DOUBLE_JUMP != 0
        {
            self.velocity[1] = self.config.double_jump_power * TICKS_PER_SECOND;
            self.jump_phase = JumpPhase::DoubleJump;
        }
    }

    fn update_swim_vertical(&mut self, jump_held: bool, crouch_held: bool, dt: f32) {
        let [speed, acceleration] = self.config.swim;
        if jump_held && self.config.flags & PLAYER_FLAG_ALLOW_JUMP != 0 {
            if self.grounded || self.phys_fluid < 0.5 {
                self.velocity[1] = 0.5 * self.config.jump_power * TICKS_PER_SECOND;
                return;
            }
            self.apply_axis_control(1, speed, acceleration, dt);
        } else if crouch_held {
            self.apply_axis_control(1, speed, -acceleration, dt);
        }
    }

    fn apply_axis_control(&mut self, axis: usize, speed: f32, acceleration: f32, dt: f32) {
        let current = self.velocity[axis] / TICKS_PER_SECOND;
        let correction = if acceleration < 0.0 {
            acceleration + (-speed - current).max(0.0)
        } else {
            acceleration + (speed - current).min(0.0)
        };
        self.velocity[axis] += control_integral_ticks(dt) * TICKS_PER_SECOND * correction;
    }

    #[cfg(test)]
    fn update_horizontal_velocity(&mut self, movement: [f32; 2], mode: MoveMode, dt: f32) {
        self.update_horizontal_velocity_with_flight(movement, mode, false, dt);
    }

    fn update_horizontal_velocity_with_flight(
        &mut self,
        movement: [f32; 2],
        mode: MoveMode,
        flying: bool,
        dt: f32,
    ) {
        if self.config.flags & PLAYER_FLAG_ALLOW_MOVE == 0 {
            return;
        }
        let airborne_speed_factor = if self.grounded || flying {
            1.0
        } else {
            self.config.jump_speed_factor
        };
        let airborne_acceleration_factor = if self.grounded || flying {
            1.0
        } else {
            self.config.jump_acceleration_factor
        };
        let profile_mode = if flying && mode == MoveMode::Crouch {
            MoveMode::Walk
        } else {
            mode
        };
        let mut profile = self.base_profile(profile_mode);
        if flying {
            profile[0] *= self.config.fly[0];
            profile[1] *= self.config.fly[1];
        }
        let speed_per_tick = profile[0] * airborne_speed_factor;
        let acceleration_per_tick = profile[1] * airborne_acceleration_factor;
        let length = movement[0].hypot(movement[1]);
        let control_factor = control_integral_ticks(dt);
        if length <= 0.0 {
            let damping = if mode == MoveMode::Crouch {
                1.0
            } else {
                acceleration_per_tick
            };
            self.damp_horizontal(damping, control_factor);
            return;
        }

        let mut forward = [-movement[0] / length, -movement[1] / length];
        if mode == MoveMode::Crouch && self.grounded {
            if (forward[0] < 0.0 && self.occupancy & OCCUPANCY_EDGE_X_NEG != 0)
                || (forward[0] > 0.0 && self.occupancy & OCCUPANCY_EDGE_X_POS != 0)
            {
                forward[0] = 0.0;
            }
            if (forward[1] < 0.0 && self.occupancy & OCCUPANCY_EDGE_Z_NEG != 0)
                || (forward[1] > 0.0 && self.occupancy & OCCUPANCY_EDGE_Z_POS != 0)
            {
                forward[1] = 0.0;
            }
            let allowed_length = forward[0].hypot(forward[1]);
            if allowed_length <= 0.0 {
                self.damp_horizontal(1.0, control_factor);
                return;
            }
            forward[0] /= allowed_length;
            forward[1] /= allowed_length;
        }
        let lateral = [-forward[1], forward[0]];
        let velocity_tick = [
            self.velocity[0] / TICKS_PER_SECOND,
            self.velocity[2] / TICKS_PER_SECOND,
        ];
        let forward_speed = dot2(velocity_tick, forward);
        let lateral_speed = dot2(velocity_tick, lateral);
        let forward_correction = acceleration_per_tick + (speed_per_tick - forward_speed).min(0.0);
        let lateral_damping = if mode == MoveMode::Crouch {
            1.0
        } else {
            acceleration_per_tick
        };
        let lateral_correction = -lateral_damping * lateral_speed;
        let impulse = control_factor * TICKS_PER_SECOND;
        self.velocity[0] +=
            impulse * (forward_correction * forward[0] + lateral_correction * lateral[0]);
        self.velocity[2] +=
            impulse * (forward_correction * forward[1] + lateral_correction * lateral[1]);
    }

    fn base_profile(&self, mode: MoveMode) -> [f32; 2] {
        match mode {
            MoveMode::Walk => self.config.walk,
            MoveMode::Run => self.config.run,
            MoveMode::Crouch => self.config.crouch,
            MoveMode::Swim => self.config.swim,
            MoveMode::Fly => self.config.walk,
        }
    }

    fn damp_axis(&mut self, axis: usize, damping: f32, dt: f32) {
        let scale = (1.0 - damping * control_integral_ticks(dt)).max(0.0);
        self.velocity[axis] *= scale;
    }

    fn damp_horizontal(&mut self, damping: f32, control_factor: f32) {
        let scale = (1.0 - damping * control_factor).max(0.0);
        self.velocity[0] *= scale;
        self.velocity[2] *= scale;
    }

    #[cfg(test)]
    fn integrate_gravity_and_damping(&mut self, dt: f32) {
        self.integrate_velocity(dt, true);
    }

    fn integrate_velocity(&mut self, dt: f32, gravity: bool) {
        let tick_delta = TICKS_PER_SECOND * dt;
        let damping = self.velocity_damping_per_tick;
        let velocity_scale = (-damping * tick_delta).exp();
        let acceleration_factor = if damping > 1.0e-6 {
            (1.0 - velocity_scale) / damping
        } else {
            tick_delta
        };
        self.velocity[0] *= velocity_scale;
        self.velocity[1] *= velocity_scale;
        if gravity {
            self.velocity[1] += acceleration_factor * self.gravity_per_tick * TICKS_PER_SECOND;
        }
        self.velocity[2] *= velocity_scale;
    }
}

fn control_integral_ticks(dt: f32) -> f32 {
    let tick_delta = TICKS_PER_SECOND * dt;
    if VELOCITY_DAMPING_PER_TICK < 1.0e-6 {
        tick_delta
    } else {
        (1.0 - (-VELOCITY_DAMPING_PER_TICK * tick_delta).exp()) / VELOCITY_DAMPING_PER_TICK
    }
}

#[derive(Clone, Copy)]
struct SweepResult {
    #[allow(dead_code)]
    amount: f32,
    collided: bool,
}

fn sweep(
    position: [f32; 3],
    half_extents: [f32; 3],
    axis: usize,
    amount: f32,
    solid: &impl Fn(i32, i32, i32) -> bool,
) -> SweepResult {
    if !amount.is_finite() || amount.abs() <= SWEEP_EPSILON {
        return SweepResult {
            amount: 0.0,
            collided: false,
        };
    }
    let min: [f32; 3] = std::array::from_fn(|index| position[index] - half_extents[index]);
    let max: [f32; 3] = std::array::from_fn(|index| position[index] + half_extents[index]);
    let swept_min: [f32; 3] = std::array::from_fn(|index| {
        if index == axis {
            min[index].min(min[index] + amount)
        } else {
            min[index]
        }
    });
    let swept_max: [f32; 3] = std::array::from_fn(|index| {
        if index == axis {
            max[index].max(max[index] + amount)
        } else {
            max[index]
        }
    });
    let mut allowed = amount;
    let mut collided = false;
    for x in floor_range(swept_min[0], swept_max[0]) {
        for y in floor_range(swept_min[1], swept_max[1]) {
            for z in floor_range(swept_min[2], swept_max[2]) {
                if !solid(x, y, z) || !overlaps_other_axes(min, max, [x, y, z], axis) {
                    continue;
                }
                if let Some(limit) = movement_limit(min[axis], max[axis], [x, y, z][axis], amount)
                    && is_nearer(limit, allowed, amount)
                {
                    allowed = limit;
                    collided = true;
                }
            }
        }
    }
    SweepResult {
        amount: if allowed.abs() <= SWEEP_EPSILON {
            0.0
        } else {
            allowed
        },
        collided,
    }
}

/// Recovered module 7166 samples four shrunken boxes immediately below the
/// player while crouching. An empty probe marks that direction as an edge.
fn voxel_occupancy(
    position: [f32; 3],
    half_extents: [f32; 3],
    solid: &impl Fn(i32, i32, i32) -> bool,
) -> u64 {
    let quarter_x = 0.25 * half_extents[0];
    let quarter_z = 0.25 * half_extents[2];
    let body_min = [
        position[0] - half_extents[0],
        position[1] - half_extents[1],
        position[2] - half_extents[2],
    ];
    let body_max = [
        position[0] + half_extents[0],
        position[1] + half_extents[1],
        position[2] + half_extents[2],
    ];
    let mut occupancy = 0;
    for (bit, offset_x, offset_z) in [
        (OCCUPANCY_EDGE_X_NEG, -half_extents[0], 0.0),
        (OCCUPANCY_EDGE_X_POS, half_extents[0], 0.0),
        (OCCUPANCY_EDGE_Z_NEG, 0.0, -half_extents[2]),
        (OCCUPANCY_EDGE_Z_POS, 0.0, half_extents[2]),
    ] {
        let min = [
            body_min[0] + quarter_x + offset_x,
            body_min[1] - 0.5,
            body_min[2] + quarter_z + offset_z,
        ];
        let max = [
            body_max[0] - quarter_x + offset_x,
            body_min[1],
            body_max[2] - quarter_z + offset_z,
        ];
        if !solid_box_overlap(min, max, solid) {
            occupancy |= bit;
        }
    }
    occupancy
}

fn solid_box_overlap(min: [f32; 3], max: [f32; 3], solid: &impl Fn(i32, i32, i32) -> bool) -> bool {
    let start: [i32; 3] = std::array::from_fn(|axis| (min[axis] + SWEEP_EPSILON).floor() as i32);
    let end: [i32; 3] = std::array::from_fn(|axis| (max[axis] - SWEEP_EPSILON).ceil() as i32);
    for y in start[1]..end[1] {
        for z in start[2]..end[2] {
            for x in start[0]..end[0] {
                if solid(x, y, z) {
                    return true;
                }
            }
        }
    }
    false
}

fn floor_range(min: f32, max: f32) -> std::ops::RangeInclusive<i32> {
    (min - SWEEP_EPSILON).floor() as i32..=(max + SWEEP_EPSILON).floor() as i32
}

fn overlaps_other_axes(min: [f32; 3], max: [f32; 3], voxel: [i32; 3], axis: usize) -> bool {
    (0..3)
        .filter(|index| *index != axis)
        .all(|index| max[index] > voxel[index] as f32 && min[index] < voxel[index] as f32 + 1.0)
}

fn movement_limit(min: f32, max: f32, voxel: i32, amount: f32) -> Option<f32> {
    let voxel_min = voxel as f32;
    let voxel_max = voxel_min + 1.0;
    if amount > 0.0 {
        (max <= voxel_min + SWEEP_EPSILON && max + amount >= voxel_min - SWEEP_EPSILON)
            .then_some(voxel_min - max)
    } else {
        (min >= voxel_max - SWEEP_EPSILON && min + amount <= voxel_max + SWEEP_EPSILON)
            .then_some(voxel_max - min)
    }
}

fn is_nearer(candidate: f32, allowed: f32, movement: f32) -> bool {
    if movement > 0.0 {
        candidate < allowed
    } else {
        candidate > allowed
    }
}

fn dot2(left: [f32; 2], right: [f32; 2]) -> f32 {
    left[0] * right[0] + left[1] * right[1]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn body_center_lands_with_original_half_height() {
        let floor = |_x: i32, y: i32, _z: i32| y == 0;
        let mut body = NeaPlayerPhysics::new([0.5, 3.0, 0.5]);
        for _ in 0..120 {
            body.step([0.0, 0.0], MoveMode::Walk, false, false, 1.0 / 60.0, &floor);
        }
        assert!((body.position[1] - 2.1).abs() < 1.0e-4);
        assert!(body.grounded);
    }

    #[test]
    fn recovered_contact_solver_does_not_create_an_unrecovered_auto_climb() {
        let world = |x: i32, y: i32, z: i32| y == 0 || (x == 1 && y == 1 && z == 0);
        let mut body = NeaPlayerPhysics::new([0.5, 2.1, 0.5]);
        body.observe(&world);
        body.velocity[0] = 40.0;
        body.step([0.0, 0.0], MoveMode::Walk, false, false, 0.02, &world);
        assert!(body.position[0] <= 0.55 + 1.0e-5);
        assert!((body.position[1] - 2.1).abs() < 1.0e-5);
    }

    #[test]
    fn sweep_stops_at_wall_without_tunneling() {
        let wall = |x: i32, y: i32, _z: i32| x == 3 && (0..=4).contains(&y);
        let result = sweep([0.5, 2.0, 0.5], DEFAULT_BODY_HALF_EXTENTS, 0, 10.0, &wall);
        assert!(result.collided);
        assert!((result.amount - 2.05).abs() < 1.0e-5);
    }

    #[test]
    fn crouch_uses_recovered_lower_speed_profile() {
        let mut walk = NeaPlayerPhysics::new([0.0, 2.1, 0.0]);
        let mut crouch = NeaPlayerPhysics::new([0.0, 2.1, 0.0]);
        walk.update_horizontal_velocity([1.0, 0.0], MoveMode::Walk, 1.0);
        crouch.update_horizontal_velocity([1.0, 0.0], MoveMode::Crouch, 1.0);
        assert!(crouch.velocity[0].abs() < walk.velocity[0].abs());
    }

    #[test]
    fn diagonal_input_has_the_same_acceleration_magnitude_as_axial_input() {
        let mut axial = NeaPlayerPhysics::new([0.0, 2.1, 0.0]);
        let mut diagonal = NeaPlayerPhysics::new([0.0, 2.1, 0.0]);
        axial.grounded = true;
        diagonal.grounded = true;
        axial.update_horizontal_velocity([1.0, 0.0], MoveMode::Walk, 1.0 / 60.0);
        diagonal.update_horizontal_velocity([1.0, 1.0], MoveMode::Walk, 1.0 / 60.0);
        let axial_speed = axial.velocity[0].hypot(axial.velocity[2]);
        let diagonal_speed = diagonal.velocity[0].hypot(diagonal.velocity[2]);
        assert!((axial_speed - diagonal_speed).abs() < 1.0e-5);
    }

    #[test]
    fn crouching_prevents_ground_jump() {
        let floor = |_x: i32, y: i32, _z: i32| y == 0;
        let mut body = NeaPlayerPhysics::new([0.5, 2.1, 0.5]);
        body.grounded = true;
        body.step([0.0, 0.0], MoveMode::Crouch, true, true, 1.0 / 60.0, &floor);
        assert!(body.velocity[1] <= 0.0);
    }

    #[test]
    fn held_jump_restarts_on_ground_at_the_recovered_state_boundary() {
        let mut body = NeaPlayerPhysics::new([0.0, 2.1, 0.0]);
        body.grounded = true;
        body.update_jump_state(MoveMode::Walk, false, true);
        assert_eq!(body.jump_phase, JumpPhase::Jump);
        assert_eq!(body.velocity[1], JUMP_POWER * TICKS_PER_SECOND);
    }

    #[test]
    fn released_jump_can_transition_to_recovered_double_jump() {
        let air = |_x: i32, _y: i32, _z: i32| false;
        let mut body = NeaPlayerPhysics::new([0.5, 4.0, 0.5]);
        body.grounded = true;
        body.step([0.0, 0.0], MoveMode::Walk, true, true, 0.001, &air);
        assert_eq!(body.jump_phase, JumpPhase::Jump);
        body.step([0.0, 0.0], MoveMode::Walk, false, false, 0.001, &air);
        assert_eq!(body.jump_phase, JumpPhase::Fall);
        body.step([0.0, 0.0], MoveMode::Walk, true, true, 0.001, &air);
        assert_eq!(body.jump_phase, JumpPhase::DoubleJump);
        assert!(body.velocity[1] > 0.0);
    }

    #[test]
    fn airborne_control_uses_recovered_speed_and_acceleration_factors() {
        let mut ground = NeaPlayerPhysics::new([0.0, 2.1, 0.0]);
        let mut air = NeaPlayerPhysics::new([0.0, 4.0, 0.0]);
        ground.grounded = true;
        air.grounded = false;
        ground.update_horizontal_velocity([1.0, 0.0], MoveMode::Walk, TICK_MS as f32 / 1000.0);
        air.update_horizontal_velocity([1.0, 0.0], MoveMode::Walk, TICK_MS as f32 / 1000.0);
        assert!(air.velocity[0].abs() < ground.velocity[0].abs());
        let ratio = air.velocity[0] / ground.velocity[0];
        assert!((ratio - JUMP_ACCELERATION_FACTOR).abs() < 1.0e-5);
    }

    #[test]
    fn gravity_and_velocity_damping_match_recovered_tick_integrator() {
        let mut body = NeaPlayerPhysics::new([0.0, 4.0, 0.0]);
        body.velocity = [2.0, 3.0, 4.0];
        body.integrate_gravity_and_damping(TICK_MS as f32 / 1000.0);
        let scale = (-VELOCITY_DAMPING_PER_TICK).exp();
        let acceleration_factor = (1.0 - scale) / VELOCITY_DAMPING_PER_TICK;
        assert!((body.velocity[0] - 2.0 * scale).abs() < 1.0e-5);
        assert!((body.velocity[2] - 4.0 * scale).abs() < 1.0e-5);
        let expected_y = 3.0 * scale + acceleration_factor * GRAVITY_PER_TICK * TICKS_PER_SECOND;
        assert!((body.velocity[1] - expected_y).abs() < 1.0e-5);
    }

    #[test]
    fn authoritative_shape_half_extents_control_collision() {
        let wall = |x: i32, _y: i32, _z: i32| x == 2;
        let mut body = NeaPlayerPhysics::new([0.5, 2.0, 0.5]);
        body.set_half_extents([0.8, 0.9, 0.8]);
        body.velocity[0] = 10.0;
        body.step([0.0, 0.0], MoveMode::Walk, false, false, 0.1, &wall);
        assert!((body.position[0] - 1.2).abs() < 1.0e-5);
    }

    #[test]
    fn authoritative_runtime_profile_changes_movement_response() {
        let mut body = NeaPlayerPhysics::new([0.0, 2.1, 0.0]);
        body.grounded = true;
        body.config.walk = [0.05, 0.04];
        body.update_horizontal_velocity([1.0, 0.0], MoveMode::Walk, TICK_MS as f32 / 1000.0);
        let expected = control_integral_ticks(TICK_MS as f32 / 1000.0) * 0.04 * TICKS_PER_SECOND;
        assert!((body.velocity[0].abs() - expected).abs() < 1.0e-5);
    }

    #[test]
    fn one_tick_motor_uses_recovered_damping_integral_without_friction_scaling() {
        let mut body = NeaPlayerPhysics::new([0.0, 2.1, 0.0]);
        body.grounded = true;
        body.update_horizontal_velocity([1.0, 0.0], MoveMode::Walk, TICK_MS as f32 / 1000.0);
        let recovered_factor =
            (1.0 - (-VELOCITY_DAMPING_PER_TICK).exp()) / VELOCITY_DAMPING_PER_TICK;
        let expected = recovered_factor * move_acceleration(MoveMode::Walk) * TICKS_PER_SECOND;
        assert!((body.velocity[0].abs() - expected).abs() < 1.0e-5);
    }

    #[test]
    fn authoritative_flags_can_disable_jump_and_movement() {
        let air = |_x: i32, _y: i32, _z: i32| false;
        let mut body = NeaPlayerPhysics::new([0.0, 2.1, 0.0]);
        body.grounded = true;
        body.config.flags = 0;
        body.step([1.0, 0.0], MoveMode::Walk, true, true, 0.001, &air);
        assert_eq!(body.velocity[0], 0.0);
        assert!(body.velocity[1] <= 0.0);
    }

    #[test]
    fn flight_toggle_requires_authoritative_allow_flight_flag() {
        let mut body = NeaPlayerPhysics::new([0.0, 4.0, 0.0]);
        body.config.flags &= !PLAYER_FLAG_ALLOW_FLIGHT;
        body.request_flight_toggle();
        assert!(!body.is_flying());

        body.config.flags |= PLAYER_FLAG_ALLOW_FLIGHT;
        body.request_flight_toggle();
        assert!(body.is_flying());
        body.request_flight_toggle();
        assert!(!body.is_flying());
    }

    #[test]
    fn flying_disables_gravity_but_keeps_collision() {
        let ceiling = |_x: i32, y: i32, _z: i32| y == 4;
        let mut body = NeaPlayerPhysics::new([0.5, 2.0, 0.5]);
        body.config.flags |= PLAYER_FLAG_ALLOW_FLIGHT;
        body.request_flight_toggle();
        body.step([0.0, 0.0], MoveMode::Walk, false, true, 0.1, &ceiling);
        assert!(body.velocity[1] >= 0.0);
        assert!(body.position[1] <= 2.9 + SWEEP_EPSILON);
    }

    #[test]
    fn spectator_forces_flight_and_disables_collision() {
        let wall = |x: i32, _y: i32, _z: i32| x == 1;
        let mut body = NeaPlayerPhysics::new([0.5, 2.0, 0.5]);
        body.config.flags = PLAYER_FLAG_SPECTATOR | PLAYER_FLAG_ALLOW_MOVE;
        body.velocity[0] = 20.0;
        body.step([0.0, 0.0], MoveMode::Walk, false, false, 0.1, &wall);
        assert!(body.is_flying());
        assert!(body.position[0] > 1.0);
        assert!(!body.grounded);
    }

    #[test]
    fn platform_velocity_uses_preserved_remove_then_inverse_damping_restore() {
        let mut body = NeaPlayerPhysics::new([0.0, 4.0, 0.0]);
        body.platform_velocity = [0.25, 0.0, -0.5];
        body.velocity = [0.25 * TICKS_PER_SECOND, 0.0, -0.5 * TICKS_PER_SECOND];
        body.remove_platform_velocity();
        assert_eq!(body.velocity, [0.0; 3]);
        let dt = TICK_MS as f32 / 1000.0;
        body.integrate_velocity(dt, false);
        body.restore_platform_velocity(dt);
        let inverse = VELOCITY_DAMPING_PER_TICK.exp();
        assert!((body.velocity[0] - inverse * 0.25 * TICKS_PER_SECOND).abs() < 1.0e-5);
        assert!((body.velocity[2] + inverse * 0.5 * TICKS_PER_SECOND).abs() < 1.0e-5);
    }

    #[test]
    fn authoritative_contacts_are_applied_once_and_sanitize_platform_velocity() {
        let mut body = NeaPlayerPhysics::new([0.0, 2.1, 0.0]);
        body.apply_authoritative_contacts(true, 0.75, OCCUPANCY_EDGE_X_NEG, [0.25, f32::NAN, -0.5]);
        assert!(body.grounded);
        assert_eq!(body.phys_fluid, 0.75);
        assert_eq!(body.occupancy, OCCUPANCY_EDGE_X_NEG);
        assert_eq!(body.platform_velocity, [0.25, 0.0, -0.5]);
    }

    #[test]
    fn crouch_occupancy_prevents_motion_over_reported_edges() {
        let mut body = NeaPlayerPhysics::new([0.0, 2.1, 0.0]);
        body.grounded = true;
        body.occupancy = OCCUPANCY_EDGE_X_NEG;
        body.update_horizontal_velocity([1.0, 0.0], MoveMode::Crouch, 0.064);
        assert_eq!(body.velocity[0], 0.0);

        body.occupancy = 0;
        body.update_horizontal_velocity([1.0, 0.0], MoveMode::Crouch, 0.064);
        assert!(body.velocity[0] < 0.0);
    }

    #[test]
    fn recovered_crouch_probes_mark_only_unsupported_directions() {
        let support = |x: i32, y: i32, z: i32| y == 0 && x < 0 && z == 0;
        let occupancy = voxel_occupancy([0.0, 2.1, 0.5], DEFAULT_BODY_HALF_EXTENTS, &support);
        assert_eq!(occupancy & OCCUPANCY_EDGE_X_NEG, 0);
        assert_ne!(occupancy & OCCUPANCY_EDGE_X_POS, 0);
    }
}
