# Contributing to VoxWeb

Keep changes focused, reviewable, and safe for public redistribution.

## Workflow

1. Create a branch from the intended base.
2. Make one cohesive change.
3. Add focused tests for behavior changes.
4. Run the validation commands below.
5. Describe scope, validation, compatibility impact, and remaining risks.

## Required validation

~~~text
cargo fmt --all -- --check
cargo test --workspace
cargo check --workspace --target wasm32-unknown-unknown
trunk build --release
~~~

## Safety

Never commit private maps, captures, archived bundles, browser profiles, credentials, tokens,
local environment files, or unreviewed assets. Keep licensed local assets behind the ignored
asset-overrides boundary.

## Code quality

- Keep protocol, simulation, rendering, transport, and UI responsibilities separated.
- Validate external input and preserve actionable error context.
- Avoid unrelated formatting or refactors.
- Document compatibility limits honestly.
