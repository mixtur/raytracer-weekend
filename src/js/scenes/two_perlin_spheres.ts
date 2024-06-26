import { HittableList } from '../hittable/hittable_list';
import { NoiseTexture } from '../texture/noise_texture';
import { Sphere } from '../hittable/sphere';
import { color, point3, vec3 } from '../math/vec3.gen';
import { Scene } from './scene';
import { Camera } from '../camera';
import { create_lambertian } from '../materials/lambertian';

const pertext = new NoiseTexture(4);

export const two_perlin_spheres: Scene = {
    root_hittable: new HittableList([
        new Sphere(point3(0, -1000, 0), 1000, create_lambertian(pertext)),
        new Sphere(point3(0, 2, 0), 2, create_lambertian(pertext))
    ]),

    light: null,

    create_camera(aspect_ratio: number): Camera {
        const look_from = point3(13,2,3);
        const look_at = point3(0,0,0);

        return new Camera({
            look_from,
            look_at,
            v_up: vec3(0, 1, 0),
            focus_dist: 10,
            aspect_ratio,
            aperture: 0,
            y_fov: 20,
            time0: 0,
            time1: 1
        });
    },
    background: color(0.7, 0.8, 1.0)
}
