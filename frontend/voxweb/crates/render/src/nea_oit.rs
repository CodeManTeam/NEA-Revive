//! Three-band per-pixel linked-list OIT recovered from the NEA WebGPU renderer.

use wgpu::util::DeviceExt;

const NODE_BYTES: u64 = 12;
const NODES_PER_PIXEL: u64 = 10;
const BAND_COUNT: usize = 3;

#[repr(C)]
#[derive(Clone, Copy, bytemuck::Pod, bytemuck::Zeroable)]
struct OitUniform {
    viewport: [f32; 2],
    node_buffer_bytes: f32,
    _padding: f32,
}

pub struct NeaOit {
    #[allow(dead_code)]
    device: wgpu::Device,
    #[allow(dead_code)]
    width: u32,
    #[allow(dead_code)]
    height: u32,
    #[allow(dead_code)]
    opaque_texture: wgpu::Texture,
    opaque_view: wgpu::TextureView,
    #[allow(dead_code)]
    nodes: [wgpu::Buffer; BAND_COUNT],
    offsets: [wgpu::Buffer; BAND_COUNT],
    layout: wgpu::BindGroupLayout,
    group: wgpu::BindGroup,
    resolve_pipeline: wgpu::RenderPipeline,
    background_layout: wgpu::BindGroupLayout,
}

impl NeaOit {
    pub fn new(
        device: &wgpu::Device,
        width: u32,
        height: u32,
        surface_format: wgpu::TextureFormat,
    ) -> Self {
        let width = width.max(1);
        let height = height.max(1);
        let per_height = height.div_ceil(3);
        let requested_node_bytes = width as u64 * per_height as u64 * NODE_BYTES * NODES_PER_PIXEL;
        let node_bytes = requested_node_bytes
            .min(device.limits().max_storage_buffer_binding_size as u64)
            .max(NODE_BYTES);
        let offset_bytes = (4 + width as u64 * per_height as u64 * 4).max(4);
        let nodes = std::array::from_fn(|band| {
            device.create_buffer(&wgpu::BufferDescriptor {
                label: Some(&format!("nea.oit.nodes.{band}")),
                size: node_bytes,
                usage: wgpu::BufferUsages::STORAGE,
                mapped_at_creation: false,
            })
        });
        let offsets = std::array::from_fn(|band| {
            device.create_buffer(&wgpu::BufferDescriptor {
                label: Some(&format!("nea.oit.offsets.{band}")),
                size: offset_bytes,
                usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_DST,
                mapped_at_creation: false,
            })
        });
        let opaque_texture = device.create_texture(&wgpu::TextureDescriptor {
            label: Some("nea.oit.opaque"),
            size: wgpu::Extent3d {
                width,
                height,
                depth_or_array_layers: 1,
            },
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: surface_format,
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT | wgpu::TextureUsages::TEXTURE_BINDING,
            view_formats: &[],
        });
        let opaque_view = opaque_texture.create_view(&wgpu::TextureViewDescriptor::default());
        let uniform = OitUniform {
            viewport: [width as f32, height as f32],
            node_buffer_bytes: node_bytes as f32,
            _padding: 0.0,
        };
        let uniform_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("nea.oit.uniform"),
            contents: bytemuck::bytes_of(&uniform),
            usage: wgpu::BufferUsages::UNIFORM,
        });
        let layout = create_oit_layout(device);
        let group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("nea.oit.group"),
            layout: &layout,
            entries: &[
                buffer_entry(0, &uniform_buffer),
                buffer_entry(1, &nodes[0]),
                buffer_entry(2, &offsets[0]),
                buffer_entry(3, &nodes[1]),
                buffer_entry(4, &offsets[1]),
                buffer_entry(5, &nodes[2]),
                buffer_entry(6, &offsets[2]),
            ],
        });
        let background_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("nea.oit.background-layout"),
            entries: &[
                wgpu::BindGroupLayoutEntry {
                    binding: 0,
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty: wgpu::BindingType::Texture {
                        sample_type: wgpu::TextureSampleType::Float { filterable: false },
                        view_dimension: wgpu::TextureViewDimension::D2,
                        multisampled: false,
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
            ],
        });
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("nea.oit.resolve-shader"),
            source: wgpu::ShaderSource::Wgsl(OIT_RESOLVE_WGSL.into()),
        });
        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("nea.oit.resolve-layout"),
            bind_group_layouts: &[Some(&background_layout), Some(&layout)],
            immediate_size: 0,
        });
        let resolve_pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("nea.oit.resolve"),
            layout: Some(&pipeline_layout),
            vertex: wgpu::VertexState {
                module: &shader,
                entry_point: Some("vs_main"),
                compilation_options: Default::default(),
                buffers: &[],
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
            primitive: Default::default(),
            depth_stencil: None,
            multisample: Default::default(),
            multiview_mask: None,
            cache: None,
        });
        Self {
            device: device.clone(),
            width,
            height,
            opaque_texture,
            opaque_view,
            nodes,
            offsets,
            layout,
            group,
            resolve_pipeline,
            background_layout,
        }
    }

    pub fn layout(&self) -> &wgpu::BindGroupLayout {
        &self.layout
    }
    pub fn group(&self) -> &wgpu::BindGroup {
        &self.group
    }
    pub fn opaque_view(&self) -> &wgpu::TextureView {
        &self.opaque_view
    }

    pub fn resolve(
        &self,
        encoder: &mut wgpu::CommandEncoder,
        output: &wgpu::TextureView,
        depth: &wgpu::TextureView,
    ) {
        let background = self.device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("nea.oit.background-depth-group"),
            layout: &self.background_layout,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: wgpu::BindingResource::TextureView(&self.opaque_view),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: wgpu::BindingResource::TextureView(depth),
                },
            ],
        });
        {
            let mut pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("nea.oit.resolve"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: output,
                    resolve_target: None,
                    depth_slice: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(wgpu::Color::BLACK),
                        store: wgpu::StoreOp::Store,
                    },
                })],
                depth_stencil_attachment: None,
                timestamp_writes: None,
                occlusion_query_set: None,
                multiview_mask: None,
            });
            pass.set_pipeline(&self.resolve_pipeline);
            pass.set_bind_group(0, &background, &[]);
            pass.set_bind_group(1, &self.group, &[]);
            pass.draw(0..3, 0..1);
        }
        for offsets in &self.offsets {
            encoder.clear_buffer(offsets, 0, None);
        }
    }
}

