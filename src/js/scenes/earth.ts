import { Scene } from './scene';
import { Sphere } from '../hittable/sphere';
import { point3, vec3 } from '../vec3';
import earthUrl from './earthmap.jpg';
import { Camera } from '../camera';
import { Lambertian } from '../material';
import { ImageTexture } from '../texture/image_texture';

export const create_earth_scene = async (): Promise<Scene> => {
    const earthImageBitmap = await createImageBitmap(
        await fetch(earthUrl).then(res => res.blob())
    );
    return {
        root_hittable: new Sphere(point3(0, 0, 0), 2, new Lambertian(new ImageTexture(earthImageBitmap))),
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
        }
    };
}
