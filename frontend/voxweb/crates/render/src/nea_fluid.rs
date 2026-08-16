//! Preserved NEA fluid surface shader and transparent draw pipeline.

use crate::nea_atlas::AtlasTexture;
use crate::nea_mesh::{FLOATS_PER_VERTEX, MeshBuffers};
use crate::nea_oit::{NeaOit, OIT_STORAGE_WGSL};
use crate::nea_pipeline::{
    GLOBALS_ATLAS_OFFSET, GLOBALS_EYE_EXPOSURE_OFFSET, GLOBALS_FLOATS, GLOBALS_MVP_OFFSET,
};
use wgpu::util::DeviceExt;

pub const NEA_FLUID_WGSL: &str = r#"
@group(0) @binding(0) var water_bump: texture_2d<f32>;
@group(0) @binding(1) var water_sampler: sampler;

struct Globals {
  mvp: mat4x4<f32>,
  eye_exposure: vec4f,
  fog_params: vec4f,
  light_direction_gamma: vec4f,
  light_color_global: vec4f,
  fog_params2: vec4f,
  fog_params3: vec4f,
  sky_left: vec4f,
  sky_right: vec4f,
  sky_top: vec4f,
  sky_bottom: vec4f,
  sky_front: vec4f,
  sky_back: vec4f,
  atlas_params: vec4f,
};
@group(0) @binding(2) var<uniform> globals: Globals;

struct VsOut {
  @builtin(position) position: vec4f,
  @location(0) world_pos: vec3f,
  @location(1) face_normal: vec3f,
  @location(2) fog: vec4f,
};

fn pow5(x: f32) -> f32 {
  let x2 = x * x;
  return x2 * x2 * x;
}

fn directional_sky(direction: vec3f) -> vec3f {
  let denominator = abs(direction.x) + abs(direction.y) + abs(direction.z);
  return 0.125 / denominator * (
    max(direction.x, 0.0) * globals.sky_left.rgb +
    max(-direction.x, 0.0) * globals.sky_right.rgb +
    max(direction.y, 0.0) * globals.sky_top.rgb +
    max(-direction.y, 0.0) * globals.sky_bottom.rgb +
    max(direction.z, 0.0) * globals.sky_front.rgb +
    max(-direction.z, 0.0) * globals.sky_back.rgb
  );
}

fn water_height(face_normal: vec3f, face_u: vec3f, face_v: vec3f, position: vec3f) -> vec4f {
  let uv = vec2f(dot(position, face_u), dot(position, face_v));
  let now = globals.atlas_params.z;
  let info =
    textureSample(water_bump, water_sampler,
      vec2f(-0.09034713652888932, 0.04168606254177097) * uv.x +
      vec2f(-0.04168606254177097, -0.09034713652888932) * uv.y +
      vec2f(0.09047047097772415, -0.17836786112152822) * now).rgb +
    textureSample(water_bump, water_sampler,
      vec2f(0.03761523317359175, -0.0905008243239295) * uv.x +
      vec2f(0.0905008243239295, 0.03761523317359175) * uv.y +
      vec2f(-0.19970633443880023, 0.010834204401712169) * now).rgb +
    textureSample(water_bump, water_sampler,
      vec2f(0.03281944212910051, 0.08971935294507542) * uv.x +
      vec2f(-0.08971935294507542, 0.03281944212910051) * uv.y +
      vec2f(0.109235863461076, 0.16753365671981604) * now).rgb;
  let gradient = info.rg - vec2f(1.5);
  return vec4f(normalize(
    4.0 * face_normal + gradient.x * face_u + gradient.y * face_v
  ), info.b / 3.0);
}

fn aces_tone_map(color: vec3f) -> vec3f {
  let mapped = color * (2.51 * color + vec3f(0.03)) /
    (color * (2.43 * color + vec3f(0.59)) + vec3f(0.14));
  return clamp(mapped, vec3f(0.0), vec3f(1.0));
}

@vertex
fn vs_main(
  @location(0) position: vec3f,
  @location(1) normal: vec3f,
  @location(2) _uv: vec2f,
  @location(3) fluid_info: vec4f,
  @location(4) _light01: vec4f,
  @location(5) _light10: vec4f,
  @location(6) _light11: vec4f,
) -> VsOut {
  var out: VsOut;
  out.position = globals.mvp * vec4f(position, 1.0);
  out.world_pos = position;
  out.face_normal = normal;
  out.fog = vec4f(
    fluid_info.rgb * globals.light_color_global.rgb,
    fluid_info.a,
  );
  return out;
}

@fragment
fn fs_main(in: VsOut) {
  let face_u = vec3f(in.face_normal.y + in.face_normal.z, 0.0, -in.face_normal.x);
  let face_v = vec3f(0.0, -abs(in.face_normal.x + in.face_normal.z), abs(in.face_normal.y));
  let data = water_height(in.face_normal, face_u, face_v, in.world_pos);
  let fragment_normal = data.rgb;
  let height = data.a;
  let view_direction = normalize(in.world_pos - globals.eye_exposure.xyz);
  let reflection_direction = reflect(view_direction, fragment_normal);
  let reflection_color = directional_sky(reflection_direction);
  let optical_depth = 18.0 - 4.0 * height;
  let specular = (68.0 / (3.14159265 * 8.0)) *
    pow(clamp(dot(reflection_direction, globals.light_direction_gamma.xyz), 0.0, 1.0), 60.0);
  let extinction = clamp(1.0 - exp(-0.1 * optical_depth * in.fog.a), 0.0, 1.0);
  let fresnel = 1.0 - 0.65 * pow5(1.0 - max(0.0, dot(fragment_normal, view_direction)));
  let color =
    specular * globals.light_color_global.rgb +
    fresnel * reflection_color +
    extinction * in.fog.rgb;
  let mapped = aces_tone_map(globals.eye_exposure.w * color);
  let corrected = pow(mapped, vec3f(1.0 / globals.light_direction_gamma.w));
  oit_store(vec4f(corrected, extinction), in.position);
}
"#;

