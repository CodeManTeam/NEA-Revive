//! Evidence-backed NEA avatar pose blending and two-bone IK reconstruction.

use glam::{Mat4, Quat, Vec3};

pub const PART_NAMES: [&str; 18] = [
    "hips",
    "torso",
    "neck",
    "head",
    "leftShoulder",
    "leftUpperArm",
    "leftLowerArm",
    "leftHand",
    "rightShoulder",
    "rightUpperArm",
    "rightLowerArm",
    "rightHand",
    "leftUpperLeg",
    "leftLowerLeg",
    "leftFoot",
    "rightUpperLeg",
    "rightLowerLeg",
    "rightFoot",
];

#[derive(Clone, Copy, Debug)]
pub struct Rig {
    pub foot_length: f32,
    pub hip_width: f32,
    pub neck_length: f32,
    pub shoulder_width: f32,
    pub upper_torso_length: f32,
    pub lower_torso_length: f32,
    pub upper_leg_length: f32,
    pub lower_leg_length: f32,
    pub upper_arm_length: f32,
    pub lower_arm_length: f32,
}

#[derive(Clone, Copy, Debug)]
pub struct Pose {
    pub left_plant: f32,
    pub left_foot: [f32; 3],
    pub left_toe: [f32; 3],
    pub left_knee: [f32; 3],
    pub right_plant: f32,
    pub right_foot: [f32; 3],
    pub right_toe: [f32; 3],
    pub right_knee: [f32; 3],
    pub left_hand: [f32; 3],
    pub left_hand_rotation: [f32; 4],
    pub left_elbow: [f32; 3],
    pub left_shoulder: [f32; 3],
    pub right_hand: [f32; 3],
    pub right_hand_rotation: [f32; 4],
    pub right_elbow: [f32; 3],
    pub right_shoulder: [f32; 3],
    pub hips: [f32; 3],
    pub hips_rotation: [f32; 4],
    pub spine: [f32; 3],
    pub head: [f32; 3],
    pub head_rotation: [f32; 4],
}

#[derive(Clone, Copy, Debug, Default)]
pub struct IkSample {
    pub phase: f32,
    pub movement: f32,
    pub grounded: bool,
    pub running: bool,
    pub crouching: bool,
    pub landing: f32,
    pub vertical_velocity: f32,
    pub swimming: bool,
    pub roll_phase: Option<f32>,
}

#[derive(Clone, Copy)]
struct Points {
    hips: Vec3,
    left_hip: Vec3,
    right_hip: Vec3,
    left_knee: Vec3,
    right_knee: Vec3,
    left_foot: Vec3,
    right_foot: Vec3,
    left_toe: Vec3,
    right_toe: Vec3,
    left_shoulder: Vec3,
    right_shoulder: Vec3,
    left_elbow: Vec3,
    right_elbow: Vec3,
    left_hand: Vec3,
    right_hand: Vec3,
    spine: Vec3,
    neck: Vec3,
    head: Vec3,
}

pub fn recovered_configuration(sample: IkSample) -> [Mat4; 18] {
    use crate::recovered_ik_data as data;
    let mut pose = if sample.swimming {
        let active = sample_pose(&data::SWIM, sample.phase);
        let idle = sample_pose(&data::SWIM_IDLE, sample.phase);
        blend_pose(idle, active, sample.movement.clamp(0.0, 1.0))
    } else if sample.grounded {
        let locomotion = if sample.running {
            sample_pose(&data::RUN, sample.phase)
        } else {
            sample_pose(&data::WALK, sample.phase)
        };
        let mut grounded = blend_pose(data::IDLE, locomotion, sample.movement.clamp(0.0, 1.0));
        grounded = blend_pose(grounded, data::LAND, sample.landing.clamp(0.0, 1.0));
        grounded
    } else {
        let fall_weight = ((0.25 - sample.vertical_velocity) / 0.5).clamp(0.0, 1.0);
        blend_pose(data::JUMP, data::FALL, fall_weight)
    };
    if sample.crouching && sample.grounded {
        crouch_pose(&mut pose);
    }
    let mut configuration = solve_configuration(data::RIG, pose);
    if let Some(phase) = sample.roll_phase {
        let roll_pose = solve_configuration(data::RIG, data::ROLL);
        let weight = (1.4 - (2.0 * (phase - 0.84) - 1.0).abs()).clamp(0.0, 1.0);
        for (target, roll) in configuration.iter_mut().zip(roll_pose) {
            *target = interpolate_transform(*target, roll, weight);
        }
        let pivot = Mat4::from_translation(Vec3::new(0.0, 0.8, 0.0));
        let spin = pivot * Mat4::from_rotation_x(phase * std::f32::consts::TAU) * pivot.inverse();
        for target in &mut configuration {
            *target = spin * *target;
        }
    }
    configuration
}

