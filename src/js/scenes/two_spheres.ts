import { Scene } from './scene';
import { point3, vec3 } from '../vec3';
import { Camera } from '../camera';
import { Hittable } from '../hittable/hittable';
import { HittableList } from '../hittable/hittable_list';
import { Sphere } from '../hittable/sphere';
import { Checker3DTexture } from '../texture/checker_3d_texture';
import { sColor } from '../texture/solid_color';
import { Lambertian } from '../material';

const create_two_spheres = (): Hittable => {
    const checker = new Checker3DTexture(sColor(0.2, 0.3, 0.1), sColor(0.9, 0.9, 0.9));
    return new HittableList([
        new Sphere(point3(0, -10, 0), 10, new Lambertian(checker)),
        new Sphere(point3(0, 10, 0), 10, new Lambertian(checker))
    ]);
};

export const two_spheres: Scene = {
    root_hittable: create_two_spheres(),

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
        })
    }
}
