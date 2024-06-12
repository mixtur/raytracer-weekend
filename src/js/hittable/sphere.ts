import { ray, Ray, rayAt3, raySet } from '../math/ray';
import { Point3, vec3Dot, vec3, vec3DivS3, vec3Sub3, Vec3, vec3Sub2, vec3SqLen } from '../math/vec3';
import { createEmptyHitRecord, HitRecord, Hittable, set_face_normal } from "./hittable";
import { AABB } from './aabb';
import { UV } from '../texture/texture';
import { MegaMaterial } from '../materials/megamaterial';
import { mat3FromZ1, mulMat3Vec3_2 } from '../math/mat3';
import { clamp } from '../utils';


const tmpHit = createEmptyHitRecord();
const tmpRay = ray(vec3(0, 0, 0), vec3(0, 0, 0), 0);

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

        vec3Sub3(oc, r.origin, center);
        const a = vec3Dot(r.direction, r.direction);
        const half_b = vec3Dot(oc, r.direction);
        const c = vec3Dot(oc, oc) - radius ** 2;
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
        rayAt3(p, r, t);
        vec3Sub3(r_vector, p, center)
        vec3DivS3(hit.normal, r_vector, radius)
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
        raySet(tmpRay, origin, direction, 0);
        if (!this.hit(tmpRay, 0.00001, Infinity, tmpHit)) {
            return 0;
        }
        const cone_axis = vec3Sub2(this.center, origin);
        const cos_theta_max = Math.sqrt(1 - clamp((this.radius ** 2) / vec3SqLen(cone_axis), 0, 1));
        const solid_angle = 2 * Math.PI * (1 - cos_theta_max);

        return 1 / solid_angle;
    }

    random(origin: Vec3): Vec3 {
        const cone_axis = vec3Sub2(this.center, origin);
        const cos_theta_max = Math.sqrt(1 - clamp((this.radius ** 2) / vec3SqLen(cone_axis), 0, 1));
        const r1 = Math.random() * Math.PI * 2;
        const r2 = Math.random();
        const matrix = mat3FromZ1(cone_axis);
        const cosT = 1 + r2 * (cos_theta_max - 1);
        const sinT = Math.sqrt(1 - cosT * cosT);
        const sinP = Math.sin(r1);
        const cosP = Math.cos(r1);

        return mulMat3Vec3_2(matrix, vec3(
            sinT * cosP,
            sinT * sinP,
            cosT
        ));
    }
}
