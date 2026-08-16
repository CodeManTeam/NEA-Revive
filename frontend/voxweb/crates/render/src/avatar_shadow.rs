//! Shadow-depth renderer for recovered instanced avatar parts.

use wgpu::util::DeviceExt;

use crate::avatar_pipeline::{AvatarPartGpu, avatar_instance_layout, avatar_vertex_layout};
use crate::nea_avatar_shader::NEA_AVATAR_SHADOW_WGSL;
use crate::nea_mesh::MeshBuffers;
use crate::nea_shadow::{CASCADE_COUNT, NeaShadowFrame, NeaShadowMap};

pub struct AvatarShadowRenderer {
    pipeline: wgpu::RenderPipeline,
    camera_buffers: [wgpu::Buffer; CASCADE_COUNT],
    camera_bind_groups: [wgpu::BindGroup; CASCADE_COUNT],
}

impl AvatarShadowRenderer {
    pub fn new(device: &wgpu::Device, part_layout: &wgpu::BindGroupLayout) -> Self {
        let layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("nea.avatar.shadow.camera.layout"),
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
                label: Some(&format!("nea.avatar.shadow.camera.{index}")),
                contents: bytemuck::cast_slice(&glam::Mat4::IDENTITY.to_cols_array()),
                usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
            })
        });
        let camera_bind_groups = std::array::from_fn(|index| {
            device.create_bind_group(&wgpu::BindGroupDescriptor {
                label: Some(&format!("nea.avatar.shadow.camera.bind.{index}")),
                layout: &layout,
                entries: &[wgpu::BindGroupEntry {
                    binding: 0,
                    resource: camera_buffers[index].as_entire_binding(),
                }],
            })
        });
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("nea.avatar.shadow.shader"),
            source: wgpu::ShaderSource::Wgsl(NEA_AVATAR_SHADOW_WGSL.into()),
        });
        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("nea.avatar.shadow.pipeline.layout"),
            bind_group_layouts: &[Some(&layout), Some(part_layout)],
            immediate_size: 0,
        });
        let pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("nea.avatar.shadow.pipeline"),
            layout: Some(&pipeline_layout),
            vertex: wgpu::VertexState {
                module: &shader,
                entry_point: Some("vs_main"),
                compilation_options: Default::default(),
                buffers: &[avatar_vertex_layout(), avatar_instance_layout()],
            },
            fragment: None,
            primitive: wgpu::PrimitiveState {
                // 只把人物**背面**写入 shadow map（front-face culling）：
                // 主 pass 人物正面片元采样 shadow map 时，正面深度比背面深度浅，
                // 不会自阴影；而地面采样人物背面深度仍比地面浅 → 投影保留。
                cull_mode: Some(wgpu::Face::Front),
                ..Default::default()
            },
            depth_stencil: Some(wgpu::DepthStencilState {
                format: wgpu::TextureFormat::Depth32Float,
                depth_write_enabled: Some(true),
                depth_compare: Some(wgpu::CompareFunction::LessEqual),
                stencil: Default::default(),
                bias: wgpu::DepthBiasState {
                    constant: 1,
                    slope_scale: 1.0,
                    clamp: 0.0,
                },
            }),
            multisample: Default::default(),
            multiview_mask: None,
            cache: None,
        });
        Self {
            pipeline,
            camera_buffers,
            camera_bind_groups,
        }
    }

    pub fn render(
        &self,
        encoder: &mut wgpu::CommandEncoder,
        queue: &wgpu::Queue,
        shadow_map: &NeaShadowMap,
        frame: &NeaShadowFrame,
        parts: &[AvatarPartGpu],
        instances: &wgpu::Buffer,
        instance_count: u32,
    ) {
        for (index, cascade) in frame.cascades.iter().enumerate() {
            queue.write_buffer(
                &self.camera_buffers[index],
                0,
                bytemuck::cast_slice(&cascade.view_projection.to_cols_array()),
            );
        }
        for (index, cascade) in frame.cascades.iter().enumerate() {
            let mut pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("nea.avatar.shadow"),
                color_attachments: &[],
                depth_stencil_attachment: Some(wgpu::RenderPassDepthStencilAttachment {
                    view: &shadow_map.view,
                    depth_ops: Some(wgpu::Operations {
                        load: wgpu::LoadOp::Load,
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
            pass.set_pipeline(&self.pipeline);
            pass.set_bind_group(0, &self.camera_bind_groups[index], &[]);
            pass.set_vertex_buffer(1, instances.slice(..));
            for part in parts {
                // 空部件（neck/肩部等占位）无 mesh，跳过避免空 buffer slice panic
                if part.index_count == 0 {
                    continue;
                }
                pass.set_bind_group(1, &part.bind_group, &[]);
                pass.set_vertex_buffer(0, part.vertex_buffer.slice(..));
                pass.set_index_buffer(part.index_buffer.slice(..), wgpu::IndexFormat::Uint32);
                pass.draw_indexed(0..part.index_count, 0, 0..instance_count);
            }
        }
    }
}
