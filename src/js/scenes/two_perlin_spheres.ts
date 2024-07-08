import { NoiseTexture } from '../texture/noise_texture';
import { point3, vec3 } from '../math/vec3.gen';
import { create_scene, Scene } from './scene';
import { Camera } from '../camera';
import { create_lambertian } from '../materials/lambertian';
import { Skybox } from '../hittable/skybox';
import { create_hittable_list } from '../hittable/hittable_list';
import { create_sphere } from '../hittable/sphere';

const pertext = new NoiseTexture(4);

export const two_perlin_spheres: Scene = create_scene({
    root_hittable: create_hittable_list([
        create_sphere(point3(0, -1000, 0), 1000, create_lambertian(pertext)),
        create_sphere(point3(0, 2, 0), 2, create_lambertian(pertext))
    ]),

    camera: new Camera({
        look_from: point3(13, 2, 3),
        look_at: point3(0, 0, 0),
        v_up: vec3(0, 1, 0),
        focus_dist: 10,
        aperture: 0,
        y_fov: 20,
        time0: 0,
        time1: 1
    }),
    background: Skybox.create_solid(0.7, 0.8, 1.0)
});
