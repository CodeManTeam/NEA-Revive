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
    pub exposure: f32,
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
            exposure: 1.0,
        };
        Self {
            exposure: environment.target_exposure(1.0),
            ..environment
        }
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
        let denominator = ambient * direct
            + EMISSIVE_SCALE / 32.0
            + (1.0 - ambient) * (EMISSIVE_SCALE / 20.0) * indirect * DEFAULT_GLOBAL_LIGHT;
        1.0 / denominator.max(f32::MIN_POSITIVE)
    }
}

pub fn recovered_default_globals(atlas_size: f32, tile_size: f32) -> [f32; GLOBALS_FLOATS] {
    let environment = NeaEnvironment::recovered_default();
    let mut values = [0.0; GLOBALS_FLOATS];
    for index in [0, 5, 10, 15] {
        values[GLOBALS_MVP_OFFSET + index] = 1.0;
    }
    values[GLOBALS_EYE_EXPOSURE_OFFSET + 3] = environment.exposure;
    values[GLOBALS_FOG_OFFSET..GLOBALS_FOG_OFFSET + 4].copy_from_slice(&[0.0, -8.0, 0.8, 0.0]);
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

/// Apply the preserved underwater environment override decoded from fluid RGBA.
pub fn apply_underwater_globals(values: &mut [f32; GLOBALS_FLOATS], fluid: Option<[f32; 4]>) {
    let Some(fluid) = fluid else { return };
    values[GLOBALS_FOG_OFFSET] = 0.0;
    values[GLOBALS_FOG_OFFSET + 3] = 0.1 * fluid[3];
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
        assert_eq!(
            &globals[GLOBALS_FOG_OFFSET..GLOBALS_FOG_OFFSET + 4],
            &[0.0, -8.0, 0.8, 0.0]
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
        assert_eq!(globals[GLOBALS_FOG_OFFSET + 3], 0.05);
        assert_eq!(
            &globals[GLOBALS_SKY_FRONT_OFFSET..GLOBALS_SKY_FRONT_OFFSET + 3],
            &[0.1, 0.2, 0.3]
        );
    }
}
