import { Hittable } from '../hittable/hittable';
import { Camera } from '../camera';
import { HittableList } from '../hittable/hittable_list';
import { point3, vec3 } from '../math/vec3.gen';
import { Skybox } from '../hittable/skybox';

export interface Scene {
    root_hittable: Hittable;
    light: Hittable | null;
    camera: Camera;
    background: Hittable;
}

export const create_scene = (config: Partial<Scene>): Scene => {
    return {
        root_hittable: config.root_hittable ?? new HittableList([]),
        light: config.light ?? null,
        camera: config.camera ?? new Camera({
            look_from: point3(13, 2, 3),
            look_at: point3(0, 0, 0),
            v_up: vec3(0, 1, 0),
            focus_dist: 10,
            aperture: 0,
            y_fov: 20,
            time0: 0,
            time1: 1
        }),
        background: config.background ?? Skybox.create_white()
    };
}
