//! NEA terrain render pipeline — wgpu pipeline object creation (VW-003
//! Step 6/7). Creates the pipeline from the recovered shader + mesh layout;
//! `set_camera` updates the MVP uniform each frame; `draw` emits the terrain
//! with the atlas texture. Surface/present wiring lives in the client.

use crate::nea_environment::{apply_underwater_globals, recovered_default_globals};
use crate::nea_mesh::MeshBuffers;
use crate::nea_shader::NEA_FRAGMENT_WGSL;
use crate::nea_shadow::NeaShadowMap;
use wgpu::util::DeviceExt;

/// Uniform layout: MVP followed by thirteen vec4 environment/material records.
pub const GLOBALS_FLOATS: usize = 68;
pub const GLOBALS_MVP_OFFSET: usize = 0;
pub const GLOBALS_EYE_EXPOSURE_OFFSET: usize = 16;
pub const GLOBALS_FOG_OFFSET: usize = 20;
pub const GLOBALS_LIGHT_GAMMA_OFFSET: usize = 24;
pub const GLOBALS_LIGHT_COLOR_OFFSET: usize = 28;
pub const GLOBALS_FOG2_OFFSET: usize = 32;
pub const GLOBALS_FOG3_OFFSET: usize = 36;
pub const GLOBALS_SKY_LEFT_OFFSET: usize = 40;
pub const GLOBALS_SKY_RIGHT_OFFSET: usize = 44;
pub const GLOBALS_SKY_TOP_OFFSET: usize = 48;
pub const GLOBALS_SKY_BOTTOM_OFFSET: usize = 52;
pub const GLOBALS_SKY_FRONT_OFFSET: usize = 56;
pub const GLOBALS_SKY_BACK_OFFSET: usize = 60;
pub const GLOBALS_ATLAS_OFFSET: usize = 64;
/// Debug view 模式（F1-F6）：存 atlas_params.z（原恢复布局里 z/w 空闲）。
pub const GLOBALS_DEBUG_MODE_OFFSET: usize = GLOBALS_ATLAS_OFFSET + 2;

/// A full NEA terrain pipeline: atlas texture + mesh buffers + pipeline.
pub struct NeaTerrainPipeline {
    pub pipeline: wgpu::RenderPipeline,
    pub vertex_buffer: wgpu::Buffer,
    pub index_buffer: wgpu::Buffer,
    pub index_count: u32,
    bind_group: wgpu::BindGroup,
    uniform_buffer: wgpu::Buffer,
    /// The format the pipeline renders into (must match the surface).
    pub surface_format: wgpu::TextureFormat,
    /// Depth format used by the pipeline (None = no depth test).
    pub depth_format: Option<wgpu::TextureFormat>,
}

