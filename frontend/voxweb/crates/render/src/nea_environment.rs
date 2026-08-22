//! Evidence-backed NEA environment uniforms recovered from the preserved Player.

use crate::nea_pipeline::{
    GLOBALS_ATLAS_OFFSET, GLOBALS_EYE_EXPOSURE_OFFSET, GLOBALS_FLOATS, GLOBALS_FOG_OFFSET,
    GLOBALS_FOG2_OFFSET, GLOBALS_FOG3_OFFSET, GLOBALS_LIGHT_COLOR_OFFSET,
    GLOBALS_LIGHT_GAMMA_OFFSET, GLOBALS_MVP_OFFSET, GLOBALS_SKY_BACK_OFFSET,
    GLOBALS_SKY_BOTTOM_OFFSET, GLOBALS_SKY_FRONT_OFFSET, GLOBALS_SKY_LEFT_OFFSET,
    GLOBALS_SKY_RIGHT_OFFSET, GLOBALS_SKY_TOP_OFFSET,
};

const DEFAULT_GAMMA: f32 = 1.3;
const DEFAULT_GLOBAL_LIGHT: f32 = 0.3;
const EMISSIVE_SCALE: f32 = 100.0;

/// Natural-sky state at the recovered default phase `4 / 24`.
#[derive(Clone, Copy, Debug)]
pub struct NeaEnvironment {
    pub sun_direction: [f32; 3],
    pub sun_color: [f32; 3],
    pub sky_left: [f32; 3],
    pub sky_right: [f32; 3],
    pub sky_top: [f32; 3],
    pub sky_bottom: [f32; 3],
    pub sky_front: [f32; 3],
    pub sky_back: [f32; 3],
    pub global_light: f32,
    pub gamma: f32,
    pub exposure: f32,
    pub sun_up: bool,
}

/// Recovered DAO3 map environment fields (`environment.json`) in raw form.
#[derive(Clone, Copy, Debug, Default)]
pub struct MapEnvironment {
    pub sky_type: u8,
    pub sun_phase: f32,
    pub sun_frequency: f32,
    pub sun_direction: [f32; 3],
    pub sun_color: [f32; 3],
    pub sky_left: [f32; 3],
    pub sky_right: [f32; 3],
    pub sky_top: [f32; 3],
    pub sky_bottom: [f32; 3],
    pub sky_front: [f32; 3],
    pub sky_back: [f32; 3],
    pub global_light: f32,
    pub gamma: f32,
    pub fog_start_distance: f32,
    pub fog_density: f32,
    pub fog_height_falloff: f32,
}

impl NeaEnvironment {
    /// The default phase is fixed because the preserved schema defaults
    /// `sunFrequency` to zero. Values are the exact interpolation of samples
    /// 10 and 11 from recovered module 90259.
    pub fn recovered_default() -> Self {
        let environment = Self {
            sun_direction: [0.4975186, 0.8617275, 0.09950372],
            sun_color: [365.59668, 406.11667, 448.52],
            sky_left: [207.55467, 245.775, 281.18832],
            sky_right: [199.428, 233.376, 265.0415],
            sky_top: [209.15417, 248.91817, 286.085],
            sky_bottom: [182.88173, 203.10341, 224.27666],
            sky_front: [203.125, 239.0755, 272.44034],
            sky_back: [203.125, 239.0755, 272.44034],
            global_light: DEFAULT_GLOBAL_LIGHT,
            gamma: DEFAULT_GAMMA,
            exposure: 1.0,
            sun_up: true,
        };
        Self {
            exposure: environment.target_exposure(1.0),
            ..environment
        }
    }

    /// Build the shading environment from a map's recovered `environment`
    /// fields. `global_light` defaults to the recovered schema default 0.3
    /// when the map omits it (null / negative sentinel).
    pub fn from_map(map: &MapEnvironment) -> Self {
        Self::from_map_at_time(map, 0.0)
    }

