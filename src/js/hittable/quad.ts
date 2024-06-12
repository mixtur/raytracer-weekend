import { create_empty_hit_record, HitRecord, Hittable, set_face_normal } from './hittable';
import {
    Point3, vec3,
    Vec3,
    vec3_add_2,
    vec3_add_3,
    vec3_cross2, vec3_divs_2,
    vec3_dot, vec3_len, vec3_muls_addv_3, vec3_muls_addv_4, vec3_sq_len,
    vec3_sub_2, vec3_sub_3,
    vec3_unit2
} from '../math/vec3';
import { MegaMaterial } from '../materials/megamaterial';
import { AABB } from './aabb';
import { ray, Ray, ray_at2, ray_set } from '../math/ray';

const tmp_hit = create_empty_hit_record();
const tmp_ray = ray(vec3(0, 0, 0), vec3(0, 0, 0), 0);

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
        this.normal = vec3_cross2(u, v);
        this.area = vec3_len(this.normal);
        this.w = vec3_divs_2(this.normal, vec3_dot(this.normal, this.normal));
        vec3_unit2(this.normal, this.normal);
        this.d = vec3_dot(q, this.normal);

        this.aabb = AABB.createEmpty();
        this.aabb.consumePoint(q);

        const t = vec3_add_2(q, u);
        this.aabb.consumePoint(t);
        vec3_add_3(t, q, v);
        this.aabb.consumePoint(t);
        vec3_add_3(t, t, u);
        this.aabb.consumePoint(t);

        this.aabb.expand(0.0001);
    }

    get_bounding_box(time0: number, time1: number, aabb: AABB) {
        aabb.min.set(this.aabb.min);
        aabb.max.set(this.aabb.max);
    }

    hit(r: Ray, t_min: number, t_max: number, hit: HitRecord): boolean {
        const denom = vec3_dot(this.normal, r.direction);

        if (Math.abs(denom) < 1e-8) {
            return false;
        }

        const t = (this.d - vec3_dot(this.normal, r.origin)) / denom;
        if (t < t_min || t > t_max) {
            return false;
        }

        const intersection = ray_at2(r, t);
        const planar_hitpt_vector = vec3_sub_2(intersection, this.q);
        const a = vec3_dot(this.w, vec3_cross2(planar_hitpt_vector, this.v));
        const b = vec3_dot(this.w, vec3_cross2(this.u, planar_hitpt_vector));

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
        ray_set(tmp_ray, origin, direction, 0);
        if (!this.hit(tmp_ray, 0.00001, Infinity, tmp_hit)) {
            return 0;
        }

        const distance_squared = tmp_hit.t * tmp_hit.t * vec3_sq_len(direction);
        const cos = Math.abs(vec3_dot(direction, this.normal)) / vec3_len(direction);

        return distance_squared / (cos * this.area);
    }

    random(origin: Vec3): Vec3 {
        const r1 = Math.random();
        const r2 = Math.random();
        const p = vec3_muls_addv_3(this.u, r1, this.q);
        vec3_muls_addv_4(p, this.v, r2, p);
        vec3_sub_3(p, p, origin);
        return p;
    }
}
