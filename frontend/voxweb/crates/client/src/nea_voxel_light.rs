//! Static packed RGBA 4-bit light propagation recovered from the NEA voxel worker.

use std::collections::VecDeque;

const MAX_LIGHT: u8 = 15;

pub struct StaticVoxelLight {
    min_x: i32,
    min_z: i32,
    size_x: usize,
    size_z: usize,
    levels: Vec<u16>,
}

impl StaticVoxelLight {
    pub fn build(
        min_x: i32,
        min_z: i32,
        size_x: usize,
        size_z: usize,
        height: usize,
        solid: &impl Fn(i32, i32, i32) -> bool,
        emissive: &impl Fn(i32, i32, i32) -> u16,
    ) -> Self {
        Self::build_with_sky(min_x, min_z, size_x, size_z, height, solid, emissive, false)
    }

    pub fn build_with_sky(
        min_x: i32,
        min_z: i32,
        size_x: usize,
        size_z: usize,
        height: usize,
        solid: &impl Fn(i32, i32, i32) -> bool,
        emissive: &impl Fn(i32, i32, i32) -> u16,
        use_min_light: bool,
    ) -> Self {
        let mut light = Self {
            min_x,
            min_z,
            size_x,
            size_z,
            levels: vec![0; size_x * height * size_z],
        };
        let mut queue = VecDeque::new();
        light.seed_initial(
            height,
            solid,
            emissive,
            if use_min_light { 0xD000 } else { 0 },
            &mut queue,
        );
        light.propagate(height, solid, &mut queue);
        light
    }

    pub fn sample(&self, x: i32, y: i32, z: i32) -> [f32; 4] {
        unpack_channels(self.sample_quantized(x, y, z))
    }

    /// Raw packed light channels used by the dump chunk worker's mesh
    /// vertices. The worker writes the 4-bit nibbles directly; the nonlinear
    /// `sampleLight` transform is only used by eye-ambient queries.
    pub fn sample_raw(&self, x: i32, y: i32, z: i32) -> [f32; 4] {
        self.sample_quantized(x, y, z)
    }

    /// Recovered worker `sampleLight`: trilinear interpolation of packed
    /// channels followed by the original nonlinear light transform.
    pub fn sample_continuous(&self, x: f32, y: f32, z: f32) -> [f32; 4] {
        let base = [x.floor() as i32, y.floor() as i32, z.floor() as i32];
        let fraction = [x - base[0] as f32, y - base[1] as f32, z - base[2] as f32];
        let mut channels = [0.0; 4];
        let mut total = 0.0;
        for dz in 0..=1 {
            for dy in 0..=1 {
                for dx in 0..=1 {
                    let weight = axis_weight(fraction[0], dx)
                        * axis_weight(fraction[1], dy)
                        * axis_weight(fraction[2], dz);
                    let sample = self.sample_quantized(base[0] + dx, base[1] + dy, base[2] + dz);
                    for channel in 0..4 {
                        channels[channel] += weight * sample[channel];
                    }
                    total += weight;
                }
            }
        }
        if total > 0.0 {
            for channel in &mut channels {
                *channel /= total;
                *channel = (*channel / (16.0 - 15.0 * *channel)).min(1.0);
            }
        }
        channels
    }

    /// Dump `LightEngine.sampleLight` variant used by non-voxel meshes.
    /// Opaque voxel cells do not contribute a sample; the worker renormalizes
    /// by the remaining trilinear weight before applying the nonlinear curve.
    pub fn sample_continuous_filtered(
        &self,
        x: f32,
        y: f32,
        z: f32,
        opaque: &impl Fn(i32, i32, i32) -> bool,
    ) -> [f32; 4] {
        let base = [x.floor() as i32, y.floor() as i32, z.floor() as i32];
        let fraction = [x - base[0] as f32, y - base[1] as f32, z - base[2] as f32];
        let mut channels = [0.0; 4];
        let mut total = 0.0;
        for dz in 0..=1 {
            for dy in 0..=1 {
                for dx in 0..=1 {
                    let weight = axis_weight(fraction[0], dx)
                        * axis_weight(fraction[1], dy)
                        * axis_weight(fraction[2], dz);
                    let cell = (base[0] + dx, base[1] + dy, base[2] + dz);
                    if opaque(cell.0, cell.1, cell.2) {
                        continue;
                    }
                    let Some(sample) = self.sample_quantized_if_in_bounds(cell.0, cell.1, cell.2)
                    else {
                        continue;
                    };
                    for channel in 0..4 {
                        channels[channel] += weight * sample[channel];
                    }
                    total += weight;
                }
            }
        }
        if total > 0.0 {
            for channel in &mut channels {
                *channel /= total;
                *channel = (*channel / (16.0 - 15.0 * *channel)).min(1.0);
            }
        }
        channels
    }

