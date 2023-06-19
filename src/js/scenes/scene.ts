import { Hittable } from '../hittable/hittable';
import { Camera } from '../camera';
import { Color } from '../vec3';

export interface Scene {
    root_hittable: Hittable;
    create_camera(aspect_ratio: number): Camera;
    background: Color;
}
