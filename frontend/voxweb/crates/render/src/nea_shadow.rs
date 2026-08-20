//! Recovered four-cascade directional-shadow fitting used by the NEA Player.

use glam::{Mat3, Mat4, Vec2, Vec3, Vec4};
use wgpu::util::DeviceExt;

use crate::nea_mesh::MeshBuffers;

pub const CASCADE_COUNT: usize = 4;
pub const SHADOW_UNIFORM_FLOATS: usize = 148;
pub const DEFAULT_SHADOW_RESOLUTION: u32 = 1024;

const DEPTH_SHADER: &str = r#"
struct ShadowCamera { view_projection: mat4x4<f32> };
@group(0) @binding(0) var<uniform> camera: ShadowCamera;

@vertex fn vs_main(@location(0) position: vec3f) -> @builtin(position) vec4f {
  return camera.view_projection * vec4f(position, 1.0);
}
"#;
pub const CASCADE_VIEWPORTS: [[f32; 4]; CASCADE_COUNT] = [
    [0.0, 0.0, 0.5, 0.5],
    [0.0, 0.5, 0.5, 0.5],
    [0.5, 0.0, 0.5, 0.5],
    [0.5, 0.5, 0.5, 0.5],
];

#[derive(Clone, Copy, Debug)]
pub struct ShadowCascade {
    pub view_projection: Mat4,
    pub normal: Mat3,
    pub bounds: [f32; 4],
    pub viewport: [u32; 4],
}

#[derive(Clone, Debug)]
pub struct NeaShadowFrame {
    pub splits: [f32; 3],
    pub cascades: [ShadowCascade; CASCADE_COUNT],
}

pub struct NeaShadowMap {
    pub view: wgpu::TextureView,
    pub sampler: wgpu::Sampler,
    pub uniform_buffer: wgpu::Buffer,
    depth_pipeline: wgpu::RenderPipeline,
    camera_buffers: [wgpu::Buffer; CASCADE_COUNT],
    camera_bind_groups: [wgpu::BindGroup; CASCADE_COUNT],
    resolution: u32,
}

