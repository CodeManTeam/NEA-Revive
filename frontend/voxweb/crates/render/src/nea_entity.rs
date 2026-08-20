//! Instanced rendering for recovered DAO3 model entities.
//!
//! A `.vb` mesh is uploaded once and every seed using it is represented by a
//! compact instance record. This mirrors the preserved entity schema and
//! avoids expanding repeated room props into terrain-style vertex buffers.

use bytemuck::{Pod, Zeroable};
use wgpu::util::DeviceExt;

use crate::nea_atlas::AtlasTexture;
use crate::nea_environment::{apply_underwater_globals, environment_globals, MapEnvironment, NeaEnvironment};
use crate::nea_pipeline::{GLOBALS_DEBUG_MODE_OFFSET, GLOBALS_EYE_EXPOSURE_OFFSET, GLOBALS_FLOATS, GLOBALS_MVP_OFFSET};

#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable)]
pub struct EntityVertex {
    pub position: [f32; 3],
    pub normal: [f32; 3],
    pub uv: [f32; 2],
}

#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable)]
pub struct EntityInstance {
    pub model: [[f32; 4]; 4],
    pub tint: [f32; 4],
    pub light: [f32; 4],
    /// emissive, metalness, shininess, staticShadow
    pub material: [f32; 4],
}

pub struct NeaEntityPipeline {
    pipeline: wgpu::RenderPipeline,
    bind_group: wgpu::BindGroup,
    uniform_buffer: wgpu::Buffer,
    vertex_buffer: wgpu::Buffer,
    index_buffer: wgpu::Buffer,
    instance_buffer: wgpu::Buffer,
    index_count: u32,
    instance_count: u32,
}

impl NeaEntityPipeline {
    pub fn new(
        device: &wgpu::Device,
        texture: &AtlasTexture,
        vertices: &[EntityVertex],
        indices: &[u32],
        instances: &[EntityInstance],
        surface_format: wgpu::TextureFormat,
        depth_format: wgpu::TextureFormat,
        label: &str,
    ) -> Self {
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some(&format!("{label}.shader")),
            source: wgpu::ShaderSource::Wgsl(ENTITY_SHADER.into()),
        });
        let layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some(&format!("{label}.layout")),
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
                    visibility: wgpu::ShaderStages::VERTEX_FRAGMENT,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Uniform,
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
            ],
        });
        let uniform_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some(&format!("{label}.globals")),
            contents: bytemuck::cast_slice(&[0.0_f32; GLOBALS_FLOATS]),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        });
        let bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some(&format!("{label}.bind")),
            layout: &layout,
            entries: &[
                wgpu::BindGroupEntry { binding: 0, resource: wgpu::BindingResource::TextureView(&texture.view) },
                wgpu::BindGroupEntry { binding: 1, resource: wgpu::BindingResource::Sampler(&texture.sampler) },
                wgpu::BindGroupEntry { binding: 2, resource: uniform_buffer.as_entire_binding() },
            ],
        });
        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some(&format!("{label}.pipeline-layout")),
            bind_group_layouts: &[Some(&layout)],
            immediate_size: 0,
        });
        let vertex_attrs = wgpu::vertex_attr_array![0 => Float32x3, 1 => Float32x3, 2 => Float32x2];
        let instance_attrs = wgpu::vertex_attr_array![
            3 => Float32x4, 4 => Float32x4, 5 => Float32x4, 6 => Float32x4,
            7 => Float32x4, 8 => Float32x4, 9 => Float32x4
        ];
        let pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some(label),
            layout: Some(&pipeline_layout),
            vertex: wgpu::VertexState {
                module: &shader,
                entry_point: Some("vs_main"),
                compilation_options: Default::default(),
                buffers: &[
                    wgpu::VertexBufferLayout {
                        array_stride: std::mem::size_of::<EntityVertex>() as u64,
                        step_mode: wgpu::VertexStepMode::Vertex,
                        attributes: &vertex_attrs,
                    },
                    wgpu::VertexBufferLayout {
                        array_stride: std::mem::size_of::<EntityInstance>() as u64,
                        step_mode: wgpu::VertexStepMode::Instance,
                        attributes: &instance_attrs,
                    },
                ],
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
            primitive: wgpu::PrimitiveState { cull_mode: Some(wgpu::Face::Back), ..Default::default() },
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
        let vertex_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some(&format!("{label}.vertices")),
            contents: bytemuck::cast_slice(vertices),
            usage: wgpu::BufferUsages::VERTEX,
        });
        let index_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some(&format!("{label}.indices")),
            contents: bytemuck::cast_slice(indices),
            usage: wgpu::BufferUsages::INDEX,
        });
        let instance_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some(&format!("{label}.instances")),
            contents: bytemuck::cast_slice(instances),
            usage: wgpu::BufferUsages::VERTEX | wgpu::BufferUsages::COPY_DST,
        });
        Self { pipeline, bind_group, uniform_buffer, vertex_buffer, index_buffer, instance_buffer, index_count: indices.len() as u32, instance_count: instances.len() as u32 }
    }

    pub fn set_frame(&self, queue: &wgpu::Queue, mvp: &[f32; 16], eye: &[f32; 3], eye_fluid: Option<[f32; 4]>, exposure: f32, debug: f32, environment: &NeaEnvironment, map: Option<&MapEnvironment>) {
        let mut globals = environment_globals(1.0, 1.0, environment, map);
        globals[GLOBALS_MVP_OFFSET..GLOBALS_MVP_OFFSET + 16].copy_from_slice(mvp);
        globals[GLOBALS_EYE_EXPOSURE_OFFSET..GLOBALS_EYE_EXPOSURE_OFFSET + 3].copy_from_slice(eye);
        globals[GLOBALS_EYE_EXPOSURE_OFFSET + 3] = exposure;
        globals[GLOBALS_DEBUG_MODE_OFFSET] = debug;
        apply_underwater_globals(&mut globals, eye_fluid);
        queue.write_buffer(&self.uniform_buffer, 0, bytemuck::cast_slice(&globals));
    }

    pub fn draw<'a>(&'a self, pass: &mut wgpu::RenderPass<'a>) {
        if self.index_count == 0 || self.instance_count == 0 { return; }
        pass.set_pipeline(&self.pipeline);
        pass.set_bind_group(0, &self.bind_group, &[]);
        pass.set_vertex_buffer(0, self.vertex_buffer.slice(..));
        pass.set_vertex_buffer(1, self.instance_buffer.slice(..));
        pass.set_index_buffer(self.index_buffer.slice(..), wgpu::IndexFormat::Uint32);
        pass.draw_indexed(0..self.index_count, 0, 0..self.instance_count);
    }
}

