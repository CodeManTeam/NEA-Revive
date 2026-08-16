# Contributing to NEA Project Recode

Thank you for helping improve the project. Keep changes focused, reviewable, and safe for public redistribution.

## Development workflow

1. Create a branch from `main`.
2. Make one cohesive change.
3. Add focused tests for behavior changes.
4. Run the validation commands below.
5. Open a pull request describing scope, validation, and remaining risks.

## Required validation

```text
cargo fmt --all -- --check
cargo test --workspace
cargo check --workspace --target wasm32-unknown-unknown
trunk build --release
```

## Public repository safety

Never commit private maps, captures, archived bundles, browser profiles, credentials, tokens, local environment files, extraction tools, or assets without reviewed redistribution rights. Use the anonymous procedural defaults or the ignored local asset override interface.

## Code quality

- Keep protocol, simulation, rendering, transport, and UI responsibilities separated.
- Validate external input and preserve actionable error context.
- Avoid unrelated formatting or refactors in feature pull requests.
- Use English for code identifiers, diagnostics, tests, and engineering documentation.
- Document compatibility limits honestly.

## Pull requests

Use a concise title and include:

- the observable goal;
- changed areas;
- validation commands and results;
- compatibility impact;
- unresolved risks or follow-up work.
