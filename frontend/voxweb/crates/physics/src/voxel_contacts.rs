//! Recovered default (`useOBB = false`) NEA terrain-contact path.

const VOXEL_EPSILON: f32 = 1.0 / 256.0;
const FRICTION_CUTOFF: f32 = 1.0 / 1024.0;
const CONTACT_CUTOFF: f32 = 1.0 / 1024.0;
const ACTIVE_ITERATIONS: usize = 2;

#[derive(Clone, Copy, Debug)]
struct Contact {
    axis: usize,
    outward: bool,
    depth: f32,
}

#[derive(Clone, Copy, Debug, Default)]
pub struct TerrainSolveResult {
    pub velocity: [f32; 3],
    pub grounded: bool,
    pub normal_force: [f32; 3],
}

pub fn solve_terrain_contacts(
    position: [f32; 3],
    half_extents: [f32; 3],
    velocity: [f32; 3],
    dt: f32,
    mass: f32,
    body_friction: f32,
    surface_friction: f32,
    restitution: f32,
    solid: &impl Fn(i32, i32, i32) -> bool,
) -> TerrainSolveResult {
    if dt <= 0.0 || !dt.is_finite() {
        return TerrainSolveResult {
            velocity,
            ..Default::default()
        };
    }
    let contacts = find_contacts(position, half_extents, velocity, dt, solid);
    let mut result = TerrainSolveResult {
        velocity,
        ..Default::default()
    };
    let friction = body_friction * surface_friction;

    // The recovered AABB solver presolves and solves in Y/X/Z order.
    for axis in [1, 0, 2] {
        solve_axis(
            &contacts,
            axis,
            dt,
            mass,
            friction,
            restitution,
            &mut result,
        );
    }
    result
}

fn find_contacts(
    position: [f32; 3],
    half_extents: [f32; 3],
    velocity: [f32; 3],
    dt: f32,
    solid: &impl Fn(i32, i32, i32) -> bool,
) -> Vec<Contact> {
    let end: [f32; 3] = std::array::from_fn(|axis| position[axis] + velocity[axis] * dt);
    let min: [f32; 3] = std::array::from_fn(|axis| {
        position[axis].min(end[axis]) - half_extents[axis] - VOXEL_EPSILON
    });
    let max: [f32; 3] = std::array::from_fn(|axis| {
        position[axis].max(end[axis]) + half_extents[axis] + VOXEL_EPSILON
    });
    let start_cell = min.map(|value| value.floor() as i32);
    let end_cell = max.map(|value| value.ceil() as i32);
    let mut contacts = Vec::new();
    for z in start_cell[2]..end_cell[2] {
        for y in start_cell[1]..end_cell[1] {
            for x in start_cell[0]..end_cell[0] {
                if solid(x, y, z) {
                    if let Some(contact) = box_sweep_intersect(
                        position,
                        end,
                        half_extents,
                        [x as f32, y as f32, z as f32],
                    ) && voxel_face_is_exposed([x, y, z], contact, solid)
                    {
                        contacts.push(contact);
                    }
                }
            }
        }
    }
    contacts
}

/// Internal faces shared by two solid voxels do not participate in the
/// recovered voxel contact manifold. Keeping them makes tile seams behave as
/// walls when the player's AABB starts exactly on an expanded face.
fn voxel_face_is_exposed(
    voxel: [i32; 3],
    contact: Contact,
    solid: &impl Fn(i32, i32, i32) -> bool,
) -> bool {
    let mut neighbor = voxel;
    neighbor[contact.axis] += if contact.outward { -1 } else { 1 };
    !solid(neighbor[0], neighbor[1], neighbor[2])
}

fn box_sweep_intersect(
    start: [f32; 3],
    end: [f32; 3],
    half: [f32; 3],
    voxel_min: [f32; 3],
) -> Option<Contact> {
    let voxel_max = voxel_min.map(|value| value + 1.0);
    let expanded_min: [f32; 3] = std::array::from_fn(|axis| voxel_min[axis] - half[axis]);
    let expanded_max: [f32; 3] = std::array::from_fn(|axis| voxel_max[axis] + half[axis]);
    let delta: [f32; 3] = std::array::from_fn(|axis| end[axis] - start[axis]);
    let mut entry = 0.0_f32;
    let mut exit = 1.0_f32;
    let mut hit_axis = None;
    for axis in 0..3 {
        if delta[axis].abs() <= 1.0e-6 {
            if start[axis] < expanded_min[axis] || start[axis] > expanded_max[axis] {
                return None;
            }
            continue;
        }
        let inverse = delta[axis].recip();
        let t0 = (expanded_min[axis] - start[axis]) * inverse;
        let t1 = (expanded_max[axis] - start[axis]) * inverse;
        let near = t0.min(t1);
        let far = t0.max(t1);
        if near >= entry {
            entry = near;
            hit_axis = Some(axis);
        }
        exit = exit.min(far);
    }
    if exit < entry || entry > 1.0 {
        return None;
    }
    if entry >= 1.0e-4 {
        let axis = hit_axis?;
        let outward = delta[axis] > 0.0;
        let depth = if outward {
            start[axis] - expanded_min[axis]
        } else {
            expanded_max[axis] - start[axis]
        };
        return Some(Contact {
            axis,
            outward,
            depth,
        });
    }

    // The recovered constraint solver prioritizes Y/X/Z. Preserve that order
    // for equal-depth initial overlaps as well, otherwise a player standing
    // exactly on a floor-tile seam can select the tile's internal X/Z face
    // and experience it as an invisible wall.
    let mut best = (f32::INFINITY, 0, false);
    for axis in [1, 0, 2] {
        let negative = start[axis] - expanded_min[axis];
        if negative < best.0 {
            best = (negative, axis, true);
        }
        let positive = expanded_max[axis] - start[axis];
        if positive < best.0 {
            best = (positive, axis, false);
        }
    }
    (best.0 >= 0.0).then_some(Contact {
        axis: best.1,
        outward: best.2,
        depth: best.0,
    })
}

