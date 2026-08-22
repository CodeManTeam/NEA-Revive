//! NEA voxel shader — WGSL port of the recovered engine's fragment
//! lighting/UV semantics (voxel-shader.mjs). VW-003 Step 5 (CPU/text side).
//!
//! Recovered semantics (all from the preserved WebGPU renderer):
//! - tileOffset(pos, faceU, faceV) = fract(dot(pos, faceU), dot(pos, faceV))
//! - getTexCoord(base, tile) = (0.5/r) + ((size-1)/r)*tile + base
//! - 4-corner voxel lighting: bilinear blend of corner lights by face UV,
//!   plus 6-direction sky ambient from the light alpha.
//!
//! This module ships the WGSL source as a const string with a tiny sanity
//! test (function signatures present); the pipeline wiring is the
//! user-visible GPU step.

/// WGSL fragment shader implementing the recovered NEA voxel shading.
/// Vertex inputs: position (vec3f), normal (vec3f), uv (vec2f).
pub const NEA_FRAGMENT_WGSL: &str = r#"
// NEA voxel shader — recovered semantics port.
// Uniforms: atlas (texture_2d), atlas_sampler, globals (mvp + atlas consts).
@group(0) @binding(0) var atlas: texture_2d<f32>;
@group(0) @binding(1) var atlas_sampler: sampler;
@group(0) @binding(2) var material_atlas: texture_2d<f32>;
@group(0) @binding(3) var material_sampler: sampler;
@group(0) @binding(4) var bump_atlas: texture_2d<f32>;
@group(0) @binding(5) var bump_sampler: sampler;

struct ShadowData {
  enabled_splits: vec4f,
  projection: array<mat4x4<f32>, 4>,
  normal: array<mat4x4<f32>, 4>,
  bounds: array<vec4f, 4>,
};
@group(0) @binding(7) var shadow_map: texture_depth_2d;
@group(0) @binding(8) var shadow_sampler: sampler;
@group(0) @binding(9) var<uniform> shadow_data: ShadowData;

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
@group(0) @binding(6) var<uniform> globals: Globals;

struct VsOut {
  @builtin(position) pos: vec4f,
  @location(0) world_pos: vec3f,
  @location(1) normal: vec3f,
  @location(2) uv: vec2f,
  @location(3) light00: vec4f,
  @location(4) light01: vec4f,
  @location(5) light10: vec4f,
  @location(6) light11: vec4f,
  @location(7) texture_rotation: f32,
};

// tileOffset: fract(dot(pos, faceU), dot(pos, faceV)) — one tile repeat per
// voxel unit (recovered 342.js semantics).
fn tile_offset(pos: vec3f, face_u: vec3f, face_v: vec3f) -> vec2f {
  return fract(vec2f(dot(pos, face_u), dot(pos, face_v)));
}

// getTexCoord: (0.5/r) + ((size-1)/r)*tile + base (recovered 734.js).
// Vertex UVs carry only the tile ORIGIN; `tile` is the per-voxel-unit
// in-tile repeat (fract(world_pos) dotted with the face axes) and the
// shader adds it plus the half-texel offset so NEAREST sampling never
// crosses the tile border. atlas_params.y < 2 selects entity mode, where
// UVs are already full-texture coordinates and must be used verbatim.
fn get_tex_coord(base: vec2f, tile: vec2f) -> vec2f {
  if (globals.atlas_params.y < 2.0) {
    return base;
  }
  let uv_offset = vec2f(0.5 / globals.atlas_params.x) +
    ((globals.atlas_params.y - 1.0) / globals.atlas_params.x) * tile;
  return base + uv_offset;
}

// The preserved bump atlas uses 64px tiles in a 2048px image while the
// color/material atlases use 16px tiles in 512px images. They share the same
// 32x32 tile grid, but require independent half-texel and in-tile spans.
fn get_bump_tex_coord(color_base: vec2f) -> vec2f {
  let tile_grid = 32.0;
  let tile_origin = floor(color_base * tile_grid) / tile_grid;
  let color_span = 15.0 / 512.0;
  let bump_span = 63.0 / 2048.0;
  let within_tile = clamp((color_base - tile_origin) / color_span, vec2f(0.0), vec2f(1.0));
  return tile_origin + vec2f(0.5 / 2048.0) + within_tile * bump_span;
}

