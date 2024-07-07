This is my take on the great [Ray tracing in one weekend](https://raytracing.github.io) series.

It is written in TypeScript.


## Features
- grids
- multithreaded rendering
- loading glTF models
- IBL
- PBR
- ACES tone mapping

## See it in action
https://mixtur.github.io/raytracing-weekend/

## Run locally

```bash
 # you'll need node.js and npm installed in your system
 npm install 
 npm start # serves the raytracer page on 0.0.0.0:8080
```

## Resources used

1. This wouldn't be possible without the great [Ray tracing in one weekend](https://raytracing.github.io) series.
1. PBR is implemented using these papers
  - https://media.disneyanimation.com/uploads/production/publication_asset/48/asset/s2012_pbs_disney_brdf_notes_v3.pdf
    except that geometry factor uses `alpha = roughness^2`, not `alpha = (0.5 + 0.5 * roughness)^2`
  - https://www.cs.cornell.edu/~srm/publications/EGSR07-btdf.pdf - the actual formula for geometry factor is taken from here
  - https://jcgt.org/published/0007/04/01/paper.pdf - took Jacobian of the reflection operator from there
1. Ported RGBE parser from our in-house 3d engine, as well as some math
  - AFAIK the source code is not public now, but you can take a look at some demos here - https://webgears.app/engine
1. glTF example models are taken from here - https://github.com/KhronosGroup/glTF-Sample-Assets
