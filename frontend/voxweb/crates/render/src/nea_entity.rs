//! Instanced rendering for recovered DAO3 model entities.
//!
//! A `.vb` mesh is uploaded once and every seed using it is represented by a
//! compact instance record. This mirrors the preserved entity schema and
//! avoids expanding repeated room props into terrain-style vertex buffers.

use bytemuck::{Pod, Zeroable};
use wgpu::util::DeviceExt;

use crate::nea_atlas::AtlasTexture;
use crate::nea_environment::{
    MapEnvironment, NeaEnvironment, apply_underwater_globals, environment_globals,
};
use crate::nea_pipeline::{
    GLOBALS_DEBUG_MODE_OFFSET, GLOBALS_EYE_EXPOSURE_OFFSET, GLOBALS_FLOATS, GLOBALS_MVP_OFFSET,
};

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
    pub lo: [f32; 4],
    pub hi: [f32; 4],
    pub ambient: [[f32; 4]; 8],
    /// metalness, shininess, emissive, staticShadow
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
        instance_capacity: usize,
        is_gltf: bool,
        surface_format: wgpu::TextureFormat,
        depth_format: wgpu::TextureFormat,
        label: &str,
    ) -> Self {
        let shader_source = if is_gltf {
            ENTITY_SHADER.replace(
                "const IS_GLTF: bool = false;",
                "const IS_GLTF: bool = true;",
            )
        } else {
            ENTITY_SHADER.to_owned()
        };
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some(&format!("{label}.shader")),
            source: wgpu::ShaderSource::Wgsl(shader_source.into()),
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
                wgpu::BindGroupLayoutEntry {
                    binding: 3,
                    visibility: wgpu::ShaderStages::VERTEX,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Storage { read_only: true },
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
        let mut instance_storage =
            vec![EntityInstance::zeroed(); instance_capacity.max(instances.len())];
        instance_storage[..instances.len()].copy_from_slice(instances);
        let instance_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some(&format!("{label}.instances")),
            contents: bytemuck::cast_slice(&instance_storage),
            usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_DST,
        });
        let bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some(&format!("{label}.bind")),
            layout: &layout,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: wgpu::BindingResource::TextureView(&texture.view),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: wgpu::BindingResource::Sampler(&texture.sampler),
                },
                wgpu::BindGroupEntry {
                    binding: 2,
                    resource: uniform_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 3,
                    resource: instance_buffer.as_entire_binding(),
                },
            ],
        });
        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some(&format!("{label}.pipeline-layout")),
            bind_group_layouts: &[Some(&layout)],
            immediate_size: 0,
        });
        let vertex_attrs = wgpu::vertex_attr_array![0 => Float32x3, 1 => Float32x3, 2 => Float32x2];
        let pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some(label),
            layout: Some(&pipeline_layout),
            vertex: wgpu::VertexState {
                module: &shader,
                entry_point: Some("vs_main"),
                compilation_options: Default::default(),
                buffers: &[wgpu::VertexBufferLayout {
                    array_stride: std::mem::size_of::<EntityVertex>() as u64,
                    step_mode: wgpu::VertexStepMode::Vertex,
                    attributes: &vertex_attrs,
                }],
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
                cull_mode: Some(wgpu::Face::Back),
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
        Self {
            pipeline,
            bind_group,
            uniform_buffer,
            vertex_buffer,
            index_buffer,
            instance_buffer,
            index_count: indices.len() as u32,
            instance_count: instances.len() as u32,
        }
    }

    pub fn set_frame(
        &self,
        queue: &wgpu::Queue,
        mvp: &[f32; 16],
        eye: &[f32; 3],
        eye_fluid: Option<[f32; 4]>,
        exposure: f32,
        debug: f32,
        environment: &NeaEnvironment,
        map: Option<&MapEnvironment>,
    ) {
        let mut globals = environment_globals(1.0, 1.0, environment, map);
        globals[GLOBALS_MVP_OFFSET..GLOBALS_MVP_OFFSET + 16].copy_from_slice(mvp);
        globals[GLOBALS_EYE_EXPOSURE_OFFSET..GLOBALS_EYE_EXPOSURE_OFFSET + 3].copy_from_slice(eye);
        globals[GLOBALS_EYE_EXPOSURE_OFFSET + 3] = exposure;
        globals[GLOBALS_DEBUG_MODE_OFFSET] = debug;
        apply_underwater_globals(&mut globals, eye_fluid);
        queue.write_buffer(&self.uniform_buffer, 0, bytemuck::cast_slice(&globals));
    }

    /// Update transforms/materials without rebuilding the terrain or pipeline.
    /// Entity state events arrive every simulation tick; keeping this path to
    /// a small instance-buffer upload is essential for stable frame pacing.
    pub fn update_instances(
        &mut self,
        device: &wgpu::Device,
        queue: &wgpu::Queue,
        instances: &[EntityInstance],
    ) {
        let bytes = bytemuck::cast_slice(instances);
        if instances.len() as u32 == self.instance_count {
            if !bytes.is_empty() {
                queue.write_buffer(&self.instance_buffer, 0, bytes);
            }
            return;
        }
        if instances.len()
            <= self.instance_buffer.size() as usize / std::mem::size_of::<EntityInstance>()
        {
            if !bytes.is_empty() {
                queue.write_buffer(&self.instance_buffer, 0, bytes);
            }
            self.instance_count = instances.len() as u32;
            return;
        }
        self.instance_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("nea.entity.instances.dynamic"),
            contents: bytes,
            usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_DST,
        });
        self.instance_count = instances.len() as u32;
    }

    pub fn draw<'a>(&'a self, pass: &mut wgpu::RenderPass<'a>) {
        if self.index_count == 0 || self.instance_count == 0 {
            return;
        }
        pass.set_pipeline(&self.pipeline);
        pass.set_bind_group(0, &self.bind_group, &[]);
        pass.set_vertex_buffer(0, self.vertex_buffer.slice(..));
        pass.set_index_buffer(self.index_buffer.slice(..), wgpu::IndexFormat::Uint32);
        pass.draw_indexed(0..self.index_count, 0, 0..self.instance_count);
    }
}

