//! Recovered alpha-voxel pass writing translucent block fragments into NEA OIT.

use crate::nea_atlas::AtlasTexture;
use crate::nea_mesh::{FLOATS_PER_VERTEX, MeshBuffers};
use crate::nea_oit::{NeaOit, OIT_STORAGE_WGSL};
use crate::nea_pipeline::{GLOBALS_EYE_EXPOSURE_OFFSET, GLOBALS_MVP_OFFSET};
use crate::nea_shader::{NEA_ALPHA_FRAGMENT_WGSL, NEA_FRAGMENT_WGSL};
use crate::nea_shadow::NeaShadowMap;
use wgpu::util::DeviceExt;

pub struct NeaAlphaPipeline {
    pipeline: wgpu::RenderPipeline,
    vertex_buffer: wgpu::Buffer,
    index_buffer: wgpu::Buffer,
    index_count: u32,
    bind_group: wgpu::BindGroup,
    uniform_buffer: wgpu::Buffer,
}

impl NeaAlphaPipeline {
    pub fn new(
        device: &wgpu::Device,
        atlas: &AtlasTexture,
        material_atlas: &AtlasTexture,
        bump_atlas: &AtlasTexture,
        mesh: &MeshBuffers,
        oit: &NeaOit,
        shadow_map: &NeaShadowMap,
        surface_format: wgpu::TextureFormat,
        depth_format: wgpu::TextureFormat,
    ) -> Self {
        let source = format!("{NEA_FRAGMENT_WGSL}\n{NEA_ALPHA_FRAGMENT_WGSL}\n{OIT_STORAGE_WGSL}");
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("nea.alpha.shader"),
            source: wgpu::ShaderSource::Wgsl(source.into()),
        });
        let layout = create_texture_layout(device);
        let globals = crate::nea_environment::recovered_default_globals(512.0, 16.0);
        let uniform_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("nea.alpha.uniforms"),
            contents: bytemuck::cast_slice(&globals),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        });
        let bind_group = create_texture_group(
            device,
            &layout,
            atlas,
            material_atlas,
            bump_atlas,
            &uniform_buffer,
            shadow_map,
        );
        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("nea.alpha.pipeline-layout"),
            bind_group_layouts: &[Some(&layout), Some(oit.layout())],
            immediate_size: 0,
        });
        let pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("nea.alpha"),
            layout: Some(&pipeline_layout),
            vertex: wgpu::VertexState {
                module: &shader,
                entry_point: Some("vs_main"),
                compilation_options: Default::default(),
                buffers: &[MeshBuffers::vertex_layout()],
            },
            fragment: Some(wgpu::FragmentState {
                module: &shader,
                entry_point: Some("fs_alpha"),
                compilation_options: Default::default(),
                targets: &[Some(wgpu::ColorTargetState {
                    format: surface_format,
                    blend: None,
                    write_mask: wgpu::ColorWrites::empty(),
                })],
            }),
            primitive: wgpu::PrimitiveState {
                topology: wgpu::PrimitiveTopology::TriangleList,
                cull_mode: Some(wgpu::Face::Back),
                ..Default::default()
            },
            depth_stencil: Some(wgpu::DepthStencilState {
                format: depth_format,
                depth_write_enabled: Some(false),
                depth_compare: Some(wgpu::CompareFunction::LessEqual),
                stencil: Default::default(),
                bias: Default::default(),
            }),
            multisample: Default::default(),
            multiview_mask: None,
            cache: None,
        });
        debug_assert_eq!(mesh.vertices.len() % FLOATS_PER_VERTEX, 0);
        let vertex_buffer = upload(
            device,
            "nea.alpha.vertices",
            &mesh.vertices,
            wgpu::BufferUsages::VERTEX,
        );
        let index_buffer = upload(
            device,
            "nea.alpha.indices",
            &mesh.indices,
            wgpu::BufferUsages::INDEX,
        );
        Self {
            pipeline,
            vertex_buffer,
            index_buffer,
            index_count: mesh.indices.len() as u32,
            bind_group,
            uniform_buffer,
        }
    }

    pub fn set_frame(
        &self,
        queue: &wgpu::Queue,
        mvp: &[f32; 16],
        eye: &[f32; 3],
        eye_fluid: Option<[f32; 4]>,
        exposure: f32,
    ) {
        let mut globals = crate::nea_environment::recovered_default_globals(512.0, 16.0);
        globals[GLOBALS_MVP_OFFSET..GLOBALS_MVP_OFFSET + 16].copy_from_slice(mvp);
        globals[GLOBALS_EYE_EXPOSURE_OFFSET..GLOBALS_EYE_EXPOSURE_OFFSET + 3].copy_from_slice(eye);
        globals[GLOBALS_EYE_EXPOSURE_OFFSET + 3] = exposure;
        crate::nea_environment::apply_underwater_globals(&mut globals, eye_fluid);
        queue.write_buffer(&self.uniform_buffer, 0, bytemuck::cast_slice(&globals));
    }

    pub fn draw<'a>(&'a self, pass: &mut wgpu::RenderPass<'a>, oit: &'a NeaOit) {
        if self.index_count == 0 {
            return;
        }
        pass.set_pipeline(&self.pipeline);
        pass.set_bind_group(0, &self.bind_group, &[]);
        pass.set_bind_group(1, oit.group(), &[]);
        pass.set_vertex_buffer(0, self.vertex_buffer.slice(..));
        pass.set_index_buffer(self.index_buffer.slice(..), wgpu::IndexFormat::Uint32);
        pass.draw_indexed(0..self.index_count, 0, 0..1);
    }
}

