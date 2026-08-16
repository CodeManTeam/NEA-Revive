//! WebGPU pipeline for recovered textured avatar parts in an idle pose.

use voxweb_protocol::AvatarPart;
use wgpu::util::DeviceExt;

use crate::avatar_mesh::build_posed_avatar_part_mesh;
use crate::avatar_shadow::AvatarShadowRenderer;
use crate::nea_avatar_shader::NEA_AVATAR_WGSL;
use crate::nea_environment::{apply_underwater_globals, recovered_default_globals};
use crate::nea_mesh::MeshBuffers;
use crate::nea_pipeline::{GLOBALS_EYE_EXPOSURE_OFFSET, GLOBALS_MVP_OFFSET};
use crate::nea_shadow::{NeaShadowFrame, NeaShadowMap};

#[repr(C)]
#[derive(Clone, Copy, Debug, bytemuck::Pod, bytemuck::Zeroable)]
pub struct AvatarInstance {
    pub position: [f32; 3],
    pub scale: f32,
    pub rotation: [f32; 4],
    pub ambient: [f32; 4],
}

impl AvatarInstance {
    pub fn new(position: [f32; 3], rotation: [f32; 4], scale: f32) -> Self {
        Self {
            position,
            scale,
            rotation,
            ambient: [0.0, 0.0, 0.0, 1.0],
        }
    }
}

pub(crate) struct AvatarPartGpu {
    name: String,
    _texture: wgpu::Texture,
    pose_buffer: wgpu::Buffer,
    pub(crate) bind_group: wgpu::BindGroup,
    pub(crate) vertex_buffer: wgpu::Buffer,
    pub(crate) index_buffer: wgpu::Buffer,
    pub(crate) index_count: u32,
}

pub struct NeaAvatarRenderer {
    pipeline: wgpu::RenderPipeline,
    camera_buffer: wgpu::Buffer,
    camera_bind_group: wgpu::BindGroup,
    parts: Vec<AvatarPartGpu>,
    instance_buffer: Option<wgpu::Buffer>,
    instance_capacity: usize,
    instance_count: u32,
    shadow: AvatarShadowRenderer,
}

