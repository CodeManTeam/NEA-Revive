use std::fs;
use std::path::PathBuf;

use voxweb_protocol::decode_avatar_part;

#[test]
fn configured_avatar_parts_decode() {
    let Some(directory) = std::env::var_os("NEA_AVATAR_ASSET_DIR").map(PathBuf::from) else {
        eprintln!("skipped: set NEA_AVATAR_ASSET_DIR to run avatar-part conformance");
        return;
    };
    let entries = fs::read_dir(&directory).expect("read configured avatar asset directory");
    let mut decoded = 0usize;
    for entry in entries {
        let path = entry.expect("read avatar asset entry").path();
        if !path.is_file() {
            continue;
        }
        let bytes = fs::read(&path).expect("read avatar asset");
        if bytes.is_empty() {
            continue;
        }
        decode_avatar_part(&bytes).expect("decode configured avatar asset");
        decoded += 1;
    }
    assert!(decoded >= 150, "expected the recovered avatar-part catalog");
}