fn sample_pose(frames: &[Pose], phase: f32) -> Pose {
    let frame = phase.rem_euclid(1.0) * frames.len() as f32;
    let first = frame.floor() as usize % frames.len();
    blend_pose(
        frames[first],
        frames[(first + 1) % frames.len()],
        frame.fract(),
    )
}

fn blend_pose(left: Pose, right: Pose, amount: f32) -> Pose {
    let vec = |a: [f32; 3], b: [f32; 3]| Vec3::from(a).lerp(Vec3::from(b), amount).to_array();
    let quat = |a: [f32; 4], b: [f32; 4]| {
        Quat::from_array(a)
            .normalize()
            .slerp(Quat::from_array(b).normalize(), amount)
            .to_array()
    };
    Pose {
        left_plant: left.left_plant + amount * (right.left_plant - left.left_plant),
        left_foot: vec(left.left_foot, right.left_foot),
        left_toe: vec(left.left_toe, right.left_toe),
        left_knee: vec(left.left_knee, right.left_knee),
        right_plant: left.right_plant + amount * (right.right_plant - left.right_plant),
        right_foot: vec(left.right_foot, right.right_foot),
        right_toe: vec(left.right_toe, right.right_toe),
        right_knee: vec(left.right_knee, right.right_knee),
        left_hand: vec(left.left_hand, right.left_hand),
        left_hand_rotation: quat(left.left_hand_rotation, right.left_hand_rotation),
        left_elbow: vec(left.left_elbow, right.left_elbow),
        left_shoulder: vec(left.left_shoulder, right.left_shoulder),
        right_hand: vec(left.right_hand, right.right_hand),
        right_hand_rotation: quat(left.right_hand_rotation, right.right_hand_rotation),
        right_elbow: vec(left.right_elbow, right.right_elbow),
        right_shoulder: vec(left.right_shoulder, right.right_shoulder),
        hips: vec(left.hips, right.hips),
        hips_rotation: quat(left.hips_rotation, right.hips_rotation),
        spine: vec(left.spine, right.spine),
        head: vec(left.head, right.head),
        head_rotation: quat(left.head_rotation, right.head_rotation),
    }
}

fn crouch_pose(pose: &mut Pose) {
    for point in [
        &mut pose.head,
        &mut pose.hips,
        &mut pose.left_foot,
        &mut pose.left_toe,
        &mut pose.left_hand,
        &mut pose.left_shoulder,
        &mut pose.right_foot,
        &mut pose.right_toe,
        &mut pose.right_hand,
        &mut pose.right_shoulder,
    ] {
        point[1] *= 0.26;
    }
    let distance = Vec3::from(pose.head).distance(Vec3::from(pose.hips));
    pose.head[1] = pose.hips[1] + distance * 0.25f32.cos();
    pose.head[2] = pose.hips[2] + distance * 0.25f32.sin();
}

