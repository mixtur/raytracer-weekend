import { Ray, rayAt2 } from "../ray";
import { Point3, vec3Dot, vec3Sub2, vec3DivS2 } from "../vec3";
import { HitRecord, Hittable, set_face_normal } from "./hittable";

export class Sphere implements Hittable {
    center: Point3;
    radius: number;
    constructor(center: Point3, radius: number) {
        this.center = center;
        this.radius = radius;

    }
    hit(r: Ray, t_min: number, t_max: number): HitRecord | null {
        const {center, radius} = this;

        const oc = vec3Sub2(r.origin, center);
        const a = vec3Dot(r.direction, r.direction);
        const half_b = vec3Dot(oc, r.direction);
        const c = vec3Dot(oc, oc) - radius ** 2;
        const D = half_b * half_b - a * c;
        if (D < 0) return null;
        const sqrt_d = Math.sqrt(D);
        let t = ( -half_b - sqrt_d ) / a;
        if (t < t_min || t_max < t) {
            t = ( -half_b + sqrt_d ) / a;
            if (t < t_min || t_max < t) {
                return null;
            }
        }
        const p = rayAt2(r, t);

        const hit = {
            t,
            p,
            normal: vec3DivS2(vec3Sub2(p, center), radius),
            front_face: false
        };

        set_face_normal(hit, r, hit.normal);

        return hit;
    }
}
