import { create_scene, Scene } from './scene';
import { point3, vec3 } from '../math/vec3.gen';
import { create_camera } from '../camera';
import { Hittable } from '../hittable/hittable';
import { solid_color } from '../texture/solid_color';
import { create_lambertian } from '../materials/lambertian';
import { Skybox } from '../hittable/skybox';
import { create_hittable_list } from '../hittable/hittable_list';
import { create_sphere } from '../hittable/sphere';
import { create_checker_3d_texture } from '../texture/checker_3d_texture';

const create_two_spheres = (): Hittable => {
    const checker = create_checker_3d_texture(solid_color(0.2, 0.3, 0.1), solid_color(0.9, 0.9, 0.9));
    return create_hittable_list([
        create_sphere(point3(0, -10, 0), 10, create_lambertian(checker)),
        create_sphere(point3(0, 10, 0), 10, create_lambertian(checker))
    ]);
};

export const create = (): Scene => create_scene({
    root_hittable: create_two_spheres(),

    camera: create_camera({
        look_from: point3(13, 2, 3),
        look_at: point3(0, 0, 0),
        y_up: vec3(0, 1, 0),
        focus_dist: 10,
        aperture: 0,
        y_fov: 20,
        time0: 0,
        time1: 1
    }),
    background: Skybox.create_solid(0.7, 0.8, 1.0)
});