impl NeaTerrainPipeline {
    /// Create the pipeline + buffers. `atlas` is the uploaded atlas texture
    /// (crate::nea_atlas::AtlasTexture); `mesh` the packed terrain mesh.
    /// `depth_format` enables the depth test when Some (usually
    /// Depth32Float).
    pub fn new(
        device: &wgpu::Device,
        atlas: &crate::nea_atlas::AtlasTexture,
        material_atlas: &crate::nea_atlas::AtlasTexture,
        bump_atlas: &crate::nea_atlas::AtlasTexture,
        shadow_map: &NeaShadowMap,
        mesh: &MeshBuffers,
        surface_format: wgpu::TextureFormat,
        depth_format: Option<wgpu::TextureFormat>,
        label: &str,
    ) -> Self {
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some(&format!("{label}_shader")),
            source: wgpu::ShaderSource::Wgsl(NEA_FRAGMENT_WGSL.into()),
        });

        let bind_group_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some(&format!("{label}_bind_layout")),
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
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty: wgpu::BindingType::Texture {
                        sample_type: wgpu::TextureSampleType::Float { filterable: true },
                        view_dimension: wgpu::TextureViewDimension::D2,
                        multisampled: false,
                    },
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 3,
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty: wgpu::BindingType::Sampler(wgpu::SamplerBindingType::Filtering),
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 4,
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty: wgpu::BindingType::Texture {
                        sample_type: wgpu::TextureSampleType::Float { filterable: true },
                        view_dimension: wgpu::TextureViewDimension::D2,
                        multisampled: false,
                    },
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 5,
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty: wgpu::BindingType::Sampler(wgpu::SamplerBindingType::Filtering),
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 6,
                    visibility: wgpu::ShaderStages::VERTEX_FRAGMENT,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Uniform,
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 7,
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty: wgpu::BindingType::Texture {
                        sample_type: wgpu::TextureSampleType::Depth,
                        view_dimension: wgpu::TextureViewDimension::D2,
                        multisampled: false,
                    },
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 8,
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty: wgpu::BindingType::Sampler(wgpu::SamplerBindingType::NonFiltering),
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 9,
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

        let globals = recovered_default_globals(512.0, 16.0);
        let uniform_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some(&format!("{label}_uniforms")),
            contents: bytemuck::cast_slice(&globals),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        });

        let bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some(&format!("{label}_bind_group")),
            layout: &bind_group_layout,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: wgpu::BindingResource::TextureView(&atlas.view),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: wgpu::BindingResource::Sampler(&atlas.sampler),
                },
                wgpu::BindGroupEntry {
                    binding: 2,
                    resource: wgpu::BindingResource::TextureView(&material_atlas.view),
                },
                wgpu::BindGroupEntry {
                    binding: 3,
                    resource: wgpu::BindingResource::Sampler(&material_atlas.sampler),
                },
                wgpu::BindGroupEntry {
                    binding: 4,
                    resource: wgpu::BindingResource::TextureView(&bump_atlas.view),
                },
                wgpu::BindGroupEntry {
                    binding: 5,
                    resource: wgpu::BindingResource::Sampler(&bump_atlas.sampler),
                },
                wgpu::BindGroupEntry {
                    binding: 6,
                    resource: uniform_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 7,
                    resource: wgpu::BindingResource::TextureView(&shadow_map.view),
                },
                wgpu::BindGroupEntry {
                    binding: 8,
                    resource: wgpu::BindingResource::Sampler(&shadow_map.sampler),
                },
                wgpu::BindGroupEntry {
                    binding: 9,
                    resource: shadow_map.uniform_buffer.as_entire_binding(),
                },
            ],
        });

        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some(&format!("{label}_layout")),
            bind_group_layouts: &[Some(&bind_group_layout)],
            immediate_size: 0,
        });

        let vertex_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some(&format!("{label}_vertices")),
            contents: bytemuck::cast_slice(&mesh.vertices),
            usage: wgpu::BufferUsages::VERTEX,
        });
        let index_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some(&format!("{label}_indices")),
            contents: bytemuck::cast_slice(&mesh.indices),
            usage: wgpu::BufferUsages::INDEX,
        });

        let pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some(label),
            layout: Some(&pipeline_layout),
            vertex: wgpu::VertexState {
                module: &shader,
                entry_point: Some("vs_main"),
                compilation_options: Default::default(),
                buffers: &[MeshBuffers::vertex_layout()],
            },
            fragment: Some(wgpu::FragmentState {
                module: &shader,
                entry_point: Some("fs_main"),
                compilation_options: Default::default(),
                targets: &[Some(wgpu::ColorTargetState {
                    format: surface_format,
                    blend: Some(wgpu::BlendState::REPLACE),
                    write_mask: wgpu::ColorWrites::ALL,
                })],
            }),
            primitive: wgpu::PrimitiveState {
                topology: wgpu::PrimitiveTopology::TriangleList,
                cull_mode: Some(wgpu::Face::Back),
                ..Default::default()
            },
            depth_stencil: depth_format.map(|format| wgpu::DepthStencilState {
                format,
                depth_write_enabled: Some(true),
                depth_compare: Some(wgpu::CompareFunction::LessEqual),
                stencil: wgpu::StencilState::default(),
                bias: wgpu::DepthBiasState::default(),
            }),
            multisample: wgpu::MultisampleState::default(),
            multiview_mask: None,
            cache: None,
        });

        Self {
            pipeline,
            vertex_buffer,
            index_buffer,
            index_count: mesh.indices.len() as u32,
            bind_group,
            uniform_buffer,
            surface_format,
            depth_format,
        }
    }

    /// Update the MVP uniform (column-major 4×4, 16 floats).
    pub fn set_camera(
        &self,
        queue: &wgpu::Queue,
        mvp: &[f32; 16],
        eye: &[f32; 3],
        eye_fluid: Option<[f32; 4]>,
        exposure: f32,
        debug_mode: f32,
    ) {
        let mut globals = recovered_default_globals(512.0, 16.0);
        globals[GLOBALS_MVP_OFFSET..GLOBALS_MVP_OFFSET + 16].copy_from_slice(mvp);
        globals[GLOBALS_EYE_EXPOSURE_OFFSET..GLOBALS_EYE_EXPOSURE_OFFSET + 3].copy_from_slice(eye);
        globals[GLOBALS_EYE_EXPOSURE_OFFSET + 3] = exposure;
        globals[GLOBALS_DEBUG_MODE_OFFSET] = debug_mode;
        apply_underwater_globals(&mut globals, eye_fluid);
        queue.write_buffer(&self.uniform_buffer, 0, bytemuck::cast_slice(&globals));
    }

    /// Emit the terrain geometry.
    pub fn draw<'a>(&'a self, pass: &mut wgpu::RenderPass<'a>) {
        pass.set_pipeline(&self.pipeline);
        pass.set_bind_group(0, &self.bind_group, &[]);
        pass.set_vertex_buffer(0, self.vertex_buffer.slice(..));
        pass.set_index_buffer(self.index_buffer.slice(..), wgpu::IndexFormat::Uint32);
        pass.draw_indexed(0..self.index_count, 0, 0..1);
    }

    /// Emit a dynamic mesh (e.g. other players' bodies) through the same
    /// pipeline: caller supplies packed vertices/indices as buffers.
    pub fn draw_buffers<'p, 'b>(
        &self,
        pass: &mut wgpu::RenderPass<'p>,
        vertex_buffer: &'b wgpu::Buffer,
        index_buffer: &'b wgpu::Buffer,
        index_count: u32,
    ) where
        'b: 'p,
    {
        pass.set_pipeline(&self.pipeline);
        pass.set_bind_group(0, &self.bind_group, &[]);
        pass.set_vertex_buffer(0, vertex_buffer.slice(..));
        pass.set_index_buffer(index_buffer.slice(..), wgpu::IndexFormat::Uint32);
        pass.draw_indexed(0..index_count, 0, 0..1);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn globals_layout_is_272_bytes() {
        assert_eq!(GLOBALS_FLOATS * 4, 272, "mat4 plus thirteen vec4 records");
        assert_eq!(GLOBALS_MVP_OFFSET, 0);
        assert_eq!(GLOBALS_EYE_EXPOSURE_OFFSET, 16);
        assert_eq!(GLOBALS_LIGHT_COLOR_OFFSET, 28);
        assert_eq!(GLOBALS_SKY_LEFT_OFFSET, 40);
        assert_eq!(GLOBALS_ATLAS_OFFSET, 64);
    }

    #[test]
    fn shader_has_vertex_entry() {
        assert!(
            NEA_FRAGMENT_WGSL.contains("@vertex") || NEA_FRAGMENT_WGSL.contains("vs_main"),
            "vertex entry present in shader"
        );
    }
}