const ENTITY_SHADER: &str = r#"
const IS_GLTF: bool = false;
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
struct InstanceData {
  model: mat4x4<f32>, tint: vec4f, lo: vec4f, hi: vec4f,
  ambient: array<vec4f, 8>, material: vec4f,
};
@group(0) @binding(3) var<storage, read> instances: array<InstanceData>;
struct In {
  @location(0) position: vec3f, @location(1) normal: vec3f, @location(2) uv: vec2f,
  @builtin(instance_index) instance_index: u32,
};
struct Out { @builtin(position) clip: vec4f, @location(0) uv: vec2f, @location(1) normal: vec3f, @location(2) world: vec3f, @location(3) tint: vec4f, @location(4) ambient: vec4f, @location(5) material: vec4f };
@vertex fn vs_main(input: In) -> Out {
  let instance = instances[input.instance_index];
  let model = instance.model;
  let world = model * vec4f(input.position, 1.0);
  var output: Out;
  output.clip = globals.mvp * world;
  output.uv = input.uv;
  output.normal = normalize((model * vec4f(input.normal, 0.0)).xyz);
  output.world = world.xyz;
  output.tint = instance.tint;
  output.material = instance.material;
  let weight = clamp((input.position - instance.lo.xyz) / max(instance.hi.xyz - instance.lo.xyz, vec3f(1.0)), vec3f(0.0), vec3f(1.0));
  output.ambient = mix(
    mix(mix(instance.ambient[0], instance.ambient[1], weight.x), mix(instance.ambient[2], instance.ambient[3], weight.x), weight.y),
    mix(mix(instance.ambient[4], instance.ambient[5], weight.x), mix(instance.ambient[6], instance.ambient[7], weight.x), weight.y),
    weight.z);
  return output;
}
fn display(value: vec3f) -> vec3f { return pow(clamp(value, vec3f(0.0), vec3f(1.0)), vec3f(1.0 / max(globals.light_direction_gamma.w, 0.001))); }
fn global_shade(value: f32) -> f32 { return value * (1.0 - globals.light_color_global.w) + globals.light_color_global.w; }
fn safe_light_direction() -> vec3f {
  let direction = globals.light_direction_gamma.xyz;
  let length_squared = dot(direction, direction);
  if (length_squared <= 0.00000001) { return vec3f(0.0); }
  return direction / sqrt(length_squared);
}
fn directional_sky(normal: vec3f) -> vec3f {
  let x0 = max(normal.x + 0.25, 0.0);
  let x1 = max(-normal.x + 0.25, 0.0);
  let y0 = max(normal.y + 0.25, 0.0);
  let y1 = max(-normal.y + 0.25, 0.0);
  let z0 = max(normal.z + 0.25, 0.0);
  let z1 = max(-normal.z + 0.25, 0.0);
  let total = x0 + x1 + y0 + y1 + z0 + z1;
  return (x0 * globals.sky_left.rgb + x1 * globals.sky_right.rgb + y0 * globals.sky_top.rgb + y1 * globals.sky_bottom.rgb + z0 * globals.sky_front.rgb + z1 * globals.sky_back.rgb) / total;
}
@fragment fn fs_main(input: Out) -> @location(0) vec4f {
  var rgbe = textureSample(color_texture, color_sampler, input.uv) * input.tint;
  if (IS_GLTF) { rgbe.a = 0.0; }
  let albedo = rgbe.rgb;
  let normal = normalize(input.normal);
  let face_shadow = step(0.0, dot(normal, globals.light_direction_gamma.xyz));
  let shadow = face_shadow * input.ambient.a;
  // Dump's common shading path consumes the stored direction directly. This
  // also keeps an indoor map's zero direction finite instead of normalizing
  // it into NaNs and contaminating the entire fragment color.
  let direct = global_shade(clamp(dot(normal, safe_light_direction()), 0.0, 1.0) * shadow) * globals.light_color_global.rgb;
  // The native shader promotes the decoded lightmap channels before adding
  // directional sky light. Without this factor indoor models are effectively
  // black even though their palette texture is valid.
  let irradiance = 100.0 * input.ambient.rgb + input.ambient.a * directional_sky(normal);
  let pbr = 1.0 - (1.0 - 2.56 * vec3f(1.0, 1.0, rgbe.a)) * (1.0 - input.material.xyz);
  // Dump constructs `color = vec4f(rgbe.rgb, 1.)`; texture alpha is PBR
  // input, never ambient occlusion or fragment coverage in this opaque pass.
  let shaded = albedo * (direct + irradiance) + 400.0 * pbr.z * albedo;
  let exposed = globals.eye_exposure.w * shaded;
  let mapped = (exposed * (2.51 * exposed + vec3f(0.03))) / (exposed * (2.43 * exposed + vec3f(0.59)) + vec3f(0.14));
  return vec4f(pow(clamp(mapped, vec3f(0.0), vec3f(1.0)), vec3f(1.0 / max(globals.light_direction_gamma.w, 0.001))), 1.0);
}
"#;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn entity_shader_keeps_dump_direction_math_finite_for_zero_sun() {
        assert!(
            !ENTITY_SHADER.contains("dot(normal, normalize(globals.light_direction_gamma.xyz))")
        );
        assert!(ENTITY_SHADER.contains("dot(normal, globals.light_direction_gamma.xyz)"));
    }
}
