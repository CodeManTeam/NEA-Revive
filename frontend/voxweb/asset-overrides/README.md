# Local asset overrides

Copy manifest.example.json to manifest.json, remove unused entries, and put
licensed third-party files under files/. Both locations are ignored by Git.

Stable slots:

- terrain.color.N, terrain.material.N, and terrain.bump.N replace mip N.
- water.bump replaces the water normal map.
- avatar.PART replaces a decoded Player part by its public part name.

Replacement paths must remain under /asset-overrides/files/. Remote URLs,
query strings, fragments, backslashes, and parent traversal are rejected.
When manifest.json is absent, VoxWeb uses deterministic anonymous terrain,
material, bump, water, and avatar-palette defaults. Compatibility geometry is
still decoded for the avatar rig, but its embedded palette is replaced before
GPU upload.