fn create_oit_layout(device: &wgpu::Device) -> wgpu::BindGroupLayout {
    let mut entries = vec![wgpu::BindGroupLayoutEntry {
        binding: 0,
        visibility: wgpu::ShaderStages::FRAGMENT,
        ty: wgpu::BindingType::Buffer {
            ty: wgpu::BufferBindingType::Uniform,
            has_dynamic_offset: false,
            min_binding_size: None,
        },
        count: None,
    }];
    for binding in 1..=6 {
        entries.push(wgpu::BindGroupLayoutEntry {
            binding,
            visibility: wgpu::ShaderStages::FRAGMENT,
            ty: wgpu::BindingType::Buffer {
                ty: wgpu::BufferBindingType::Storage { read_only: false },
                has_dynamic_offset: false,
                min_binding_size: None,
            },
            count: None,
        });
    }
    device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
        label: Some("nea.oit.layout"),
        entries: &entries,
    })
}

fn buffer_entry<'a>(binding: u32, buffer: &'a wgpu::Buffer) -> wgpu::BindGroupEntry<'a> {
    wgpu::BindGroupEntry {
        binding,
        resource: buffer.as_entire_binding(),
    }
}

pub const OIT_STORAGE_WGSL: &str = r#"
struct OitUniform { viewport: vec2f, node_buffer_bytes: f32, padding: f32 }
struct FragmentData { color: u32, depth: f32 }
struct StaticNode { data: FragmentData, next: u32 }
@group(1) @binding(0) var<uniform> oit: OitUniform;
@group(1) @binding(1) var<storage, read_write> nodes0: array<StaticNode>;
@group(1) @binding(2) var<storage, read_write> offsets0: array<atomic<u32>>;
@group(1) @binding(3) var<storage, read_write> nodes1: array<StaticNode>;
@group(1) @binding(4) var<storage, read_write> offsets1: array<atomic<u32>>;
@group(1) @binding(5) var<storage, read_write> nodes2: array<StaticNode>;
@group(1) @binding(6) var<storage, read_write> offsets2: array<atomic<u32>>;
fn pack_color(color: vec4f) -> u32 {
  return u32(color.r * 255.0) | (u32(color.g * 255.0) << 8u) |
    (u32(color.b * 255.0) << 16u) | (u32(color.a * 255.0) << 24u);
}
fn oit_store(color: vec4f, position: vec4f) {
  if (color.a < 1.0 / 255.0) { return; }
  let per_h = u32(oit.viewport.y) / 3u;
  let max_nodes = u32(oit.node_buffer_bytes) / 12u;
  if (u32(position.y) < per_h) {
    // Index zero is the linked-list null sentinel.
    let index = atomicAdd(&offsets0[0], 1u) + 1u;
    if (index >= max_nodes) { return; }
    let pointer = u32(position.x) + u32(oit.viewport.x) * u32(position.y);
    nodes0[index] = StaticNode(FragmentData(pack_color(color), position.z), atomicExchange(&offsets0[pointer + 1u], index));
  } else if (u32(position.y) < per_h * 2u) {
    let index = atomicAdd(&offsets1[0], 1u) + 1u;
    if (index >= max_nodes) { return; }
    let pointer = u32(position.x) + u32(oit.viewport.x) * (u32(position.y) - per_h);
    nodes1[index] = StaticNode(FragmentData(pack_color(color), position.z), atomicExchange(&offsets1[pointer + 1u], index));
  } else {
    let index = atomicAdd(&offsets2[0], 1u) + 1u;
    if (index >= max_nodes) { return; }
    let pointer = u32(position.x) + u32(oit.viewport.x) * (u32(position.y) - per_h * 2u);
    nodes2[index] = StaticNode(FragmentData(pack_color(color), position.z), atomicExchange(&offsets2[pointer + 1u], index));
  }
}
"#;