    /// Reproduce module 18622's environment update. `tick_time` is in the
    /// same normalized clock units used by the original `sunFrequency`.
    pub fn from_map_at_time(map: &MapEnvironment, tick_time: f32) -> Self {
        let (
            sun_direction,
            sun_color,
            sky_left,
            sky_right,
            sky_top,
            sky_bottom,
            sky_front,
            sky_back,
            sun_up,
        ) = if map.sky_type == 0 {
            natural_sky(map.sun_phase, map.sun_frequency, tick_time)
        } else {
            let direction = normalize_or_down(map.sun_direction);
            let time_of_day = (2.0
                + direction[1].clamp(-1.0, 1.0).asin() / (2.0 * std::f32::consts::PI))
                .rem_euclid(1.0);
            let sun_up = time_of_day < crate::nea_natural_sky::SUN_TIME[0]
                || time_of_day > crate::nea_natural_sky::SUN_TIME[1];
            (
                direction,
                map.sun_color,
                map.sky_left,
                map.sky_right,
                map.sky_top,
                map.sky_bottom,
                map.sky_front,
                map.sky_back,
                sun_up,
            )
        };
        let environment = Self {
            sun_direction,
            sun_color,
            sky_left,
            sky_right,
            sky_top,
            sky_bottom,
            sky_front,
            sky_back,
            global_light: if map.global_light < 0.0 {
                DEFAULT_GLOBAL_LIGHT
            } else {
                map.global_light
            },
            gamma: if map.gamma > 0.0 {
                map.gamma
            } else {
                DEFAULT_GAMMA
            },
            exposure: 1.0,
            sun_up,
        };
        Self {
            exposure: environment.target_exposure(1.0),
            ..environment
        }
    }

    /// A map without a usable sun (zero direction or black sun color) must
    /// not render directional shadows; the DAO3 Player skips the sun pass
    /// for such environments (e.g. fully indoor maps).
    pub fn sun_active(&self) -> bool {
        self.sun_direction != [0.0; 3] && self.sun_color != [0.0; 3]
    }

    /// Overwrite the sun/sky/globalLight slots of a globals record with this
    /// environment so per-frame pipelines shade with the map's sky.
    pub fn apply_to_globals(&self, values: &mut [f32; GLOBALS_FLOATS]) {
        values[GLOBALS_LIGHT_GAMMA_OFFSET..GLOBALS_LIGHT_GAMMA_OFFSET + 3]
            .copy_from_slice(&self.sun_direction);
        values[GLOBALS_LIGHT_GAMMA_OFFSET + 3] = self.gamma;
        set_rgb(values, GLOBALS_LIGHT_COLOR_OFFSET, self.sun_color);
        values[GLOBALS_LIGHT_COLOR_OFFSET + 3] = self.global_light;
        set_rgb(values, GLOBALS_SKY_LEFT_OFFSET, self.sky_left);
        set_rgb(values, GLOBALS_SKY_RIGHT_OFFSET, self.sky_right);
        set_rgb(values, GLOBALS_SKY_TOP_OFFSET, self.sky_top);
        set_rgb(values, GLOBALS_SKY_BOTTOM_OFFSET, self.sky_bottom);
        set_rgb(values, GLOBALS_SKY_FRONT_OFFSET, self.sky_front);
        set_rgb(values, GLOBALS_SKY_BACK_OFFSET, self.sky_back);
    }

    /// Overwrite the world-fog slot with the map's recovered fog parameters
    /// in the preserved `fogParams` layout
    /// (start distance, height base, height falloff, density).
    pub fn apply_map_fog(values: &mut [f32; GLOBALS_FLOATS], map: &MapEnvironment) {
        values[GLOBALS_FOG_OFFSET..GLOBALS_FOG_OFFSET + 4].copy_from_slice(&[
            map.fog_start_distance,
            -128.0,
            map.fog_height_falloff,
            map.fog_density,
        ]);
    }

    /// Recovered camera exposure target. `ambient` is the voxel worker''s
    /// eye-local sky visibility in the inclusive range 0..=1.
    pub fn target_exposure(&self, ambient: f32) -> f32 {
        let ambient = ambient.clamp(0.0, 1.0);
        let sky = [self.sky_front, self.sky_back, self.sky_left, self.sky_right]
            .iter()
            .map(|color| (color[0] + color[1] + color[2]) / 3.0)
            .fold(0.0_f32, f32::max);
        let direct = ambient * self.sun_color.iter().copied().fold(0.0_f32, f32::max);
        let indirect = (1.0 - ambient) * sky;
        let (direct, indirect) = if self.sun_up {
            (direct, indirect)
        } else {
            // Original module 51531 doubles both terms when sunUp is false.
            (direct * 2.0, indirect * 2.0)
        };
        // Preserved Player expression:
        //   (globalLight ? indirect * globalLight : 1)
        // A zero globalLight is not a zero contribution. Indoor maps use the
        // fallback 1.0 as the eye-adaptation baseline for emissive lighting.
        let indirect_exposure = if self.global_light != 0.0 {
            indirect * self.global_light
        } else {
            1.0
        };
        let denominator = ambient * direct
            + EMISSIVE_SCALE / 32.0
            + (1.0 - ambient) * (EMISSIVE_SCALE / 20.0) * indirect_exposure;
        1.0 / denominator.max(f32::MIN_POSITIVE)
    }
}

