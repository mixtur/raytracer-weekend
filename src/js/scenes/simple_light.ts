import { Scene } from './scene';
import { Camera } from '../camera';
import { color, point3, vec3 } from '../math/vec3';
import { HittableList } from '../hittable/hittable_list';
import { NoiseTexture } from '../texture/noise_texture';
import { Sphere } from '../hittable/sphere';
import { XYRect } from '../hittable/xy_rect';
import { sColor } from '../texture/solid_color';
import { createLambertian } from '../materials/lambertian';
import { createDiffuseLight } from '../materials/diffuse_light';

const perlinTexture = new NoiseTexture(4);

export const simple_light: Scene = {
    root_hittable: new HittableList([
        new Sphere(point3(0, -1000, 0), 1000, createLambertian(perlinTexture)),
        new Sphere(point3(0, 2, 0), 2, createLambertian(perlinTexture)),
        new XYRect(3, 5, 1, 3, -2, createDiffuseLight(sColor(0.5, 4, 1))),
        new Sphere(point3(0, 7, 0), 2, createDiffuseLight(sColor(4, 1, 0.5)))
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
