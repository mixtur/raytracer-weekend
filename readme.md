This is my take on the great [Ray tracing in one weekend](https://raytracing.github.io) series.

It is written in TypeScript.

The following additional features are implemented
- grid instead of BVH when applicable
- cheaper box intersection tests
- arena allocators for everything. It is less of a problem in the books, because they use C++ for code examples, but in JS it makes a notable difference because raytracing tends to create a lot of temporary objects, and GC is not happy about it.
- multithreaded rendering
- quaternions for changing PDFs orientations 


```bash
 # you'll need node.js and npm installed in your system
 npm install 
 npm start # serves the raytracer page on 0.0.0.0:8080
```

TODO:
- report completeness to the page, not in console
- fix noisy metals
- affine matrices
- better tone mapping
- HDR backgrounds
- micro-facets
- non-transparent dielectrics
- triangles-based geometry
- gltf
  - without maps 
  - normal map
  - metalness-roughness map