impl NeaAvatarRenderer {
    pub fn new(
        device: &wgpu::Device,
        queue: &wgpu::Queue,
        parts: &[(String, AvatarPart)],
        surface_format: wgpu::TextureFormat,
        depth_format: wgpu::TextureFormat,
        shadow_map: &NeaShadowMap,
    ) -> Result<Self, String> {
        let camera_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("nea.avatar.camera.layout"),
            entries: &[
                wgpu::BindGroupLayoutEntry {
                    binding: 0,
                    visibility: wgpu::ShaderStages::VERTEX_FRAGMENT,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Uniform,
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 1,
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty: wgpu::BindingType::Texture {
                        sample_type: wgpu::TextureSampleType::Depth,
                        view_dimension: wgpu::TextureViewDimension::D2,
                        multisampled: false,
                    },
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 2,
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty: wgpu::BindingType::Sampler(wgpu::SamplerBindingType::NonFiltering),
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 3,
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Uniform,
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
            ],
        });
        let texture_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("nea.avatar.texture.layout"),
            entries: &[
                wgpu::BindGroupLayoutEntry {
                    binding: 0,
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty: wgpu::BindingType::Texture {
                        sample_type: wgpu::TextureSampleType::Float { filterable: true },
                        view_dimension: wgpu::TextureViewDimension::D2,
                        multisampled: false,
                    },
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 1,
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty: wgpu::BindingType::Sampler(wgpu::SamplerBindingType::Filtering),
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 2,
                    visibility: wgpu::ShaderStages::VERTEX,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Uniform,
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
            ],
        });
        let camera_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("nea.avatar.camera"),
            contents: bytemuck::cast_slice(&recovered_default_globals(512.0, 16.0)),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        });
        let camera_bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("nea.avatar.camera.bind"),
            layout: &camera_layout,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: camera_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: wgpu::BindingResource::TextureView(&shadow_map.view),
                },
                wgpu::BindGroupEntry {
                    binding: 2,
                    resource: wgpu::BindingResource::Sampler(&shadow_map.sampler),
                },
                wgpu::BindGroupEntry {
                    binding: 3,
                    resource: shadow_map.uniform_buffer.as_entire_binding(),
                },
            ],
        });
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("nea.avatar.shader"),
            source: wgpu::ShaderSource::Wgsl(NEA_AVATAR_WGSL.into()),
        });
        let layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("nea.avatar.pipeline.layout"),
            bind_group_layouts: &[Some(&camera_layout), Some(&texture_layout)],
            immediate_size: 0,
        });
        let pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("nea.avatar.pipeline"),
            layout: Some(&layout),
            vertex: wgpu::VertexState {
                module: &shader,
                entry_point: Some("vs_main"),
                compilation_options: Default::default(),
                buffers: &[avatar_vertex_layout(), avatar_instance_layout()],
            },
            fragment: Some(wgpu::FragmentState {
                module: &shader,
                entry_point: Some("fs_main"),
                compilation_options: Default::default(),
                targets: &[Some(wgpu::ColorTargetState {
                    format: surface_format,
                    // 角色必须是实心的：ALPHA_BLENDING 会让角色半透明叠层、
                    // 内部面穿透、背景透过（深度正确但混合错误）。
                    blend: Some(wgpu::BlendState::REPLACE),
                    write_mask: wgpu::ColorWrites::ALL,
                })],
            }),
            primitive: wgpu::PrimitiveState {
                // Recovered part meshes contain mirrored limbs whose winding
                // differs after bind-pose transforms. Render both sides until
                // the historical per-part winding contract is fully proven.
                cull_mode: None,
                ..Default::default()
            },
            depth_stencil: Some(wgpu::DepthStencilState {
                format: depth_format,
                depth_write_enabled: Some(true),
                depth_compare: Some(wgpu::CompareFunction::LessEqual),
                stencil: Default::default(),
                bias: Default::default(),
            }),
            multisample: Default::default(),
            multiview_mask: None,
            cache: None,
        });
        let shadow = AvatarShadowRenderer::new(device, &texture_layout);
        let mut gpu_parts = Vec::new();
        for (name, part) in parts {
            if part.texture.width == 0 || part.texture.data.is_empty() {
                continue;
            }
            let mesh = build_posed_avatar_part_mesh(name, part)?;
            if mesh.buffers.indices.is_empty() {
                continue;
            }
            gpu_parts.push(upload_part(
                device,
                queue,
                &texture_layout,
                part,
                mesh.buffers,
                name,
            )?);
        }
        if gpu_parts.is_empty() {
            return Err("avatar skin has no renderable parts".into());
        }
        Ok(Self {
            pipeline,
            camera_buffer,
            camera_bind_group,
            parts: gpu_parts,
            instance_buffer: None,
            instance_capacity: 0,
            instance_count: 0,
            shadow,
        })
    }

    pub fn set_environment(
        &self,
        queue: &wgpu::Queue,
        mvp: &[f32; 16],
        eye: &[f32; 3],
        eye_fluid: Option<[f32; 4]>,
        exposure: f32,
    ) {
        let mut globals = recovered_default_globals(512.0, 16.0);
        globals[GLOBALS_MVP_OFFSET..GLOBALS_MVP_OFFSET + 16].copy_from_slice(mvp);
        globals[GLOBALS_EYE_EXPOSURE_OFFSET..GLOBALS_EYE_EXPOSURE_OFFSET + 3].copy_from_slice(eye);
        globals[GLOBALS_EYE_EXPOSURE_OFFSET + 3] = exposure;
        apply_underwater_globals(&mut globals, eye_fluid);
        queue.write_buffer(&self.camera_buffer, 0, bytemuck::cast_slice(&globals));
    }

    pub fn update_instances(
        &mut self,
        device: &wgpu::Device,
        queue: &wgpu::Queue,
        instances: &[AvatarInstance],
    ) {
        self.instance_count = instances.len() as u32;
        if instances.is_empty() {
            return;
        }
        if instances.len() > self.instance_capacity {
            self.instance_capacity = instances.len().next_power_of_two();
            self.instance_buffer = Some(device.create_buffer(&wgpu::BufferDescriptor {
                label: Some("nea.avatar.instances"),
                size: (self.instance_capacity * std::mem::size_of::<AvatarInstance>()) as u64,
                usage: wgpu::BufferUsages::VERTEX | wgpu::BufferUsages::COPY_DST,
                mapped_at_creation: false,
            }));
        }
        if let Some(buffer) = &self.instance_buffer {
            queue.write_buffer(buffer, 0, bytemuck::cast_slice(instances));
        }
    }

    pub fn update_locomotion(
        &self,
        queue: &wgpu::Queue,
        phase: f32,
        movement_amount: f32,
        grounded: bool,
        running: bool,
        crouching: bool,
        landing_amount: f32,
        vertical_velocity: f32,
        swimming: bool,
        roll_phase: Option<f32>,
    ) {
        let configuration = crate::avatar_ik::recovered_configuration(crate::avatar_ik::IkSample {
            phase,
            movement: movement_amount,
            grounded,
            running,
            crouching,
            landing: landing_amount,
            vertical_velocity,
            swimming,
            roll_phase,
        });
        for part in &self.parts {
            let pose = crate::avatar_ik::PART_NAMES
                .iter()
                .position(|name| *name == part.name)
                .and_then(|index| {
                    crate::avatar_idle_pose::recovered_idle_pose(&part.name).map(|idle| {
                        configuration[index] * glam::Mat4::from_cols_array(&idle).inverse()
                    })
                })
                .unwrap_or(glam::Mat4::IDENTITY)
                .to_cols_array();
            queue.write_buffer(&part.pose_buffer, 0, bytemuck::cast_slice(&pose));
        }
    }

    pub fn draw<'a>(&'a self, pass: &mut wgpu::RenderPass<'a>) {
        let Some(instances) = &self.instance_buffer else {
            return;
        };
        if self.instance_count == 0 {
            return;
        }
        pass.set_pipeline(&self.pipeline);
        pass.set_bind_group(0, &self.camera_bind_group, &[]);
        pass.set_vertex_buffer(1, instances.slice(..));
        for part in &self.parts {
            // 空部件（neck/肩部等占位）无 mesh，slice(..) 对空 buffer 会 panic
            if part.index_count == 0 {
                continue;
            }
            pass.set_bind_group(1, &part.bind_group, &[]);
            pass.set_vertex_buffer(0, part.vertex_buffer.slice(..));
            pass.set_index_buffer(part.index_buffer.slice(..), wgpu::IndexFormat::Uint32);
            pass.draw_indexed(0..part.index_count, 0, 0..self.instance_count);
        }
    }

    pub fn render_shadows(
        &self,
        encoder: &mut wgpu::CommandEncoder,
        queue: &wgpu::Queue,
        shadow_map: &NeaShadowMap,
        frame: &NeaShadowFrame,
    ) {
        let Some(instances) = &self.instance_buffer else {
            return;
        };
        if self.instance_count == 0 {
            return;
        }
        self.shadow.render(
            encoder,
            queue,
            shadow_map,
            frame,
            &self.parts,
            instances,
            self.instance_count,
        );
    }
}

