import {
    add_vec3, add_vec3_r,
    cross_vec3, div_vec3_s, fma_vec3_s_vec3_r, mul_vec3_s, mul_vec3_s_r,
    Point3, rand_vec3_in_unit_disk, sub_vec3, sub_vec3_r, unit_vec3,
    Vec3
} from './math/vec3.gen';
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

        this.w = unit_vec3(sub_vec3(look_from, look_at));
        this.u = unit_vec3(cross_vec3(v_up, this.w));
        this.v = cross_vec3(this.w, this.u);

        this.time0 = time0;
        this.time1 = time1;

        this.origin = look_from;
        this.horizontal = mul_vec3_s(this.u, viewport_width * focus_dist);
        this.vertical = mul_vec3_s(this.v, viewport_height * focus_dist);
        this.lower_left_corner = sub_vec3(
            this.origin,
            add_vec3(
                add_vec3(
                    div_vec3_s(this.horizontal, 2),
                    div_vec3_s(this.vertical, 2)
                ),
                mul_vec3_s(this.w, focus_dist)
            )
        );
        this.lens_radius = aperture / 2;
    }

    get_ray(u: number, v: number): Ray {
        const rd = rand_vec3_in_unit_disk();
        mul_vec3_s_r(rd, rd, this.lens_radius);
        const offset = mul_vec3_s(this.u, rd[0]);
        fma_vec3_s_vec3_r(offset, this.v, rd[1], offset)

        const direction = sub_vec3(this.lower_left_corner, offset);
        add_vec3_r(direction, direction, mul_vec3_s(this.horizontal, u));
        add_vec3_r(direction, direction, mul_vec3_s(this.vertical, v));
        sub_vec3_r(direction, direction, this.origin);

        add_vec3_r(offset, offset, this.origin);
        ray_allocator.reset();
        return ray_allocator.reuse(
            offset,
            direction,
            random_min_max(this.time0, this.time1)
        );
    }
}