impl NeaShadowMap {
    pub fn new(device: &wgpu::Device, resolution: u32) -> Self {
        let resolution = resolution.max(2);
        let texture = device.create_texture(&wgpu::TextureDescriptor {
            label: Some("nea.shadow.depth_atlas"),
            size: wgpu::Extent3d {
                width: resolution,
                height: resolution,
                depth_or_array_layers: 1,
            },
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: wgpu::TextureFormat::Depth32Float,
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT | wgpu::TextureUsages::TEXTURE_BINDING,
            view_formats: &[],
        });
        let view = texture.create_view(&Default::default());
        let sampler = device.create_sampler(&wgpu::SamplerDescriptor {
            label: Some("nea.shadow.sampler"),
            address_mode_u: wgpu::AddressMode::ClampToEdge,
            address_mode_v: wgpu::AddressMode::ClampToEdge,
            mag_filter: wgpu::FilterMode::Nearest,
            min_filter: wgpu::FilterMode::Nearest,
            ..Default::default()
        });
        let camera_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("nea.shadow.camera.layout"),
            entries: &[wgpu::BindGroupLayoutEntry {
                binding: 0,
                visibility: wgpu::ShaderStages::VERTEX,
                ty: wgpu::BindingType::Buffer {
                    ty: wgpu::BufferBindingType::Uniform,
                    has_dynamic_offset: false,
                    min_binding_size: None,
                },
                count: None,
            }],
        });
        let camera_buffers = std::array::from_fn(|index| {
            device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
                label: Some(&format!("nea.shadow.camera.{index}")),
                contents: bytemuck::cast_slice(&Mat4::IDENTITY.to_cols_array()),
                usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
            })
        });
        let camera_bind_groups = std::array::from_fn(|index| {
            device.create_bind_group(&wgpu::BindGroupDescriptor {
                label: Some(&format!("nea.shadow.camera.bind.{index}")),
                layout: &camera_layout,
                entries: &[wgpu::BindGroupEntry {
                    binding: 0,
                    resource: camera_buffers[index].as_entire_binding(),
                }],
            })
        });
        let uniform_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("nea.shadow.uniform"),
            contents: bytemuck::cast_slice(&[0.0_f32; SHADOW_UNIFORM_FLOATS]),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        });
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("nea.shadow.depth.shader"),
            source: wgpu::ShaderSource::Wgsl(DEPTH_SHADER.into()),
        });
        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("nea.shadow.depth.pipeline.layout"),
            bind_group_layouts: &[Some(&camera_layout)],
            immediate_size: 0,
        });
        let depth_pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("nea.shadow.depth.pipeline"),
            layout: Some(&pipeline_layout),
            vertex: wgpu::VertexState {
                module: &shader,
                entry_point: Some("vs_main"),
                compilation_options: Default::default(),
                buffers: &[MeshBuffers::vertex_layout()],
            },
            fragment: None,
            primitive: wgpu::PrimitiveState {
                cull_mode: Some(wgpu::Face::Back),
                ..Default::default()
            },
            depth_stencil: Some(wgpu::DepthStencilState {
                format: wgpu::TextureFormat::Depth32Float,
                depth_write_enabled: Some(true),
                depth_compare: Some(wgpu::CompareFunction::LessEqual),
                stencil: Default::default(),
                bias: wgpu::DepthBiasState::default(),
            }),
            multisample: Default::default(),
            multiview_mask: None,
            cache: None,
        });
        Self {
            view,
            sampler,
            uniform_buffer,
            depth_pipeline,
            camera_buffers,
            camera_bind_groups,
            resolution,
        }
    }

    pub fn update(&self, queue: &wgpu::Queue, frame: &NeaShadowFrame) {
        queue.write_buffer(
            &self.uniform_buffer,
            0,
            bytemuck::cast_slice(&frame.uniform_data(true)),
        );
    }

    pub fn render_terrain(
        &self,
        encoder: &mut wgpu::CommandEncoder,
        queue: &wgpu::Queue,
        frame: &NeaShadowFrame,
        vertex_buffer: &wgpu::Buffer,
        index_buffer: &wgpu::Buffer,
        index_count: u32,
        clear_depth: bool,
    ) {
        // 空地形 mesh（0 顶点）时跳过阴影，避免空 buffer slice panic
        if index_count == 0 {
            return;
        }
        for (index, cascade) in frame.cascades.iter().enumerate() {
            queue.write_buffer(
                &self.camera_buffers[index],
                0,
                bytemuck::cast_slice(&cascade.view_projection.to_cols_array()),
            );
        }
        for (index, cascade) in frame.cascades.iter().enumerate() {
            let mut pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("nea.shadow.depth"),
                color_attachments: &[],
                depth_stencil_attachment: Some(wgpu::RenderPassDepthStencilAttachment {
                    view: &self.view,
                    depth_ops: Some(wgpu::Operations {
                        // Only the first submitted batch clears the atlas;
                        // subsequent batches accumulate depth so every terrain
                        // and entity batch contributes to the shadow map.
                        load: if index == 0 {
                            if clear_depth {
                                wgpu::LoadOp::Clear(1.0)
                            } else {
                                wgpu::LoadOp::Load
                            }
                        } else {
                            wgpu::LoadOp::Load
                        },
                        store: wgpu::StoreOp::Store,
                    }),
                    stencil_ops: None,
                }),
                timestamp_writes: None,
                occlusion_query_set: None,
                multiview_mask: None,
            });
            let [x, y, width, height] = cascade.viewport;
            pass.set_viewport(x as f32, y as f32, width as f32, height as f32, 0.0, 1.0);
            pass.set_scissor_rect(x, y, width, height);
            pass.set_pipeline(&self.depth_pipeline);
            pass.set_bind_group(0, &self.camera_bind_groups[index], &[]);
            pass.set_vertex_buffer(0, vertex_buffer.slice(..));
            pass.set_index_buffer(index_buffer.slice(..), wgpu::IndexFormat::Uint32);
            pass.draw_indexed(0..index_count, 0, 0..1);
        }
    }

    pub fn resolution(&self) -> u32 {
        self.resolution
    }
}

