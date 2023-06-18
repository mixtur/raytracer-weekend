import { Hittable } from '../hittable/hittable';
import { Camera } from '../camera';

export interface Scene {
    root_hittable: Hittable;
    create_camera(aspect_ratio: number): Camera;
}
