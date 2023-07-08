import { Ray, rayAt2, rayAt3 } from '../ray';
import { Point3, vec3Dot, vec3Sub2, vec3DivS2, vec3Mix3, vec3, vec3DivS3 } from '../vec3';
import { HitRecord, Hittable, set_face_normal } from "./hittable";
import { AABB } from './aabb';
import { get_sphere_uv } from './sphere';
import { MegaMaterial } from '../materials/megamaterial';

export class MovingSphere implements Hittable {
    center0: Point3;
    center1: Point3;
    time0: number;
    time1: number;
    dt: number;
    radius: number;
    material: MegaMaterial;

    get_center(time: number) {
        const p = (time - this.time0) / this.dt;
        return vec3Mix3(this.center0, this.center1, p);
    }

    constructor(center0: Point3, center1: Point3, time0: number, time1: number, radius: number, material: MegaMaterial) {
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
        const center = this.get_center(r.time);

        const oc = vec3Sub2(r.origin, center);
        const a = vec3Dot(r.direction, r.direction);
        const half_b = vec3Dot(oc, r.direction);
        const c = vec3Dot(oc, oc) - radius ** 2;
        const D = half_b * half_b - a * c;
        if (D < 0) return false;
        const sqrt_d = Math.sqrt(D);
        let t = ( -half_b - sqrt_d ) / a;
        if (t < t_min || t_max < t) {
            t = ( -half_b + sqrt_d ) / a;
            if (t < t_min || t_max < t) {
                return false;
            }
        }
        const p = hit.p;
        rayAt3(p, r, t);
        vec3DivS3(hit.normal, vec3Sub2(p, center), radius);
        hit.t = t;
        hit.material = this.material;
        const { u, v } = get_sphere_uv(hit.normal);
        hit.u = u;
        hit.v = v;

        set_face_normal(hit, r, hit.normal);

        return true;
    }

    get_bounding_box(time0: number, time1: number, aabb: AABB): void {
        const c0 = this.get_center(time0);
        const c1 = this.get_center(time1);
        aabb.min[0] = Math.min(c0[0], c1[0]) - this.radius;
        aabb.min[1] = Math.min(c0[1], c1[1]) - this.radius;
        aabb.min[2] = Math.min(c0[2], c1[2]) - this.radius;
        aabb.max[0] = Math.max(c0[0], c1[0]) + this.radius;
        aabb.max[1] = Math.max(c0[1], c1[1]) + this.radius;
        aabb.max[2] = Math.max(c0[2], c1[2]) + this.radius;
    }
}