fn normalize_or_down(value: [f32; 3]) -> [f32; 3] {
    let length = (value[0] * value[0] + value[1] * value[1] + value[2] * value[2]).sqrt();
    if length > 1.0e-6 {
        [value[0] / length, value[1] / length, value[2] / length]
    } else {
        [0.0, -1.0, 0.0]
    }
}

fn natural_sky(
    phase: f32,
    frequency: f32,
    tick_time: f32,
) -> (
    [f32; 3],
    [f32; 3],
    [f32; 3],
    [f32; 3],
    [f32; 3],
    [f32; 3],
    [f32; 3],
    [f32; 3],
    bool,
) {
    let p = (tick_time * frequency + phase).rem_euclid(1.0);
    let angle = p * 2.0 * std::f32::consts::PI;
    let mut direction = [angle.cos(), angle.sin(), 0.0];
    let sun_up = p < crate::nea_natural_sky::SUN_TIME[0] || p > crate::nea_natural_sky::SUN_TIME[1];
    if !sun_up {
        direction = [-direction[0], -direction[1], -direction[2]];
    }
    direction[1] = direction[1].max(0.15);
    direction[2] += 0.1;
    direction = normalize_or_down(direction);
    let sun_color = interpolate(&crate::nea_natural_sky::SUN_COLORS, p);
    let sky_left = blend_sky(p, 0, sun_color);
    let sky_right = blend_sky(p, 1, sun_color);
    let sky_top = blend_sky(p, 2, sun_color);
    let sky_bottom = blend_sky(p, 3, sun_color);
    let sky_front = blend_sky(p, 4, sun_color);
    (
        direction, sun_color, sky_left, sky_right, sky_top, sky_bottom, sky_front, sky_front,
        sun_up,
    )
}

fn interpolate(table: &[[f32; 3]; 64], p: f32) -> [f32; 3] {
    let scaled = p * table.len() as f32;
    let index = scaled.floor() as usize % table.len();
    let next = (index + 1) % table.len();
    let t = scaled.fract();
    [
        table[index][0] + (table[next][0] - table[index][0]) * t,
        table[index][1] + (table[next][1] - table[index][1]) * t,
        table[index][2] + (table[next][2] - table[index][2]) * t,
    ]
}

fn blend_sky(p: f32, direction: usize, sun_color: [f32; 3]) -> [f32; 3] {
    let scaled = p * crate::nea_natural_sky::LIGHTMAP.len() as f32;
    let index = scaled.floor() as usize % crate::nea_natural_sky::LIGHTMAP.len();
    let next = (index + 1) % crate::nea_natural_sky::LIGHTMAP.len();
    let t = scaled.fract();
    let a = crate::nea_natural_sky::LIGHTMAP[index][direction];
    let b = crate::nea_natural_sky::LIGHTMAP[next][direction];
    [
        (a[0] + (b[0] - a[0]) * t) * 0.5 + sun_color[0] * 0.5,
        (a[1] + (b[1] - a[1]) * t) * 0.5 + sun_color[1] * 0.5,
        (a[2] + (b[2] - a[2]) * t) * 0.5 + sun_color[2] * 0.5,
    ]
}

