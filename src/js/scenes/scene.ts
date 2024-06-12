import { Hittable } from '../hittable/hittable';
import { Camera } from '../camera';
import { Color } from '../math/vec3';

export interface Scene {
    root_hittable: Hittable;
    light: Hittable;
    create_camera(aspect_ratio: number): Camera;
    background: Color;
}
