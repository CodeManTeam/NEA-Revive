# DAO3 model schema finding

The dumped frontend bundle contains the authoritative model migration schemas. The current `decode-engine-model.mjs` guess is wrong: v7 is not arrays of nodes/meshes. The v7 root is:

```text
MuStruct {
  version: MuVarint(7),
  nodes: MuDictionary(NodeV7, Infinity),
  voxels: MuDictionary(VoxelV8Shape, Infinity),
  palette: PaletteV2,
  animations: MuArray(AnimationV6, Infinity)
}
```

`NodeV7` fields: `id: MuASCII, type: MuVarint(root enum), name: MuUTF8, voxelId: MuASCII, parentId: MuASCII, childrenIds: MuArray(MuASCII), skinId: MuASCII, boneId: MuASCII, alpha: MuFloat32(1), pivot: vec3, position: vec3, quaternion: vec4, euler: vec3, flip: vec3, scale: vec3, parentScaleMat3: vec9`.

The v7 migration uses v1-v7 roots with dictionary nodes and voxel dictionaries; it does **not** use `meshes: MuArray(MuArray(MeshFace, 6))`. The separate `engine/m` mesh payload has its own schema (v1-v3): root fields `version, partId, bindMat, bounds, nodes, texture: MeshTextureSchema, meshes: MuArray(MeshDataSchema)`.

The bundle's voxel payload decoder for legacy `-11` is also authoritative: after magic, read `surfaceCount`, then `paletteCount`, then `sliceInfoCount`; each palette entry is 7 bytes (`id,r,g,b,pbr0,pbr1,pbr2`), followed by `sliceInfoCount/2` pairs of `(uint8, varint)`, then `surfaceCount * 6` bytes of surface data.

Evidence source: `.build/backroom-dump-20260819/GET-view.dao3.fun/_next/static/chunks/734.8dcb480d99773395.js`, module containing `Ra/Da` migrations and `Eo/Co/Po` mesh schemas.