const OIT_RESOLVE_WGSL: &str = r#"
struct OitUniform { viewport: vec2f, node_buffer_bytes: f32, padding: f32 }
struct FragmentData { color: u32, depth: f32 }
struct StaticNode { data: FragmentData, next: u32 }
@group(0) @binding(0) var background: texture_2d<f32>;
@group(0) @binding(1) var background_depth: texture_depth_2d;
@group(1) @binding(0) var<uniform> oit: OitUniform;
@group(1) @binding(1) var<storage, read_write> nodes0: array<StaticNode>;
@group(1) @binding(2) var<storage, read_write> offsets0: array<atomic<u32>>;
@group(1) @binding(3) var<storage, read_write> nodes1: array<StaticNode>;
@group(1) @binding(4) var<storage, read_write> offsets1: array<atomic<u32>>;
@group(1) @binding(5) var<storage, read_write> nodes2: array<StaticNode>;
@group(1) @binding(6) var<storage, read_write> offsets2: array<atomic<u32>>;
@vertex fn vs_main(@builtin(vertex_index) index: u32) -> @builtin(position) vec4f {
  let x = f32((index << 1u) & 2u); let y = f32(index & 2u);
  return vec4f(x * 2.0 - 1.0, 1.0 - y * 2.0, 0.0, 1.0);
}
fn unpack_color(value: u32) -> vec4f {
  return vec4f(f32(value & 255u), f32((value >> 8u) & 255u), f32((value >> 16u) & 255u), f32(value >> 24u)) / 255.0;
}
@fragment fn fs_main(@builtin(position) position: vec4f) -> @location(0) vec4f {
  let pixel = vec2u(position.xy);
  var color = textureLoad(background, pixel, 0);
  let opaque_depth = textureLoad(background_depth, pixel, 0);
  let per_h = u32(oit.viewport.y) / 3u;
  let band = min(u32(position.y) / max(per_h, 1u), 2u);
  let local_y = u32(position.y) - band * per_h;
  let pointer = u32(position.x) + u32(oit.viewport.x) * local_y + 1u;
  var offset = select(atomicLoad(&offsets0[pointer]), atomicLoad(&offsets1[pointer]), band == 1u);
  offset = select(offset, atomicLoad(&offsets2[pointer]), band == 2u);
  var indices: array<u32, 16>;
  var count = 0u;
  while (offset > 0u && count < 16u) {
    indices[count] = offset; count++;
    var next = select(nodes0[offset].next, nodes1[offset].next, band == 1u);
    offset = select(next, nodes2[offset].next, band == 2u);
  }
  for (var i = 1u; i < count; i++) {
    var j = i;
    while (j > 0u) {
      let left = indices[j - 1u]; let right = indices[j];
      var ld = select(nodes0[left].data.depth, nodes1[left].data.depth, band == 1u);
      ld = select(ld, nodes2[left].data.depth, band == 2u);
      var rd = select(nodes0[right].data.depth, nodes1[right].data.depth, band == 1u);
      rd = select(rd, nodes2[right].data.depth, band == 2u);
      if (ld >= rd) { break; }
      indices[j - 1u] = right; indices[j] = left; j--;
    }
  }
  for (var i = 0u; i < count; i++) {
    let index = indices[i];
    var packed = select(nodes0[index].data.color, nodes1[index].data.color, band == 1u);
    packed = select(packed, nodes2[index].data.color, band == 2u);
    var fragment_depth = select(nodes0[index].data.depth, nodes1[index].data.depth, band == 1u);
    fragment_depth = select(fragment_depth, nodes2[index].data.depth, band == 2u);
    if (fragment_depth <= opaque_depth) {
      let rgba = unpack_color(packed);
      color = vec4f(color.rgb * (1.0 - rgba.a) + rgba.rgb * rgba.a, color.a);
    }
  }
  return color;
}
"#;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn recovered_oit_shaders_parse() {
        wgpu::naga::front::wgsl::parse_str(OIT_STORAGE_WGSL).expect("storage shader");
        wgpu::naga::front::wgsl::parse_str(OIT_RESOLVE_WGSL).expect("resolve shader");
    }

    #[test]
    fn recovered_allocation_uses_ten_twelve_byte_nodes_per_band_pixel() {
        assert_eq!(NODE_BYTES * NODES_PER_PIXEL, 120);
        assert_eq!(1080u32.div_ceil(3), 360);
    }

    #[test]
    fn oit_reserves_zero_as_the_null_node() {
        assert_eq!(OIT_STORAGE_WGSL.matches("atomicAdd(&offsets").count(), 3);
        assert_eq!(OIT_STORAGE_WGSL.matches("1u) + 1u").count(), 3);
    }

    #[test]
    fn resolve_rejects_transparency_behind_opaque_depth() {
        assert!(OIT_RESOLVE_WGSL.contains("texture_depth_2d"));
        assert!(OIT_RESOLVE_WGSL.contains("fragment_depth <= opaque_depth"));
    }
}
