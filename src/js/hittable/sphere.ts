import { ray, Ray, ray_at3, ray_set } from '../math/ray';
import { Point3, vec3_dot, vec3, vec3_divs_3, vec3_sub_3, Vec3, vec3_sub_2, vec3_sq_len } from '../math/vec3';
import { create_empty_hit_record, HitRecord, Hittable, set_face_normal } from "./hittable";
import { AABB } from './aabb';
import { UV } from '../texture/texture';
import { MegaMaterial } from '../materials/megamaterial';
import { clamp } from '../utils';
import { mul_quat_vec3_2, quat_from_z_1 } from '../math/quat';


const tmp_hit = create_empty_hit_record();
const tmp_ray = ray(vec3(0, 0, 0), vec3(0, 0, 0), 0);

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

        vec3_sub_3(oc, r.origin, center);
        const a = vec3_dot(r.direction, r.direction);
        const half_b = vec3_dot(oc, r.direction);
        const c = vec3_dot(oc, oc) - radius ** 2;
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
        ray_at3(p, r, t);
        vec3_sub_3(r_vector, p, center)
        vec3_divs_3(hit.normal, r_vector, radius)
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
        const cone_axis = vec3_sub_2(this.center, origin);
        const cos_theta_max = Math.sqrt(1 - clamp((this.radius ** 2) / vec3_sq_len(cone_axis), 0, 1));
        const solid_angle = 2 * Math.PI * (1 - cos_theta_max);

        return 1 / solid_angle;
    }

    random(origin: Vec3): Vec3 {
        const cone_axis = vec3_sub_2(this.center, origin);
        const cos_theta_max = Math.sqrt(1 - clamp((this.radius ** 2) / vec3_sq_len(cone_axis), 0, 1));
        const r1 = Math.random() * Math.PI * 2;
        const r2 = Math.random();
        const quat = quat_from_z_1(cone_axis);
        const cos_t = 1 + r2 * (cos_theta_max - 1);
        const sin_t = Math.sqrt(1 - cos_t * cos_t);
        const cos_p = Math.cos(r1);
        const sin_p = Math.sin(r1);

        return mul_quat_vec3_2(quat, vec3(
            sin_t * cos_p,
            sin_t * sin_p,
            cos_t
        ));
    }
}
