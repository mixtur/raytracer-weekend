import { create_scene, Scene } from './scene';
import { point3, vec3 } from '../math/vec3.gen';
import earthUrl from './earthmap.jpg';
import { create_camera } from '../camera';
import { create_lambertian } from '../materials/lambertian';
import { Skybox } from '../hittable/skybox';
import { load_dom_image } from '../texture/image-parsers/image-bitmap';
import { create_image_texture } from '../texture/image_texture';
import { create_sphere } from '../hittable/sphere';

export const create_earth_scene = async (): Promise<Scene> => {
    const earth_image = await load_dom_image(earthUrl);
    return create_scene({
        root_hittable: create_sphere(point3(0, 0, 0), 2, create_lambertian(create_image_texture(earth_image, {flip_y: true, decode_srgb: true}))),
        camera: create_camera({
            look_from: point3(13, 2, 3),
            look_at: point3(0, 0, 0),
            v_up: vec3(0, 1, 0),
            focus_dist: 10,
            aperture: 0.1,
            y_fov: 20,
            time0: 0,
            time1: 1
        }),
        background: Skybox.create_solid(0.7, 0.8, 1.0)
    });
}