fn solve_configuration(rig: Rig, pose: Pose) -> [Mat4; 18] {
    let points = derive_points(rig, pose);
    let head = Mat4::from_rotation_translation(Quat::from_array(pose.head_rotation), points.head);
    let hips = Mat4::from_rotation_translation(Quat::from_array(pose.hips_rotation), points.hips);
    let left_hand = Mat4::from_rotation_translation(
        Quat::from_array(pose.left_hand_rotation),
        points.left_hand,
    );
    let right_hand = Mat4::from_rotation_translation(
        Quat::from_array(pose.right_hand_rotation),
        points.right_hand,
    );
    let head_axis = safe_normalize(points.head - points.neck, Vec3::Y);
    let shoulder_axis = safe_normalize(points.left_shoulder - points.right_shoulder, Vec3::X);
    let neck_z = safe_normalize(shoulder_axis.cross(head_axis), Vec3::Z);
    let neck = frame(shoulder_axis, head_axis, neck_z, points.neck);
    let torso_y = safe_normalize(points.neck - points.hips, Vec3::Y);
    let torso_z = safe_normalize(hips.z_axis.truncate().lerp(neck_z, 0.5), Vec3::Z);
    let torso_x = safe_normalize(torso_y.cross(torso_z), Vec3::X);
    let torso = frame(
        torso_x,
        torso_y,
        torso_z,
        points.neck.lerp(points.hips, 0.5).lerp(points.spine, 0.2),
    );
    [
        hips,
        torso,
        neck,
        head,
        shoulder_frame(torso_y, points.left_elbow, points.left_shoulder, false),
        limb_frame(
            points.left_shoulder,
            points.left_elbow,
            Vec3::from(pose.left_elbow),
            true,
        ),
        limb_frame(
            points.left_elbow,
            points.left_hand,
            Vec3::from(pose.left_elbow),
            true,
        ),
        left_hand,
        shoulder_frame(torso_y, points.right_elbow, points.right_shoulder, true),
        limb_frame(
            points.right_elbow,
            points.right_shoulder,
            Vec3::from(pose.right_elbow),
            true,
        ),
        limb_frame(
            points.right_hand,
            points.right_elbow,
            Vec3::from(pose.right_elbow),
            true,
        ),
        right_hand,
        limb_frame(
            points.left_knee,
            points.left_hip,
            Vec3::from(pose.left_knee),
            false,
        ),
        limb_frame(
            points.left_foot,
            points.left_knee,
            Vec3::from(pose.left_knee),
            false,
        ),
        limb_frame(
            points.left_foot,
            points.left_foot.lerp(points.left_toe, 0.1),
            Vec3::from(pose.left_knee),
            false,
        ),
        limb_frame(
            points.right_knee,
            points.right_hip,
            Vec3::from(pose.right_knee),
            false,
        ),
        limb_frame(
            points.right_foot,
            points.right_knee,
            Vec3::from(pose.right_knee),
            false,
        ),
        limb_frame(
            points.right_foot,
            points.right_foot.lerp(points.right_toe, 0.1),
            Vec3::from(pose.right_knee),
            false,
        ),
    ]
}

fn derive_points(rig: Rig, pose: Pose) -> Points {
    let hips = Vec3::from(pose.hips);
    let hip_axis = Quat::from_array(pose.hips_rotation) * Vec3::X;
    let left_hip = hips + 0.5 * rig.hip_width * hip_axis;
    let right_hip = hips - 0.5 * rig.hip_width * hip_axis;
    let (left_knee, left_foot) = solve_two_bone(
        left_hip,
        Vec3::from(pose.left_foot),
        Vec3::from(pose.left_knee),
        rig.upper_leg_length,
        rig.lower_leg_length,
    );
    let (right_knee, right_foot) = solve_two_bone(
        right_hip,
        Vec3::from(pose.right_foot),
        Vec3::from(pose.right_knee),
        rig.upper_leg_length,
        rig.lower_leg_length,
    );
    let left_toe = target_at_distance(left_foot, Vec3::from(pose.left_toe), rig.foot_length);
    let right_toe = target_at_distance(right_foot, Vec3::from(pose.right_toe), rig.foot_length);
    let (_, left_seed) = solve_two_bone(
        Vec3::from(pose.left_hand),
        Vec3::from(pose.left_shoulder),
        Vec3::from(pose.left_elbow),
        rig.lower_arm_length,
        rig.upper_arm_length,
    );
    let (_, right_seed) = solve_two_bone(
        Vec3::from(pose.right_hand),
        Vec3::from(pose.right_shoulder),
        Vec3::from(pose.right_elbow),
        rig.lower_arm_length,
        rig.upper_arm_length,
    );
    let neck_seed = left_seed.lerp(right_seed, 0.5);
    let (spine, neck) = solve_two_bone(
        hips,
        neck_seed,
        Vec3::from(pose.spine),
        rig.lower_torso_length,
        rig.upper_torso_length,
    );
    let left_shoulder = target_at_distance(neck, left_seed, 0.5 * rig.shoulder_width);
    let right_shoulder = target_at_distance(neck, right_seed, 0.5 * rig.shoulder_width);
    let (left_elbow, left_hand) = solve_two_bone(
        left_shoulder,
        Vec3::from(pose.left_hand),
        Vec3::from(pose.left_elbow),
        rig.upper_arm_length,
        rig.lower_arm_length,
    );
    let (right_elbow, right_hand) = solve_two_bone(
        right_shoulder,
        Vec3::from(pose.right_hand),
        Vec3::from(pose.right_elbow),
        rig.upper_arm_length,
        rig.lower_arm_length,
    );
    let head = target_at_distance(neck, Vec3::from(pose.head), rig.neck_length);
    Points {
        hips,
        left_hip,
        right_hip,
        left_knee,
        right_knee,
        left_foot,
        right_foot,
        left_toe,
        right_toe,
        left_shoulder,
        right_shoulder,
        left_elbow,
        right_elbow,
        left_hand,
        right_hand,
        spine,
        neck,
        head,
    }
}

