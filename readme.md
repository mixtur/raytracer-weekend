This is my take on the great [Ray tracing in one weekend](https://raytracing.github.io) series.

It is written in TypeScript.

The following additional features are implemented
- grid instead of BVH when applicable
- zero allocations while rendering
- multithreaded rendering
- quaternions for changing PDFs orientations
- some gltf support
- IBL with importance sampling
- PBR using [this](https://media.disneyanimation.com/uploads/production/publication_asset/48/asset/s2012_pbs_disney_brdf_notes_v3.pdf) paper

```bash
 # you'll need node.js and npm installed in your system
 npm install 
 npm start # serves the raytracer page on 0.0.0.0:8080
```

TODO:
- **bug** - when burley_pbr_separate is rendered with image based importance sampling, colors get bent a little 
- scene serialization for workers
- better tone mapping
- texture filtering
- non-transparent dielectrics
- matrix-based camera
- hitting bvh with triangles is too slow. Need more efficient in-memory structure after loading gltf. This may also help with messy UV/vertex-normals related code.
- glTF
  - emissive map
