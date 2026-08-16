//! NEA OBB contact-axis selection recovered from `m66300.OBBOBBintersect`.

use glam::{Mat3, Quat, Vec3};
use voxweb_protocol::netstate::RigidBody;

const COLLIDES_FLAG: u32 = 2;
const DEGENERATE_AXIS_LENGTH_SQUARED: f32 = 1.0e-5;
const CROSS_AXIS_SELECTION_BIAS: f32 = 0.01;

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct ObbContactAxis {
    /// Unit axis directed from the first box toward the second box.
    pub normal: Vec3,
    pub penetration: f32,
    pub separating_axis_index: usize,
}

#[derive(Clone, Debug, PartialEq)]
pub struct ObbManifoldPoint {
    pub position: Vec3,
    /// Recovered manifold convention: penetrating points have negative depth.
    pub penetration: f32,
}

#[derive(Clone, Debug, PartialEq)]
pub struct ObbContactManifold {
    pub normal: Vec3,
    pub penetration: f32,
    pub separating_axis_index: usize,
    pub points: Vec<ObbManifoldPoint>,
}

pub fn player_body_contact(
    player_position: [f32; 3],
    player_half_extents: [f32; 3],
    body: &RigidBody,
) -> Option<ObbContactAxis> {
    if body.flags & COLLIDES_FLAG == 0 {
        return None;
    }
    let player_axes = [Vec3::X, Vec3::Y, Vec3::Z];
    let body_axes = body_axes(body);
    obb_contact_axis(
        Vec3::from_array(player_position),
        Vec3::from_array(player_half_extents),
        player_axes,
        Vec3::new(body.px, body.py, body.pz),
        Vec3::new(body.hsx, body.hsy, body.hsz),
        body_axes,
    )
}

pub fn player_body_manifold(
    player_position: [f32; 3],
    player_half_extents: [f32; 3],
    body: &RigidBody,
) -> Option<ObbContactManifold> {
    let contact = player_body_contact(player_position, player_half_extents, body)?;
    let center_a = Vec3::from_array(player_position);
    let half_a = Vec3::from_array(player_half_extents);
    let center_b = Vec3::new(body.px, body.py, body.pz);
    let half_b = Vec3::new(body.hsx, body.hsy, body.hsz);
    let axes_a = [Vec3::X, Vec3::Y, Vec3::Z];
    let axes_b = body_axes(body);
    let points = if contact.separating_axis_index < 6 {
        face_contact_points(center_a, half_a, axes_a, center_b, half_b, axes_b, contact)
    } else {
        vec![ObbManifoldPoint {
            position: edge_contact_point(
                center_a, half_a, axes_a, center_b, half_b, axes_b, contact,
            ),
            penetration: -contact.penetration,
        }]
    };
    (!points.is_empty()).then_some(ObbContactManifold {
        normal: contact.normal,
        penetration: contact.penetration,
        separating_axis_index: contact.separating_axis_index,
        points,
    })
}

#[allow(clippy::too_many_arguments)]
fn face_contact_points(
    center_a: Vec3,
    half_a: Vec3,
    axes_a: [Vec3; 3],
    center_b: Vec3,
    half_b: Vec3,
    axes_b: [Vec3; 3],
    contact: ObbContactAxis,
) -> Vec<ObbManifoldPoint> {
    let reference_is_a = contact.separating_axis_index < 3;
    let (
        reference_center,
        reference_half,
        reference_axes,
        incident_center,
        incident_half,
        incident_axes,
    ) = if reference_is_a {
        (center_a, half_a, axes_a, center_b, half_b, axes_b)
    } else {
        (center_b, half_b, axes_b, center_a, half_a, axes_a)
    };
    let outward = if reference_is_a {
        contact.normal
    } else {
        -contact.normal
    };
    let reference_axis = dominant_axis(reference_axes, outward);
    let reference_normal = signed_axis(reference_axes[reference_axis], outward);
    let face_center =
        reference_center + reference_normal * component(reference_half, reference_axis);
    let tangent_indices = other_axes(reference_axis);
    let tangent_u = reference_axes[tangent_indices[0]];
    let tangent_v = reference_axes[tangent_indices[1]];
    let extent_u = component(reference_half, tangent_indices[0]);
    let extent_v = component(reference_half, tangent_indices[1]);

    let incident_axis = dominant_axis(incident_axes, -reference_normal);
    let incident_normal = signed_axis(incident_axes[incident_axis], -reference_normal);
    let incident_face_center =
        incident_center + incident_normal * component(incident_half, incident_axis);
    let incident_tangents = other_axes(incident_axis);
    let incident_u =
        incident_axes[incident_tangents[0]] * component(incident_half, incident_tangents[0]);
    let incident_v =
        incident_axes[incident_tangents[1]] * component(incident_half, incident_tangents[1]);
    let mut polygon = vec![
        incident_face_center + incident_u + incident_v,
        incident_face_center - incident_u + incident_v,
        incident_face_center - incident_u - incident_v,
        incident_face_center + incident_u - incident_v,
    ];
    polygon = clip_polygon(polygon, tangent_u, tangent_u.dot(face_center) + extent_u);
    polygon = clip_polygon(polygon, -tangent_u, -tangent_u.dot(face_center) + extent_u);
    polygon = clip_polygon(polygon, tangent_v, tangent_v.dot(face_center) + extent_v);
    polygon = clip_polygon(polygon, -tangent_v, -tangent_v.dot(face_center) + extent_v);
    polygon
        .into_iter()
        .filter_map(|point| {
            let penetration = reference_normal.dot(point - face_center);
            (penetration < 0.0).then_some(ObbManifoldPoint {
                position: point,
                penetration,
            })
        })
        .take(4)
        .collect()
}

