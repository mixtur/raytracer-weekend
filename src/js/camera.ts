import {
    Point3,
    Vec3,
    vec3Add2,
    vec3Add3, vec3Cross2,
    vec3DivS2,
    vec3MulS2, vec3MulS3, vec3MulSAddV4, vec3MulVAddV4, vec3RandInUnitDisk,
    vec3Sub2,
    vec3Sub3,
    vec3Unit1
} from './vec3';
import { Ray, rayAllocator } from './ray';
import { degrees_to_radians } from './utils';
import { randomMinMax } from './random';

export class Camera {
    origin: Point3;
    lower_left_corner: Point3;
    vertical: Vec3;
    horizontal: Vec3;
    u: Vec3;
    v: Vec3;
    w: Vec3;
    lens_radius: number;
    time0: number;
    time1: number;

    constructor({
        look_from,
        look_at,
        v_up,
        y_fov,
        aspect_ratio,
        aperture,
        focus_dist,
        time0,
        time1
    }: {
        look_from: Point3,
        look_at: Point3,
        v_up: Vec3,
        y_fov: number,
        aspect_ratio: number,
        aperture: number,
        focus_dist: number,
        time0: number,
        time1: number
    }) {
        const theta = degrees_to_radians(y_fov);
        const h = Math.tan(theta / 2);
        const viewport_height = 2 * h;
        const viewport_width = aspect_ratio * viewport_height;

        this.w = vec3Unit1(vec3Sub2(look_from, look_at));
        this.u = vec3Unit1(vec3Cross2(v_up, this.w));
        this.v = vec3Cross2(this.w, this.u);

        this.time0 = time0;
        this.time1 = time1;

        this.origin = look_from;
        this.horizontal = vec3MulS2(this.u, viewport_width * focus_dist);
        this.vertical = vec3MulS2(this.v, viewport_height * focus_dist);
        this.lower_left_corner = vec3Sub2(
            this.origin,
            vec3Add2(
                vec3Add2(
                    vec3DivS2(this.horizontal, 2),
                    vec3DivS2(this.vertical, 2)
                ),
                vec3MulS2(this.w, focus_dist)
            )
        );
        this.lens_radius = aperture / 2;
    }

    get_ray(u: number, v: number): Ray {
        const rd = vec3RandInUnitDisk();
        vec3MulS3(rd, rd, this.lens_radius);
        const offset = vec3MulS2(this.u, rd[0]);
        vec3MulSAddV4(offset, this.v, rd[1], offset)

        const direction = vec3Sub2(this.lower_left_corner, offset);
        vec3Add3(direction, direction, vec3MulS2(this.horizontal, u));
        vec3Add3(direction, direction, vec3MulS2(this.vertical, v));
        vec3Sub3(direction, direction, this.origin);

        vec3Add3(offset, offset, this.origin);
        rayAllocator.reset();
        return rayAllocator.reuse(
            offset,
            direction,
            randomMinMax(this.time0, this.time1)
        );
    }
}
