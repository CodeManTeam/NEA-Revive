//! Recovered Player/body contact constraints from `m64781.ContactSet`.

use glam::{Mat3, Quat, Vec3};
use voxweb_protocol::netstate::RigidBody;

use crate::obb_contact::{ObbContactManifold, player_body_manifold};

const ACTIVE_ITERATION_COUNT: usize = 2;
const CONTACT_CUTOFF: f32 = 1.0 / 1024.0;
const RESTITUTION_VELOCITY_CUTOFF: f32 = -1.0;
const PENETRATION_SLOP: f32 = 5.0e-3;
const PENETRATION_BIAS: f32 = 0.5;
const COLLIDES_FLAG: u32 = 2;
const PLAYER_FLAG: u32 = 8;
const FIXED_FLAG: u32 = 16;
const REMOTE_FLAG: u32 = 32;
const ANIMATED_FLAG: u32 = 64;
const GRAVITY_FLAG: u32 = 4;
const VELOCITY_DAMPING: f32 = 0.01;
const GRAVITY: f32 = -0.1;
const MAX_VELOCITY: f32 = 128.0;
const VELOCITY_CUTOFF: f32 = 1.0 / 256.0;

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct PlayerContactResult {
    pub velocity: Vec3,
    pub force: Vec3,
    pub grounded: bool,
    pub platform_velocity: Vec3,
}

#[derive(Clone, Copy)]
struct PointConstraint {
    normal: Vec3,
    tangent: Vec3,
    binormal: Vec3,
    body_offset: Vec3,
    normal_body_torque: Vec3,
    tangent_body_torque: Vec3,
    binormal_body_torque: Vec3,
    normal_target: f32,
    normal_denominator: f32,
    tangent_denominator: f32,
    binormal_denominator: f32,
    normal_impulse: f32,
    tangent_impulse: f32,
    binormal_impulse: f32,
}

pub fn solve_player_contacts(
    player_position: [f32; 3],
    player_half_extents: [f32; 3],
    player_velocity: Vec3,
    player_mass: f32,
    player_friction: f32,
    player_restitution: f32,
    bodies: &mut [RigidBody],
) -> PlayerContactResult {
    if !player_mass.is_finite() || player_mass <= 0.0 {
        return empty_result(player_velocity);
    }
    let mut velocity = player_velocity;
    let mut force = Vec3::ZERO;
    let mut grounded = false;
    let mut platform_velocity_sum = Vec3::ZERO;
    let mut platform_force = 0.0;
    for body in bodies {
        if !participates_in_local_contacts(body) {
            continue;
        }
        let Some(manifold) = player_body_manifold(player_position, player_half_extents, body)
        else {
            continue;
        };
        let solved = solve_manifold(
            velocity,
            player_mass,
            player_friction,
            player_restitution,
            body,
            &manifold,
        );
        velocity = solved.velocity;
        force += solved.force;
        grounded |= solved.grounded;
        if solved.grounded {
            platform_velocity_sum += Vec3::new(body.vx, body.vy, body.vz) * solved.force.y;
            platform_force += solved.force.y;
        }
    }
    PlayerContactResult {
        velocity,
        force,
        grounded,
        platform_velocity: if platform_force > 0.0 {
            platform_velocity_sum / platform_force
        } else {
            Vec3::ZERO
        },
    }
}

pub fn advance_active_bodies(bodies: &mut [RigidBody], delta_ticks: f32) {
    if !delta_ticks.is_finite() || delta_ticks <= 0.0 {
        return;
    }
    let velocity_scale = (-VELOCITY_DAMPING * delta_ticks).exp();
    let acceleration_factor = (1.0 - velocity_scale) / VELOCITY_DAMPING;
    for body in bodies {
        if body.flags & FIXED_FLAG != 0
            || body.flags & REMOTE_FLAG != 0 && body.flags & ANIMATED_FLAG == 0
        {
            continue;
        }
        body.vx = clamp_velocity(velocity_scale * body.vx);
        body.vy = clamp_velocity(
            velocity_scale * body.vy
                + if body.flags & GRAVITY_FLAG != 0 {
                    acceleration_factor * GRAVITY
                } else {
                    0.0
                },
        );
        body.vz = clamp_velocity(velocity_scale * body.vz);
        body.ax = clamp_and_sleep(velocity_scale * body.ax);
        body.ay = clamp_and_sleep(velocity_scale * body.ay);
        body.az = clamp_and_sleep(velocity_scale * body.az);
        body.px += delta_ticks * body.vx;
        body.py += delta_ticks * body.vy;
        body.pz += delta_ticks * body.vz;
        integrate_quaternion(body, delta_ticks);
    }
}

