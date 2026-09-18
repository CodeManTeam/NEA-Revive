# VoxWeb Agent Rules

## Mission

Maintain the Rust/WebAssembly/WebGPU player used by NEA-Revive, with explicit compatibility,
provenance, and third-party asset boundaries.

## Repository boundary

- Never commit dumps, archived bundles, private captures, browser state, credentials, tokens,
  local logs, or generated build output.
- Do not add original or unlicensed runtime assets.
- Keep compatibility behavior, evidence analysis, and executable assets separate.
- Use the current repository paths (backend/, frontend/, Middleware/, docs/); historical
  evidence may contain old path names and must be labeled as such.

## Engineering

- Prefer focused root-cause changes and focused regression tests.
- Validate external input, network responses, and local asset paths.
- Run cargo fmt, relevant tests, the wasm32 check, and trunk build before publication.
- The NEA path must consume world shape and state from protocol frames rather than map-specific
  constants.