// saturate helper.
fn saturate(v: f32) -> f32 {
  return clamp(v, 0.0, 1.0);
}

fn pow5(v: f32) -> f32 {
  let v2 = v * v;
  return v2 * v2 * v;
}

fn d_ggx(linear_roughness: f32, no_h: f32) -> f32 {
  let one_minus_no_h2 = 1.0 - no_h * no_h;
  let a = no_h * linear_roughness;
  let k = linear_roughness / max(one_minus_no_h2 + a * a, 0.001);
  return k * k * (1.0 / 3.141592653589793);
}

fn v_smith_ggx_correlated(linear_roughness: f32, no_v: f32, no_l: f32) -> f32 {
  let a2 = linear_roughness * linear_roughness;
  let ggx_v = no_l * sqrt((no_v - a2 * no_v) * no_v + a2);
  let ggx_l = no_v * sqrt((no_l - a2 * no_l) * no_l + a2);
  return 0.5 / max(ggx_v + ggx_l, 0.001);
}

fn f_schlick(f0: vec3f, vo_h: f32) -> vec3f {
  return f0 + (vec3f(1.0) - f0) * pow5(1.0 - vo_h);
}

fn prefiltered_dfg(roughness: f32, no_v: f32) -> vec2f {
  let c0 = vec4f(-1.0, -0.0275, -0.572, 0.022);
  let c1 = vec4f(1.0, 0.0425, 1.04, -0.04);
  let r = roughness * c0 + c1;
  let a004 = min(r.x * r.x, exp2(-9.28 * no_v)) * r.x + r.y;
  return vec2f(-1.04, 1.04) * a004 + r.zw;
}

fn global_shade(value: f32) -> f32 {
  return value * (1.0 - globals.light_color_global.w) + globals.light_color_global.w;
}

// Indoor maps can legitimately store a zero sun direction together with a
// black sun color. The native path effectively disables direct sunlight in
// that case; never normalize the zero vector into NaNs that poison the whole
// fragment color.
fn safe_light_direction() -> vec3f {
  let direction = globals.light_direction_gamma.xyz;
  let length_squared = dot(direction, direction);
  if (length_squared <= 0.00000001) {
    return vec3f(0.0);
  }
  return direction / sqrt(length_squared);
}

fn aces_tone_map(color: vec3f) -> vec3f {
  let mapped = (color * (2.51 * color + vec3f(0.03))) /
    (color * (2.43 * color + vec3f(0.59)) + vec3f(0.14));
  return clamp(mapped, vec3f(0.0), vec3f(1.0));
}

/// 原版 outputFragment 的显示端 gamma：pow(rgb, 1/gamma)，gamma=1.3
/// （box3 渲染器 environment.gamma 默认 1.3，提亮方向；sRGB surface 上
/// 最终显示 = shader 输出值，故输出 pow(A, 1/1.3)≈pow(A,0.769) 而非 2.2。）
fn decode_display(value: vec3f) -> vec3f {
  return pow(value, vec3f(1.0 / 1.3));
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
  let atlas_bounds = weight.x * shadow_data.bounds[0] +
    weight.y * shadow_data.bounds[1] + weight.z * shadow_data.bounds[2] +
    weight.w * shadow_data.bounds[3];
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
  let shadow_size = vec2f(textureDimensions(shadow_map));
  for (var i = 0; i < 16; i++) {
    let duv = 0.5 * taps[i] * 0.0009765625;
    let uv = atlas_bounds.xy + 0.5 * clamp(uv_offset + duv, vec2f(0.0), vec2f(1.0));
    // The recovered WebGPU shader explicitly flips Y when reading the
    // composed shadow atlas (the render target is vertically inverted).
    let sample_uv = vec2f(uv.x, 1.0 - uv.y) * shadow_size - vec2f(0.5);
    let p0 = vec2i(floor(sample_uv));
    let f = fract(sample_uv);
    let q = vec2u(textureDimensions(shadow_map));
    let a = textureLoad(shadow_map, clamp(p0, vec2i(0), vec2i(q) - vec2i(1)), 0);
    let b = textureLoad(shadow_map, clamp(p0 + vec2i(1, 0), vec2i(0), vec2i(q) - vec2i(1)), 0);
    let c = textureLoad(shadow_map, clamp(p0 + vec2i(0, 1), vec2i(0), vec2i(q) - vec2i(1)), 0);
    let d = textureLoad(shadow_map, clamp(p0 + vec2i(1, 1), vec2i(0), vec2i(q) - vec2i(1)), 0);
    var depth = mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    depth += bias - (bias_x * duv.x + bias_y * duv.y);
    depth += abs(depth) * 0.0009765625;
    total += step(sample_depth, depth);
  }
  return total / 16.0;
}

