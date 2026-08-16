//! Recovered NEA opaque voxel-model material and environment shader.

pub const NEA_AVATAR_WGSL: &str = r#"
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
@group(0) @binding(0) var<uniform> globals: Globals;
struct ShadowData {
  enabled_splits: vec4f,
  projection: array<mat4x4<f32>, 4>,
  normal: array<mat4x4<f32>, 4>,
  bounds: array<vec4f, 4>,
};
@group(0) @binding(1) var shadow_map: texture_depth_2d;
@group(0) @binding(2) var shadow_sampler: sampler;
@group(0) @binding(3) var<uniform> shadow_data: ShadowData;
@group(1) @binding(0) var avatar_texture: texture_2d<f32>;
@group(1) @binding(1) var avatar_sampler: sampler;
@group(1) @binding(2) var<uniform> part_pose: mat4x4<f32>;

struct VertexInput {
  @location(0) position: vec3f,
  @location(1) normal: vec3f,
  @location(2) uv: vec2f,
  @location(3) instance_position: vec3f,
  @location(4) instance_scale: f32,
  @location(5) instance_rotation: vec4f,
  @location(6) ambient: vec4f,
};
struct VertexOutput {
  @builtin(position) clip_position: vec4f,
  @location(0) normal: vec3f,
  @location(1) uv: vec2f,
  @location(2) world_position: vec3f,
  @location(3) ambient: vec4f,
};

fn directional_sky(normal: vec3f) -> vec3f {
  let x0 = max(normal.x + 0.25, 0.0);
  let x1 = max(-normal.x + 0.25, 0.0);
  let y0 = max(normal.y + 0.25, 0.0);
  let y1 = max(-normal.y + 0.25, 0.0);
  let z0 = max(normal.z + 0.25, 0.0);
  let z1 = max(-normal.z + 0.25, 0.0);
  let total = x0 + x1 + y0 + y1 + z0 + z1;
  return (x0 * globals.sky_left.rgb + x1 * globals.sky_right.rgb +
    y0 * globals.sky_top.rgb + y1 * globals.sky_bottom.rgb +
    z0 * globals.sky_front.rgb + z1 * globals.sky_back.rgb) / total;
}

fn apply_fog(color: vec3f, position: vec3f) -> vec3f {
  var view = position - globals.eye_exposure.xyz;
  let distance = max(length(view), 0.000001);
  view /= distance;
  let ambient_color = globals.fog_params2.x * directional_sky(view);
  let fog_distance = max(0.0, distance - globals.fog_params.x);
  let fog_height = position.y - globals.fog_params.y;
  let view_y = select(-0.000001, view.y, abs(view.y) > 0.000001);
  let height_extinction = 1.0 - clamp((1.0 / view_y) * (
    exp(globals.fog_params.z * (fog_distance * view.y - fog_height)) -
    exp(-globals.fog_params.z * fog_height)), 0.0, 1.0);
  let uniform_extinction = clamp(exp(-fog_distance * globals.fog_params.w), 0.0, 1.0);
  let fog_amount = min(1.0 - height_extinction * uniform_extinction, globals.fog_params2.z);
  return mix(color, ambient_color * globals.fog_params3.rgb, fog_amount);
}

fn aces_tone_map(color: vec3f) -> vec3f {
  let mapped = (color * (2.51 * color + vec3f(0.03))) /
    (color * (2.43 * color + vec3f(0.59)) + vec3f(0.14));
  return clamp(mapped, vec3f(0.0), vec3f(1.0));
}

