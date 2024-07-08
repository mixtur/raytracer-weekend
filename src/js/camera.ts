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

export interface Camera {
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

    config: CameraConfig;
}

export const create_camera = (config: CameraConfig): Camera => {
    return {
        origin: point3_dirty(),
        lower_left_corner: point3_dirty(),
        vertical: vec3_dirty(),
        horizontal: vec3_dirty(),
        u: vec3_dirty(),
        v: vec3_dirty(),
        w: vec3_dirty(),
        lens_radius: NaN,
        time0: NaN,
        time1: NaN,

        config
    }
};

export const configure_camera = (camera: Camera, aspect_ratio: number): void => {
    const {
        look_from,
        look_at,
        v_up,
        y_fov,
        aperture,
        focus_dist,
        time0,
        time1
    } = camera.config;

    const theta = degrees_to_radians(y_fov);
    const h = Math.tan(theta / 2);
    const viewport_height = 2 * h;
    const viewport_width = aspect_ratio * viewport_height;

    unit_vec3_r(camera.w, sub_vec3(look_from, look_at));
    unit_vec3_r(camera.u, cross_vec3(v_up, camera.w));
    cross_vec3_r(camera.v, camera.w, camera.u);

    camera.time0 = time0;
    camera.time1 = time1;

    camera.origin.set(look_from);
    mul_vec3_s_r(camera.horizontal, camera.u, viewport_width * focus_dist);
    mul_vec3_s_r(camera.vertical, camera.v, viewport_height * focus_dist);
    sub_vec3_r(
        camera.lower_left_corner,
        camera.origin,
        add_vec3(
            add_vec3(
                div_vec3_s(camera.horizontal, 2),
                div_vec3_s(camera.vertical, 2)
            ),
            mul_vec3_s(camera.w, focus_dist)
        )
    );
    camera.lens_radius = aperture / 2;
};

export const get_ray = (camera: Camera, u: number, v: number): Ray => {
    const rd = rand_vec3_in_unit_disk();
    mul_vec3_s_r(rd, rd, camera.lens_radius);
    const offset = mul_vec3_s(camera.u, rd[0]);
    fma_vec3_s_vec3_r(offset, camera.v, rd[1], offset)

    const direction = sub_vec3(camera.lower_left_corner, offset);
    add_vec3_r(direction, direction, mul_vec3_s(camera.horizontal, u));
    add_vec3_r(direction, direction, mul_vec3_s(camera.vertical, v));
    sub_vec3_r(direction, direction, camera.origin);

    add_vec3_r(offset, offset, camera.origin);
    ray_set(
        ray,
        offset,
        direction,
        random_min_max(camera.time0, camera.time1)
    );

    return ray;
};
