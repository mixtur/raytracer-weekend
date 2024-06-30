This is my take on the great [Ray tracing in one weekend](https://raytracing.github.io) series.

It is written in TypeScript.

The following additional features are implemented
- grid instead of BVH when applicable
- zero allocations while rendering
- multithreaded rendering
- quaternions for changing PDFs orientations
- some gltf support
- IBL with importance sampling
- some PBR

```bash
 # you'll need node.js and npm installed in your system
 npm install 
 npm start # serves the raytracer page on 0.0.0.0:8080
```

TODO:
- scene serialization for workers
- better tone mapping
- texture filtering
- explicit micro-facets (not sure if it is even possible)
- non-transparent dielectrics
- matrix-based camera
- glTF
  - albedo map (and UV attributes)
  - normal map
  - metalness-roughness map
