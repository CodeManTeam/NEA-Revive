//! Tick-indexed dirty-state replay recovered from the preserved Player net loop.

use std::collections::VecDeque;

use voxweb_protocol::netstate::RigidBody;
use voxweb_protocol::player::{MoveMode, TICK_SECONDS};

use voxweb_physics::NeaPlayerPhysics;

const HISTORY_LIMIT: usize = 64;

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct PredictionInput {
    pub movement: [f32; 2],
    pub mode: MoveMode,
    pub jump_edge: bool,
    pub jump_held: bool,
}

#[derive(Clone)]
struct PredictionFrame {
    tick: u32,
    authoritative: bool,
    dirty: bool,
    physics: NeaPlayerPhysics,
    bodies: Vec<RigidBody>,
    input: PredictionInput,
}

pub struct PredictionHistory {
    frames: VecDeque<PredictionFrame>,
}

impl PredictionHistory {
    pub fn new() -> Self {
        Self {
            frames: VecDeque::with_capacity(HISTORY_LIMIT),
        }
    }

    /// Retire frames acknowledged by a transform-echo backend without
    /// replacing newer render-frame prediction with the echoed snapshot.
    pub fn discard_echo_through(&mut self, tick: u32) {
        self.discard_through(tick);
    }

    /// Input submitted for tick N is applied at N+1 by the compatibility
    /// backend, matching the preserved input-array index convention.
    pub fn record_submitted(
        &mut self,
        client_tick: u32,
        physics: &NeaPlayerPhysics,
        bodies: &[RigidBody],
        input: PredictionInput,
    ) {
        let tick = client_tick.saturating_add(1);
        let frame = PredictionFrame {
            tick,
            authoritative: false,
            dirty: false,
            physics: physics.clone(),
            bodies: bodies.to_vec(),
            input,
        };
        if let Some(index) = self.frames.iter().position(|item| item.tick == tick) {
            self.frames[index] = frame;
        } else {
            self.frames.push_back(frame);
        }
        self.frames.make_contiguous().sort_by_key(|item| item.tick);
        while self.frames.len() > HISTORY_LIMIT {
            self.frames.pop_front();
        }
    }

    #[allow(clippy::too_many_arguments)]
    pub fn reconcile_and_replay(
        &mut self,
        authoritative_tick: u32,
        authoritative_position: [f32; 3],
        authoritative_velocity: [f32; 3],
        current: &mut NeaPlayerPhysics,
        solid: &impl Fn(i32, i32, i32) -> bool,
        bodies: &mut Vec<RigidBody>,
    ) -> bool {
        if !authoritative_position
            .iter()
            .chain(authoritative_velocity.iter())
            .all(|value| value.is_finite())
        {
            return false;
        }
        let Some(index) = self
            .frames
            .iter()
            .position(|frame| frame.tick == authoritative_tick)
        else {
            self.discard_before(authoritative_tick);
            return false;
        };

        // Preserve the contact, jump, and movement state captured for this
        // tick. Using the current render-frame state here mixes two points in
        // time and can repeatedly turn an acknowledged landing into an
        // airborne state during replay.
        let mut authoritative_physics = self.frames[index].physics.clone();
        authoritative_physics.position = authoritative_position;
        authoritative_physics.velocity = authoritative_velocity;
        self.frames[index].physics = authoritative_physics;
        self.frames[index].authoritative = true;
        self.frames[index].dirty = false;
        for frame in self.frames.iter_mut().skip(index + 1) {
            if !frame.authoritative {
                frame.dirty = true;
            }
        }

        for replay_index in index + 1..self.frames.len() {
            if !self.frames[replay_index].dirty {
                continue;
            }
            let mut replayed = self.frames[replay_index - 1].physics.clone();
            let mut replayed_bodies = self.frames[replay_index - 1].bodies.clone();
            let input = self.frames[replay_index].input;
            replayed.step_with_bodies(
                input.movement,
                input.mode,
                input.jump_edge,
                input.jump_held,
                TICK_SECONDS,
                solid,
                &mut replayed_bodies,
            );
            self.frames[replay_index].physics = replayed;
            self.frames[replay_index].bodies = replayed_bodies;
            self.frames[replay_index].dirty = false;
        }
        *current = self
            .frames
            .back()
            .unwrap_or(&self.frames[index])
            .physics
            .clone();
        *bodies = self
            .frames
            .back()
            .unwrap_or(&self.frames[index])
            .bodies
            .clone();
        self.discard_through(authoritative_tick);
        true
    }

    fn discard_before(&mut self, tick: u32) {
        while self.frames.front().is_some_and(|frame| frame.tick < tick) {
            self.frames.pop_front();
        }
    }