    pub fn sky_nibble(&self, x: i32, y: i32, z: i32) -> u8 {
        if y < 0 {
            return 0;
        }
        let local_x = x - self.min_x;
        let local_z = z - self.min_z;
        if local_x < 0
            || local_z < 0
            || local_x >= self.size_x as i32
            || local_z >= self.size_z as i32
        {
            return MAX_LIGHT;
        }
        self.index(local_x as usize, y as usize, local_z as usize)
            .and_then(|index| self.levels.get(index))
            .map_or(MAX_LIGHT, |level| ((level >> 12) & 0xf) as u8)
    }

    fn sample_quantized_if_in_bounds(&self, x: i32, y: i32, z: i32) -> Option<[f32; 4]> {
        if y < 0 {
            return None;
        }
        let local_x = x - self.min_x;
        let local_z = z - self.min_z;
        if local_x < 0 || local_z < 0 {
            return None;
        }
        self.index(local_x as usize, y as usize, local_z as usize)
            .and_then(|index| self.levels.get(index))
            .map(|level| quantized_channels(*level))
    }

    fn sample_quantized(&self, x: i32, y: i32, z: i32) -> [f32; 4] {
        if let Some(sample) = self.sample_quantized_if_in_bounds(x, y, z) {
            return sample;
        }
        if y < 0 {
            return [0.0; 4];
        }
        let local_x = x - self.min_x;
        let local_z = z - self.min_z;
        if local_x < 0
            || local_z < 0
            || local_x >= self.size_x as i32
            || local_z >= self.size_z as i32
        {
            return [0.0, 0.0, 0.0, 1.0];
        }
        self.index(local_x as usize, y as usize, local_z as usize)
            .and_then(|index| self.levels.get(index))
            .map_or([0.0, 0.0, 0.0, 1.0], |level| quantized_channels(*level))
    }

    fn seed_initial(
        &mut self,
        height: usize,
        solid: &impl Fn(i32, i32, i32) -> bool,
        emissive: &impl Fn(i32, i32, i32) -> u16,
        min_light: u16,
        queue: &mut VecDeque<(usize, usize, usize)>,
    ) {
        for z in 0..self.size_z {
            for x in 0..self.size_x {
                let mut ray = -1_i32;
                for y in 0..height {
                    if solid(self.min_x + x as i32, y as i32, self.min_z + z as i32) {
                        ray = ray.max(y as i32);
                    }
                }
                for y in 0..height {
                    let wx = self.min_x + x as i32;
                    let wz = self.min_z + z as i32;
                    let opaque = solid(wx, y as i32, wz);
                    let mut level = emissive(wx, y as i32, wz);
                    if (y as i32) > ray {
                        level |= 0xF000;
                    }
                    if level == 0 && !opaque {
                        level = min_light;
                    }
                    if level != 0 {
                        self.set_level(x, y, z, level);
                        queue.push_back((x, y, z));
                    }
                }
            }
        }
    }

    fn propagate(
        &mut self,
        height: usize,
        solid: &impl Fn(i32, i32, i32) -> bool,
        queue: &mut VecDeque<(usize, usize, usize)>,
    ) {
        while let Some((x, y, z)) = queue.pop_front() {
            let Some(index) = self.index(x, y, z) else {
                continue;
            };
            let next = dump_attenuate(self.levels[index]);
            if next == 0 {
                continue;
            }
            for (nx, ny, nz) in neighbors(x, y, z, self.size_x, height, self.size_z) {
                let world = (self.min_x + nx as i32, ny as i32, self.min_z + nz as i32);
                let Some(neighbor_index) = self.index(nx, ny, nz) else {
                    continue;
                };
                if solid(world.0, world.1, world.2) {
                    continue;
                }
                let merged = dump_merge(self.levels[neighbor_index], next);
                if merged == self.levels[neighbor_index] {
                    continue;
                }
                self.levels[neighbor_index] = merged;
                queue.push_back((nx, ny, nz));
            }
        }
    }

    fn level_at(&self, x: usize, y: usize, z: usize) -> u16 {
        self.index(x, y, z).map_or(0, |index| self.levels[index])
    }

    fn set_level(&mut self, x: usize, y: usize, z: usize, level: u16) {
        if let Some(index) = self.index(x, y, z) {
            self.levels[index] = level;
        }
    }

    fn index(&self, x: usize, y: usize, z: usize) -> Option<usize> {
        let layer = self.size_x.checked_mul(self.size_z)?;
        let height = self.levels.len().checked_div(layer)?;
        (x < self.size_x && y < height && z < self.size_z)
            .then_some(x + self.size_x * (z + self.size_z * y))
    }
}