pub fn recovered_default_globals(atlas_size: f32, tile_size: f32) -> [f32; GLOBALS_FLOATS] {
    let environment = NeaEnvironment::recovered_default();
    let mut values = [0.0; GLOBALS_FLOATS];
    for index in [0, 5, 10, 15] {
        values[GLOBALS_MVP_OFFSET + index] = 1.0;
    }
    values[GLOBALS_EYE_EXPOSURE_OFFSET + 3] = environment.exposure;
    // 世界雾（空气透视）：fog = [起始距离, 高度基准, 高度衰减, 密度]。
    // 很淡的默认（起始 32 米、密度 0.0012 ≈ 200 米处 21% 混向天空色），
    // 避免过浓雾化；必要时再调。
    values[GLOBALS_FOG_OFFSET..GLOBALS_FOG_OFFSET + 4].copy_from_slice(&[32.0, -8.0, 0.8, 0.0012]);
    values[GLOBALS_LIGHT_GAMMA_OFFSET..GLOBALS_LIGHT_GAMMA_OFFSET + 4].copy_from_slice(&[
        environment.sun_direction[0],
        environment.sun_direction[1],
        environment.sun_direction[2],
        DEFAULT_GAMMA,
    ]);
    set_rgb(
        &mut values,
        GLOBALS_LIGHT_COLOR_OFFSET,
        environment.sun_color,
    );
    values[GLOBALS_LIGHT_COLOR_OFFSET + 3] = DEFAULT_GLOBAL_LIGHT;
    // The preserved frame update assigns `fogParams2[0] = light.ambient`.
    // Start in fully lit open sky instead of mixing distant terrain to black
    // before the eye-light sampler has produced its first frame.
    values[GLOBALS_FOG2_OFFSET..GLOBALS_FOG2_OFFSET + 4].copy_from_slice(&[1.0, 1.0, 1.0, 0.0]);
    set_rgb(&mut values, GLOBALS_FOG3_OFFSET, [1.0, 1.0, 1.0]);
    values[GLOBALS_FOG3_OFFSET + 3] = 1.0;
    set_rgb(&mut values, GLOBALS_SKY_LEFT_OFFSET, environment.sky_left);
    set_rgb(&mut values, GLOBALS_SKY_RIGHT_OFFSET, environment.sky_right);
    set_rgb(&mut values, GLOBALS_SKY_TOP_OFFSET, environment.sky_top);
    set_rgb(
        &mut values,
        GLOBALS_SKY_BOTTOM_OFFSET,
        environment.sky_bottom,
    );
    set_rgb(&mut values, GLOBALS_SKY_FRONT_OFFSET, environment.sky_front);
    set_rgb(&mut values, GLOBALS_SKY_BACK_OFFSET, environment.sky_back);
    values[GLOBALS_ATLAS_OFFSET] = atlas_size;
    values[GLOBALS_ATLAS_OFFSET + 1] = tile_size;
    values
}

/// Default globals with the sun/sky/globalLight slots replaced by a map's
/// recovered environment (used by every per-frame pipeline writer).
pub fn environment_globals(
    atlas_size: f32,
    tile_size: f32,
    environment: &NeaEnvironment,
    map: Option<&MapEnvironment>,
) -> [f32; GLOBALS_FLOATS] {
    let mut values = recovered_default_globals(atlas_size, tile_size);
    environment.apply_to_globals(&mut values);
    if let Some(map) = map {
        if map.gamma > 0.0 {
            values[GLOBALS_LIGHT_GAMMA_OFFSET + 3] = map.gamma;
        }
        NeaEnvironment::apply_map_fog(&mut values, map);
    }
    values
}

/// Apply the preserved underwater environment override decoded from fluid RGBA.
pub fn apply_underwater_globals(values: &mut [f32; GLOBALS_FLOATS], fluid: Option<[f32; 4]>) {
    let Some(fluid) = fluid else { return };
    values[GLOBALS_FOG_OFFSET] = 0.0;
    // 水下雾密度：原实现 0.1*alpha 对 water(alpha=0.2) 只有 0.02，几乎无雾，
    // 水下看起来和陆地一样。按流体不透明度给下限：water 0.12（约 8 米视野），
    // 果汁 0.2、咖啡 ~0.28（黑水更看不清）。
    values[GLOBALS_FOG_OFFSET + 3] = 0.08 + 0.2 * fluid[3];
    values[GLOBALS_FOG2_OFFSET..GLOBALS_FOG2_OFFSET + 4].copy_from_slice(&[0.0, 1.0, 1.0, 0.0]);
    set_rgb(values, GLOBALS_FOG3_OFFSET, [1.0, 1.0, 1.0]);
    for offset in [
        GLOBALS_LIGHT_COLOR_OFFSET,
        GLOBALS_SKY_LEFT_OFFSET,
        GLOBALS_SKY_RIGHT_OFFSET,
        GLOBALS_SKY_TOP_OFFSET,
        GLOBALS_SKY_BOTTOM_OFFSET,
        GLOBALS_SKY_FRONT_OFFSET,
        GLOBALS_SKY_BACK_OFFSET,
    ] {
        set_rgb(values, offset, [fluid[0], fluid[1], fluid[2]]);
    }
}

