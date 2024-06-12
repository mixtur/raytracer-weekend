This is my take on the great [Ray tracing in one weekend](https://raytracing.github.io/books/RayTracingInOneWeekend.html) series.

It is written in TypeScript.

It has some performance improvements over the source material.
Namely, this implementation
- uses grid instead of BVH when applicable
- uses cheaper box intersection tests
- uses arena allocators for everything. It is less of a problem in the books, because they use C++ for code examples, but in JS it makes a notable difference because raytracing tends to create a lot of temporary objects, and GC is not happy about it.
- multithreading. The book only mentions it, this implementation actually does it.
- actually fixes NaN problem mentioned in the last book
- uses quaternions for changing PDFs orientations instead of matrices 


```bash
 # you'll need node.js and npm installed in your system
 npm install # there is just one dependency - esbuild. It is only needed to compile TS to JS, but since it is there anyway it also does bundling. 
 npm start # serves the raytracer page on 0.0.0.0:8080
```

TODO:
- enforce naming conventions
- generalize scopes
- be consistent with order of arguments in math
- create arenas for new objects from Book 3
- make progressive enhancement more obvious (in multithreaded variant cast less rays in the beginning, and more towards the end)
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