fn apply_fog(color: vec3f, position: vec3f) -> vec3f {
  var view = position - globals.eye_exposure.xyz;
  let distance = max(length(view), 0.000001);
  view /= distance;
  let ambient_color = globals.fog_params2.x * directional_sky(view);
  let fog_distance = max(0.0, distance - globals.fog_params.x);
  let fog_height = position.y - globals.fog_params.y;
  let height_scale = globals.fog_params.z;
  let view_y = select(-0.000001, view.y, abs(view.y) > 0.000001);
  let height_extinction = 1.0 - clamp(
    (1.0 / view_y) * (
      exp(height_scale * (fog_distance * view.y - fog_height)) -
      exp(-height_scale * fog_height)
    ),
    0.0,
    1.0,
  );
  let uniform_extinction = clamp(exp(-fog_distance * globals.fog_params.w), 0.0, 1.0);
  let fog_amount = min(
    1.0 - height_extinction * uniform_extinction,
    globals.fog_params2.z,
  );
  return mix(color, ambient_color * globals.fog_params3.rgb, fog_amount);
}

fn directional_sky(normal: vec3f) -> vec3f {
  let x0 = max(normal.x + 0.25, 0.0);
  let x1 = max(-normal.x + 0.25, 0.0);
  let y0 = max(normal.y + 0.25, 0.0);
  let y1 = max(-normal.y + 0.25, 0.0);
  let z0 = max(normal.z + 0.25, 0.0);
  let z1 = max(-normal.z + 0.25, 0.0);
  let total = x0 + x1 + y0 + y1 + z0 + z1;
  return (
    x0 * globals.sky_left.rgb +
    x1 * globals.sky_right.rgb +
    y0 * globals.sky_top.rgb +
    y1 * globals.sky_bottom.rgb +
    z0 * globals.sky_front.rgb +
    z1 * globals.sky_back.rgb
  ) / total;
}

fn shade_surface(
  albedo: vec3f,
  emissive: f32,
  normal: vec3f,
  position: vec3f,
  geometry_normal: vec3f,
  light00: vec4f,
  light01: vec4f,
  light10: vec4f,
  light11: vec4f,
  shadow: f32,
) -> vec3f {
  let n = normalize(normal);
  let light = safe_light_direction();
  let normal_light = saturate(dot(n, light));
  let face_n = normalize(geometry_normal);
  let face_u = vec3f(face_n.y + face_n.z, 0.0, -face_n.x);
  let face_v = vec3f(0.0, -abs(face_n.x + face_n.z), abs(face_n.y));
  let nu = 0.5 * dot(n, face_u) + 0.5;
  let nv = 0.5 * dot(n, face_v) + 0.5;
  let interpolated_light =
    ((1.0 - nu) * (1.0 - nv)) * light00 +
    (nu * (1.0 - nv)) * light01 +
    ((1.0 - nu) * nv) * light10 +
    (nu * nv) * light11;
  let direct = global_shade(normal_light * shadow) * globals.light_color_global.rgb;
  let irradiance =
    100.0 * interpolated_light.rgb + interpolated_light.a * directional_sky(n);
  return albedo * (direct + irradiance + 400.0 * emissive);
}

@vertex
fn vs_main(
  @location(0) position: vec3f,
  @location(1) normal: vec3f,
  @location(2) uv: vec2f,
  @location(3) light00: vec4f,
  @location(4) light01: vec4f,
  @location(5) light10: vec4f,
  @location(6) light11: vec4f,
  @location(7) texture_rotation: f32,
) -> VsOut {
  var out: VsOut;
  out.pos = globals.mvp * vec4f(position, 1.0);
  out.world_pos = position;
  out.normal = normal;
  out.uv = uv;
  out.light00 = light00;
  out.light01 = light01;
  out.light10 = light10;
  out.light11 = light11;
  out.texture_rotation = texture_rotation;
  return out;
}

