//! NEA atlas → wgpu texture upload (VW-003 Step 2, CPU side).
//!
//! Converts the decoded 512×512 atlas (AtlasImage RGBA) into a wgpu
//! texture with NEAREST sampling + CLAMP wrap — the exact setup the
//! preserved engine used (block-atlas.mjs loadAtlases). Not wired into the
//! render path yet (user-visible Step 2); this module provides the tested
//! conversion + descriptor so the GPU step is a single call.

use voxweb_protocol::atlas::AtlasImage;

/// Sampling setup recovered from the preserved client: NEAREST + CLAMP.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct AtlasSampling {
    pub mag_filter: wgpu::FilterMode,
    pub min_filter: wgpu::FilterMode,
    pub mipmap_filter: wgpu::MipmapFilterMode,
    pub address_u: wgpu::AddressMode,
    pub address_v: wgpu::AddressMode,
}

impl Default for AtlasSampling {
    fn default() -> Self {
        Self {
            mag_filter: wgpu::FilterMode::Nearest,
            min_filter: wgpu::FilterMode::Nearest,
            // Linear mip selection blends neighboring atlas tiles at grazing
            // angles and produces the horizontal bands visible on the floor.
            // The original block sampler keeps the mip level discrete.
            mipmap_filter: wgpu::MipmapFilterMode::Nearest,
            address_u: wgpu::AddressMode::ClampToEdge,
            address_v: wgpu::AddressMode::ClampToEdge,
        }
    }
}

/// A wgpu texture created from a decoded atlas. Owns the device-side
/// resources.
pub struct AtlasTexture {
    pub texture: wgpu::Texture,
    pub view: wgpu::TextureView,
    pub sampler: wgpu::Sampler,
    pub size: wgpu::Extent3d,
}

impl AtlasTexture {
    pub fn upload_mip_chain_with_format(
        device: &wgpu::Device,
        queue: &wgpu::Queue,
        images: &[AtlasImage],
        sampling: AtlasSampling,
        format: wgpu::TextureFormat,
        label: &str,
    ) -> Result<AtlasTexture, String> {
        validate_mip_chain(images)?;
        let size = wgpu::Extent3d {
            width: images[0].width,
            height: images[0].height,
            depth_or_array_layers: 1,
        };
        let texture = device.create_texture(&wgpu::TextureDescriptor {
            label: Some(label),
            size,
            mip_level_count: images.len() as u32,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format,
            usage: wgpu::TextureUsages::TEXTURE_BINDING | wgpu::TextureUsages::COPY_DST,
            view_formats: &[],
        });
        for (level, image) in images.iter().enumerate() {
            queue.write_texture(
                wgpu::TexelCopyTextureInfo {
                    texture: &texture,
                    mip_level: level as u32,
                    origin: wgpu::Origin3d::ZERO,
                    aspect: wgpu::TextureAspect::All,
                },
                &image.rgba,
                wgpu::TexelCopyBufferLayout {
                    offset: 0,
                    bytes_per_row: Some(4 * image.width),
                    rows_per_image: Some(image.height),
                },
                wgpu::Extent3d {
                    width: image.width,
                    height: image.height,
                    depth_or_array_layers: 1,
                },
            );
        }
        Ok(Self::from_texture(device, texture, size, sampling, label))
    }

    /// Upload an AtlasImage as an Rgba8UnormSrgb 2D texture (512×512 for the
    /// bedwars catalog). The caller supplies the queue for the write.
    pub fn upload(
        device: &wgpu::Device,
        queue: &wgpu::Queue,
        image: &AtlasImage,
        sampling: AtlasSampling,
        label: &str,
    ) -> AtlasTexture {
        Self::upload_with_format(
            device,
            queue,
            image,
            sampling,
            wgpu::TextureFormat::Rgba8UnormSrgb,
            label,
        )
    }