fn clip_polygon(points: Vec<Vec3>, normal: Vec3, limit: f32) -> Vec<Vec3> {
    let mut output = Vec::with_capacity(points.len() + 1);
    let Some(mut previous) = points.last().copied() else {
        return output;
    };
    let mut previous_distance = normal.dot(previous) - limit;
    for current in points {
        let current_distance = normal.dot(current) - limit;
        if previous_distance <= 0.0 && current_distance > 0.0 {
            output.push(previous.lerp(
                current,
                previous_distance / (previous_distance - current_distance),
            ));
        } else if previous_distance > 0.0 && current_distance <= 0.0 {
            output.push(previous.lerp(
                current,
                previous_distance / (previous_distance - current_distance),
            ));
            output.push(current);
        } else if current_distance <= 0.0 {
            output.push(current);
        }
        previous = current;
        previous_distance = current_distance;
    }
    output
}

#[allow(clippy::too_many_arguments)]
fn edge_contact_point(
    center_a: Vec3,
    half_a: Vec3,
    axes_a: [Vec3; 3],
    center_b: Vec3,
    half_b: Vec3,
    axes_b: [Vec3; 3],
    contact: ObbContactAxis,
) -> Vec3 {
    let cross_index = contact.separating_axis_index - 6;
    let edge_a = cross_index / 3;
    let edge_b = cross_index % 3;
    let point_a = support_edge_center(center_a, half_a, axes_a, edge_a, contact.normal);
    let point_b = support_edge_center(center_b, half_b, axes_b, edge_b, -contact.normal);
    closest_line_midpoint(point_a, axes_a[edge_a], point_b, axes_b[edge_b])
        - contact.normal * (contact.penetration * 0.5)
}

fn support_edge_center(
    center: Vec3,
    half: Vec3,
    axes: [Vec3; 3],
    edge_axis: usize,
    direction: Vec3,
) -> Vec3 {
    let mut point = center;
    for axis in 0..3 {
        if axis != edge_axis {
            point += axes[axis] * component(half, axis) * axes[axis].dot(direction).signum();
        }
    }
    point
}

fn closest_line_midpoint(point_a: Vec3, axis_a: Vec3, point_b: Vec3, axis_b: Vec3) -> Vec3 {
    let dot = axis_a.dot(axis_b);
    let denominator = 1.0 - dot * dot;
    if denominator.abs() <= DEGENERATE_AXIS_LENGTH_SQUARED {
        return (point_a + point_b) * 0.5;
    }
    let delta = point_b - point_a;
    let distance_a = (delta.dot(axis_a) - delta.dot(axis_b) * dot) / denominator;
    let distance_b = (delta.dot(axis_a) * dot - delta.dot(axis_b)) / denominator;
    (point_a + axis_a * distance_a + point_b + axis_b * distance_b) * 0.5
}

fn dominant_axis(axes: [Vec3; 3], direction: Vec3) -> usize {
    (0..3)
        .max_by(|left, right| {
            axes[*left]
                .dot(direction)
                .abs()
                .total_cmp(&axes[*right].dot(direction).abs())
        })
        .unwrap_or(0)
}

fn signed_axis(axis: Vec3, direction: Vec3) -> Vec3 {
    if axis.dot(direction) >= 0.0 {
        axis
    } else {
        -axis
    }
}

fn other_axes(axis: usize) -> [usize; 2] {
    match axis {
        0 => [1, 2],
        1 => [0, 2],
        _ => [0, 1],
    }
}

fn component(vector: Vec3, axis: usize) -> f32 {
    vector[axis]
}

fn body_axes(body: &RigidBody) -> [Vec3; 3] {
    let quaternion = Quat::from_xyzw(body.qx, body.qy, body.qz, body.qw);
    let rotation = if quaternion.length_squared() > DEGENERATE_AXIS_LENGTH_SQUARED {
        Mat3::from_quat(quaternion.normalize())
    } else {
        Mat3::IDENTITY
    };
    [rotation.x_axis, rotation.y_axis, rotation.z_axis]
}

