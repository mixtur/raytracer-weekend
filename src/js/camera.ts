import { point3, Point3, vec3, Vec3, vec3Add2, vec3Add3, vec3DivS2, vec3MulS2, vec3Sub2, vec3Sub3 } from './vec3';
import { ray, Ray } from './ray';

export class Camera {
    origin: Point3;
    lower_left_corner: Point3;
    vertical: Vec3;
    horizontal: Vec3;

    constructor() {
        const aspect_ratio = 16 / 9;
        const viewport_height = 2;
        const viewport_width = aspect_ratio * viewport_height;
        const focal_length = 1.0;

        this.origin = point3(0, 0, 0);
        this.horizontal = vec3(viewport_width, 0, 0);
        this.vertical = vec3(0, viewport_height, 0);
        this.lower_left_corner = vec3Sub2(
            this.origin,
            vec3Add2(
                vec3Add2(
                    vec3DivS2(this.horizontal, 2),
                    vec3DivS2(this.vertical, 2)
                ),
                vec3(0, 0, focal_length)
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