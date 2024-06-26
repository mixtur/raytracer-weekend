import { Hittable } from '../hittable/hittable';
import { Camera } from '../camera';
import { Color } from '../math/vec3.gen';

export interface Scene {
    root_hittable: Hittable;
    light: Hittable | null;
    create_camera(aspect_ratio: number): Camera;
    background: Color;
}
