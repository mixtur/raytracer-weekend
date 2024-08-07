import { load_gltf } from '../gltf_loader/loader';
import { create_scene, Scene } from './scene';
import { point3, vec3 } from '../math/vec3.gen';
import { create_camera } from '../camera';
import { load_rgbe } from '../texture/image-parsers/rgbe_image_parser';
import { Skybox } from '../hittable/skybox';
import { load_gltf_light } from '../gltf_loader/light_weight_loader';

export const create = async (): Promise<Scene> => {
    // const scene = await load_gltf('gltf/AlphaBlendModeTest/glTF/AlphaBlendModeTest.gltf', 2 ** 24, 2 ** 12, 25);
    const scene = await load_gltf_light('gltf/AlphaBlendModeTest/glTF/AlphaBlendModeTest.gltf', 64, 64, 25);
    const [env] = await load_rgbe(2200, 'hdr/Cannon_Exterior.hdr');
    const skybox = Skybox.create_hdr(env);

    return create_scene({
        // light: skybox,
        camera: create_camera({
            look_from: point3(0, 2, 7),
            look_at: point3(0, 1, 0),
            y_up: vec3(0, 1, 0),
            focus_dist: 0.7,
            aperture: 0,
            y_fov: 45,
            time0: 0,
            time1: 1
        }),
        root_hittable: scene,
        background: skybox,
        exposure_config: {
            aperture: 16,
            shutter_speed: 1 / 25,
            ISO: 100,
            exp_comp: 0
        }
    });
};