fn integrate_quaternion(body: &mut RigidBody, delta_ticks: f32) {
    let mut quaternion = Quat::from_xyzw(body.qx, body.qy, body.qz, body.qw);
    let angular = Quat::from_xyzw(body.ax, body.ay, body.az, 0.0);
    quaternion = quaternion + (angular * quaternion) * (0.5 * delta_ticks);
    quaternion = if quaternion.length_squared() > 0.0 {
        quaternion.normalize()
    } else {
        Quat::IDENTITY
    };
    [body.qx, body.qy, body.qz, body.qw] = quaternion.to_array();
}

fn clamp_velocity(value: f32) -> f32 {
    value.clamp(-MAX_VELOCITY, MAX_VELOCITY)
}

fn clamp_and_sleep(value: f32) -> f32 {
    if value.abs() < VELOCITY_CUTOFF {
        0.0
    } else {
        clamp_velocity(value)
    }
}

fn participates_in_local_contacts(body: &RigidBody) -> bool {
    body.flags & COLLIDES_FLAG != 0
        && (body.flags & REMOTE_FLAG == 0 || body.flags & ANIMATED_FLAG != 0)
}

fn empty_result(velocity: Vec3) -> PlayerContactResult {
    PlayerContactResult {
        velocity,
        force: Vec3::ZERO,
        grounded: false,
        platform_velocity: Vec3::ZERO,
    }
}

fn solve_manifold(
    mut player_velocity: Vec3,
    player_mass: f32,
    player_friction: f32,
    player_restitution: f32,
    body: &mut RigidBody,
    manifold: &ObbContactManifold,
) -> PlayerContactResult {
    let player_inverse_mass = player_mass.recip();
    let body_inverse_mass = inverse_mass(body);
    let body_inverse_inertia = inverse_inertia(body);
    let mass_sum = player_inverse_mass + body_inverse_mass;
    let friction = sqrt_product(player_friction, body.friction);
    let restitution = sqrt_product(player_restitution, body.restitution);
    let body_center = Vec3::new(body.px, body.py, body.pz);
    let mut body_velocity = Vec3::new(body.vx, body.vy, body.vz);
    let mut body_angular_velocity = Vec3::new(body.ax, body.ay, body.az);
    let mut constraints = Vec::with_capacity(manifold.points.len());
    for point in &manifold.points {
        let body_offset = point.position - body_center;
        let body_point_velocity = body_velocity + body_angular_velocity.cross(body_offset);
        let relative_velocity = body_point_velocity - player_velocity;
        let normal_speed = relative_velocity.dot(manifold.normal);
        let tangent = contact_tangent(manifold.normal, relative_velocity, normal_speed);
        let binormal = manifold.normal.cross(tangent);
        let normal_body_torque = body_inverse_inertia * body_offset.cross(manifold.normal);
        let tangent_body_torque = body_inverse_inertia * body_offset.cross(tangent);
        let binormal_body_torque = body_inverse_inertia * body_offset.cross(binormal);
        constraints.push(PointConstraint {
            normal: manifold.normal,
            tangent,
            binormal,
            body_offset,
            normal_body_torque,
            tangent_body_torque,
            binormal_body_torque,
            normal_target: normal_target(normal_speed, restitution, point.penetration),
            normal_denominator: effective_mass(
                mass_sum,
                manifold.normal,
                normal_body_torque,
                body_offset,
            ),
            tangent_denominator: effective_mass(
                mass_sum,
                tangent,
                tangent_body_torque,
                body_offset,
            ),
            binormal_denominator: effective_mass(
                mass_sum,
                binormal,
                binormal_body_torque,
                body_offset,
            ),
            normal_impulse: 0.0,
            tangent_impulse: 0.0,
            binormal_impulse: 0.0,
        });
    }

    for _ in 0..ACTIVE_ITERATION_COUNT {
        for constraint in constraints.iter_mut().rev() {
            let relative_velocity = body_velocity
                + body_angular_velocity.cross(constraint.body_offset)
                - player_velocity;
            let old_tangent = constraint.tangent_impulse;
            let old_binormal = constraint.binormal_impulse;
            let mut tangent_impulse = old_tangent
                + relative_velocity.dot(constraint.tangent) * constraint.tangent_denominator;
            let mut binormal_impulse = old_binormal
                + relative_velocity.dot(constraint.binormal) * constraint.binormal_denominator;
            let friction_limit = friction * constraint.normal_impulse.abs();
            clamp_friction_pair(&mut tangent_impulse, &mut binormal_impulse, friction_limit);
            apply_impulse(
                constraint.tangent,
                constraint.tangent_body_torque,
                tangent_impulse - old_tangent,
                player_inverse_mass,
                body_inverse_mass,
                &mut player_velocity,
                &mut body_velocity,
                &mut body_angular_velocity,
            );
            apply_impulse(
                constraint.binormal,
                constraint.binormal_body_torque,
                binormal_impulse - old_binormal,
                player_inverse_mass,
                body_inverse_mass,
                &mut player_velocity,
                &mut body_velocity,
                &mut body_angular_velocity,
            );
            constraint.tangent_impulse = tangent_impulse;
            constraint.binormal_impulse = binormal_impulse;

            let relative_velocity = body_velocity
                + body_angular_velocity.cross(constraint.body_offset)
                - player_velocity;
            let old_normal = constraint.normal_impulse;
            let normal_delta = (relative_velocity.dot(constraint.normal)
                - constraint.normal_target)
                * constraint.normal_denominator;
            let normal_impulse = (old_normal + normal_delta).min(0.0);
            apply_impulse(
                constraint.normal,
                constraint.normal_body_torque,
                normal_impulse - old_normal,
                player_inverse_mass,
                body_inverse_mass,
                &mut player_velocity,
                &mut body_velocity,
                &mut body_angular_velocity,
            );
            constraint.normal_impulse = normal_impulse;
        }
    }

    body.vx = body_velocity.x;
    body.vy = body_velocity.y;
    body.vz = body_velocity.z;
    body.ax = body_angular_velocity.x;
    body.ay = body_angular_velocity.y;
    body.az = body_angular_velocity.z;
    let force = contact_force(&constraints);
    PlayerContactResult {
        velocity: player_velocity,
        force,
        grounded: manifold.normal.y != 0.0 && force.y > CONTACT_CUTOFF,
        platform_velocity: Vec3::ZERO,
    }
}

