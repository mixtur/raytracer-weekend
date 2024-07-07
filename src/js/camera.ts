import {
    add_vec3, add_vec3_r,
    cross_vec3, cross_vec3_r, div_vec3_s, fma_vec3_s_vec3_r, mul_vec3_s, mul_vec3_s_r,
    Point3, point3_dirty, rand_vec3_in_unit_disk, sub_vec3, sub_vec3_r, unit_vec3, unit_vec3_r,
    Vec3, vec3_dirty
} from './math/vec3.gen';
import { Ray, ray_allocator, ray_dirty, ray_set } from './math/ray';
import { degrees_to_radians } from './utils';
import { random_min_max } from './math/random';

export interface CameraConfig {
    look_from: Point3,
    look_at: Point3,
    v_up: Vec3,
    y_fov: number,
    aperture: number,
    focus_dist: number,
    time0: number,
    time1: number
}

const ray = ray_dirty();
export class Camera {
    origin: Point3 = point3_dirty();
    lower_left_corner: Point3 = point3_dirty();
    vertical: Vec3 = vec3_dirty();
    horizontal: Vec3 = vec3_dirty();
    u: Vec3 = vec3_dirty();
    v: Vec3 = vec3_dirty();
    w: Vec3 = vec3_dirty();
    lens_radius: number = NaN;
    time0: number = NaN;
    time1: number = NaN;

    config: CameraConfig;

    constructor(config: CameraConfig) {
        this.config = config;
    }

    configure(aspect_ratio: number) {
        const {
            look_from,
            look_at,
            v_up,
            y_fov,
            aperture,
            focus_dist,
            time0,
            time1
        } = this.config;

        const theta = degrees_to_radians(y_fov);
        const h = Math.tan(theta / 2);
        const viewport_height = 2 * h;
        const viewport_width = aspect_ratio * viewport_height;

        unit_vec3_r(this.w, sub_vec3(look_from, look_at));
        unit_vec3_r(this.u, cross_vec3(v_up, this.w));
        cross_vec3_r(this.v, this.w, this.u);

        this.time0 = time0;
        this.time1 = time1;

        this.origin.set(look_from);
        mul_vec3_s_r(this.horizontal, this.u, viewport_width * focus_dist);
        mul_vec3_s_r(this.vertical, this.v, viewport_height * focus_dist);
        sub_vec3_r(
            this.lower_left_corner,
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
        ray_set(
            ray,
            offset,
            direction,
            random_min_max(this.time0, this.time1)
        );

        return ray;
    }
}
