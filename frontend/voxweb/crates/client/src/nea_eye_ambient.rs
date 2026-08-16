//! Recovered eye-local ambient and exposure calculation from the voxel worker.

use glam::{IVec3, Vec3};

use crate::nea_voxel_light::StaticVoxelLight;

const SAMPLE_COUNT: usize = 64;
const MAX_RAY_DISTANCE: f32 = 128.0;
const MIN_HIT_DISTANCE: f32 = 0.5;
const SURFACE_OFFSET: f32 = 0.5;
pub const RECOVERED_INITIAL_EXPOSURE: f32 = 0.01;

pub struct EyeAmbientSampler {
    directions: [Vec3; SAMPLE_COUNT],
}

pub struct EyeExposure {
    pub current: f32,
    log_velocity: f32,
}

impl EyeExposure {
    pub fn new(initial: f32) -> Self {
        Self {
            current: initial,
            log_velocity: 0.0,
        }
    }

    /// Recovered per-frame asymmetric logarithmic exposure smoothing.
    pub fn update(&mut self, target: f32, net_skip: bool) -> f32 {
        if net_skip {
            self.log_velocity = 0.0;
            self.current = target;
            return self.current;
        }
        let current_log = self.current.max(f32::MIN_POSITIVE).ln();
        let mut difference = target.max(f32::MIN_POSITIVE).ln() - current_log;
        if difference < 0.0 {
            difference *= 0.2;
        }
        self.log_velocity = 0.9 * self.log_velocity + 0.004 * difference;
        self.current = (current_log + self.log_velocity).exp();
        self.current
    }
}

impl EyeAmbientSampler {
    /// The original worker creates these directions once with random unit
    /// hemisphere samples and rejects candidates closer than 1/64 to any
    /// prior direction.
    pub fn recovered_random() -> Self {
        let mut directions = [Vec3::Y; SAMPLE_COUNT];
        for index in 0..SAMPLE_COUNT {
            loop {
                let candidate = random_hemisphere_direction();
                let separated = directions[..index]
                    .iter()
                    .all(|direction| candidate.distance(*direction) > 1.0 / 64.0);
                if separated {
                    directions[index] = candidate;
                    break;
                }
            }
        }
        Self { directions }
    }

    pub fn sample(
        &self,
        eye: [f32; 3],
        light: &StaticVoxelLight,
        solid: &impl Fn(i32, i32, i32) -> bool,
    ) -> f32 {
        let eye = Vec3::from(eye);
        let mut sum = light.sample_continuous(eye.x, eye.y, eye.z)[3];
        let mut count = 1.0;
        for direction in self.directions {
            let endpoint = match raycast_hit(eye, direction, MAX_RAY_DISTANCE, solid) {
                Some(hit) if hit.distance < MIN_HIT_DISTANCE => continue,
                Some(hit) => hit.position + hit.normal * SURFACE_OFFSET,
                None => eye + direction * MAX_RAY_DISTANCE,
            };
            sum += light.sample_continuous(endpoint.x, endpoint.y, endpoint.z)[3];
            count += 1.0;
        }
        let average = sum / count;
        1.0 / (1.0 + (40.0 * (0.125 - average)).exp())
    }
}

#[derive(Clone, Copy)]
struct RayHit {
    distance: f32,
    position: Vec3,
    normal: Vec3,
}

fn random_hemisphere_direction() -> Vec3 {
    loop {
        let candidate = Vec3::new(
            (2.0 * js_sys::Math::random() - 1.0) as f32,
            js_sys::Math::random() as f32,
            (2.0 * js_sys::Math::random() - 1.0) as f32,
        );
        if candidate.length_squared() > 1.0e-8 {
            return candidate.normalize();
        }
    }
}

fn raycast_hit(
    origin: Vec3,
    direction: Vec3,
    maximum: f32,
    solid: &impl Fn(i32, i32, i32) -> bool,
) -> Option<RayHit> {
    let direction = direction.normalize_or_zero();
    if direction.length_squared() < 1.0e-8 || maximum <= 0.0 {
        return None;
    }
    let mut cell = origin.floor().as_ivec3();
    if solid(cell.x, cell.y, cell.z) {
        return Some(RayHit {
            distance: 0.0,
            position: origin,
            normal: Vec3::ZERO,
        });
    }
    let step = direction.signum().as_ivec3();
    let delta = Vec3::new(
        reciprocal_abs(direction.x),
        reciprocal_abs(direction.y),
        reciprocal_abs(direction.z),
    );
    let boundary = Vec3::new(
        axis_boundary(cell.x, step.x),
        axis_boundary(cell.y, step.y),
        axis_boundary(cell.z, step.z),
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
            let mut normal = IVec3::ZERO;
            normal[axis] = -step[axis];
            return Some(RayHit {
                distance,
                position: origin + direction * distance,
                normal: normal.as_vec3(),
            });
        }
    }
}

fn axis_boundary(cell: i32, step: i32) -> f32 {
    if step > 0 {
        cell as f32 + 1.0
    } else {
        cell as f32
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
    fn raycast_reports_preserved_surface_normal_and_distance() {
        let hit = raycast_hit(Vec3::new(0.5, 0.5, 0.5), Vec3::X, 10.0, &|x, _, _| x == 2)
            .expect("wall hit");
        assert!((hit.distance - 1.5).abs() < 1.0e-6);
        assert_eq!(hit.normal, -Vec3::X);
    }

    #[test]
    fn exposure_smoothing_matches_recovered_coefficients() {
        let mut exposure = EyeExposure::new(1.0);
        let value = exposure.update(0.25, false);
        let expected_velocity = 0.004 * 0.2 * 0.25_f32.ln();
        assert!((value - expected_velocity.exp()).abs() < 1.0e-6);
        assert_eq!(exposure.update(0.5, true), 0.5);
    }

    #[test]
    fn recovered_camera_exposure_starts_at_schema_default() {
        let exposure = EyeExposure::new(RECOVERED_INITIAL_EXPOSURE);
        assert_eq!(exposure.current, 0.01);
    }
}
