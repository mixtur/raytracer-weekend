import {
    Point3,
    Vec3,
    vec3_add_2,
    vec3_add_3, vec3_cross2,
    vec3_divs_2,
    vec3_muls_2, vec3_muls_3, vec3_muls_addv_4, vec3_rand_in_unit_disk,
    vec3_sub_2,
    vec3_sub_3,
    vec3_unit1
} from './math/vec3';
import { Ray, ray_allocator } from './math/ray';
import { degrees_to_radians } from './utils';
import { random_min_max } from './math/random';

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

        this.w = vec3_unit1(vec3_sub_2(look_from, look_at));
        this.u = vec3_unit1(vec3_cross2(v_up, this.w));
        this.v = vec3_cross2(this.w, this.u);

        this.time0 = time0;
        this.time1 = time1;

        this.origin = look_from;
        this.horizontal = vec3_muls_2(this.u, viewport_width * focus_dist);
        this.vertical = vec3_muls_2(this.v, viewport_height * focus_dist);
        this.lower_left_corner = vec3_sub_2(
            this.origin,
            vec3_add_2(
                vec3_add_2(
                    vec3_divs_2(this.horizontal, 2),
                    vec3_divs_2(this.vertical, 2)
                ),
                vec3_muls_2(this.w, focus_dist)
            )
        );
        this.lens_radius = aperture / 2;
    }

    get_ray(u: number, v: number): Ray {
        const rd = vec3_rand_in_unit_disk();
        vec3_muls_3(rd, rd, this.lens_radius);
        const offset = vec3_muls_2(this.u, rd[0]);
        vec3_muls_addv_4(offset, this.v, rd[1], offset)

        const direction = vec3_sub_2(this.lower_left_corner, offset);
        vec3_add_3(direction, direction, vec3_muls_2(this.horizontal, u));
        vec3_add_3(direction, direction, vec3_muls_2(this.vertical, v));
        vec3_sub_3(direction, direction, this.origin);

        vec3_add_3(offset, offset, this.origin);
        ray_allocator.reset();
        return ray_allocator.reuse(
            offset,
            direction,
            random_min_max(this.time0, this.time1)
        );
    }
}