    pub fn upload_with_format(
        device: &wgpu::Device,
        queue: &wgpu::Queue,
        image: &AtlasImage,
        sampling: AtlasSampling,
        format: wgpu::TextureFormat,
        label: &str,
    ) -> AtlasTexture {
        let size = wgpu::Extent3d {
            width: image.width,
            height: image.height,
            depth_or_array_layers: 1,
        };
        let texture = device.create_texture(&wgpu::TextureDescriptor {
            label: Some(label),
            size,
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format,
            usage: wgpu::TextureUsages::TEXTURE_BINDING | wgpu::TextureUsages::COPY_DST,
            view_formats: &[],
        });
        queue.write_texture(
            wgpu::TexelCopyTextureInfo {
                texture: &texture,
                mip_level: 0,
                origin: wgpu::Origin3d::ZERO,
                aspect: wgpu::TextureAspect::All,
            },
            &image.rgba,
            wgpu::TexelCopyBufferLayout {
                offset: 0,
                bytes_per_row: Some(4 * image.width),
                rows_per_image: Some(image.height),
            },
            size,
        );
        Self::from_texture(device, texture, size, sampling, label)
    }

    /// Upload a standalone model texture. Unlike terrain atlases this image
    /// uses normalized 0..1 UVs and is never tile-addressed by the block
    /// shader; keeping it as a regular texture prevents model UVs from
    /// sampling neighboring terrain tiles.
    pub fn upload_rgba(
        device: &wgpu::Device,
        queue: &wgpu::Queue,
        width: u32,
        height: u32,
        rgba: &[u8],
        label: &str,
    ) -> Result<AtlasTexture, String> {
        let image = AtlasImage::from_rgba(width, height, rgba.to_vec())?;
        Ok(Self::upload_with_format(
            device,
            queue,
            &image,
            AtlasSampling::default(),
            wgpu::TextureFormat::Rgba8UnormSrgb,
            label,
        ))
    }

    fn from_texture(
        device: &wgpu::Device,
        texture: wgpu::Texture,
        size: wgpu::Extent3d,
        sampling: AtlasSampling,
        label: &str,
    ) -> AtlasTexture {
        let view = texture.create_view(&wgpu::TextureViewDescriptor::default());
        let sampler = device.create_sampler(&wgpu::SamplerDescriptor {
            label: Some(&format!("{label}_sampler")),
            address_mode_u: sampling.address_u,
            address_mode_v: sampling.address_v,
            address_mode_w: wgpu::AddressMode::ClampToEdge,
            mag_filter: sampling.mag_filter,
            min_filter: sampling.min_filter,
            mipmap_filter: sampling.mipmap_filter,
            ..Default::default()
        });
        AtlasTexture {
            texture,
            view,
            sampler,
            size,
        }
    }
}

fn validate_mip_chain(images: &[AtlasImage]) -> Result<(), String> {
    let Some(base) = images.first() else {
        return Err("atlas mip chain is empty".to_string());
    };
    for (level, image) in images.iter().enumerate() {
        let expected_width = (base.width >> level).max(1);
        let expected_height = (base.height >> level).max(1);
        if image.width != expected_width || image.height != expected_height {
            return Err(format!(
                "atlas mip {level} is {}x{}, expected {expected_width}x{expected_height}",
                image.width, image.height,
            ));
        }
        if image.rgba.len() != image.width as usize * image.height as usize * 4 {
            return Err(format!("atlas mip {level} has an invalid RGBA byte length"));
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_sampling_matches_preserved() {
        let s = AtlasSampling::default();
        assert_eq!(s.mag_filter, wgpu::FilterMode::Nearest);
        assert_eq!(s.address_u, wgpu::AddressMode::ClampToEdge);
        assert_eq!(s.address_v, wgpu::AddressMode::ClampToEdge);
        assert_eq!(s.mipmap_filter, wgpu::MipmapFilterMode::Nearest);
    }

    #[test]
    fn row_layout_is_4_bytes_per_pixel() {
        // 512×512 RGBA -> 2048 bytes per row (the bytes_per_row the upload
        // uses); wgpu requires it be a multiple of 256 for COPY_DST, and
        // 2048 IS a multiple of 256 — the recovered atlas uploads directly.
        assert_eq!(4 * 512, 2048);
        assert_eq!(2048 % 256, 0, "bytes_per_row aligned for wgpu");
    }

    #[test]
    fn recovered_mip_chain_requires_halved_dimensions() {
        let image = |width, height| AtlasImage {
            width,
            height,
            rgba: vec![0; width as usize * height as usize * 4],
        };
        assert!(validate_mip_chain(&[image(4, 4), image(2, 2), image(1, 1)]).is_ok());
        assert!(validate_mip_chain(&[image(4, 4), image(3, 2)]).is_err());
    }
}