#[allow(clippy::too_many_arguments)]
fn apply_impulse(
    axis: Vec3,
    body_torque: Vec3,
    impulse: f32,
    player_inverse_mass: f32,
    body_inverse_mass: f32,
    player_velocity: &mut Vec3,
    body_velocity: &mut Vec3,
    body_angular_velocity: &mut Vec3,
) {
    *player_velocity += axis * (player_inverse_mass * impulse);
    *body_velocity -= axis * (body_inverse_mass * impulse);
    *body_angular_velocity -= body_torque * impulse;
}

fn effective_mass(mass_sum: f32, axis: Vec3, torque: Vec3, offset: Vec3) -> f32 {
    let denominator = mass_sum + axis.dot(torque.cross(offset));
    if denominator > 0.0 {
        denominator.recip()
    } else {
        0.0
    }
}

fn inverse_mass(body: &RigidBody) -> f32 {
    if body.flags & FIXED_FLAG != 0 || !body.mass.is_finite() || body.mass <= 0.0 {
        0.0
    } else {
        body.mass.recip()
    }
}

fn inverse_inertia(body: &RigidBody) -> Mat3 {
    if body.flags & (FIXED_FLAG | PLAYER_FLAG) != 0 || inverse_mass(body) == 0.0 {
        return Mat3::ZERO;
    }
    let inertia = Vec3::new(
        body.mass * (body.hsy * body.hsy + body.hsz * body.hsz) / 3.0,
        body.mass * (body.hsx * body.hsx + body.hsz * body.hsz) / 3.0,
        body.mass * (body.hsx * body.hsx + body.hsy * body.hsy) / 3.0,
    );
    if inertia.min_element() <= 0.0 {
        return Mat3::ZERO;
    }
    let quaternion = Quat::from_xyzw(body.qx, body.qy, body.qz, body.qw);
    let rotation = if quaternion.length_squared() > 1.0e-5 {
        Mat3::from_quat(quaternion.normalize())
    } else {
        Mat3::IDENTITY
    };
    rotation * Mat3::from_diagonal(inertia.recip()) * rotation.transpose()
}

