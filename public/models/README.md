# Head models

Drop a `.glb` or `.gltf` head in this folder and point `config.head.modelUrl` at it:

```ts
// src/core/config.ts
modelUrl: `${BASE}models/my-planes-head.glb`,
```

You can also just drag a `.glb` onto the demo page - it is read locally and never uploaded,
which is the quickest way to try a model without editing any code.

## What the loader expects

- Y up, facing +Z (towards the viewer).
- Any scale. The model is auto-centred and scaled to a fixed height on load.
- Materials are replaced with the neutral plaster study material, because the point of the
  demo is to read light on form rather than to show off textures.

## Licensing

Everything in this folder except this README is gitignored on purpose. Please do not commit
third-party head models unless the licence clearly allows redistribution in a public repo -
and if it does, credit it (name, author, licence, link) in the top-level README.
