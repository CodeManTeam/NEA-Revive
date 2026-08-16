//! Preserved NEA FOLLOW-camera obstruction and distance recovery.

use glam::Vec3;
use voxweb_protocol::player::{FOLLOW_CAMERA_DISTANCE, PLAYER_HEIGHT, camera_axis, fps_camera};

const CAMERA_COLLISION_MARGIN: f32 = 0.05;
const CAMERA_EYE_OFFSET: f32 = 1.0;
const CAMERA_RECOVERY_PER_FRAME: f32 = 0.03;
const CAMERA_TARGET_CLEARANCE: f32 = 0.1;
const CAMERA_ANCHOR_RESPONSE: f32 = 18.0;
const CAMERA_ANCHOR_SNAP_DISTANCE: f32 = 4.0;

#[derive(Default)]
pub struct FollowCameraAnchor {
    position: Option<Vec3>,
}

impl FollowCameraAnchor {
    pub fn update(&mut self, target: Option<[f32; 3]>, delta_seconds: f32) -> Option<[f32; 3]> {
        let target = Vec3::from(target?);
        let current = self.position.unwrap_or(target);
        let offset = target - current;
        let next = if !delta_seconds.is_finite()
            || delta_seconds <= 0.0
            || offset.length() >= CAMERA_ANCHOR_SNAP_DISTANCE
        {
            target
        } else {
            let blend = 1.0 - (-CAMERA_ANCHOR_RESPONSE * delta_seconds.min(0.1)).exp();
            current + offset * blend
        };
        self.position = Some(next);
        Some(next.to_array())
    }
}

pub struct FollowCameraPose {
    pub eye: [f32; 3],
    pub target: [f32; 3],
    pub ray_distance: f32,
    pub first_person: bool,
}

pub fn follow_camera_pose(
    body: [f32; 3],
    half_height: f32,
    crouching: bool,
    pitch: f32,
    yaw: f32,
    current_ray_distance: f32,
    solid: &impl Fn(i32, i32, i32) -> bool,
) -> FollowCameraPose {
    let body = Vec3::from(body);
    let axis = Vec3::from(camera_axis(pitch, yaw));
    let scale = half_height / PLAYER_HEIGHT;
    let target = camera_target(body, half_height, solid);
    let maximum = scale * FOLLOW_CAMERA_DISTANCE + CAMERA_EYE_OFFSET;
    let desired = obstructed_distance(target, axis, maximum, solid);
    let ray_distance = recover_distance(current_ray_distance, desired);
    if ray_distance < 3.0 * scale {
        let (eye, look) = fps_camera(body.to_array(), half_height, crouching, pitch, yaw);
        return FollowCameraPose {
            eye,
            target: look,
            ray_distance,
            first_person: true,
        };
    }
    let eye = target + axis * (ray_distance - CAMERA_EYE_OFFSET);
    FollowCameraPose {
        eye: eye.to_array(),
        target: target.to_array(),
        ray_distance,
        first_person: false,
    }
}

fn camera_target(body: Vec3, half_height: f32, solid: &impl Fn(i32, i32, i32) -> bool) -> Vec3 {
    let maximum = 0.5 + half_height;
    let rise = raycast_solid_distance(body, Vec3::Y, maximum, solid).map_or(maximum, |distance| {
        (distance - CAMERA_TARGET_CLEARANCE).max(0.0)
    });
    body + Vec3::Y * rise
}

fn obstructed_distance(
    target: Vec3,
    axis: Vec3,
    maximum: f32,
    solid: &impl Fn(i32, i32, i32) -> bool,
) -> f32 {
    let lateral = Vec3::new(-axis.z, 0.0, axis.x).normalize_or_zero();
    let mut distance = maximum;
    for horizontal in -1..=1 {
        for vertical in -1..=1 {
            let direction = (axis
                + lateral * (CAMERA_COLLISION_MARGIN * horizontal as f32)
                + Vec3::Y * (CAMERA_COLLISION_MARGIN * vertical as f32))
                .normalize_or_zero();
            if let Some(hit) = raycast_solid_distance(target, direction, maximum, solid) {
                distance = distance.min(hit);
            }
        }
    }
    distance
}