fn sample_shadows(world_pos: vec3f, face_normal: vec3f, frag_coord: vec4f) -> f32 {
  let z_depth = frag_coord.z / frag_coord.w;
  let h0 = step(z_depth, shadow_data.enabled_splits.y);
  let h1 = step(z_depth, shadow_data.enabled_splits.z);
  let h2 = step(z_depth, shadow_data.enabled_splits.w);
  let weight = vec4f(h0, (1.0 - h0) * h1, (1.0 - h1) * h2, 1.0 - h2);
  let world_h = vec4f(world_pos, 1.0);
  let sample_clip = weight.x * (shadow_data.projection[0] * world_h) +
    weight.y * (shadow_data.projection[1] * world_h) +
    weight.z * (shadow_data.projection[2] * world_h) +
    weight.w * (shadow_data.projection[3] * world_h);
  let transformed_normal = weight.x * (shadow_data.normal[0] * vec4f(face_normal, 0.0)) +
    weight.y * (shadow_data.normal[1] * vec4f(face_normal, 0.0)) +
    weight.z * (shadow_data.normal[2] * vec4f(face_normal, 0.0)) +
    weight.w * (shadow_data.normal[3] * vec4f(face_normal, 0.0));
  let atlas_bounds = weight.x * shadow_data.bounds[0] + weight.y * shadow_data.bounds[1] +
    weight.z * shadow_data.bounds[2] + weight.w * shadow_data.bounds[3];
  let uv_offset = 0.5 * sample_clip.xy / sample_clip.w + vec2f(0.5);
  let sample_depth = sample_clip.z / sample_clip.w;
  let z_scale = max(-1024.0 * transformed_normal.z, 0.0009765625);
  let bias_x = transformed_normal.x / z_scale;
  let bias_y = transformed_normal.y / z_scale;
  let bias = abs(bias_x) + abs(bias_y);
  let taps = array<vec2f, 16>(
    vec2f(-0.8835609, 2.523391), vec2f(-1.387375, 1.056318),
    vec2f(-2.854452, 1.313645), vec2f(0.6326182, 1.14569),
    vec2f(1.331515, 3.637297), vec2f(-2.175307, 3.885795),
    vec2f(-0.5396664, 4.1938), vec2f(-0.6708734, -0.36875),
    vec2f(-2.083908, -0.6921188), vec2f(-3.219028, 2.85465),
    vec2f(-1.863933, -2.742254), vec2f(-4.125739, -1.283028),
    vec2f(-3.376766, -2.81844), vec2f(-3.974553, 0.5459405),
    vec2f(3.102514, 1.717692), vec2f(2.951887, 3.186624));
  var total = 0.0;
  for (var i = 0; i < 16; i++) {
    let duv = 0.5 * taps[i] * 0.0009765625;
    let uv = atlas_bounds.xy + 0.5 * clamp(uv_offset + duv, vec2f(0.0), vec2f(1.0));
    var depth = textureSampleLevel(shadow_map, shadow_sampler, vec2f(uv.x, 1.0 - uv.y), 0);
    depth += bias - (bias_x * duv.x + bias_y * duv.y);
    depth += abs(depth) * 0.0009765625;
    total += step(sample_depth, depth);
  }
  return total / 16.0;
}

@vertex fn vs_main(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  let q = normalize(input.instance_rotation);
  let posed_position = (part_pose * vec4f(input.position, 1.0)).xyz;
  let posed_normal = (part_pose * vec4f(input.normal, 0.0)).xyz;
  let scaled = posed_position * input.instance_scale;
  let rotated = scaled + 2.0 * cross(q.xyz, cross(q.xyz, scaled) + q.w * scaled);
  let rotated_normal = posed_normal +
    2.0 * cross(q.xyz, cross(q.xyz, posed_normal) + q.w * posed_normal);
  let world = rotated + input.instance_position;
  output.clip_position = globals.mvp * vec4f(world, 1.0);
  output.normal = rotated_normal;
  output.uv = input.uv;
  output.world_position = world;
  output.ambient = input.ambient;
  return output;
}