impl NeaShadowFrame {
    /// GPU layout: enabled/splits vec4, four projection mat4 records, four
    /// padded normal mat4 records, then four atlas-bounds vec4 records.
    pub fn uniform_data(&self, enabled: bool) -> [f32; SHADOW_UNIFORM_FLOATS] {
        let mut data = [0.0; SHADOW_UNIFORM_FLOATS];
        data[0] = enabled as u8 as f32;
        data[1..4].copy_from_slice(&self.splits);
        let mut projection_offset = 4;
        let mut normal_offset = 68;
        let mut bounds_offset = 132;
        for cascade in &self.cascades {
            data[projection_offset..projection_offset + 16]
                .copy_from_slice(&cascade.view_projection.to_cols_array());
            let normal = cascade.normal;
            let padded_normal = Mat4::from_cols(
                normal.x_axis.extend(0.0),
                normal.y_axis.extend(0.0),
                normal.z_axis.extend(0.0),
                Vec4::W,
            );
            data[normal_offset..normal_offset + 16].copy_from_slice(&padded_normal.to_cols_array());
            data[bounds_offset..bounds_offset + 4].copy_from_slice(&cascade.bounds);
            projection_offset += 16;
            normal_offset += 16;
            bounds_offset += 4;
        }
        data
    }
}

pub fn recovered_shadow_frame(
    eye: Vec3,
    _camera_view: Mat4,
    _fov_y: f32,
    _aspect: f32,
    near: f32,
    far: f32,
    sun_direction: Vec3,
    resolution: u32,
) -> NeaShadowFrame {
    let z = recovered_cascade_z(near, far);
    let sun = sun_direction.normalize_or_zero();
    let shadow_view = Mat4::look_at_rh(eye + sun * 512.0, eye, Vec3::Z);
    // Keep each cascade anchored to the player's world position. Fitting to
    // the camera frustum makes the shadow atlas rotate whenever the mouse
    // turns, so nearby shadows visibly swim despite no movement.
    let extents = [24.0, 64.0, 160.0, 320.0];
    let cascades = std::array::from_fn(|index| {
        fit_cascade_fixed(
            shadow_view,
            eye,
            extents[index],
            z[index],
            z[index + 1],
            CASCADE_VIEWPORTS[index],
            resolution,
        )
    });
    NeaShadowFrame {
        // shader 用 `frag_coord.z/w`（NDC 深度 0..1）选级联，而 z[1..3] 是视距米
        // （16/48/128）。两者直接比较会让所有像素几乎全选最近级联 → 远处阴影
        // 全部失效。把视距 split 转成对应 NDC 深度阈值（perspective 逆映射）。
        splits: [
            ndc_depth(near, far, z[1]),
            ndc_depth(near, far, z[2]),
            ndc_depth(near, far, z[3]),
        ],
        cascades,
    }
}

/// 视距 z（米）→ 相机 NDC 深度（0..1，perspective_rh）：
/// ndc = far*(z-near) / (z*(far-near))
fn ndc_depth(near: f32, far: f32, z: f32) -> f32 {
    if z <= near {
        return 0.0;
    }
    (far * (z - near) / (z * (far - near))).clamp(0.0, 1.0)
}

/// 以 `center` 为中心的固定正交级联：取玩家周围世界**立方体**（边长 extent）
/// 的 8 个角点在 shadow_view 空间的投影范围——覆盖垂直方向。此前只按水平 XZ
/// 取范围，太阳斜射时玩家脚下/头顶的方块投影出级联范围 → 阴影渲染/采样失配。
const SHADOW_DEPTH_NEAR: f32 = 0.5;
const SHADOW_DEPTH_FAR: f32 = 700.0;

