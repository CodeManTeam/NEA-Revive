# NEA Project Recode Agent Rules

## Mission

Maintain a self-hostable Rust/WebAssembly voxel compatibility runtime with
explicit privacy, provenance, and third-party asset boundaries.

## Public repository boundary

- Never commit dumps, archived runtime bundles, private captures, private maps,
  browser state, credentials, tokens, local logs, or generated build output.
- Do not add original or unlicensed runtime assets.
- Runtime-visible default assets must be anonymous and generated locally.
- Licensed third-party assets must enter through asset-overrides and remain
  ignored unless redistribution has been reviewed.
- Keep compatibility behavior, evidence analysis, and executable assets
  separate.

## Engineering

- Use English for source, diagnostics, tests, and technical documentation.
- Prefer focused root-cause changes and focused regression tests.
- Validate external input, network responses, and local asset paths.
- Run cargo fmt, relevant tests, and the wasm32 check before publication.
- Do not commit, push, rewrite history, or change remotes without explicit user
  approval.
