import { HittableList } from '../hittable/hittable_list';
import { NoiseTexture } from '../texture/noise_texture';
import { Sphere } from '../hittable/sphere';
import { point3, vec3 } from '../vec3';
import { Lambertian } from '../material';
import { Scene } from './scene';
import { Camera } from '../camera';

const pertext = new NoiseTexture(4);

export const two_perlin_spheres: Scene = {
    root_hittable: new HittableList([
        new Sphere(point3(0, -1000, 0), 1000, new Lambertian(pertext)),
        new Sphere(point3(0, 2, 0), 2, new Lambertian(pertext))
    ]),

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
    }
}