fn upload_part(
    device: &wgpu::Device,
    queue: &wgpu::Queue,
    texture_layout: &wgpu::BindGroupLayout,
    part: &AvatarPart,
    mesh: MeshBuffers,
    name: &str,
) -> Result<AvatarPartGpu, String> {
    let width = part.texture.width;
    let height = part.texture.data.len() as u32 / width;
    let rgba = decode_palette_rgba(part)?;
    let texture = device.create_texture(&wgpu::TextureDescriptor {
        label: Some(&format!("nea.avatar.{name}.texture")),
        size: wgpu::Extent3d {
            width,
            height,
            depth_or_array_layers: 1,
        },
        mip_level_count: 1,
        sample_count: 1,
        dimension: wgpu::TextureDimension::D2,
        format: wgpu::TextureFormat::Rgba8UnormSrgb,
        usage: wgpu::TextureUsages::TEXTURE_BINDING | wgpu::TextureUsages::COPY_DST,
        view_formats: &[],
    });
    queue.write_texture(
        wgpu::TexelCopyTextureInfo {
            texture: &texture,
            mip_level: 0,
            origin: wgpu::Origin3d::ZERO,
            aspect: wgpu::TextureAspect::All,
        },
        &rgba,
        wgpu::TexelCopyBufferLayout {
            offset: 0,
            bytes_per_row: Some(width * 4),
            rows_per_image: Some(height),
        },
        wgpu::Extent3d {
            width,
            height,
            depth_or_array_layers: 1,
        },
    );
    let view = texture.create_view(&Default::default());
    let sampler = device.create_sampler(&wgpu::SamplerDescriptor {
        label: Some(&format!("nea.avatar.{name}.sampler")),
        address_mode_u: wgpu::AddressMode::ClampToEdge,
        address_mode_v: wgpu::AddressMode::ClampToEdge,
        mag_filter: wgpu::FilterMode::Nearest,
        min_filter: wgpu::FilterMode::Nearest,
        ..Default::default()
    });
    let pose_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
        label: Some(&format!("nea.avatar.{name}.pose")),
        contents: bytemuck::cast_slice(&glam::Mat4::IDENTITY.to_cols_array()),
        usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
    });
    let bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
        label: Some(&format!("nea.avatar.{name}.bind")),
        layout: texture_layout,
        entries: &[
            wgpu::BindGroupEntry {
                binding: 0,
                resource: wgpu::BindingResource::TextureView(&view),
            },
            wgpu::BindGroupEntry {
                binding: 1,
                resource: wgpu::BindingResource::Sampler(&sampler),
            },
            wgpu::BindGroupEntry {
                binding: 2,
                resource: pose_buffer.as_entire_binding(),
            },
        ],
    });
    let vertex_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
        label: Some(&format!("nea.avatar.{name}.vertices")),
        contents: bytemuck::cast_slice(&mesh.vertices),
        usage: wgpu::BufferUsages::VERTEX,
    });
    let index_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
        label: Some(&format!("nea.avatar.{name}.indices")),
        contents: bytemuck::cast_slice(&mesh.indices),
        usage: wgpu::BufferUsages::INDEX,
    });
    Ok(AvatarPartGpu {
        name: name.to_string(),
        _texture: texture,
        pose_buffer,
        bind_group,
        vertex_buffer,
        index_buffer,
        index_count: mesh.indices.len() as u32,
    })
}

