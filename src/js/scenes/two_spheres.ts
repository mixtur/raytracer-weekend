import { create_scene, Scene } from './scene';
import { point3, vec3 } from '../math/vec3.gen';
import { Camera } from '../camera';
import { Hittable } from '../hittable/hittable';
import { HittableList } from '../hittable/hittable_list';
import { Sphere } from '../hittable/sphere';
import { Checker3DTexture } from '../texture/checker_3d_texture';
import { solid_color } from '../texture/solid_color';
import { create_lambertian } from '../materials/lambertian';
import { Skybox } from '../hittable/skybox';

const create_two_spheres = (): Hittable => {
    const checker = new Checker3DTexture(solid_color(0.2, 0.3, 0.1), solid_color(0.9, 0.9, 0.9));
    return new HittableList([
        new Sphere(point3(0, -10, 0), 10, create_lambertian(checker)),
        new Sphere(point3(0, 10, 0), 10, create_lambertian(checker))
    ]);
};

export const two_spheres: Scene = create_scene({
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
    },
    background: Skybox.create_solid(0.7, 0.8, 1.0)
});
