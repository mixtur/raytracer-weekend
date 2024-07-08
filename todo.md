- **bug** Sometimes according to normal-map or/and vertex normals, combined with micro-facets distribution, reflected ray must go below the surface. This is currently rendered as black. Should probably do something smarter in that case.
- matrix-based camera
- hitting bvh with triangles is too slow. Need more efficient in-memory structure after loading gltf. This may also help with messy UV/vertex-normals related code.
- pdf mixer with explicit weights. When using image based importance sampling with PBR material, specular/diffuse rays will get only quarter priority instead of one third. More general mixer may fix that.
- scene serialization for workers
- schedule thread load more evenly. Think something like Masonry layout, but for threads and ray counts
- glTF
  - combine factors with textures
  - alpha channel
  - texture transforms
  - transmission
  - volume, ior