import { Hittable } from '../hittable/hittable';
import { Camera } from '../camera';
import { HittableList } from '../hittable/hittable_list';
import { point3, vec3 } from '../math/vec3.gen';
import { Skybox } from '../hittable/skybox';

export interface Scene {
    root_hittable: Hittable;
    light: Hittable | null;
    create_camera(aspect_ratio: number): Camera;
    background: Hittable;
}

export const create_scene = (config: Partial<Scene>): Scene => {
    return {
        root_hittable: config.root_hittable ?? new HittableList([]),
        light: config.light ?? null,
        create_camera: config.create_camera ?? function create_camera(aspect_ratio: number): Camera {
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
        background: config.background ?? Skybox.create_white()
    };
}