    fn discard_through(&mut self, tick: u32) {
        while self.frames.front().is_some_and(|frame| frame.tick <= tick) {
            self.frames.pop_front();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const INPUT: PredictionInput = PredictionInput {
        movement: [1.0, 0.0],
        mode: MoveMode::Walk,
        jump_edge: false,
        jump_held: false,
    };

    fn active_support_body() -> RigidBody {
        RigidBody {
            id: 2,
            flags: 2,
            group: 0,
            mass: 1.0,
            friction: 0.0,
            restitution: 0.0,
            rx: 1.0,
            ry: 1.0,
            rz: 1.0,
            px: 0.0,
            py: -0.99,
            pz: 0.0,
            vx: 0.0,
            vy: 0.0,
            vz: 0.0,
            qx: 0.0,
            qy: 0.0,
            qz: 0.0,
            qw: 1.0,
            hsx: 0.5,
            hsy: 0.5,
            hsz: 0.5,
            ax: 0.0,
            ay: 0.0,
            az: 0.0,
        }
    }

    #[test]
    fn authoritative_tick_replays_all_later_dirty_states() {
        let air = |_: i32, _: i32, _: i32| false;
        let mut history = PredictionHistory::new();
        let mut physics = NeaPlayerPhysics::new([0.0; 3]);
        history.record_submitted(10, &physics, &[], INPUT);
        physics.step_with_bodies(
            INPUT.movement,
            INPUT.mode,
            false,
            false,
            TICK_SECONDS,
            &air,
            &mut [],
        );
        history.record_submitted(11, &physics, &[], INPUT);
        let mut current = physics.clone();
        let mut bodies = Vec::new();
        assert!(history.reconcile_and_replay(
            11,
            [2.0, 3.0, 4.0],
            [0.0; 3],
            &mut current,
            &air,
            &mut bodies,
        ));
        assert!((current.position[0] - 2.0).abs() > 0.0 || (current.position[2] - 4.0).abs() > 0.0);
        assert!(current.position[1] < 3.0);
    }

    #[test]
    fn unmatched_authoritative_frame_keeps_current_prediction() {
        let air = |_: i32, _: i32, _: i32| false;
        let mut history = PredictionHistory::new();
        let physics = NeaPlayerPhysics::new([4.0; 3]);
        history.record_submitted(10, &physics, &[], INPUT);
        let mut current = physics.clone();
        let mut bodies = Vec::new();
        assert!(!history.reconcile_and_replay(
            12,
            [0.0; 3],
            [0.0; 3],
            &mut current,
            &air,
            &mut bodies,
        ));
        assert_eq!(current.position, [4.0; 3]);
    }

    #[test]
    fn authoritative_tick_preserves_its_recorded_contact_state() {
        let floor = |_: i32, y: i32, _: i32| y == 0;
        let mut history = PredictionHistory::new();
        let mut submitted = NeaPlayerPhysics::new([0.0, 1.9, 0.0]);
        submitted.grounded = true;
        history.record_submitted(10, &submitted, &[], INPUT);

        let mut current = NeaPlayerPhysics::new([0.0, 4.0, 0.0]);
        current.grounded = false;
        let mut bodies = Vec::new();
        assert!(history.reconcile_and_replay(
            11,
            submitted.position,
            [0.0; 3],
            &mut current,
            &floor,
            &mut bodies,
        ));
        assert!(current.grounded);
    }

    #[test]
    fn submitted_client_tick_matches_the_backend_next_apply_tick() {
        let mut history = PredictionHistory::new();
        let physics = NeaPlayerPhysics::new([0.0; 3]);
        history.record_submitted(41, &physics, &[], INPUT);
        assert_eq!(history.frames.front().map(|frame| frame.tick), Some(42));

        history.record_submitted(u32::MAX, &physics, &[], INPUT);
        assert_eq!(
            history.frames.back().map(|frame| frame.tick),
            Some(u32::MAX)
        );
    }

    #[test]
    fn transform_echo_acknowledgement_does_not_replace_fractional_prediction() {
        let mut history = PredictionHistory::new();
        let submitted = NeaPlayerPhysics::new([1.0, 2.0, 3.0]);
        history.record_submitted(41, &submitted, &[], INPUT);
        let mut fractional = submitted.clone();
        fractional.position[0] = 1.25;

        history.discard_echo_through(42);

        assert!(history.frames.is_empty());
        assert_eq!(fractional.position, [1.25, 2.0, 3.0]);
    }

    #[test]
    fn dirty_replay_restores_participating_active_body_state() {
        let air = |_: i32, _: i32, _: i32| false;
        let mut history = PredictionHistory::new();
        let mut physics = NeaPlayerPhysics::new([0.0; 3]);
        physics.velocity = [0.0, -0.1 / TICK_SECONDS, 0.0];
        let authoritative_bodies = vec![active_support_body()];
        history.record_submitted(10, &physics, &authoritative_bodies, INPUT);
        let mut predicted_bodies = authoritative_bodies.clone();
        physics.step_with_bodies(
            INPUT.movement,
            INPUT.mode,
            false,
            false,
            TICK_SECONDS,
            &air,
            &mut predicted_bodies,
        );
        history.record_submitted(11, &physics, &predicted_bodies, INPUT);
        let mut current = physics.clone();
        let mut replay_bodies = authoritative_bodies;
        assert!(history.reconcile_and_replay(
            11,
            [0.0; 3],
            [0.0, -0.1 / TICK_SECONDS, 0.0],
            &mut current,
            &air,
            &mut replay_bodies,
        ));
        assert!(replay_bodies[0].vy < 0.0);
        assert!(replay_bodies[0].py < -0.99);
    }
}