@fragment fn fs_main(input: VertexOutput) -> @location(0) vec4f {
  let rgbe = textureSample(avatar_texture, avatar_sampler, input.uv);
  let normal = normalize(input.normal);
  let normal_light = clamp(dot(normal, globals.light_direction_gamma.xyz), 0.0, 1.0);
  let face_shadow = step(0.0, dot(normal, globals.light_direction_gamma.xyz));
  var shadow = face_shadow * input.ambient.a;
  if (shadow_data.enabled_splits.x > 0.0) {
    shadow = face_shadow * sample_shadows(input.world_position, normal, input.clip_position);
  }
  let direct = (normal_light * shadow * (1.0 - globals.light_color_global.w) +
    globals.light_color_global.w) * globals.light_color_global.rgb;
  let irradiance = 100.0 * input.ambient.rgb + input.ambient.a * directional_sky(normal);
  // The preserved opaque pass clips on a separate per-vertex alpha value.
  // Texture alpha is PBR data, so it must not control fragment coverage.
  // Emissive remains disabled until model.pbrMod is carried by this pipeline.
  let emissive = 0.0;
  let shaded = rgbe.rgb * (direct + irradiance + 400.0 * emissive);
  let fogged = apply_fog(shaded, input.world_position);
  let mapped = aces_tone_map(globals.eye_exposure.w * fogged);
  // 原版 outputFragment：pow(rgb, 1/gamma)，environment.gamma 默认 1.3 →
  // pow(x, 1/1.3)≈pow(x,0.769)（提亮方向）。sRGB surface 上最终显示 = shader
  // 输出值，故与地形/水统一用 1/1.3（此前 pow(2.2) 压暗方向相反）。
  // Debug view（与地形 F1-F6 同步，存 atlas_params.w）：人物也响应
  let dbg = globals.atlas_params.w;
  if (dbg > 3.5) {
    // F4+: 纯 shadow map 采样（不含 face_shadow/ambient.a），区分阴影来源
    let sm = sample_shadows(input.world_position, normal, input.clip_position);
    return vec4f(vec3f(sm), 1.0);
  }
  if (dbg > 2.5) { return vec4f(irradiance / 400.0, 1.0); }   // F3: Ambient/Sky
  if (dbg > 1.5) { return vec4f(direct / 500.0, 1.0); }       // F2: Direct
  if (dbg > 0.5) { return vec4f(rgbe.rgb, 1.0); }             // F1: Albedo
  return vec4f(pow(mapped, vec3f(1.0 / 1.3)), 1.0);            // F6: Final
}
"#;

pub const NEA_AVATAR_SHADOW_WGSL: &str = r#"
struct ShadowCamera { view_projection: mat4x4<f32> };
@group(0) @binding(0) var<uniform> camera: ShadowCamera;
@group(1) @binding(2) var<uniform> part_pose: mat4x4<f32>;

struct VertexInput {
  @location(0) position: vec3f,
  @location(3) instance_position: vec3f,
  @location(4) instance_scale: f32,
  @location(5) instance_rotation: vec4f,
};

@vertex fn vs_main(input: VertexInput) -> @builtin(position) vec4f {
  let q = normalize(input.instance_rotation);
  let posed_position = (part_pose * vec4f(input.position, 1.0)).xyz;
  let scaled = posed_position * input.instance_scale;
  let rotated = scaled + 2.0 * cross(q.xyz, cross(q.xyz, scaled) + q.w * scaled);
  return camera.view_projection * vec4f(rotated + input.instance_position, 1.0);
}
"#;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn avatar_uses_recovered_opaque_material_path() {
        assert!(!NEA_AVATAR_WGSL.contains("if (rgbe.a < 0.5)"));
        assert!(NEA_AVATAR_WGSL.contains("Texture alpha is PBR data"));
        // 已清理：不再有 direct_corrected 调试残留（忽略 fog）
        assert!(!NEA_AVATAR_WGSL.contains("direct_corrected"));
        assert!(NEA_AVATAR_WGSL.contains("normal_light * shadow"));
        assert!(NEA_AVATAR_WGSL.contains("let emissive = 0.0"));
        assert!(NEA_AVATAR_WGSL.contains("input.ambient.a"));
        assert!(NEA_AVATAR_WGSL.contains("aces_tone_map"));
        assert!(NEA_AVATAR_WGSL.contains("fn sample_shadows"));
        // sRGB surface：输出 pow(A, 1/1.3) 与地形/水统一（原版 gamma=1.3）
        assert!(NEA_AVATAR_WGSL.contains("pow(mapped, vec3f(1.0 / 1.3))"));
        let module = wgpu::naga::front::wgsl::parse_str(NEA_AVATAR_WGSL)
            .unwrap_or_else(|error| panic!("avatar WGSL parse failed: {error}"));
        wgpu::naga::valid::Validator::new(
            wgpu::naga::valid::ValidationFlags::all(),
            wgpu::naga::valid::Capabilities::all(),
        )
        .validate(&module)
        .unwrap_or_else(|error| panic!("avatar WGSL validation failed: {error:#?}"));
        let shadow_module = wgpu::naga::front::wgsl::parse_str(NEA_AVATAR_SHADOW_WGSL)
            .unwrap_or_else(|error| panic!("avatar shadow WGSL parse failed: {error}"));
        wgpu::naga::valid::Validator::new(
            wgpu::naga::valid::ValidationFlags::all(),
            wgpu::naga::valid::Capabilities::all(),
        )
        .validate(&shadow_module)
        .unwrap_or_else(|error| panic!("avatar shadow WGSL validation failed: {error}"));
    }
}