fn fit_cascade_fixed(
    shadow_view: Mat4,
    center: Vec3,
    extent: f32,
    _near_z: f32,
    _far_z: f32,
    uv_bounds: [f32; 4],
    resolution: u32,
) -> ShadowCascade {
    let h = 0.5 * extent;
    let world_corners = [
        center + Vec3::new(-h, -h, -h),
        center + Vec3::new(h, -h, -h),
        center + Vec3::new(-h, h, -h),
        center + Vec3::new(h, h, -h),
        center + Vec3::new(-h, -h, h),
        center + Vec3::new(h, -h, h),
        center + Vec3::new(-h, h, h),
        center + Vec3::new(h, h, h),
    ];
    // shadow_view 空间坐标：x=side（横向1）、y=up（横向2）、z=深度（负值）。
    // 横向范围必须用 x/y 分量；深度用 -z。
    let mut min_x = f32::MAX;
    let mut max_x = f32::MIN;
    let mut min_y = f32::MAX;
    let mut max_y = f32::MIN;
    let mut min_depth = f32::MAX;
    let mut max_depth = 0.0f32;
    for corner in world_corners {
        let c = shadow_view.transform_point3(corner);
        min_x = min_x.min(c.x);
        max_x = max_x.max(c.x);
        min_y = min_y.min(c.y);
        max_y = max_y.max(c.y);
        min_depth = min_depth.min(-c.z);
        max_depth = max_depth.max(-c.z);
    }
    let range_x = (max_x - min_x).max(1.0e-4) + 2.0;
    let range_y = (max_y - min_y).max(1.0e-4) + 2.0;
    let depth_near = (min_depth - 1.0).max(SHADOW_DEPTH_NEAR);
    let depth_far = (max_depth + 2.0).min(SHADOW_DEPTH_FAR);
    let sx = 2.0 / range_x;
    let sy = 2.0 / range_y;
    let sz = -2.0 / (depth_far - depth_near);
    let tx = -sx * 0.5 * (min_x + max_x);
    let ty = -sy * 0.5 * (min_y + max_y);
    let tz = -(depth_near + depth_far) / (depth_far - depth_near);
    let columns = [
        Vec4::new(sx, 0.0, 0.0, 0.0),
        Vec4::new(0.0, sy, 0.0, 0.0),
        Vec4::new(0.0, 0.0, sz, 0.0),
        Vec4::new(tx, ty, tz, 1.0),
    ];
    let projection = Mat4::from_cols(columns[0], columns[1], columns[2], columns[3]);
    let depth_to_webgpu = Mat4::from_cols(
        Vec4::X,
        Vec4::Y,
        Vec4::new(0.0, 0.0, 0.5, 0.0),
        Vec4::new(0.0, 0.0, 0.5, 1.0),
    );
    let view_projection = depth_to_webgpu * projection * shadow_view;
    let inverse = view_projection.inverse();
    ShadowCascade {
        view_projection,
        normal: Mat3::from_mat4(inverse).transpose(),
        bounds: [uv_bounds[0], uv_bounds[1], extent, extent],
        viewport: [
            (uv_bounds[0] * resolution as f32) as u32,
            (uv_bounds[1] * resolution as f32) as u32,
            (uv_bounds[2] * resolution as f32) as u32,
            (uv_bounds[3] * resolution as f32) as u32,
        ],
    }
}

pub fn recovered_cascade_z(near: f32, far: f32) -> [f32; 5] {
    let far_edge = far + 1.0;
    let third = 128.0_f32.min(0.5 * (16.0 + far_edge));
    [
        near,
        16.0,
        48.0_f32.min(0.5 * (16.0 + third)),
        third,
        far_edge,
    ]
}

