import { Scene } from './scene';
import { Sphere } from '../hittable/sphere';
import { color, point3, vec3 } from '../math/vec3';
import earthUrl from './earthmap.jpg';
import { Camera } from '../camera';
import { ImageTexture } from '../texture/image_texture';
import { createLambertian } from '../materials/lambertian';

export const create_earth_scene = async (): Promise<Scene> => {
    const earthImageBitmap = await createImageBitmap(
        await fetch(earthUrl).then(res => res.blob())
    );
    return {
        root_hittable: new Sphere(point3(0, 0, 0), 2, createLambertian(new ImageTexture(earthImageBitmap))),
        create_camera: (aspect_ratio: number): Camera => {
            const look_from = point3(13, 2, 3);
            const look_at = point3(0, 0, 0);
            return new Camera({
                look_from,
                look_at,
                v_up: vec3(0, 1, 0),
                focus_dist: 10,
                aspect_ratio,
                aperture: 0.1,
                y_fov: 20,
                time0: 0,
                time1: 1
            });
        },
        background: color(0.7, 0.8, 1.0)
    };
}
