# NEA Project Recode

NEA Project Recode is a self-hostable Rust/WebAssembly compatibility runtime
for voxel maps and multiplayer sessions. The browser client uses WebGPU, a
local authoritative compatibility backend, deterministic anonymous textures,
and an optional local asset-replacement boundary.

This public repository contains only implementation code, tests, neutral
fixtures, and configuration templates. It does not contain preservation dumps,
private maps, captured browser state, credentials, original runtime bundles, or
original texture assets.

## Current status

The project currently provides:

- a WebGPU terrain, transparent-fluid, avatar, shadow, and sky rendering path;
- third-person camera and pointer-lock input;
- local prediction and authoritative correction;
- recovered-compatible player collision and locomotion behavior;
- 18-part avatar IK with walk, run, jump, land, crouch, swim, and roll blending;
- deterministic anonymous terrain, material, bump, water, and avatar palettes;
- an optional same-origin interface for licensed third-party asset packs;
- WebSocket session bootstrap and compatibility protocol handling.

Compatibility is still incomplete. Dynamic sky resources, full foot planting,
all historical script APIs, and production multiplayer deployment remain active
work.

## Requirements

- Rust 1.96.0
- the wasm32-unknown-unknown target
- [Trunk](https://trunkrs.dev/)
- a current desktop browser with WebGPU

## Build

    rustup target add wasm32-unknown-unknown
    cargo install trunk --locked
    trunk build --release

For local development:

    trunk serve

The compatibility session URL is supplied through the nea query parameter:

    http://127.0.0.1:8080/start.html?nea=http://127.0.0.1:18080/api/createSession

The backend/session service must be hosted separately. For deployment, replace
the local signaling URL in `start.html` with the public WebSocket endpoint.

## Validation

    cargo fmt --all -- --check
    cargo test --workspace
    cargo check --workspace --target wasm32-unknown-unknown

CI runs formatting, native tests, WASM checks, and a release web build. Tagged
versions publish the compiled web bundle as a GitHub Release artifact.

## Local third-party assets

Copy asset-overrides/manifest.example.json to
asset-overrides/manifest.json and place licensed files under
asset-overrides/files/. Both real locations are ignored by Git.

Supported slots include:

- terrain.color.N
- terrain.material.N
- terrain.bump.N
- water.bump
- avatar.PART

Only same-origin paths under /asset-overrides/files/ are accepted. Remote URLs,
query strings, fragments, backslashes, and parent traversal are rejected.

Without a manifest, the client generates anonymous textures locally. No
historical texture bundle is required.

## Repository layout

| Path | Responsibility |
| --- | --- |
| crates/client | Browser session, input, prediction, and integration |
| crates/render | WebGPU pipelines, terrain, avatar, shadows, and sky |
| crates/protocol | Compatibility schemas, decoding, and neutral catalogs |
| crates/server | Authoritative voxel runtime |
| crates/net | Multiplayer transport |
| crates/core | Shared world and simulation types |
| signaling | Optional signaling service |
| asset-overrides | Public template for local licensed assets |
| docs | Architecture and implementation notes |

## Publication policy

Do not commit:

- dumps, archived bundles, capture output, or deobfuscation workspaces;
- private maps, browser profiles, tokens, credentials, or local environment
  files;
- original or unlicensed textures, models, audio, or UI assets;
- generated build output, caches, or runtime logs.

New third-party assets must remain local unless their license and redistribution
terms have been reviewed.

## License

See [LICENSE](LICENSE). Third-party dependencies and locally supplied asset
packs retain their own licenses.