fn obb_contact_axis(
    center_a: Vec3,
    half_a: Vec3,
    axes_a: [Vec3; 3],
    center_b: Vec3,
    half_b: Vec3,
    axes_b: [Vec3; 3],
) -> Option<ObbContactAxis> {
    let center_delta = center_b - center_a;
    let mut candidates = Vec::with_capacity(15);
    candidates.extend(axes_a);
    candidates.extend(axes_b);
    for axis_a in axes_a {
        for axis_b in axes_b {
            candidates.push(axis_a.cross(axis_b));
        }
    }

    let mut selected: Option<(usize, Vec3, f32)> = None;
    for (index, candidate) in candidates.into_iter().enumerate() {
        let length_squared = candidate.length_squared();
        if index >= 6 && length_squared <= DEGENERATE_AXIS_LENGTH_SQUARED {
            continue;
        }
        let axis = candidate / length_squared.sqrt();
        let signed_distance = center_delta.dot(axis);
        let radius_a = projection_radius(axis, axes_a, half_a);
        let radius_b = projection_radius(axis, axes_b, half_b);
        let separation = signed_distance.abs() - radius_a - radius_b;
        if separation > 0.0 {
            return None;
        }
        let comparison = if index >= 6 {
            separation - CROSS_AXIS_SELECTION_BIAS
        } else {
            separation
        };
        if selected.is_none_or(|(_, _, best)| comparison > best) {
            let normal = if signed_distance > 0.0 { axis } else { -axis };
            selected = Some((index, normal, comparison));
        }
    }

    let (separating_axis_index, normal, _) = selected?;
    let penetration = -axis_separation(normal, center_delta, axes_a, half_a, axes_b, half_b);
    Some(ObbContactAxis {
        normal,
        penetration,
        separating_axis_index,
    })
}

fn projection_radius(axis: Vec3, axes: [Vec3; 3], half: Vec3) -> f32 {
    axis.dot(axes[0]).abs() * half.x
        + axis.dot(axes[1]).abs() * half.y
        + axis.dot(axes[2]).abs() * half.z
}

fn axis_separation(
    axis: Vec3,
    center_delta: Vec3,
    axes_a: [Vec3; 3],
    half_a: Vec3,
    axes_b: [Vec3; 3],
    half_b: Vec3,
) -> f32 {
    center_delta.dot(axis).abs()
        - projection_radius(axis, axes_a, half_a)
        - projection_radius(axis, axes_b, half_b)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn body(position: [f32; 3], half: [f32; 3], rotation: Quat) -> RigidBody {
        let [qx, qy, qz, qw] = rotation.to_array();
        RigidBody {
            id: 1,
            flags: COLLIDES_FLAG,
            group: 0,
            mass: 1.0,
            friction: 0.0,
            restitution: 0.0,
            rx: 1.0,
            ry: 1.0,
            rz: 1.0,
            px: position[0],
            py: position[1],
            pz: position[2],
            vx: 0.0,
            vy: 0.0,
            vz: 0.0,
            qx,
            qy,
            qz,
            qw,
            hsx: half[0],
            hsy: half[1],
            hsz: half[2],
            ax: 0.0,
            ay: 0.0,
            az: 0.0,
        }
    }

    #[test]
    fn separated_body_has_no_contact() {
        let body = body([4.0, 0.0, 0.0], [0.5; 3], Quat::IDENTITY);
        assert!(player_body_contact([0.0; 3], [0.5; 3], &body).is_none());
    }

    #[test]
    fn axis_aligned_support_selects_vertical_player_axis() {
        let body = body([0.0, -0.9, 0.0], [0.5; 3], Quat::IDENTITY);
        let contact = player_body_contact([0.0; 3], [0.5; 3], &body).unwrap();
        assert_eq!(contact.separating_axis_index, 1);
        assert_eq!(contact.normal, -Vec3::Y);
        assert!((contact.penetration - 0.1).abs() < 1.0e-5);
    }

    #[test]
    fn rotated_body_uses_recovered_fifteen_axis_sat() {
        let rotation = Quat::from_rotation_y(std::f32::consts::FRAC_PI_4);
        let body = body([0.8, 0.0, 0.0], [0.6, 0.5, 0.2], rotation);
        let contact = player_body_contact([0.0; 3], [0.5; 3], &body).unwrap();
        assert!(contact.normal.is_normalized());
        assert!(contact.penetration >= 0.0);
    }

    #[test]
    fn face_manifold_clips_to_four_incident_points() {
        let body = body([0.0, -0.9, 0.0], [0.5; 3], Quat::IDENTITY);
        let manifold = player_body_manifold([0.0; 3], [0.5; 3], &body).unwrap();
        assert_eq!(manifold.normal, -Vec3::Y);
        assert_eq!(manifold.points.len(), 4);
        assert!(
            manifold
                .points
                .iter()
                .all(|point| (point.position.y + 0.4).abs() < 1.0e-5)
        );
        assert!(manifold.points.iter().all(|point| point.penetration < 0.0));
    }
}
