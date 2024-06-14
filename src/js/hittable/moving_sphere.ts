import { Ray, ray_at3 } from '../math/ray';
import { Point3, vec3_dot, vec3, vec3_divs_3, vec3_mix4, Vec3, vec3_sub_3 } from '../math/vec3';
import { HitRecord, Hittable, set_face_normal } from "./hittable";
import { AABB } from './aabb';
import { get_sphere_uv } from './sphere';
import { MegaMaterial } from '../materials/megamaterial';

const tmp1 = vec3(0, 0, 0);
const tmp2 = vec3(0, 0, 0);
const oc = vec3(0, 0, 0);
const r_vector = vec3(0, 0, 0);
export class MovingSphere extends Hittable {
    center0: Point3;
    center1: Point3;
    time0: number;
    time1: number;
    dt: number;
    radius: number;
    material: MegaMaterial;

    get_center(result: Vec3, time: number): void {
        const p = (time - this.time0) / this.dt;
        vec3_mix4(result, this.center0, this.center1, p);
    }

    constructor(center0: Point3, center1: Point3, time0: number, time1: number, radius: number, material: MegaMaterial) {
        super();
        this.center0 = center0;
        this.center1 = center1;
        this.time0 = time0;
        this.time1 = time1;
        this.dt = time1 - time0;
        this.radius = radius;
        this.material = material;
    }

    hit(r: Ray, t_min: number, t_max: number, hit: HitRecord): boolean {
        const {radius} = this;
        const center = tmp1;
        this.get_center(center, r.time);

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
        vec3_divs_3(hit.normal, r_vector, radius);
        hit.t = t;
        hit.material = this.material;
        get_sphere_uv(hit.normal, hit);
        set_face_normal(hit, r, hit.normal);

        return true;
    }

    get_bounding_box(time0: number, time1: number, aabb: AABB): void {
        const c0 = tmp1;
        const c1 = tmp2;

        this.get_center(c0, time0);
        this.get_center(c1, time1);
        aabb.min[0] = Math.min(c0[0], c1[0]) - this.radius;
        aabb.min[1] = Math.min(c0[1], c1[1]) - this.radius;
        aabb.min[2] = Math.min(c0[2], c1[2]) - this.radius;
        aabb.max[0] = Math.max(c0[0], c1[0]) + this.radius;
        aabb.max[1] = Math.max(c0[1], c1[1]) + this.radius;
        aabb.max[2] = Math.max(c0[2], c1[2]) + this.radius;
    }
}