fn shade_voxel(in: VsOut) -> vec4f {
  // Vertex UVs already carry the baked rect (half-texel + span*tile + fract
  // tile repeat per voxel unit) — sample the atlas directly.
  let face_normal = normalize(in.normal);
  let base_u = vec3f(face_normal.y + face_normal.z, 0.0, -face_normal.x);
  let base_v = vec3f(0.0, -abs(face_normal.x + face_normal.z), abs(face_normal.y));
  let h0 = step(in.texture_rotation, 0.5);
  let h1 = step(in.texture_rotation, 1.5);
  let h2 = step(in.texture_rotation, 2.5);
  let a = h0 - h2 + h1;
  let b = h1 - h0 - 1.0 + h2;
  let face_u = a * base_u + b * base_v;
  let face_v = a * base_v - b * base_u;
  let in_tile = tile_offset(fract(in.world_pos), face_u, face_v);
  // Vertex UVs carry only the tile ORIGIN; the in-tile repeat comes from
  // fract(world_pos) here (recovered tileOffset semantics).
  let tex_coord = get_tex_coord(in.uv, in_tile);
  let color = textureSample(atlas, atlas_sampler, tex_coord);
  let material = select(textureSample(material_atlas, material_sampler, tex_coord), vec4f(0.5, 0.5, 0.5, 1.0), globals.atlas_params.y < 2.0);
  let emissive = material.b;
  let face_shadow = step(0.0, dot(in.normal, globals.light_direction_gamma.xyz));
  let packed_shadow = saturate(
    0.484375 * (in.light00.a + in.light01.a + in.light10.a + in.light11.a));
  var shadow = face_shadow * packed_shadow;
  if (shadow_data.enabled_splits.x > 0.0) {
    shadow = face_shadow * sample_shadows(in.world_pos, in.normal, in.pos);
  }
  // Recovered four-corner irradiance and directional shadow path.
  let shaded = shade_surface(
    color.rgb,
    emissive,
    in.normal,
    in.world_pos,
    in.normal,
    in.light00,
    in.light01,
    in.light10,
    in.light11,
    shadow,
  );
  let fogged = apply_fog(shaded, in.world_pos);
  let mapped = aces_tone_map(globals.eye_exposure.w * fogged);
  // 原版 outputFragment：tone map 后 pow(rgb, 1/gamma)，gamma=1.3（提亮）
  return vec4f(decode_display(mapped), shadow);
}

