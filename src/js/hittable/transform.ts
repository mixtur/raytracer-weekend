import { HitRecord, Hittable, set_face_normal } from './hittable';
import {
    invert_mat3,
    invert_mat3x4,
    Mat3,
    Mat3x4,
    mat3x4_to_mat3,
    mul_mat3_vec3, mul_mat3_vec3_r,
    mul_mat3x4_vec3, mul_mat3x4_vec3_r
} from '../math/mat3.gen';
import { ray, Ray } from '../math/ray';
import { AABB } from './aabb';
import { point3_dirty, set_vec3, Vec3 } from '../math/vec3.gen';

const tmp_aabb = AABB.createEmpty();
const tmp_point = point3_dirty();
export class Transform implements Hittable {
    matrix: Mat3x4;
    linear: Mat3;

    inv_matrix: Mat3x4;
    inv_linear: Mat3;
    object: Hittable;
    constructor(matrix: Mat3x4, object: Hittable) {
        this.matrix = matrix;
        this.linear = mat3x4_to_mat3(matrix);

        this.object = object;
        this.inv_matrix = invert_mat3x4(matrix);
        this.inv_linear = invert_mat3(this.linear);
    }

    hit(r: Ray, t_min: number, t_max: number, hit: HitRecord): boolean {
        const new_origin = mul_mat3x4_vec3(this.inv_matrix, r.origin);
        const new_direction = mul_mat3_vec3(this.inv_linear, r.direction);
        const new_ray = ray(new_origin, new_direction, r.time);

        if (!this.object.hit(new_ray, t_min, t_max, hit)) {
            return false;
        }
        mul_mat3x4_vec3_r(hit.p, this.matrix, hit.p);
        mul_mat3_vec3_r(hit.normal, this.linear, hit.normal);
        set_face_normal(hit, new_ray, hit.normal);

        return true;
    }

    get_bounding_box(time0: number, time1: number, aabb: AABB) {
        this.object.get_bounding_box(time0, time1, aabb);
        tmp_aabb.min.fill(Infinity);
        tmp_aabb.max.fill(-Infinity);
        for (let i = 0; i < 8; i++) {
            set_vec3(
                tmp_point,
                i & 1 ? aabb.min[0] : aabb.max[0],
                i & 2 ? aabb.min[1] : aabb.max[1],
                i & 4 ? aabb.min[2] : aabb.max[2],
            );
            mul_mat3x4_vec3_r(tmp_point, this.matrix, tmp_point);
            tmp_aabb.consumePoint(tmp_point);
        }
        aabb.min.set(tmp_aabb.min);
        aabb.max.set(tmp_aabb.max);
    }

    random(origin: Vec3): Vec3 {
        const new_origin = mul_mat3x4_vec3(this.inv_matrix, origin);
        const direction = this.object.random(new_origin);
        mul_mat3_vec3_r(direction, this.linear, direction);
        return direction;
    }

    pdf_value(origin: Vec3, direction: Vec3): number {
        const new_origin = mul_mat3x4_vec3(this.inv_matrix, origin);
        const new_direction = mul_mat3_vec3(this.inv_linear, direction);
        return this.object.pdf_value(new_origin, new_direction);
    }
}
