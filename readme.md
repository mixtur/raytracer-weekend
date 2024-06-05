This is my take on the great [Ray tracing in one weekend](https://raytracing.github.io/books/RayTracingInOneWeekend.html) series.

It is written in TypeScript.

It has some performance improvements over the source material.
Namely
- it uses grid instead of BVH when applicable
- box tests use less math
- it uses arena allocators for vectors. It is less of a problem in the books, because they are written in C++, but in JS it makes a notable difference.
- multithreading. The book only mentions it, this implementation actually does it.


```bash
 # you'll need node.js and npm installed in your system
 npm install # there is just one dependency - esbuild. It is only needed to compile TS to JS, but since it is there anyway it also does bundling. 
 npm start # serves the raytracer page on 0.0.0.0:8080
```

Note: This is currently somewhere in the middle of Book 3, so dielectrics and metal currently don't work.
