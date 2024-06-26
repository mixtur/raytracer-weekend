This is my take on the great [Ray tracing in one weekend](https://raytracing.github.io) series.

It is written in TypeScript.

The following additional features are implemented
- grid instead of BVH when applicable
- cheaper box intersection tests
- zero allocations while rendering
- multithreaded rendering
- quaternions for changing PDFs orientations
- some gltf support

```bash
 # you'll need node.js and npm installed in your system
 npm install 
 npm start # serves the raytracer page on 0.0.0.0:8080
```

TODO:
- matrix-based camera
- better tone mapping
- HDR backgrounds
- micro-facets
- non-transparent dielectrics
- glTF
  - albedo map
  - normal map
  - metalness-roughness map
