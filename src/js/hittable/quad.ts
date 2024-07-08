import {
    Hittable,
    create_empty_hit_record, create_hittable_type,
    HitRecord,
    hittable_types,
    set_face_normal
} from './hittable';
import {
    add_vec3, add_vec3_r,
    cross_vec3, cross_vec3_r, div_vec3_s, dot_vec3, fma_vec3_s_vec3, fma_vec3_s_vec3_r, len_vec3,
    Point3, sq_len_vec3, sub_vec3, sub_vec3_r, unit_vec3_r, vec3,
    Vec3
} from '../math/vec3.gen';
import { MegaMaterial } from '../materials/megamaterial';
import { AABB, union_aabb_point_r, create_empty_aabb, expand_aabb_r } from '../math/aabb';
import { Ray, ray_at, ray_dirty, ray_set } from '../math/ray';

const tmp_hit = create_empty_hit_record();
const tmp_ray = ray_dirty();
const tmp_cross = vec3(0, 0, 0);

export interface IQuad extends Hittable {
    type: 'quad';
    q: Point3;
    u: Vec3;
    v: Vec3;
    mat: MegaMaterial;
    aabb: AABB;
    normal: Vec3;
    w: Vec3;
    d: number;
    area: number;
}

export const create_quad = (q: Point3, u: Vec3, v: Vec3, mat: MegaMaterial): IQuad => {
    const normal = cross_vec3(u, v);
    const area = len_vec3(normal);
    const w = div_vec3_s(normal, dot_vec3(normal, normal));
    unit_vec3_r(normal, normal);
    const d = dot_vec3(q, normal);

    const aabb = create_empty_aabb();
    union_aabb_point_r(aabb, aabb, q);

    const t = add_vec3(q, u);
    union_aabb_point_r(aabb, aabb, t);
    add_vec3_r(t, q, v);
    union_aabb_point_r(aabb, aabb, t);
    add_vec3_r(t, t, u);
    union_aabb_point_r(aabb, aabb, t);

    expand_aabb_r(aabb, aabb, 0.0001);

    return {
        type: 'quad',
        q, u, v,
        mat,
        aabb,
        normal,
        w, d,
        area
    };
}

const is_quad_interior = (a: number, b: number, hit: HitRecord): boolean => {
    if (a < 0 || a > 1 || b < 0 || b > 1) {
        return false;
    }

    hit.u = a;
    hit.v = b;

    return true;
};

hittable_types.quad = create_hittable_type({
    get_bounding_box(hittable, time0: number, time1: number, aabb: AABB) {
        const quad = hittable as IQuad;
        aabb.min.set(quad.aabb.min);
        aabb.max.set(quad.aabb.max);
    },

    hit(hittable, r: Ray, t_min: number, t_max: number, hit: HitRecord): boolean {
        const quad = hittable as IQuad;
        const denom = dot_vec3(quad.normal, r.direction);

        if (Math.abs(denom) < 1e-8) {
            return false;
        }

        const t = (quad.d - dot_vec3(quad.normal, r.origin)) / denom;
        if (t < t_min || t > t_max) {
            return false;
        }

        const intersection = ray_at(r, t);
        const planar_hitpt_vector = sub_vec3(intersection, quad.q);
        cross_vec3_r(tmp_cross, planar_hitpt_vector, quad.v)
        const a = dot_vec3(quad.w, tmp_cross);
        cross_vec3_r(tmp_cross, quad.u, planar_hitpt_vector)
        const b = dot_vec3(quad.w, tmp_cross);

        if (!is_quad_interior(a, b, hit)) {
            return false;
        }

        hit.t = t;
        hit.normal.set(quad.normal);
        hit.p.set(intersection);
        hit.material = quad.mat;
        set_face_normal(hit, r, quad.normal, hit.normal);

        return true;
    },

    pdf_value(hittable, origin: Vec3, direction: Vec3): number {
        const quad = hittable as IQuad;
        ray_set(tmp_ray, origin, direction, 0);
        if (!this.hit(quad, tmp_ray, 0.00001, Infinity, tmp_hit)) {
            return 0;
        }

        const distance_squared = tmp_hit.t * tmp_hit.t * sq_len_vec3(direction);
        const cos = Math.abs(dot_vec3(direction, quad.normal)) / len_vec3(direction);

        return distance_squared / (cos * quad.area);
    },

    random(hittable, origin: Vec3): Vec3 {
        const quad = hittable as IQuad;
        const r1 = Math.random();
        const r2 = Math.random();
        const p = fma_vec3_s_vec3(quad.u, r1, quad.q);
        fma_vec3_s_vec3_r(p, quad.v, r2, p);
        sub_vec3_r(p, p, origin);
        return p;
    }
});