fn normal_target(normal_speed: f32, restitution: f32, penetration: f32) -> f32 {
    let restitution_speed = if normal_speed > RESTITUTION_VELOCITY_CUTOFF {
        0.0
    } else {
        restitution * -normal_speed
    };
    restitution_speed.max(PENETRATION_BIAS * (-penetration - PENETRATION_SLOP))
}

fn clamp_friction_pair(tangent: &mut f32, binormal: &mut f32, limit: f32) {
    let length = (*tangent * *tangent + *binormal * *binormal).sqrt();
    if length > limit && length > 0.0 {
        let scale = limit / length;
        *tangent *= scale;
        *binormal *= scale;
    }
}

fn contact_force(constraints: &[PointConstraint]) -> Vec3 {
    constraints.iter().fold(Vec3::ZERO, |force, constraint| {
        force
            + constraint.normal * constraint.normal_impulse
            + constraint.tangent * constraint.tangent_impulse
            + constraint.binormal * constraint.binormal_impulse
    })
}

fn contact_tangent(normal: Vec3, relative_velocity: Vec3, normal_speed: f32) -> Vec3 {
    let tangent = relative_velocity - normal * normal_speed;
    if tangent.length_squared() > 0.04 {
        tangent
    } else {
        Vec3::new(
            normal.y * normal.x - normal.z * normal.z,
            -normal.z * normal.y - normal.x * normal.x,
            normal.x * normal.z + normal.y * normal.y,
        )
    }
}

fn sqrt_product(left: f32, right: f32) -> f32 {
    (left.max(0.0) * right.max(0.0)).sqrt()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn body(position: [f32; 3], velocity: [f32; 3], flags: u32) -> RigidBody {
        RigidBody {
            id: 2,
            flags,
            group: 0,
            mass: 1.0,
            friction: 1.0,
            restitution: 0.0,
            rx: 1.0,
            ry: 1.0,
            rz: 1.0,
            px: position[0],
            py: position[1],
            pz: position[2],
            vx: velocity[0],
            vy: velocity[1],
            vz: velocity[2],
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
    fn fixed_platform_stops_fall_and_transfers_friction() {
        let mut bodies = [body([0.0, -0.99, 0.0], [0.05, 0.0, 0.0], 2 | 16)];
        let result = solve_player_contacts(
            [0.0; 3],
            [0.5; 3],
            Vec3::new(0.0, -0.1, 0.0),
            1.0,
            1.0,
            0.0,
            &mut bodies,
        );
        assert!(result.velocity.y > 0.0);
        assert!(result.velocity.x > 0.0);
        assert!(result.grounded);
    }

    #[test]
    fn active_body_receives_equal_opposite_linear_reaction() {
        let mut bodies = [body([0.0, -0.99, 0.0], [0.0; 3], 2)];
        let result = solve_player_contacts(
            [0.0; 3],
            [0.5; 3],
            Vec3::new(0.0, -0.1, 0.0),
            1.0,
            0.0,
            0.0,
            &mut bodies,
        );
        assert!(result.velocity.y > -0.1);
        assert!(bodies[0].vy < 0.0);
        assert!((result.velocity.y + bodies[0].vy + 0.1).abs() < 1.0e-5);
    }

    #[test]
    fn remote_nonanimated_body_is_excluded_like_prepare_bodies() {
        let mut bodies = [body([0.0, -0.99, 0.0], [0.0; 3], 2 | 32)];
        let result = solve_player_contacts(
            [0.0; 3],
            [0.5; 3],
            Vec3::new(0.0, -0.1, 0.0),
            1.0,
            1.0,
            0.0,
            &mut bodies,
        );
        assert_eq!(result.velocity, Vec3::new(0.0, -0.1, 0.0));
    }

    #[test]
    fn active_body_tick_advance_matches_recovered_damping_and_gravity() {
        let mut bodies = [body([0.0; 3], [1.0, 0.0, 0.0], 2 | 4)];
        advance_active_bodies(&mut bodies, 1.0);
        let scale = (-VELOCITY_DAMPING).exp();
        assert!((bodies[0].vx - scale).abs() < 1.0e-6);
        assert!((bodies[0].vy - (1.0 - scale) / VELOCITY_DAMPING * GRAVITY).abs() < 1.0e-6);
        assert_eq!(bodies[0].px, bodies[0].vx);
    }
}