const ENTITY_SHADER: &str = r#"
struct Globals {
  mvp: mat4x4<f32>, eye_exposure: vec4f, fog_params: vec4f,
  light_direction_gamma: vec4f, light_color_global: vec4f,
  fog_params2: vec4f, fog_params3: vec4f,
  sky_left: vec4f, sky_right: vec4f, sky_top: vec4f,
  sky_bottom: vec4f, sky_front: vec4f, sky_back: vec4f,
  atlas_params: vec4f,
};
@group(0) @binding(0) var color_texture: texture_2d<f32>;
@group(0) @binding(1) var color_sampler: sampler;
@group(0) @binding(2) var<uniform> globals: Globals;
struct In {
  @location(0) position: vec3f, @location(1) normal: vec3f, @location(2) uv: vec2f,
  @location(3) m0: vec4f, @location(4) m1: vec4f, @location(5) m2: vec4f, @location(6) m3: vec4f,
  @location(7) tint: vec4f, @location(8) light: vec4f, @location(9) material: vec4f,
};
struct Out { @builtin(position) clip: vec4f, @location(0) uv: vec2f, @location(1) normal: vec3f, @location(2) tint: vec4f, @location(3) light: vec4f, @location(4) material: vec4f };
@vertex fn vs_main(input: In) -> Out {
  let model = mat4x4<f32>(input.m0, input.m1, input.m2, input.m3);
  let world = model * vec4f(input.position, 1.0);
  var output: Out;
  output.clip = globals.mvp * world;
  output.uv = input.uv;
  output.normal = normalize((model * vec4f(input.normal, 0.0)).xyz);
  output.tint = input.tint; output.light = input.light; output.material = input.material;
  return output;
}
fn display(value: vec3f) -> vec3f { return pow(clamp(value, vec3f(0.0), vec3f(1.0)), vec3f(1.0 / max(globals.light_direction_gamma.w, 0.001))); }
@fragment fn fs_main(input: Out) -> @location(0) vec4f {
  let texel = textureSample(color_texture, color_sampler, input.uv);
  let albedo = texel.rgb * input.tint.rgb;
  let sun = max(dot(normalize(input.normal), globals.light_direction_gamma.xyz), 0.0) * globals.light_color_global.rgb;
  let local = 100.0 * input.light.rgb;
  let lit = albedo * (sun + local + 400.0 * input.material.x);
  let mapped = (globals.eye_exposure.w * lit * (2.51 * globals.eye_exposure.w * lit + vec3f(0.03))) / (globals.eye_exposure.w * lit * (2.43 * globals.eye_exposure.w * lit + vec3f(0.59)) + vec3f(0.14));
  return vec4f(display(mapped), texel.a * input.tint.a);
}
"#;
