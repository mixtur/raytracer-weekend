import {
    point3,
    Point3,
    vec3,
    Vec3,
    vec3Add2,
    vec3Add3, vec3Cross2,
    vec3DivS2,
    vec3MulS2, vec3MulV2,
    vec3Sub2,
    vec3Sub3,
    vec3Unit1
} from './vec3';
import { ray, Ray } from './ray';
import { degrees_to_radians } from './utils';

export class Camera {
    origin: Point3;
    lower_left_corner: Point3;
    vertical: Vec3;
    horizontal: Vec3;

    constructor(look_from: Point3, look_at: Point3, v_up: Vec3, y_fov: number, aspect_ratio: number) {
        const theta = degrees_to_radians(y_fov);
        const h = Math.tan(theta / 2);
        const viewport_height = 2 * h;
        const viewport_width = aspect_ratio * viewport_height;

        const w = vec3Unit1(vec3Sub2(look_from, look_at));
        const u = vec3Unit1(vec3Cross2(v_up, w));
        const v = vec3Cross2(w, u);

        this.origin = look_from;
        this.horizontal = vec3MulS2(u, viewport_width);
        this.vertical = vec3MulS2(v, viewport_height);
        this.lower_left_corner = vec3Sub2(
            this.origin,
            vec3Add2(
                vec3Add2(
                    vec3DivS2(this.horizontal, 2),
                    vec3DivS2(this.vertical, 2)
                ),
                w
            )
        );
    }

    get_ray(u: number, v: number): Ray {
        const direction = vec3Add2(
            this.lower_left_corner,
            vec3MulS2(this.horizontal, u)
        );
        vec3Add3(direction, direction, vec3MulS2(this.vertical, v));
        vec3Sub3(direction, direction, this.origin);
        return ray(
            this.origin,
            direction
        );
    }
}