struct Globals {
    inv_view_proj: mat4x4<f32>,
    sun_dir_time: vec4<f32>,
    fog_color: vec4<f32>,
};

@group(0) @binding(0) var<uniform> g: Globals;

struct VsOut {
    @builtin(position) clip: vec4<f32>,
    @location(0) ndc: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) vi: u32) -> VsOut {
    var pos = array<vec2<f32>, 3>(
        vec2<f32>(-1.0, -3.0),
        vec2<f32>( 3.0,  1.0),
        vec2<f32>(-1.0,  1.0),
    );
    var out: VsOut;
    out.ndc = pos[vi];
    out.clip = vec4<f32>(pos[vi], 0.0, 1.0);
    return out;
}

fn recovered_band(left: vec3<f32>, right: vec3<f32>, amount: f32) -> vec3<f32> {
    return mix(left, right, amount);
}

fn recovered_default_sky(ray_y: f32) -> vec3<f32> {
    // The preserved Player defaults to 4 / 24. Its atmosphere shader blends
    // the recovered 06:00 and 12:00 palettes with smoothstep(0, .25, time).
    let time_blend = smoothstep(0.0, 0.25, g.sun_dir_time.w);
    let ground = recovered_band(vec3<f32>(0.2510, 0.2549, 0.2588), vec3<f32>(0.2706, 0.2314, 0.2902), time_blend);
    let ground1 = recovered_band(vec3<f32>(0.2784, 0.2745, 0.2667), vec3<f32>(0.3059, 0.2902, 0.3137), time_blend);
    let ground2 = recovered_band(vec3<f32>(0.4824, 0.4392, 0.3176), vec3<f32>(0.3843, 0.4039, 0.3804), time_blend);
    let level_ground = recovered_band(vec3<f32>(0.7529, 0.6667, 0.3922), vec3<f32>(0.6627, 0.6863, 0.5725), time_blend);
    let level = recovered_band(vec3<f32>(1.0, 0.8784, 0.4941), vec3<f32>(0.9333, 1.0, 0.8118), time_blend);
    let level_sky = recovered_band(vec3<f32>(0.9529, 0.7961, 0.5961), vec3<f32>(0.9098, 1.0, 0.8275), time_blend);
    let sky1 = recovered_band(vec3<f32>(0.6314, 0.7451, 0.8157), vec3<f32>(0.6510, 0.9647, 0.9373), time_blend);
    let sky2 = recovered_band(vec3<f32>(0.5020, 0.6588, 0.8549), vec3<f32>(0.2980, 0.8353, 0.9804), time_blend);
    let sky = recovered_band(vec3<f32>(0.4157, 0.6471, 0.9020), vec3<f32>(0.1216, 0.6078, 0.8196), time_blend);

    if ray_y < -0.2 {
        return mix(ground, ground1, smoothstep(-1.0, -0.2, ray_y));
    }
    if ray_y < -0.08 {
        return mix(ground1, ground2, smoothstep(-0.2, -0.08, ray_y));
    }
    if ray_y < -0.02 {
        return mix(ground2, level_ground, smoothstep(-0.08, -0.02, ray_y));
    }
    if ray_y < 0.0 {
        return mix(level_ground, level, smoothstep(-0.02, 0.0, ray_y));
    }
    if ray_y < 0.02 {
        return mix(level, level_sky, smoothstep(0.0, 0.02, ray_y));
    }
    if ray_y < 0.08 {
        return mix(level_sky, sky1, smoothstep(0.02, 0.08, ray_y));
    }
    if ray_y < 0.2 {
        return mix(sky1, sky2, smoothstep(0.08, 0.2, ray_y));
    }
    return mix(sky2, sky, smoothstep(0.2, 1.0, ray_y));
}

@fragment
fn fs_main(in: VsOut) -> @location(0) vec4<f32> {
    let near = g.inv_view_proj * vec4<f32>(in.ndc, 0.0, 1.0);
    let far = g.inv_view_proj * vec4<f32>(in.ndc, 1.0, 1.0);
    let ray = normalize((far.xyz / far.w) - (near.xyz / near.w));

    var color = recovered_default_sky(ray.y);
    let sun_dir = normalize(g.sun_dir_time.xyz);
    let sun_dot = max(dot(ray, sun_dir), 0.0);
    let sun_core = pow(sun_dot, 520.0);
    let sun_glow = pow(sun_dot, 18.0);
    color += sun_core * vec3<f32>(1.0, 0.91, 0.70);
    color += sun_glow * vec3<f32>(0.24, 0.16, 0.07);
    return vec4<f32>(color, 1.0);
}