fn decode_palette_rgba(part: &AvatarPart) -> Result<Vec<u8>, String> {
    let mut rgba = Vec::with_capacity(part.texture.data.len() * 4);
    for index in &part.texture.data {
        let color = part
            .texture
            .palette
            .get(*index as usize)
            .copied()
            .ok_or_else(|| format!("avatar palette index {index} is out of range"))?;
        // Recovered `Nm(texture, [24, 16, 8, 0])` expands packed colors as
        // high-byte-first RGBA. Little-endian expansion swaps red and alpha
        // and was the source of the cyan avatar output.
        rgba.extend_from_slice(&color.to_be_bytes());
    }
    Ok(rgba)
}

pub fn avatar_instance_layout() -> wgpu::VertexBufferLayout<'static> {
    const ATTRIBUTES: [wgpu::VertexAttribute; 4] =
        wgpu::vertex_attr_array![3 => Float32x3, 4 => Float32, 5 => Float32x4, 6 => Float32x4];
    wgpu::VertexBufferLayout {
        array_stride: std::mem::size_of::<AvatarInstance>() as u64,
        step_mode: wgpu::VertexStepMode::Instance,
        attributes: &ATTRIBUTES,
    }
}

pub(crate) fn avatar_vertex_layout() -> wgpu::VertexBufferLayout<'static> {
    const ATTRIBUTES: [wgpu::VertexAttribute; 3] =
        wgpu::vertex_attr_array![0 => Float32x3, 1 => Float32x3, 2 => Float32x2];
    wgpu::VertexBufferLayout {
        array_stride: (crate::nea_mesh::FLOATS_PER_VERTEX * 4) as wgpu::BufferAddress,
        step_mode: wgpu::VertexStepMode::Vertex,
        attributes: &ATTRIBUTES,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use voxweb_protocol::{AvatarFace, AvatarTexture};

    #[test]
    fn palette_uses_recovered_high_byte_first_rgba() {
        let part = AvatarPart {
            part_id: 0,
            bind_matrix: [0.0; 16],
            faces: Vec::<AvatarFace>::new(),
            texture: AvatarTexture {
                width: 1,
                data: vec![0],
                palette: vec![0x44332211],
            },
        };
        assert_eq!(
            decode_palette_rgba(&part).unwrap(),
            [0x44, 0x33, 0x22, 0x11]
        );
    }

    #[test]
    fn instance_layout_carries_transform() {
        let layout = avatar_instance_layout();
        assert_eq!(layout.array_stride, 48);
        assert_eq!(layout.step_mode, wgpu::VertexStepMode::Instance);
        assert_eq!(layout.attributes.len(), 4);
    }
}
