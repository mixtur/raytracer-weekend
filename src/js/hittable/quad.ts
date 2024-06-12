import { createEmptyHitRecord, HitRecord, Hittable, set_face_normal } from './hittable';
import {
    Point3, vec3,
    Vec3,
    vec3Add2,
    vec3Add3,
    vec3Cross2, vec3DivS2,
    vec3Dot, vec3Len, vec3MulSAddV3, vec3MulSAddV4, vec3SqLen,
    vec3Sub2, vec3Sub3,
    vec3Unit2
} from '../math/vec3';
import { MegaMaterial } from '../materials/megamaterial';
import { AABB } from './aabb';
import { ray, Ray, rayAt2, raySet } from '../math/ray';

const tmpHit = createEmptyHitRecord();
const tmpRay = ray(vec3(0, 0, 0), vec3(0, 0, 0), 0);

export class Quad extends Hittable {
    q: Point3;
    u: Vec3;
    v: Vec3;
    mat: MegaMaterial;
    aabb: AABB;
    normal: Vec3;
    w: Vec3;
    d: number;
    area: number;

    constructor(q: Point3, u: Vec3, v: Vec3, mat: MegaMaterial) {
        super();
        this.q = q;
        this.u = u;
        this.v = v;
        this.mat = mat;
        this.normal = vec3Cross2(u, v);
        this.area = vec3Len(this.normal);
        this.w = vec3DivS2(this.normal, vec3Dot(this.normal, this.normal));
        vec3Unit2(this.normal, this.normal);
        this.d = vec3Dot(q, this.normal);

        this.aabb = AABB.createEmpty();
        this.aabb.consumePoint(q);

        const t = vec3Add2(q, u);
        this.aabb.consumePoint(t);
        vec3Add3(t, q, v);
        this.aabb.consumePoint(t);
        vec3Add3(t, t, u);
        this.aabb.consumePoint(t);

        this.aabb.expand(0.0001);
    }

    get_bounding_box(time0: number, time1: number, aabb: AABB) {
        aabb.min.set(this.aabb.min);
        aabb.max.set(this.aabb.max);
    }

    hit(r: Ray, t_min: number, t_max: number, hit: HitRecord): boolean {
        const denom = vec3Dot(this.normal, r.direction);

        if (Math.abs(denom) < 1e-8) {
            return false;
        }

        const t = (this.d - vec3Dot(this.normal, r.origin)) / denom;
        if (t < t_min || t > t_max) {
            return false;
        }

        const intersection = rayAt2(r, t);
        const planar_hitpt_vector = vec3Sub2(intersection, this.q);
        const a = vec3Dot(this.w, vec3Cross2(planar_hitpt_vector, this.v));
        const b = vec3Dot(this.w, vec3Cross2(this.u, planar_hitpt_vector));

        if (!this.is_interior(a, b, hit)) {
            return false;
        }

        hit.t = t;
        hit.normal.set(this.normal);
        hit.p.set(intersection);
        hit.material = this.mat;
        set_face_normal(hit, r, this.normal);

        return true;
    }

    is_interior(a: number, b: number, hit: HitRecord): boolean {
        if (a < 0 || a > 1 || b < 0 || b > 1) {
            return false;
        }

        hit.u = a;
        hit.v = b;

        return true;
    }

    pdf_value(origin: Vec3, direction: Vec3): number {
        raySet(tmpRay, origin, direction, 0);
        if (!this.hit(tmpRay, 0.00001, Infinity, tmpHit)) {
            return 0;
        }

        const distance_squared = tmpHit.t * tmpHit.t * vec3SqLen(direction);
        const cos = Math.abs(vec3Dot(direction, this.normal)) / vec3Len(direction);

        return distance_squared / (cos * this.area);
    }

    random(origin: Vec3): Vec3 {
        const r1 = Math.random();
        const r2 = Math.random();
        const p = vec3MulSAddV3(this.u, r1, this.q);
        vec3MulSAddV4(p, this.v, r2, p);
        vec3Sub3(p, p, origin);
        return p;
    }
}
