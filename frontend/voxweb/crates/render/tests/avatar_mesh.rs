use std::fs;
use std::path::PathBuf;

use voxweb_protocol::AVATAR_PART_NAMES;
use voxweb_protocol::decode_avatar_part;
use voxweb_render::avatar_mesh::{build_avatar_part_mesh, build_posed_avatar_part_mesh};

#[test]
fn configured_avatar_parts_build_meshes() {
    let Some(directory) = std::env::var_os("NEA_AVATAR_ASSET_DIR").map(PathBuf::from) else {
        eprintln!("skipped: set NEA_AVATAR_ASSET_DIR to run avatar mesh conformance");
        return;
    };
    let entries = fs::read_dir(&directory).expect("read configured avatar asset directory");
    let mut decoded = 0usize;
    let mut quads = 0usize;
    let mut posed_min = [f32::INFINITY; 3];
    let mut posed_max = [f32::NEG_INFINITY; 3];
    for entry in entries {
        let path = entry.expect("read avatar asset entry").path();
        if !path.is_file() {
            continue;
        }
        let bytes = fs::read(&path).expect("read avatar asset");
        if bytes.is_empty() {
            continue;
        }
        let part = decode_avatar_part(&bytes).expect("decode configured avatar asset");
        let mesh = build_avatar_part_mesh(&part).expect("build configured avatar mesh");
        let name = AVATAR_PART_NAMES[part.part_id as usize];
        let posed = build_posed_avatar_part_mesh(name, &part).expect("build posed avatar mesh");
        for axis in 0..3 {
            posed_min[axis] = posed_min[axis].min(posed.bounds_min[axis]);
            posed_max[axis] = posed_max[axis].max(posed.bounds_max[axis]);
        }
        decoded += 1;
        quads += mesh.quad_count;
    }
    assert!(decoded >= 150, "expected the recovered avatar-part catalog");
    assert!(quads > 0, "expected recovered avatar geometry");
    eprintln!("anonymous posed avatar catalog bounds: {posed_min:?}..{posed_max:?}");
}
