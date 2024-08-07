import { Camera, create_camera } from '../camera';
import { point3, vec3 } from '../math/vec3.gen';
import { Skybox } from '../hittable/skybox';
import { Hittable } from '../hittable/hittable';
import { create_hittable_list } from '../hittable/hittable_list';
import { ExposureConfig } from '../color-flow';

export interface Scene {
    root_hittable: Hittable;
    light: Hittable | null;
    camera: Camera;
    background: Hittable;
    exposure_config: ExposureConfig;
}

export const create_scene = (config: Partial<Scene>): Scene => {
    return {
        root_hittable: config.root_hittable ?? create_hittable_list([]),
        light: config.light ?? null,
        camera: config.camera ?? create_camera({
            look_from: point3(13, 2, 3),
            look_at: point3(0, 0, 0),
            y_up: vec3(0, 1, 0),
            focus_dist: 10,
            aperture: 0,
            y_fov: 20,
            time0: 0,
            time1: 1
        }),
        background: config.background ?? Skybox.create_white(),
        exposure_config: config.exposure_config ?? {
            aperture: 2,
            shutter_speed: 1/4,
            ISO: 100,
            exp_comp: 0
        }
    };
}