#[allow(dead_code)]
fn fit_cascade(
    camera_view: Mat4,
    shadow_view: Mat4,
    fov_y: f32,
    aspect: f32,
    near: f32,
    far: f32,
    uv_bounds: [f32; 4],
    resolution: u32,
) -> ShadowCascade {
    // The preserved fitter builds an OpenGL-depth clipped camera frustum,
    // then applies its explicit z*0.5+0.5 conversion to the shadow matrix.
    let projection = Mat4::perspective_rh_gl(fov_y, aspect, near, far);
    let inverse_camera = (projection * camera_view).inverse();
    let mut corners = frustum_corners(inverse_camera);
    for corner in &mut corners {
        *corner = shadow_view.transform_point3(*corner);
    }
    let max_depth = corners
        .iter()
        .map(|corner| -corner.z)
        .fold(0.0_f32, f32::max);
    let (axis, bounds) = minimum_area_bounds(&corners);
    let width_scale = 2.0 / (bounds[1] - bounds[0]);
    let height_scale = 2.0 / (bounds[3] - bounds[2]);
    let center_x = 0.5 * (bounds[0] + bounds[1]);
    let center_y = 0.5 * (bounds[2] + bounds[3]);
    let depth_scale = -1.0 / (max_depth - 1.0);
    let mut columns = [
        Vec4::new(width_scale * axis.x, -height_scale * axis.y, 0.0, 0.0),
        Vec4::new(width_scale * axis.y, height_scale * axis.x, 0.0, 0.0),
        Vec4::new(0.0, 0.0, 2.0 * depth_scale, 0.0),
        Vec4::new(
            -width_scale * center_x,
            -height_scale * center_y,
            depth_scale * (max_depth + 1.0),
            1.0,
        ),
    ];
    let projection = Mat4::from_cols(columns[0], columns[1], columns[2], columns[3]);
    let depth_to_webgpu = Mat4::from_cols(
        Vec4::X,
        Vec4::Y,
        Vec4::new(0.0, 0.0, 0.5, 0.0),
        Vec4::new(0.0, 0.0, 0.5, 1.0),
    );
    let view_projection = depth_to_webgpu * projection * shadow_view;
    let inverse = view_projection.inverse();
    columns.fill(Vec4::ZERO);
    ShadowCascade {
        view_projection,
        normal: Mat3::from_mat4(inverse).transpose(),
        bounds: [
            uv_bounds[0],
            uv_bounds[1],
            bounds[1] - bounds[0],
            bounds[3] - bounds[2],
        ],
        viewport: [
            (uv_bounds[0] * resolution as f32) as u32,
            (uv_bounds[1] * resolution as f32) as u32,
            (uv_bounds[2] * resolution as f32) as u32,
            (uv_bounds[3] * resolution as f32) as u32,
        ],
    }
}

fn frustum_corners(inverse_view_projection: Mat4) -> [Vec3; 8] {
    let mut result = [Vec3::ZERO; 8];
    let mut index = 0;
    for z in [-1.0, 1.0] {
        for y in [-1.0, 1.0] {
            for x in [-1.0, 1.0] {
                result[index] = inverse_view_projection.project_point3(Vec3::new(x, y, z));
                index += 1;
            }
        }
    }
    result
}

