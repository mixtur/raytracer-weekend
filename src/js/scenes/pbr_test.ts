import { create_transform } from '../hittable/transform';
import { trs_to_mat3x4 } from '../math/mat.gen';
import { point3, vec3 } from '../math/vec.gen';
import { quat } from '../math/quat.gen';
import { create_sphere } from '../hittable/sphere';
import { create_burley_pbr_separate } from '../materials/burley-pbr-separate';
import { solid_color } from '../texture/solid_color';
import { create_scene, Scene } from './scene';
import { load_rgbe } from '../texture/image-parsers/rgbe_image_parser';
import { create_camera } from '../camera';
import { create_hittable_list } from '../hittable/hittable_list';
import { Skybox } from '../hittable/skybox';

export const create = async (): Promise<Scene> => {
    const [env] = await load_rgbe(2000, 'hdr/Cannon_Exterior.hdr');
    const skybox = Skybox.create_hdr(env);
    const hittables = [];
    for (let x = 0; x < 5; x++) {
        for (let y = 0; y < 5; y++) {
            const metallic = x / 4;
            const roughness = y / 4;
            const metallic_roughness = solid_color(0, metallic, roughness);
            hittables.push(
                create_sphere(
                    vec3(x, y, 0),
                    0.4,
                    create_burley_pbr_separate(
                        solid_color(0.9, 0.1, 0.1),
                        metallic_roughness,
                        metallic_roughness,
                        null,
                        null
                    )
                )
            )
        }
    }

    return create_scene({
        // importance_sampling_target: skybox,
        background: skybox,
        root_hittable: create_hittable_list(hittables),
        camera: create_camera({
            look_from: point3(2, 2, 10),
            look_at: point3(2, 2, 0),
            y_up: vec3(0, 1, 0),
            focus_dist: 3.8,
            aperture: 0,
            y_fov: 30,
            time0: 0,
            time1: 1
        }),
        exposure_config: {
            aperture: 16,
            shutter_speed: 1 / 25,
            ISO: 100,
            exp_comp: 0
        }
    })
}
