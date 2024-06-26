import { load_gltf } from '../gltf_loader/simple';
import { Scene } from './scene';
import { color, vec3 } from '../math/vec3.gen';
import { Camera } from '../camera';

export const load_simple_gltf = async (): Promise<Scene> => {
    const hittable = await load_gltf('/gltf/simple/model.gltf');

    return {
        light: null,
        background: color(1, 1, 1),
        create_camera(aspect_ratio: number): Camera {
            // this.setCameraPosition({ position: { x: -3.5, y: 11, z: 3.55 }, target: { x: 1, y: 0.5, z: -1 } });
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
        root_hittable: hittable
    }
}
