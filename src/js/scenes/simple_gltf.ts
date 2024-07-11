import { load_gltf } from '../gltf_loader/loader';
import { create_scene, Scene } from './scene';
import { point3, vec3 } from '../math/vec3.gen';
import { create_camera } from '../camera';
import { load_rgbe } from '../texture/image-parsers/rgbe_image_parser';
import { Skybox } from '../hittable/skybox';

export const create = async (): Promise<Scene> => {
    const scene = await load_gltf('gltf/simple/model.gltf', 102400, 1024);
    const env = await load_rgbe(2048, 'hdr/street.hdr');
    const skybox = Skybox.create_hdr(env);

    return create_scene({
        light: skybox,
        camera: create_camera({
            look_from: point3(-5, 10, 5),
            look_at: point3(1, 1, -1),
            v_up: vec3(0, 1, 0),
            focus_dist: 10,
            aperture: 0,
            y_fov: 50,
            time0: 0,
            time1: 1
        }),
        root_hittable: scene,
        background: skybox,
        exposure_config: {
            aperture: 16,
            shutter_speed: 1 / 10,
            ISO: 400,
            exp_comp: 0
        }
    });
};
