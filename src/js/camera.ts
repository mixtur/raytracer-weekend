import {
    gl_perspective_projection,
    invert_mat4_r,
    look_target_to_mat3x4_r,
    Mat3x4, mat3x4_dirty,
    Mat4, mat4_dirty, mul_mat3_vec3_r, mul_mat3x4_vec3_r,
    mul_mat4_vec3_r
} from './math/mat3.gen';
import {
    mul_vec3_s_r,
    point3,
    Point3,
    rand_vec3_in_unit_disk,
    sub_vec3,
    sub_vec3_r,
    Vec3
} from './math/vec3.gen';
import { Ray, ray_dirty, ray_set } from './math/ray';
import { degrees_to_radians } from './utils';

export interface Camera {
    world_matrix: Mat3x4;
    projection_matrix_inverse: Mat4;

    //depth of field
    origin_radius: number,

    //motion blur
    t0: number;
    dt: number;

    config: Camera2Config;
}

export interface Camera2Config {
    //view
    y_up: Vec3;
    look_from: Point3;
    look_at: Point3;
    //projection
    y_fov: number;
    //depth of field
    aperture: number;
    focus_dist: number;
    //motion blur
    time0: number;
    time1: number;
}

export const create_camera = (config: Camera2Config): Camera => {
    return {
        world_matrix: mat3x4_dirty(),
        projection_matrix_inverse: mat4_dirty(),
        origin_radius: 0,
        t0: 0,
        dt: 0,
        config
    };
}

export const configure_camera = (camera: Camera, aspect: number) => {
    const config = camera.config;
    look_target_to_mat3x4_r(camera.world_matrix, config.look_from, config.look_at, config.y_up);
    const projection_matrix = gl_perspective_projection(
        aspect,
        degrees_to_radians(config.y_fov),
        //near=1, far=1+focus_dist
        //so when we map a direction from point(x, y, -1) to point(x, y, 1) we get a direction from 0 to (x, y) on the focus plane
        1, 1 + config.focus_dist
    );
    invert_mat4_r(camera.projection_matrix_inverse, projection_matrix);

    camera.origin_radius = config.aperture / 2;
    camera.dt = config.time1 - config.time0;
    camera.t0 = config.time0;
};

const ray = ray_dirty();
export const get_ray = (camera: Camera, u: number, v: number): Ray => {
    const ndc_u = u * 2 - 1;
    const ndc_v = 1 - 2 * v;

    //"from to" in NDC
    const from = point3(ndc_u, ndc_v, -1);
    const to = point3(ndc_u, ndc_v, 1);

    //transform "from to" to camera's space
    mul_mat4_vec3_r(from, camera.projection_matrix_inverse, from);
    mul_mat4_vec3_r(to, camera.projection_matrix_inverse, to);

    // compute ray direction in camera's space
    const dir = sub_vec3(to, from);

    //ray origin in camera space is 0,0,0, but we make it slightly random for DoF
    const origin = rand_vec3_in_unit_disk();//todo: non-circular aperture
    mul_vec3_s_r(origin, origin, camera.origin_radius);

    // since origin is not 0,0,0 because DoF, ray no longer points to correct location.
    // Need to compensate for origin offset.
    sub_vec3_r(dir, dir, origin);

    //transform origin and dir to world_space
    mul_mat3x4_vec3_r(origin, camera.world_matrix, origin);
    mul_mat3_vec3_r(dir, camera.world_matrix, dir);//note: we abuse the fact that matrices are column-major, therefore we can interpret Mat3x4 as Mat3 in this case.

    ray_set(
        ray,
        origin,
        dir,
        camera.t0 + camera.dt * Math.random()
    );
    return ray;
}
