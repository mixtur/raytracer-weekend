import { Hittable, create_hittable_type, HitRecord, hittable_types } from './hittable';
import {
    invert_mat3,
    invert_mat3x4,
    Mat3,
    Mat3x4,
    mat3x4_to_mat3,
    mul_mat3_vec3, mul_mat3_vec3_r,
    mul_mat3x4_vec3, mul_mat3x4_vec3_r, transpose_mat3
} from '../math/mat3.gen';
import { Ray, ray_dirty, ray_set } from '../math/ray';
import { AABB, union_aabb_point_r, create_empty_aabb } from '../math/aabb';
import { point3_dirty, set_vec3, Vec3 } from '../math/vec3.gen';

export interface ITransform extends Hittable {
    type: 'transform';
    matrix: Mat3x4;
    linear: Mat3;
    normal: Mat3;

    inv_matrix: Mat3x4;
    inv_linear: Mat3;
    object: Hittable;
}

export const create_transform = (matrix: Mat3x4, object: Hittable): ITransform => {
    const linear = mat3x4_to_mat3(matrix);
    const inv_linear = invert_mat3(linear);
    const normal = transpose_mat3(inv_linear);
    const inv_matrix = invert_mat3x4(matrix);

    return {
        type: 'transform',
        matrix,
        linear,
        normal,
        inv_matrix,
        inv_linear,
        object
    };
}

const tmp_aabb = create_empty_aabb();
const tmp_point = point3_dirty();
const new_ray = ray_dirty();

hittable_types.transform = create_hittable_type({
    hit(hittable, r: Ray, t_min: number, t_max: number, hit: HitRecord): boolean {
        const transform = hittable as ITransform;
        const new_origin = mul_mat3x4_vec3(transform.inv_matrix, r.origin);
        const new_direction = mul_mat3_vec3(transform.inv_linear, r.direction);
        ray_set(new_ray, new_origin, new_direction, r.time);

        if (!hittable_types[transform.object.type].hit(transform.object, new_ray, t_min, t_max, hit)) {
            return false;
        }
        mul_mat3x4_vec3_r(hit.p, transform.matrix, hit.p);
        mul_mat3_vec3_r(hit.normal, transform.normal, hit.normal);

        return true;
    },

    get_bounding_box(hittable, time0: number, time1: number, aabb: AABB) {
        const transform = hittable as ITransform;
        hittable_types[transform.object.type].get_bounding_box(transform.object, time0, time1, aabb);
        tmp_aabb.min.fill(Infinity);
        tmp_aabb.max.fill(-Infinity);
        for (let i = 0; i < 8; i++) {
            set_vec3(
                tmp_point,
                i & 1 ? aabb.min[0] : aabb.max[0],
                i & 2 ? aabb.min[1] : aabb.max[1],
                i & 4 ? aabb.min[2] : aabb.max[2],
            );
            mul_mat3x4_vec3_r(tmp_point, transform.matrix, tmp_point);
            union_aabb_point_r(tmp_aabb, aabb, tmp_point);
        }
        aabb.min.set(tmp_aabb.min);
        aabb.max.set(tmp_aabb.max);
    },

    random(hittable, origin: Vec3): Vec3 {
        const transform = hittable as ITransform;
        const new_origin = mul_mat3x4_vec3(transform.inv_matrix, origin);
        const direction = hittable_types[transform.object.type].random(transform.object, new_origin);
        mul_mat3_vec3_r(direction, transform.linear, direction);
        return direction;
    },

    pdf_value(hittable, origin: Vec3, direction: Vec3): number {
        const transform = hittable as ITransform;
        const new_origin = mul_mat3x4_vec3(transform.inv_matrix, origin);
        const new_direction = mul_mat3_vec3(transform.inv_linear, direction);
        return hittable_types[transform.object.type].pdf_value(transform.object, new_origin, new_direction);
    }
});
