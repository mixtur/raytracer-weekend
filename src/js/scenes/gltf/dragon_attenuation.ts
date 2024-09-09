import { load_gltf } from '../../gltf_loader/loader';
import { create_scene, Scene } from '../scene';
import { point3, vec3 } from '../../math/vec.gen';
import { create_camera } from '../../camera';
import { load_rgbe } from '../../texture/image-parsers/rgbe_image_parser';
import { Skybox } from '../../hittable/skybox';
import { load_gltf_light } from '../../gltf_loader/light_weight_loader';

export const create = async (): Promise<Scene> => {
    // const scene = await load_gltf('gltf/DragonAttenuation/glTF/DragonAttenuation.gltf', 102400, 1024);
    const scene = await load_gltf_light('gltf/DragonAttenuation/glTF/DragonAttenuation.gltf', 256, 128);
    const [env] = await load_rgbe(4096, 'hdr/street.hdr');
    const skybox = Skybox.create_hdr(env);

    return create_scene({
        importance_sampling_target: skybox,
        camera: create_camera({
            look_from: point3(0, 2, 3.75),
            look_at: point3(0, 0.25, 0),
            y_up: vec3(0, 1, 0),
            focus_dist: 10,
            aperture: 0,
            y_fov: 50,
            time0: 0,
            time1: 1
        }),
        root_hittable: scene,
        background: skybox,
        exposure_config: {
            aperture: 8,
            shutter_speed: 1 / 25,
            ISO: 400,
            exp_comp: 0
        }
    });
};