fn create_texture_layout(device: &wgpu::Device) -> wgpu::BindGroupLayout {
    let mut entries = Vec::new();
    for binding in [0, 2, 4] {
        entries.push(texture_entry(binding));
        entries.push(sampler_entry(binding + 1));
    }
    entries.push(wgpu::BindGroupLayoutEntry {
        binding: 6,
        visibility: wgpu::ShaderStages::VERTEX_FRAGMENT,
        ty: wgpu::BindingType::Buffer {
            ty: wgpu::BufferBindingType::Uniform,
            has_dynamic_offset: false,
            min_binding_size: None,
        },
        count: None,
    });
    entries.extend([
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
            ty: wgpu::BindingType::Sampler(wgpu::SamplerBindingType::Filtering),
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
    ]);
    device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
        label: Some("nea.alpha.texture-layout"),
        entries: &entries,
    })
}

fn create_texture_group(
    device: &wgpu::Device,
    layout: &wgpu::BindGroupLayout,
    color: &AtlasTexture,
    material: &AtlasTexture,
    bump: &AtlasTexture,
    uniforms: &wgpu::Buffer,
    shadow_map: &NeaShadowMap,
) -> wgpu::BindGroup {
    device.create_bind_group(&wgpu::BindGroupDescriptor {
        label: Some("nea.alpha.texture-group"),
        layout,
        entries: &[
            texture_group_entry(0, color),
            sampler_group_entry(1, color),
            texture_group_entry(2, material),
            sampler_group_entry(3, material),
            texture_group_entry(4, bump),
            sampler_group_entry(5, bump),
            wgpu::BindGroupEntry {
                binding: 6,
                resource: uniforms.as_entire_binding(),
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
    })
}

fn texture_entry(binding: u32) -> wgpu::BindGroupLayoutEntry {
    wgpu::BindGroupLayoutEntry {
        binding,
        visibility: wgpu::ShaderStages::FRAGMENT,
        ty: wgpu::BindingType::Texture {
            sample_type: wgpu::TextureSampleType::Float { filterable: true },
            view_dimension: wgpu::TextureViewDimension::D2,
            multisampled: false,
        },
        count: None,
    }
}

fn sampler_entry(binding: u32) -> wgpu::BindGroupLayoutEntry {
    wgpu::BindGroupLayoutEntry {
        binding,
        visibility: wgpu::ShaderStages::FRAGMENT,
        ty: wgpu::BindingType::Sampler(wgpu::SamplerBindingType::Filtering),
        count: None,
    }
}

fn texture_group_entry(binding: u32, atlas: &AtlasTexture) -> wgpu::BindGroupEntry<'_> {
    wgpu::BindGroupEntry {
        binding,
        resource: wgpu::BindingResource::TextureView(&atlas.view),
    }
}

fn sampler_group_entry(binding: u32, atlas: &AtlasTexture) -> wgpu::BindGroupEntry<'_> {
    wgpu::BindGroupEntry {
        binding,
        resource: wgpu::BindingResource::Sampler(&atlas.sampler),
    }
}

fn upload<T: bytemuck::Pod>(
    device: &wgpu::Device,
    label: &str,
    data: &[T],
    usage: wgpu::BufferUsages,
) -> wgpu::Buffer {
    device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
        label: Some(label),
        contents: bytemuck::cast_slice(data),
        usage,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn recovered_alpha_shader_writes_texture_alpha_to_oit() {
        let source = format!("{NEA_FRAGMENT_WGSL}\n{NEA_ALPHA_FRAGMENT_WGSL}\n{OIT_STORAGE_WGSL}");
        wgpu::naga::front::wgsl::parse_str(&source)
            .unwrap_or_else(|error| panic!("NEA alpha WGSL parse failed: {error}"));
        assert!(NEA_ALPHA_FRAGMENT_WGSL.contains("textureSample(atlas"));
        assert!(NEA_ALPHA_FRAGMENT_WGSL.contains("oit_store"));
    }
}