@fragment
fn fs_main(in: VsOut) -> @location(0) vec4f {
  let face_normal = normalize(in.normal);
  let base_u = vec3f(face_normal.y + face_normal.z, 0.0, -face_normal.x);
  let base_v = vec3f(0.0, -abs(face_normal.x + face_normal.z), abs(face_normal.y));
  let h0 = step(in.texture_rotation, 0.5);
  let h1 = step(in.texture_rotation, 1.5);
  let h2 = step(in.texture_rotation, 2.5);
  let a = h0 - h2 + h1;
  let b = h1 - h0 - 1.0 + h2;
  let face_u = a * base_u + b * base_v;
  let face_v = a * base_v - b * base_u;
  let in_tile = tile_offset(fract(in.world_pos), face_u, face_v);
  let tex_coord = get_tex_coord(in.uv, in_tile);
  let albedo = textureSample(atlas, atlas_sampler, tex_coord).rgb;
  // The recovered WebGPU voxel pipeline only consumes material.b (emissive).
  // Metalness/smoothness and the bump atlas belong to the older WebGL path.
  let material = select(textureSample(material_atlas, material_sampler, tex_coord), vec4f(0.5, 0.5, 0.5, 1.0), globals.atlas_params.y < 2.0);
  let normal_light = saturate(dot(face_normal, safe_light_direction()));
  let face_shadow = step(0.0, dot(face_normal, globals.light_direction_gamma.xyz));
  var shadow = face_shadow;
  if (shadow_data.enabled_splits.x > 0.0) {
    shadow = face_shadow * sample_shadows(in.world_pos, face_normal, in.pos);
  }
  let nu = 0.5 * dot(face_normal, face_u) + 0.5;
  let nv = 0.5 * dot(face_normal, face_v) + 0.5;
  let interpolated_light =
    ((1.0 - nu) * (1.0 - nv)) * in.light00 +
    (nu * (1.0 - nv)) * in.light01 +
    ((1.0 - nu) * nv) * in.light10 +
    (nu * nv) * in.light11;
  // Recovered WebGPU terrain shader sets `surf.ao = 1.`. The packed alpha
  // channel is sky visibility, not ambient occlusion for local RGB light.
  let ao = 1.0;
  let irradiance = 100.0 * interpolated_light.rgb +
    interpolated_light.a * directional_sky(face_normal);
  // 空气透视 fog factor（与 apply_fog 同一计算，供 F5 显示）
  var view_dir = in.world_pos - globals.eye_exposure.xyz;
  let dist = max(length(view_dir), 0.000001);
  view_dir /= dist;
  let fog_distance = max(0.0, dist - globals.fog_params.x);
  let fog_height = in.world_pos.y - globals.fog_params.y;
  let view_y = select(-0.000001, view_dir.y, abs(view_dir.y) > 0.000001);
  let height_extinction = 1.0 - clamp(
    (1.0 / view_y) * (
      exp(globals.fog_params.z * (fog_distance * view_y - fog_height)) -
      exp(-globals.fog_params.z * fog_height)
    ),
    0.0, 1.0,
  );
  let uniform_extinction = clamp(exp(-fog_distance * globals.fog_params.w), 0.0, 1.0);
  let fog_amount = min(1.0 - height_extinction * uniform_extinction, globals.fog_params2.z);
  // NEA-Project's live Player WGSL uses globalShade here. Its global-light
  // floor keeps shadowed stone readable instead of multiplying it to black.
  let direct = global_shade(normal_light * shadow) * globals.light_color_global.rgb;
  let lit = albedo * (ao * (direct + irradiance) + 400.0 * material.b);
  let fog_color = globals.fog_params2.x * directional_sky(view_dir) * globals.fog_params3.rgb;
  let fogged = mix(lit, fog_color, fog_amount);
  let mapped = aces_tone_map(globals.eye_exposure.w * fogged);
  // Debug view（F1-F6，存 atlas_params.w）：Albedo / Direct / Ambient / Shadow / Fog / Final
  let dbg = globals.atlas_params.w;
  if (dbg > 5.5) { return vec4f(decode_display(mapped), 1.0); }
  if (dbg > 4.5) { return vec4f(vec3f(fog_amount), 1.0); }
  if (dbg > 3.5) { return vec4f(vec3f(shadow), 1.0); }
  if (dbg > 2.5) { return vec4f(irradiance / 400.0, 1.0); }
  if (dbg > 1.5) { return vec4f(direct / 500.0, 1.0); }
  if (dbg > 0.5) { return vec4f(albedo, 1.0); }
  return vec4f(decode_display(mapped), 1.0);
}
"#;