fn recover_distance(current: f32, desired: f32) -> f32 {
    if current <= 0.0 || desired < current {
        desired
    } else {
        (current + CAMERA_RECOVERY_PER_FRAME).min(desired)
    }
}

fn raycast_solid_distance(
    origin: Vec3,
    direction: Vec3,
    maximum: f32,
    solid: &impl Fn(i32, i32, i32) -> bool,
) -> Option<f32> {
    let direction = direction.normalize_or_zero();
    if direction.length_squared() < 1.0e-8 || maximum <= 0.0 {
        return None;
    }
    let mut cell = origin.floor().as_ivec3();
    if solid(cell.x, cell.y, cell.z) {
        return Some(0.0);
    }
    let step = direction.signum().as_ivec3();
    let delta = Vec3::new(
        reciprocal_abs(direction.x),
        reciprocal_abs(direction.y),
        reciprocal_abs(direction.z),
    );
    let boundary = Vec3::new(
        if step.x > 0 {
            cell.x as f32 + 1.0
        } else {
            cell.x as f32
        },
        if step.y > 0 {
            cell.y as f32 + 1.0
        } else {
            cell.y as f32
        },
        if step.z > 0 {
            cell.z as f32 + 1.0
        } else {
            cell.z as f32
        },
    );
    let mut next = Vec3::new(
        boundary_distance(boundary.x - origin.x, direction.x),
        boundary_distance(boundary.y - origin.y, direction.y),
        boundary_distance(boundary.z - origin.z, direction.z),
    );
    loop {
        let (axis, distance) = smallest_axis(next);
        if distance > maximum {
            return None;
        }
        cell[axis] += step[axis];
        next[axis] += delta[axis];
        if solid(cell.x, cell.y, cell.z) {
            return Some(distance);
        }
    }
}

fn reciprocal_abs(value: f32) -> f32 {
    if value.abs() < 1.0e-8 {
        f32::INFINITY
    } else {
        1.0 / value.abs()
    }
}

fn boundary_distance(offset: f32, direction: f32) -> f32 {
    if direction.abs() < 1.0e-8 {
        f32::INFINITY
    } else {
        (offset / direction).max(0.0)
    }
}

fn smallest_axis(value: Vec3) -> (usize, f32) {
    if value.x <= value.y && value.x <= value.z {
        (0, value.x)
    } else if value.y <= value.z {
        (1, value.y)
    } else {
        (2, value.z)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn unobstructed_follow_camera_uses_preserved_distance() {
        let pose = follow_camera_pose([1.0, 2.0, 3.0], 1.1, false, 0.0, 0.0, 9.5, &|_, _, _| false);
        assert!(!pose.first_person);
        assert_eq!(pose.target, [1.0, 3.6, 3.0]);
        assert_eq!(pose.eye, [9.5, 3.6, 3.0]);
    }

    #[test]
    fn wall_shortens_camera_and_close_wall_switches_to_fps() {
        let wall = |x: i32, _y: i32, _z: i32| x >= 3;
        let pose = follow_camera_pose([1.0, 2.0, 3.0], 1.1, false, 0.0, 0.0, 9.5, &wall);
        assert!(pose.first_person);
        assert!(pose.ray_distance <= 2.0);
    }

    #[test]
    fn camera_recovers_outward_at_preserved_rate() {
        assert!((recover_distance(4.0, 9.5) - 4.03).abs() < 1.0e-6);
        assert_eq!(recover_distance(8.0, 3.0), 3.0);
    }

    #[test]
    fn follow_anchor_smooths_small_prediction_corrections_and_snaps_teleports() {
        let mut anchor = FollowCameraAnchor::default();
        assert_eq!(anchor.update(Some([0.0; 3]), 1.0 / 60.0), Some([0.0; 3]));
        let corrected = anchor.update(Some([0.0, 0.2, 0.0]), 1.0 / 60.0).unwrap();
        assert!(corrected[1] > 0.0 && corrected[1] < 0.2);
        assert_eq!(
            anchor.update(Some([10.0, 5.0, 0.0]), 1.0 / 60.0),
            Some([10.0, 5.0, 0.0]),
        );
    }
}