fn solve_axis(
    contacts: &[Contact],
    axis: usize,
    dt: f32,
    mass: f32,
    friction: f32,
    restitution: f32,
    result: &mut TerrainSolveResult,
) {
    for outward in [true, false] {
        let Some(depth) = contacts
            .iter()
            .filter(|contact| contact.axis == axis && contact.outward == outward)
            .map(|contact| contact.depth)
            .max_by(f32::total_cmp)
        else {
            continue;
        };
        // Recovered `flip` names the incoming/min face. Its constraint normal
        // points toward negative axis; the max face points positive.
        let sign = if outward { -1.0 } else { 1.0 };
        let bias = depth / dt - restitution * sign * result.velocity[axis];
        let mut lambda = 0.0;
        for _ in 0..ACTIVE_ITERATIONS {
            let next = (lambda + mass * (bias - sign * result.velocity[axis])).max(0.0);
            result.velocity[axis] += sign * (next - lambda) / mass;
            lambda = next;
        }
        if lambda <= 0.0 {
            continue;
        }
        result.normal_force[axis] += sign * lambda / dt;
        if axis == 1 && !outward && lambda / dt >= CONTACT_CUTOFF {
            result.grounded = true;
        }
        let tangent = match axis {
            0 => [1, 2],
            1 => [2, 0],
            _ => [0, 1],
        };
        let speed = result.velocity[tangent[0]].hypot(result.velocity[tangent[1]]);
        let denominator = speed.max(FRICTION_CUTOFF);
        let friction_impulse = (friction * lambda / denominator).min(mass);
        result.velocity[tangent[0]] *= 1.0 - friction_impulse / mass;
        result.velocity[tangent[1]] *= 1.0 - friction_impulse / mass;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn falling_body_gets_support_and_horizontal_friction() {
        let floor = |_x, y, _z| y == 0;
        let result = solve_terrain_contacts(
            [0.5, 2.1, 0.5],
            [0.45, 1.1, 0.45],
            [4.0, -1.0, 0.0],
            0.016,
            1.75,
            0.1,
            1.0,
            0.0,
            &floor,
        );
        assert!(result.grounded);
        assert!(result.velocity[1] >= 0.0);
        assert!(result.velocity[0] < 4.0);
    }

    #[test]
    fn diagonal_motion_keeps_tangent_velocity_at_a_wall() {
        let wall = |x, _y, _z| x == 2;
        let result = solve_terrain_contacts(
            [0.5, 2.0, 0.5],
            [0.45, 1.1, 0.45],
            [20.0, 0.0, 3.0],
            0.1,
            1.75,
            0.0,
            1.0,
            0.0,
            &wall,
        );
        assert!(result.velocity[0] <= 10.5);
        assert_eq!(result.velocity[2], 3.0);
    }

    #[test]
    fn flat_floor_tile_seam_does_not_block_horizontal_motion() {
        let floor = |_x, y, _z| y == 0;
        let result = solve_terrain_contacts(
            [0.55, 2.1, 0.5],
            [0.45, 1.1, 0.45],
            [4.0, -1.0, 0.0],
            0.016,
            1.75,
            0.0,
            1.0,
            0.0,
            &floor,
        );
        assert!(result.grounded);
        assert!(result.velocity[0] > 3.9);
    }

    #[test]
    fn internal_voxel_face_is_filtered_but_exposed_wall_remains() {
        let contact = Contact {
            axis: 0,
            outward: true,
            depth: 0.0,
        };
        let joined = |x, y, z| y == 0 && (x == 0 || x == 1) && z == 0;
        assert!(!voxel_face_is_exposed([1, 0, 0], contact, &joined));

        let isolated = |x, y, z| x == 1 && y == 0 && z == 0;
        assert!(voxel_face_is_exposed([1, 0, 0], contact, &isolated));
    }

    #[test]
    fn body_falls_when_a_two_voxel_gap_has_no_support() {
        let split_floor = |x, y, _z| y == 0 && (x < 0 || x > 1);
        let result = solve_terrain_contacts(
            [1.0, 2.1, 0.5],
            [0.45, 1.1, 0.45],
            [0.0, -1.0, 0.0],
            0.016,
            1.75,
            0.1,
            1.0,
            0.0,
            &split_floor,
        );
        assert!(!result.grounded);
        assert!(result.velocity[1] < 0.0);
    }
}
