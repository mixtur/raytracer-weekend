import { load_gltf } from '../gltf_loader/simple';
import { Scene } from './scene';
import { vec3 } from '../math/vec3.gen';
import { Camera } from '../camera';
import { load_rgbe } from '../texture/image-parsers/rgbe_image_parser';
import { Skybox } from '../hittable/skybox';

export const load_simple_gltf = async (): Promise<Scene> => {
    const scene = await load_gltf('/gltf/simple/model.gltf');
    const env = await load_rgbe(20, '/hdr/street.hdr');

    return {
        light: null,
        create_camera(aspect_ratio: number): Camera {
            return new Camera({
                look_from: vec3(-5, 10, 5),
                look_at: vec3(1, 1, -1),
                aspect_ratio,
                v_up: vec3(0, 1, 0),
                focus_dist: 10,
                aperture: 0,
                y_fov: 50,
                time0: 0,
                time1: 1
            })
        },
        root_hittable: scene,
        background: Skybox.create(env)
    }
}
