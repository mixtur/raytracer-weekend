import { create_empty_hit_record, HitRecord, Hittable, set_face_normal } from './hittable';
import {
    add_vec3, add_vec3_r,
    cross_vec3, cross_vec3_r, div_vec3_s, dot_vec3, fma_vec3_s_vec3, fma_vec3_s_vec3_r, len_vec3,
    Point3, sq_len_vec3, sub_vec3, sub_vec3_r, unit_vec3, unit_vec3_r, vec3,
    Vec3
} from '../math/vec3.gen';
import { MegaMaterial } from '../materials/megamaterial';
import { AABB } from './aabb';
import { ray, Ray, ray_at2, ray_set } from '../math/ray';

const tmp_hit = create_empty_hit_record();
const tmp_ray = ray(vec3(0, 0, 0), vec3(0, 0, 0), 0);
const tmp_cross = vec3(0, 0, 0);

export interface NormalStrategy {
    get_normal(wb: number, wc: number): Vec3;
}

export class ConstantNormal implements NormalStrategy {
    normal: Vec3;
    constructor(a: Point3, b: Point3, c: Point3) {
        const u = sub_vec3(b, a);
        const v = sub_vec3(c, a);
        this.normal = cross_vec3(u, v);
    }
    get_normal(): Vec3 {
        return this.normal;
    }
}

export class InterpolatedNormal implements NormalStrategy {
    na: Vec3;
    nb: Vec3;
    nc: Vec3;
    constructor(na: Vec3, nb: Vec3, nc: Vec3) {
        this.na = na;
        this.nb = nb;
        this.nc = nc;
    }
    get_normal(wb: number, wc: number): Vec3 {
        const wa = 1 - (wb + wc);
        const {na, nb, nc} = this;
        const result = vec3(
            na[0] * wa + nb[0] * wb + nc[0] * wc,
            na[1] * wa + nb[1] * wb + nc[1] * wc,
            na[2] * wa + nb[2] * wb + nc[2] * wc
        );
        unit_vec3_r(result, result);
        return result;
    }
}

export type TriangleUV = [Vec3, Vec3, Vec3];

export const get_tex_coords_r = (result: Vec3, wb: number, wc: number, tex_coords: TriangleUV): Vec3 => {
    const wa = 1 - (wb + wc);

    result[0] = tex_coords[0][0] * wa + tex_coords[1][0] * wb + tex_coords[2][0] * wc;
    result[1] = tex_coords[0][1] * wa + tex_coords[1][1] * wb + tex_coords[2][1] * wc;
    return result;
}

//todo: make triangles indexed (mesh-hittable?)
export class Triangle extends Hittable {
    q: Point3;
    u: Vec3;
    v: Vec3;
    mat: MegaMaterial;
    aabb: AABB;
    normal: Vec3;
    w: Vec3;
    d: number;
    area: number;
    normal_strategy: NormalStrategy;
    //todo: Vec2
    tex_coords: TriangleUV[];

    constructor(a: Point3, b: Point3, c: Point3, normal_strategy: NormalStrategy, uvs: TriangleUV[], mat: MegaMaterial) {
        super();

        const q = a;
        const u = sub_vec3(b, a);
        const v = sub_vec3(c, a);

        this.normal_strategy = normal_strategy;
        this.tex_coords = uvs;

        this.q = q;
        this.u = u;
        this.v = v;
        this.mat = mat;
        this.normal = cross_vec3(u, v);
        this.area = len_vec3(this.normal);
        this.w = div_vec3_s(this.normal, dot_vec3(this.normal, this.normal));
        unit_vec3_r(this.normal, this.normal);
        this.d = dot_vec3(q, this.normal);

        this.aabb = AABB.createEmpty();
        this.aabb.consumePoint(a);
        this.aabb.consumePoint(b);
        this.aabb.consumePoint(c);

        this.aabb.expand(0.0001);
    }

    get_bounding_box(time0: number, time1: number, aabb: AABB) {
        aabb.min.set(this.aabb.min);
        aabb.max.set(this.aabb.max);
    }

    hit(r: Ray, t_min: number, t_max: number, hit: HitRecord): boolean {
        const denom = dot_vec3(this.normal, r.direction);

        if (Math.abs(denom) < 1e-8) {
            return false;
        }

        const t = (this.d - dot_vec3(this.normal, r.origin)) / denom;
        if (t < t_min || t > t_max) {
            return false;
        }

        const intersection = ray_at2(r, t);
        const planar_hitpt_vector = sub_vec3(intersection, this.q);
        cross_vec3_r(tmp_cross, planar_hitpt_vector, this.v)
        const a = dot_vec3(this.w, tmp_cross);
        cross_vec3_r(tmp_cross, this.u, planar_hitpt_vector)
        const b = dot_vec3(this.w, tmp_cross);

        if (!this.is_interior(a, b, hit)) {
            return false;
        }

        hit.t = t;

        const normal = this.normal_strategy.get_normal(a, b);

        hit.normal.set(normal);
        hit.p.set(intersection);
        hit.material = this.mat;
        hit.tex_channels = this.tex_coords;
        set_face_normal(hit, r, normal);

        return true;
    }

    is_interior(a: number, b: number, hit: HitRecord): boolean {
        if (a < 0 || a > 1 || b < 0 || b > 1 || (a + b) > 1) {
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

        const distance_squared = tmp_hit.t * tmp_hit.t * sq_len_vec3(direction);
        const cos = Math.abs(dot_vec3(direction, this.normal)) / len_vec3(direction);

        return distance_squared / (cos * this.area);
    }

    random(origin: Vec3): Vec3 {
        const r1 = Math.random();
        const r2 = Math.random();
        const p = fma_vec3_s_vec3(this.u, r1, this.q);
        fma_vec3_s_vec3_r(p, this.v, r2, p);
        sub_vec3_r(p, p, origin);
        return p;
    }
}
