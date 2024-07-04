import { Ray, ray_at_r, ray_dirty, ray_set } from '../math/ray';
import {
    div_vec3_s_r,
    dot_vec3,
    Point3, rand_vec3_unit, sq_len_vec3, sub_vec3, sub_vec3_r,
    vec3,
    Vec3
} from '../math/vec3.gen';
import { create_empty_hit_record, HitRecord, Hittable, set_face_normal } from "./hittable";
import { AABB } from './aabb';
import { UV } from '../texture/texture';
import { MegaMaterial } from '../materials/megamaterial';
import { mul_quat_vec3, newz_to_quat } from '../math/quat.gen';


const tmp_hit = create_empty_hit_record();
const tmp_ray = ray_dirty();

export function get_sphere_uv(p: Point3, uv: UV): void {
    // p: a given point on the sphere of radius one, centered at the origin.
    // u: returned value [0,1] of angle around the Y axis from X=-1.
    // v: returned value [0,1] of angle from Y=-1 to Y=+1.

    const theta = Math.acos(-p[1]);
    const phi = Math.atan2(-p[2], p[0]) + Math.PI;
    uv.u = phi / (2 * Math.PI);
    uv.v = theta / Math.PI;
}

const oc = vec3(0, 0, 0);
const r_vector = vec3(0, 0, 0);
export class Sphere extends Hittable {
    center: Point3;
    radius: number = NaN;
    material: MegaMaterial;
    constructor(center: Point3, radius: number, material: MegaMaterial) {
        super();
        this.center = center;
        this.radius = radius;
        this.material = material;
    }
    hit(r: Ray, t_min: number, t_max: number, hit: HitRecord): boolean {
        const {center, radius} = this;

        sub_vec3_r(oc, r.origin, center);
        const a = dot_vec3(r.direction, r.direction);
        const half_b = dot_vec3(oc, r.direction);
        const c = dot_vec3(oc, oc) - radius ** 2;
        const D = half_b * half_b - a * c;
        if (D < 1e-10) return false;
        const sqrt_d = Math.sqrt(D);
        let t = ( -half_b - sqrt_d ) / a;
        if (t < t_min || t_max < t) {
            t = ( -half_b + sqrt_d ) / a;
            if (t < t_min || t_max < t) {
                return false;
            }
        }
        const p = hit.p;
        ray_at_r(p, r, t);
        sub_vec3_r(r_vector, p, center)
        div_vec3_s_r(hit.normal, r_vector, radius)
        hit.t = t;
        hit.material = this.material;
        get_sphere_uv(hit.normal, hit);
        set_face_normal(hit, r, hit.normal);

        return true;
    }

    get_bounding_box(time0: number, time1: number, aabb: AABB): void {
        aabb.min[0] = this.center[0] - this.radius;
        aabb.min[1] = this.center[1] - this.radius;
        aabb.min[2] = this.center[2] - this.radius;
        aabb.max[0] = this.center[0] + this.radius;
        aabb.max[1] = this.center[1] + this.radius;
        aabb.max[2] = this.center[2] + this.radius;
    }

    pdf_value(origin: Vec3, direction: Vec3): number {
        ray_set(tmp_ray, origin, direction, 0);
        if (!this.hit(tmp_ray, 0.00001, Infinity, tmp_hit)) {
            return 0;
        }
        const cone_axis = sub_vec3(this.center, origin);
        const radius_2 = this.radius ** 2;
        const cone_axis_sq_len = sq_len_vec3(cone_axis);
        if (cone_axis_sq_len <= radius_2) {
            return 1 / (Math.PI * 4);
        }

        const cos_theta_max = Math.sqrt(1 - radius_2 / cone_axis_sq_len);
        const solid_angle = 2 * Math.PI * (1 - cos_theta_max);

        return 1 / solid_angle;
    }

    random(origin: Vec3): Vec3 {
        const cone_axis = sub_vec3(this.center, origin);
        const radius_2 = this.radius ** 2;
        const cone_axis_sq_len = sq_len_vec3(cone_axis);
        if (cone_axis_sq_len <= radius_2) {
            return rand_vec3_unit();
        }

        const cos_theta_max = Math.sqrt(1 - radius_2 / cone_axis_sq_len);
        const r1 = Math.random() * Math.PI * 2;
        const r2 = Math.random();
        const quat = newz_to_quat(cone_axis);
        const cos_t = 1 + r2 * (cos_theta_max - 1);
        const sin_t = Math.sqrt(1 - cos_t * cos_t);
        const cos_p = Math.cos(r1);
        const sin_p = Math.sin(r1);

        return mul_quat_vec3(quat, vec3(
            sin_t * cos_p,
            sin_t * sin_p,
            cos_t
        ));
    }
}
