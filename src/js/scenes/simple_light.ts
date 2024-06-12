import { Scene } from './scene';
import { Camera } from '../camera';
import { color, point3, vec3 } from '../math/vec3';
import { HittableList } from '../hittable/hittable_list';
import { NoiseTexture } from '../texture/noise_texture';
import { Sphere } from '../hittable/sphere';
import { Quad } from '../hittable/quad';
import { solid_color } from '../texture/solid_color';
import { create_lambertian } from '../materials/lambertian';
import { create_diffuse_light } from '../materials/diffuse_light';

const perlin_texture = new NoiseTexture(4);

const light1 = new Quad(point3(3,1,-2), vec3(2,0,0), vec3(0,2,0), create_diffuse_light(solid_color(0.5, 4, 1)));
const light2 = new Sphere(point3(0, 7, 0), 2, create_diffuse_light(solid_color(4, 1, 0.5)));
export const simple_light: Scene = {
    root_hittable: new HittableList([
        new Sphere(point3(0, -1000, 0), 1000, create_lambertian(perlin_texture)),
        new Sphere(point3(0, 2, 0), 2, create_lambertian(perlin_texture)),
        light1,
        light2
    ]),
    light: new HittableList([
        light1,
        light2
    ]),
    create_camera(aspect_ratio: number): Camera {
        const look_from = point3(26, 3, 6);
        const look_at = point3(0, 2, 0);

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
        })
    },
    background: color(0, 0, 0)
}