fn minimum_area_bounds(corners: &[Vec3; 8]) -> (Vec2, [f32; 4]) {
    let mut best_area = f32::INFINITY;
    let mut best_axis = Vec2::X;
    let mut best_bounds = [0.0; 4];
    for current in 0..corners.len() {
        for previous in 0..current {
            let delta = corners[previous].truncate() - corners[current].truncate();
            let axis = delta.normalize_or_zero();
            if axis == Vec2::ZERO {
                continue;
            }
            let perpendicular = Vec2::new(-axis.y, axis.x);
            let mut bounds = [
                f32::INFINITY,
                f32::NEG_INFINITY,
                f32::INFINITY,
                f32::NEG_INFINITY,
            ];
            for corner in corners {
                let point = corner.truncate();
                let along = axis.dot(point);
                let across = perpendicular.dot(point);
                bounds[0] = bounds[0].min(along);
                bounds[1] = bounds[1].max(along);
                bounds[2] = bounds[2].min(across);
                bounds[3] = bounds[3].max(across);
            }
            let area = (bounds[1] - bounds[0]) * (bounds[3] - bounds[2]);
            if area < best_area {
                best_area = area;
                best_axis = axis;
                best_bounds = bounds;
            }
        }
    }
    best_bounds[0] -= 1.0;
    best_bounds[1] += 1.0;
    best_bounds[2] -= 1.0;
    best_bounds[3] += 1.0;
    (best_axis, best_bounds)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cascade_splits_match_recovered_player() {
        assert_eq!(
            recovered_cascade_z(0.1, 2000.0),
            [0.1, 16.0, 48.0, 128.0, 2001.0]
        );
    }

    #[test]
    fn cascade_atlas_uses_four_quadrants() {
        let frame = recovered_shadow_frame(
            Vec3::new(0.0, 2.0, 4.0),
            Mat4::look_at_rh(Vec3::new(0.0, 2.0, 4.0), Vec3::ZERO, Vec3::Y),
            1.0,
            16.0 / 9.0,
            0.1,
            2000.0,
            Vec3::new(0.5, 0.86, 0.1),
            1024,
        );
        // splits 现在是 NDC 深度（视距 16/48/128 米 → 0..1）
        let expected = [
            ndc_depth(0.1, 2000.0, 16.0),
            ndc_depth(0.1, 2000.0, 48.0),
            ndc_depth(0.1, 2000.0, 128.0),
        ];
        assert!(
            (frame.splits[0] - expected[0]).abs() < 1.0e-5
                && (frame.splits[1] - expected[1]).abs() < 1.0e-5
                && (frame.splits[2] - expected[2]).abs() < 1.0e-5
        );
        assert!(
            frame.splits[0] > 0.9
                && frame.splits[0] < frame.splits[1]
                && frame.splits[1] < frame.splits[2]
        );
        assert_eq!(frame.cascades[3].viewport, [512, 512, 512, 512]);
        assert!(
            frame
                .cascades
                .iter()
                .all(|cascade| cascade.view_projection.is_finite())
        );
        let uniform = frame.uniform_data(true);
        assert_eq!(uniform[0], 1.0);
        assert!((uniform[1] - expected[0]).abs() < 1.0e-5);
        assert_eq!(&uniform[132..134], &[0.0, 0.0]);
        assert_eq!(&uniform[144..146], &[0.5, 0.5]);
    }

    #[test]
    fn fixed_cascade_ndc_contains_player_surroundings() {
        // 玩家在 (64, 4, 48)，sun 斜上方：验证第 0 级联（24 范围）的投影
        // 把玩家脚下/周围世界点映射到 NDC（XZ∈[-1,1]、深度∈[0,1]）——
        // 若玩家周围点不在 NDC 内，阴影渲染/采样会失配。
        let sun = Vec3::new(0.5, 0.86, 0.1).normalize();
        let eye = Vec3::new(64.0, 4.0, 48.0);
        let shadow_view = Mat4::look_at_rh(eye + sun * 512.0, eye, Vec3::Z);
        let cascade = fit_cascade_fixed(
            shadow_view,
            eye,
            24.0,
            16.0,
            48.0,
            [0.0, 0.0, 0.5, 0.5],
            1024,
        );
        for world in [
            Vec3::new(64.0, 3.0, 48.0),  // 玩家脚下地面
            Vec3::new(52.0, 0.0, 40.0),  // 玩家周围地面
            Vec3::new(76.0, 10.0, 56.0), // 玩家周围高处
            Vec3::new(64.0, 5.0, 48.0),  // 玩家头顶
        ] {
            let clip = cascade.view_projection * world.extend(1.0);
            let ndc = clip.truncate() / clip.w;
            assert!(ndc.x.abs() <= 1.2, "X out of NDC: {world:?} -> {ndc:?}");
            assert!(ndc.y.abs() <= 1.2, "Z out of NDC: {world:?} -> {ndc:?}");
            assert!(
                (0.0..=1.0).contains(&ndc.z),
                "depth out of [0,1]: {world:?} -> {ndc:?}"
            );
        }
    }
}
