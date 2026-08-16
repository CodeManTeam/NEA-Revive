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
        let mut light = Self {
            min_x,
            min_z,
            size_x,
            size_z,
            levels: vec![0; size_x * height * size_z],
        };
        let mut queue = VecDeque::new();
        light.seed_emissive(height, emissive, &mut queue);
        light.seed_direct_sky(height, solid, &mut queue);
        light.propagate(height, solid, &mut queue);
        light
    }

    pub fn sample(&self, x: i32, y: i32, z: i32) -> [f32; 4] {
        unpack_channels(self.sample_quantized(x, y, z))
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

    fn sample_quantized(&self, x: i32, y: i32, z: i32) -> [f32; 4] {
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

    fn seed_emissive(
        &mut self,
        height: usize,
        emissive: &impl Fn(i32, i32, i32) -> u16,
        queue: &mut VecDeque<(usize, usize, usize)>,
    ) {
        for y in 0..height {
            for z in 0..self.size_z {
                for x in 0..self.size_x {
                    let level = emissive(self.min_x + x as i32, y as i32, self.min_z + z as i32);
                    if level != 0 {
                        self.set_level(x, y, z, level);
                        queue.push_back((x, y, z));
                    }
                }
            }
        }
    }

    fn seed_direct_sky(
        &mut self,
        height: usize,
        solid: &impl Fn(i32, i32, i32) -> bool,
        queue: &mut VecDeque<(usize, usize, usize)>,
    ) {
        for z in 0..self.size_z {
            for x in 0..self.size_x {
                let mut blocked = false;
                for y in (0..height).rev() {
                    blocked |= solid(self.min_x + x as i32, y as i32, self.min_z + z as i32);
                    if !blocked {
                        let current = self.level_at(x, y, z);
                        self.set_level(x, y, z, current | ((MAX_LIGHT as u16) << 12));
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
            let next = attenuate(self.levels[index]);
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
                let merged = merge_max(self.levels[neighbor_index], next);
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

fn attenuate(level: u16) -> u16 {
    let mut result = 0;
    for shift in [0, 4, 8, 12] {
        let channel = ((level >> shift) & 0xf).saturating_sub(1);
        result |= channel << shift;
    }
    result
}

fn merge_max(left: u16, right: u16) -> u16 {
    let mut result = 0;
    for shift in [0, 4, 8, 12] {
        result |= ((left >> shift) & 0xf).max((right >> shift) & 0xf) << shift;
    }
    result
}

fn quantized_channels(level: u16) -> [f32; 4] {
    [0, 4, 8, 12].map(|shift| ((level >> shift) & 0xf) as f32 / 16.0)
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
        assert_eq!(light.sample(0, 4, 0)[3], 15.0 / 31.0);
        assert_eq!(light.sample(1, 2, 1), [0.0; 4]);
        assert!(light.sample(1, 1, 1)[3] > 0.0);
        assert!(light.sample(1, 1, 1)[3] < 15.0 / 31.0);
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
        assert_eq!(
            light.sample(1, 1, 1),
            [4.0 / 196.0, 15.0 / 31.0, 0.0, 15.0 / 31.0]
        );
        assert_eq!(light.sample(2, 1, 1)[0], 3.0 / 211.0);
        assert_eq!(light.sample(2, 1, 1)[1], 14.0 / 46.0);
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
        let expected_quantized = 15.0 / 32.0;
        let expected = expected_quantized / (16.0 - 15.0 * expected_quantized);
        assert!((sample[0] - expected).abs() < 1.0e-6);
    }
}