fn dump_attenuate(value: u16) -> u16 {
    let value = value as u32;
    let mut e = 522_133_279u32.wrapping_add(0x0F0F0F0F & (value | (value << 12)));
    e = e.wrapping_add((0x10101010 & e) >> 4) & 0x0F0F0F0F;
    (e.wrapping_add(e >> 12) & 0xFFFF) as u16
}

fn dump_merge(left: u16, right: u16) -> u16 {
    let left = left as u32;
    let right = right as u32;
    (left ^ ((left ^ right) & dump_compare_mask(left, right))) as u16
}

fn dump_compare_mask(left: u32, right: u32) -> u32 {
    let value = 15u32.wrapping_mul(
        538_976_288u32
            .wrapping_add(0x0F0F0F0F & (left | (left << 12)))
            .wrapping_sub(0x0F0F0F0F & (right | (right << 12)))
            & 0x10101010,
    );
    (value >> 4) | (value >> 16)
}

fn quantized_channels(level: u16) -> [f32; 4] {
    // Dump `_sampleLightInt` divides each four-bit channel by its actual
    // maximum (15, 240, 3840, 61440), i.e. every nibble is normalized by 15.
    [0, 4, 8, 12].map(|shift| ((level >> shift) & 0xf) as f32 / 15.0)
}

fn unpack_channels(mut channels: [f32; 4]) -> [f32; 4] {
    for channel in &mut channels {
        *channel /= 16.0 - 15.0 * *channel;
    }
    channels
}

fn axis_weight(fraction: f32, high: i32) -> f32 {
    if high == 0 { 1.0 - fraction } else { fraction }
}

fn neighbors(
    x: usize,
    y: usize,
    z: usize,
    size_x: usize,
    height: usize,
    size_z: usize,
) -> impl Iterator<Item = (usize, usize, usize)> {
    let candidates = [
        x.checked_sub(1).map(|value| (value, y, z)),
        (x + 1 < size_x).then_some((x + 1, y, z)),
        y.checked_sub(1).map(|value| (x, value, z)),
        (y + 1 < height).then_some((x, y + 1, z)),
        z.checked_sub(1).map(|value| (x, y, value)),
        (z + 1 < size_z).then_some((x, y, z + 1)),
    ];
    candidates.into_iter().flatten()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn direct_sky_is_full_and_propagates_below_an_overhang() {
        let solid = |x: i32, y: i32, z: i32| y == 2 && x == 1 && z == 1;
        let light = StaticVoxelLight::build(0, 0, 3, 3, 5, &solid, &|_, _, _| 0);
        assert_eq!(light.sample(0, 4, 0)[3], 1.0);
        assert_eq!(light.sample(1, 2, 1), [0.0; 4]);
        assert!(light.sample(1, 1, 1)[3] > 0.0);
        assert!(light.sample(1, 1, 1)[3] < 1.0);
    }

    #[test]
    fn sealed_cell_remains_dark() {
        let solid =
            |x: i32, y: i32, z: i32| x == 0 || x == 2 || z == 0 || z == 2 || y == 0 || y == 2;
        let light = StaticVoxelLight::build(0, 0, 3, 3, 4, &solid, &|_, _, _| 0);
        assert_eq!(light.sample(1, 1, 1), [0.0; 4]);
    }

    #[test]
    fn packed_rgb_emissive_channels_propagate_independently() {
        let solid = |_: i32, _: i32, _: i32| false;
        let emissive = |x: i32, y: i32, z: i32| {
            if (x, y, z) == (1, 1, 1) { 0x00f4 } else { 0 }
        };
        let light = StaticVoxelLight::build(0, 0, 3, 3, 3, &solid, &emissive);
        assert_eq!(light.sample(1, 1, 1), [4.0 / 180.0, 1.0, 0.0, 1.0]);
        assert_eq!(light.sample(2, 1, 1)[0], 3.0 / 195.0);
        assert_eq!(light.sample(2, 1, 1)[1], 14.0 / 30.0);
    }

    #[test]
    fn continuous_sampling_interpolates_before_nonlinear_transform() {
        let light = StaticVoxelLight {
            min_x: 0,
            min_z: 0,
            size_x: 2,
            size_z: 1,
            levels: vec![0x000f, 0],
        };
        let sample = light.sample_continuous(0.5, 0.0, 0.0);
        let expected_quantized = 0.5;
        let expected = expected_quantized / (16.0 - 15.0 * expected_quantized);
        assert!((sample[0] - expected).abs() < 1.0e-6);
    }

    #[test]
    fn filtered_sampling_decodes_full_dump_nibble_as_one() {
        let light = StaticVoxelLight {
            min_x: 0,
            min_z: 0,
            size_x: 1,
            size_z: 1,
            levels: vec![0xffff],
        };
        assert_eq!(
            light.sample_continuous_filtered(0.0, 0.0, 0.0, &|_, _, _| false),
            [1.0; 4]
        );
    }
}