fn set_rgb(values: &mut [f32; GLOBALS_FLOATS], offset: usize, color: [f32; 3]) {
    values[offset..offset + 3].copy_from_slice(&color);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn recovered_defaults_replace_approximate_environment() {
        let globals = recovered_default_globals(512.0, 16.0);
        // 世界雾：起始 32 米、密度 0.0012（很淡的空气透视）
        assert_eq!(
            &globals[GLOBALS_FOG_OFFSET..GLOBALS_FOG_OFFSET + 4],
            &[32.0, -8.0, 0.8, 0.0012]
        );
        assert_eq!(globals[GLOBALS_LIGHT_GAMMA_OFFSET + 3], 1.3);
        assert_eq!(globals[GLOBALS_FOG2_OFFSET], 1.0);
        assert!((globals[GLOBALS_SKY_TOP_OFFSET] - 209.15417).abs() < 1.0e-4);
        assert!(globals[GLOBALS_EYE_EXPOSURE_OFFSET + 3] < 0.01);
    }

    #[test]
    fn underwater_override_uses_packed_fluid_channels() {
        let mut globals = recovered_default_globals(512.0, 16.0);
        apply_underwater_globals(&mut globals, Some([0.1, 0.2, 0.3, 0.5]));
        // 新公式：0.08 + 0.2 * alpha = 0.18（原 0.1*alpha=0.05 对 water 几乎无雾）
        assert_eq!(globals[GLOBALS_FOG_OFFSET + 3], 0.18);
        assert_eq!(
            &globals[GLOBALS_SKY_FRONT_OFFSET..GLOBALS_SKY_FRONT_OFFSET + 3],
            &[0.1, 0.2, 0.3]
        );
    }

    #[test]
    fn backroom_natural_map_derives_external_sun() {
        // Backroom stores zero raw sky/sun colors because skyType=0 is the
        // Natural mode; module 18622 derives the actual light from phase.
        let map = MapEnvironment {
            sun_phase: 0.75,
            global_light: 0.0,
            ..Default::default()
        };
        let environment = NeaEnvironment::from_map(&map);
        assert!(environment.sun_active());
        assert!(!environment.sun_up);
        assert!(environment.sun_color[0] > 4.0);
        assert!(environment.sky_front[0] > 2.0);
        assert!(environment.target_exposure(1.0).is_finite());
        let globals = environment_globals(512.0, 16.0, &environment, Some(&map));
        assert!(globals[GLOBALS_LIGHT_COLOR_OFFSET] > 4.0);
        assert_eq!(
            &globals[GLOBALS_FOG_OFFSET..GLOBALS_FOG_OFFSET + 4],
            &[0.0, -128.0, 0.0, 0.0]
        );
    }

    #[test]
    fn lit_map_keeps_sun_active_and_maps_colors() {
        let map = MapEnvironment {
            sky_type: 1,
            sun_direction: [0.5, 0.86, 0.1],
            sun_color: [1.0, 1.0, 1.0],
            sky_front: [0.5, 0.5, 0.5],
            global_light: 0.3,
            fog_start_distance: 64.0,
            fog_density: 0.01,
            ..Default::default()
        };
        let environment = NeaEnvironment::from_map(&map);
        assert!(environment.sun_active());
        let globals = environment_globals(512.0, 16.0, &environment, Some(&map));
        assert!((globals[GLOBALS_LIGHT_COLOR_OFFSET] - 1.0).abs() < 1.0e-3);
        assert!((globals[GLOBALS_SKY_FRONT_OFFSET] - 0.5).abs() < 1.0e-3);
        assert!((globals[GLOBALS_FOG_OFFSET] - 64.0).abs() < 1.0e-4);
        assert!((globals[GLOBALS_FOG_OFFSET + 3] - 0.01).abs() < 1.0e-4);
    }

    #[test]
    fn missing_global_light_falls_back_to_schema_default() {
        let map = MapEnvironment {
            global_light: -1.0,
            ..Default::default()
        };
        assert_eq!(
            NeaEnvironment::from_map(&map).global_light,
            DEFAULT_GLOBAL_LIGHT
        );
    }
}