pub struct NeaFluidPipeline {
    pipeline: wgpu::RenderPipeline,
    vertex_buffer: wgpu::Buffer,
    index_buffer: wgpu::Buffer,
    index_count: u32,
    bind_group: wgpu::BindGroup,
    uniform_buffer: wgpu::Buffer,
    oit: NeaOit,
}

impl NeaFluidPipeline {
    pub fn new(
        device: &wgpu::Device,
        water_bump: &AtlasTexture,
        mesh: &MeshBuffers,
        surface_format: wgpu::TextureFormat,
        depth_format: wgpu::TextureFormat,
        width: u32,
        height: u32,
    ) -> Self {
        let oit = NeaOit::new(device, width, height, surface_format);
        let shader_source = format!("{NEA_FLUID_WGSL}\n{OIT_STORAGE_WGSL}");
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("nea.fluid.shader"),
            source: wgpu::ShaderSource::Wgsl(shader_source.into()),
        });
        let layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("nea.fluid.bind-layout"),
            entries: &[
                texture_entry(0),
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
        let globals = default_globals();
        let uniform_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("nea.fluid.uniforms"),
            contents: bytemuck::cast_slice(&globals),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        });
        let bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("nea.fluid.bind-group"),
            layout: &layout,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: wgpu::BindingResource::TextureView(&water_bump.view),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: wgpu::BindingResource::Sampler(&water_bump.sampler),
                },
                wgpu::BindGroupEntry {
                    binding: 2,
                    resource: uniform_buffer.as_entire_binding(),
                },
            ],
        });
        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("nea.fluid.pipeline-layout"),
            bind_group_layouts: &[Some(&layout), Some(oit.layout())],
            immediate_size: 0,
        });
        let pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("nea.fluid"),
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
        let vertex_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("nea.fluid.vertices"),
            contents: bytemuck::cast_slice(&mesh.vertices),
            usage: wgpu::BufferUsages::VERTEX,
        });
        let index_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("nea.fluid.indices"),
            contents: bytemuck::cast_slice(&mesh.indices),
            usage: wgpu::BufferUsages::INDEX,
        });
        debug_assert_eq!(mesh.vertices.len() % FLOATS_PER_VERTEX, 0);
        Self {
            pipeline,
            vertex_buffer,
            index_buffer,
            index_count: mesh.indices.len() as u32,
            bind_group,
            uniform_buffer,
            oit,
        }
    }

    pub fn set_frame(
        &self,
        queue: &wgpu::Queue,
        mvp: &[f32; 16],
        eye: &[f32; 3],
        now_seconds: f32,
        eye_fluid: Option<[f32; 4]>,
        exposure: f32,
    ) {
        let mut globals = default_globals();
        globals[GLOBALS_MVP_OFFSET..GLOBALS_MVP_OFFSET + 16].copy_from_slice(mvp);
        globals[GLOBALS_EYE_EXPOSURE_OFFSET..GLOBALS_EYE_EXPOSURE_OFFSET + 3].copy_from_slice(eye);
        globals[GLOBALS_EYE_EXPOSURE_OFFSET + 3] = exposure;
        globals[GLOBALS_ATLAS_OFFSET + 2] = now_seconds;
        crate::nea_environment::apply_underwater_globals(&mut globals, eye_fluid);
        queue.write_buffer(&self.uniform_buffer, 0, bytemuck::cast_slice(&globals));
    }

    pub fn draw<'a>(&'a self, pass: &mut wgpu::RenderPass<'a>) {
        if self.index_count == 0 {
            return;
        }
        pass.set_pipeline(&self.pipeline);
        pass.set_bind_group(0, &self.bind_group, &[]);
        pass.set_bind_group(1, self.oit.group(), &[]);
        pass.set_vertex_buffer(0, self.vertex_buffer.slice(..));
        pass.set_index_buffer(self.index_buffer.slice(..), wgpu::IndexFormat::Uint32);
        pass.draw_indexed(0..self.index_count, 0, 0..1);
    }

    pub fn opaque_view(&self) -> &wgpu::TextureView {
        self.oit.opaque_view()
    }

    pub fn oit(&self) -> &NeaOit {
        &self.oit
    }

    pub fn resolve(&self, encoder: &mut wgpu::CommandEncoder, output: &wgpu::TextureView) {
        self.oit.resolve(encoder, output);
    }
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

fn default_globals() -> [f32; GLOBALS_FLOATS] {
    crate::nea_environment::recovered_default_globals(512.0, 16.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn preserved_fluid_shader_parses_without_a_gpu_adapter() {
        let source = format!("{NEA_FLUID_WGSL}\n{OIT_STORAGE_WGSL}");
        wgpu::naga::front::wgsl::parse_str(&source)
            .unwrap_or_else(|error| panic!("NEA fluid WGSL parse failed: {error}"));
    }

    #[test]
    fn preserved_wave_vectors_and_optics_are_present() {
        assert!(NEA_FLUID_WGSL.contains("-0.09034713652888932"));
        assert!(NEA_FLUID_WGSL.contains("optical_depth = 18.0 - 4.0 * height"));
        assert!(NEA_FLUID_WGSL.contains("68.0 / (3.14159265 * 8.0)"));
        assert!(NEA_FLUID_WGSL.contains("0.65 * pow5"));
    }
}
