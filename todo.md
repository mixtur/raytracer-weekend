- **bug** Sometimes according to normal-map or/and vertex normals, combined with micro-facets distribution, reflected ray must go below the surface. This is currently rendered as black. Should probably do something smarter in that case.
- hitting bvh with triangles is too slow. Need more efficient in-memory structure after loading gltf. Grid patches could be faster
- when sampling skybox, sample normal-oriented hemisphere, not entire sphere
- pdf mixer with explicit weights. When using image based importance sampling with PBR material, specular/diffuse rays will get only quarter priority instead of one third. More general mixer may fix that.
- configuration UI
- work stealing
- scene creation progress ui
- 2d math for textures
- glTF
  - doubleSided: false by default 
  - loading progress
  - combine factors with textures
  - transmission
  - volume, ior