fn solve_two_bone(
    root: Vec3,
    target: Vec3,
    direction: Vec3,
    upper: f32,
    lower: f32,
) -> (Vec3, Vec3) {
    let mut delta = target - root;
    let minimum = (upper - lower).abs().max(1.0e-5);
    let maximum = (upper + lower).max(minimum);
    let distance = delta.length().clamp(minimum, maximum);
    delta = safe_normalize(delta, direction) * distance;
    let distance_squared = distance * distance;
    let along = -0.5 * (lower * lower - upper * upper - distance_squared) / distance_squared;
    let center = root + along * delta;
    let bend = direction - delta * direction.dot(delta) / distance_squared;
    let height_squared = (upper * upper - along * along * distance_squared).max(0.0);
    let joint = if bend.length_squared() > 1.0e-6 {
        center + safe_normalize(bend, Vec3::Z) * height_squared.sqrt()
    } else {
        center
    };
    (joint, joint + safe_normalize(target - joint, delta) * lower)
}

fn target_at_distance(origin: Vec3, target: Vec3, distance: f32) -> Vec3 {
    origin + safe_normalize(target - origin, Vec3::Z) * distance
}

fn frame(x: Vec3, y: Vec3, z: Vec3, position: Vec3) -> Mat4 {
    Mat4::from_cols(
        x.extend(0.0),
        y.extend(0.0),
        z.extend(0.0),
        position.extend(1.0),
    )
}

fn limb_frame(start: Vec3, end: Vec3, direction: Vec3, invert: bool) -> Mat4 {
    let y = safe_normalize(end - start, Vec3::Y);
    let source = if invert { -direction } else { direction };
    let z = safe_normalize(source - y * source.dot(y), Vec3::Z);
    frame(
        safe_normalize(y.cross(z), Vec3::X),
        y,
        z,
        start.lerp(end, 0.5),
    )
}

fn shoulder_frame(spine: Vec3, elbow: Vec3, shoulder: Vec3, right: bool) -> Mat4 {
    let x = safe_normalize(
        if right {
            shoulder - elbow
        } else {
            elbow - shoulder
        },
        Vec3::X,
    );
    let y = safe_normalize(spine - x * spine.dot(x), Vec3::Y);
    frame(x, y, safe_normalize(x.cross(y), Vec3::Z), shoulder)
}

fn safe_normalize(value: Vec3, fallback: Vec3) -> Vec3 {
    if value.length_squared() > 1.0e-10 {
        value.normalize()
    } else {
        fallback
    }
}

fn interpolate_transform(left: Mat4, right: Mat4, amount: f32) -> Mat4 {
    let (ls, lr, lt) = left.to_scale_rotation_translation();
    let (rs, rr, rt) = right.to_scale_rotation_translation();
    Mat4::from_scale_rotation_translation(
        ls.lerp(rs, amount),
        lr.slerp(rr, amount),
        lt.lerp(rt, amount),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn all_recovered_modes_produce_finite_part_matrices() {
        let modes = [
            IkSample {
                grounded: true,
                movement: 1.0,
                ..Default::default()
            },
            IkSample {
                grounded: true,
                crouching: true,
                ..Default::default()
            },
            IkSample {
                swimming: true,
                movement: 0.8,
                ..Default::default()
            },
            IkSample {
                vertical_velocity: -0.4,
                roll_phase: Some(1.1),
                ..Default::default()
            },
        ];
        for mode in modes {
            assert!(
                recovered_configuration(mode)
                    .iter()
                    .flat_map(|matrix| matrix.to_cols_array())
                    .all(f32::is_finite)
            );
        }
    }

    #[test]
    fn recovered_modes_produce_distinct_ik_configurations() {
        let idle = recovered_configuration(IkSample {
            grounded: true,
            ..Default::default()
        });
        let crouch = recovered_configuration(IkSample {
            grounded: true,
            crouching: true,
            ..Default::default()
        });
        let swim = recovered_configuration(IkSample {
            swimming: true,
            movement: 0.8,
            phase: 0.25,
            ..Default::default()
        });
        let roll = recovered_configuration(IkSample {
            vertical_velocity: -0.2,
            roll_phase: Some(1.1),
            ..Default::default()
        });
        assert_ne!(idle[0], crouch[0]);
        assert_ne!(idle[1], swim[1]);
        assert_ne!(idle[3], roll[3]);
    }
}
