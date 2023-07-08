import { Ray, rayAt2, rayAt3 } from '../ray';
import { Point3, vec3Dot, vec3Sub2, vec3DivS2, vec3, vec3Add2, vec3DivS3, vec3Sub3, vec3Add3 } from '../vec3';
import { HitRecord, Hittable, set_face_normal } from "./hittable";
import { AABB } from './aabb';
import { UV } from '../texture/texture';
import { MegaMaterial } from '../materials/megamaterial';


export function get_sphere_uv(p: Point3): UV {
    // p: a given point on the sphere of radius one, centered at the origin.
    // u: returned value [0,1] of angle around the Y axis from X=-1.
    // v: returned value [0,1] of angle from Y=-1 to Y=+1.

    const theta = Math.acos(-p[1]);
    const phi = Math.atan2(-p[2], p[0]) + Math.PI;
    return {
        u: phi / (2 * Math.PI),
        v: theta / Math.PI
    };
}

export class Sphere implements Hittable {
    center: Point3;
    radius: number;
    material: MegaMaterial;
    constructor(center: Point3, radius: number, material: MegaMaterial) {
        this.center = center;
        this.radius = radius;
        this.material = material;
    }
    hit(r: Ray, t_min: number, t_max: number, hit: HitRecord): boolean {
        const {center, radius} = this;

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
        vec3DivS3(hit.normal, vec3Sub2(p, center), radius)
        hit.t = t;
        hit.material = this.material;
        const { u, v } = get_sphere_uv(hit.normal);
        hit.u = u;
        hit.v = v;

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
}