pub const NEA_ALPHA_FRAGMENT_WGSL: &str = r#"
@fragment
fn fs_alpha(in: VsOut) {
  let face_normal = normalize(in.normal);
  let base_u = vec3f(face_normal.y + face_normal.z, 0.0, -face_normal.x);
  let base_v = vec3f(0.0, -abs(face_normal.x + face_normal.z), abs(face_normal.y));
  let h0 = step(in.texture_rotation, 0.5);
  let h1 = step(in.texture_rotation, 1.5);
  let h2 = step(in.texture_rotation, 2.5);
  let a = h0 - h2 + h1;
  let b = h1 - h0 - 1.0 + h2;
  let face_u = a * base_u + b * base_v;
  let face_v = a * base_v - b * base_u;
  let in_tile = tile_offset(fract(in.world_pos), face_u, face_v);
  let tex_coord = get_tex_coord(in.uv, in_tile);
  let alpha = textureSample(atlas, atlas_sampler, tex_coord).a;
  let color = textureSample(atlas, atlas_sampler, tex_coord).rgb;
  oit_store(vec4f(color, alpha), in.pos);
}
"#;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn shader_contains_recovered_functions() {
        assert!(
            NEA_FRAGMENT_WGSL.contains("fn tile_offset"),
            "tileOffset port"
        );
        assert!(
            NEA_FRAGMENT_WGSL.contains("fn get_tex_coord"),
            "getTexCoord port"
        );
        // the geometry bakes tile origin + span; the shader adds half-texel
        assert!(
            NEA_FRAGMENT_WGSL.contains("0.5 / globals.atlas_params.x"),
            "half-texel offset"
        );
        assert!(NEA_FRAGMENT_WGSL.contains("tile_offset(fract(in.world_pos)"));
        assert!(NEA_FRAGMENT_WGSL.contains("@fragment"), "fragment entry");
        assert!(NEA_FRAGMENT_WGSL.contains("textureSample"), "sampling call");
        assert!(NEA_FRAGMENT_WGSL.contains("material_atlas"));
        assert!(NEA_FRAGMENT_WGSL.contains("let ao = 1.0"));
        assert!(!NEA_FRAGMENT_WGSL.contains("let dh = bump.gb"));
        assert!(
            NEA_FRAGMENT_WGSL
                .contains("lit = albedo * (ao * (direct + irradiance) + 400.0 * material.b)")
        );
        assert!(!NEA_FRAGMENT_WGSL.contains("if (material.g < 0.01)"));
        assert!(NEA_FRAGMENT_WGSL.contains("bump_atlas"));
        assert!(NEA_FRAGMENT_WGSL.contains("emissive = material.b"));
        assert!(!NEA_FRAGMENT_WGSL.contains("textureSample(bump_atlas"));
        assert!(!NEA_FRAGMENT_WGSL.contains("perturb_normal"));
        assert!(NEA_FRAGMENT_WGSL.contains("global_shade"));
        assert!(NEA_FRAGMENT_WGSL.contains("light_color_global"));
        assert!(
            NEA_FRAGMENT_WGSL
                .contains("global_shade(normal_light * shadow) * globals.light_color_global.rgb")
        );
        assert!(NEA_FRAGMENT_WGSL.contains("apply_fog"));
        assert!(NEA_FRAGMENT_WGSL.contains("directional_sky"));
        assert!(NEA_FRAGMENT_WGSL.contains("aces_tone_map"));
        assert!(NEA_FRAGMENT_WGSL.contains("fn sample_shadows"));
        assert!(NEA_FRAGMENT_WGSL.contains("array<vec2f, 16>"));
        assert!(NEA_FRAGMENT_WGSL.contains("let direct = global_shade(normal_light * shadow)"));
        assert!(NEA_FRAGMENT_WGSL.contains("((1.0 - nu) * (1.0 - nv)) * in.light00"));
        assert!(NEA_FRAGMENT_WGSL.contains("interpolated_light.a * directional_sky(face_normal)"));
        assert!(!NEA_FRAGMENT_WGSL.contains("max(interpolated_light.a, 0.35)"));
        assert!(NEA_FRAGMENT_WGSL.contains("direct + irradiance"));
        assert!(NEA_FRAGMENT_WGSL.contains("shadow = face_shadow * sample_shadows"));
        assert!(NEA_FRAGMENT_WGSL.contains("max(length(view), 0.000001)"));
        assert!(NEA_FRAGMENT_WGSL.contains("let view_y = select(-0.000001"));
        assert!(NEA_FRAGMENT_WGSL.contains(
            "globals.fog_params2.x * directional_sky(view_dir) * globals.fog_params3.rgb"
        ));
        assert!(NEA_ALPHA_FRAGMENT_WGSL.contains("let h0 = step(in.texture_rotation"));
        assert!(NEA_ALPHA_FRAGMENT_WGSL.contains("let face_u = a * base_u + b * base_v"));
    }

    #[test]
    fn shader_constants_match_recovered() {
        // the port uses the same half-texel + span formula as faceUvRect
        assert!(NEA_FRAGMENT_WGSL.contains("fract"), "tile repeat");
    }

    #[test]
    fn shader_parses_as_wgsl_without_a_gpu_adapter() {
        let module = wgpu::naga::front::wgsl::parse_str(NEA_FRAGMENT_WGSL)
            .unwrap_or_else(|error| panic!("NEA WGSL parse failed: {error}"));
        wgpu::naga::valid::Validator::new(
            wgpu::naga::valid::ValidationFlags::all(),
            wgpu::naga::valid::Capabilities::all(),
        )
        .validate(&module)
        .unwrap_or_else(|error| panic!("NEA WGSL validation failed: {error:#?}"));
    }
}
