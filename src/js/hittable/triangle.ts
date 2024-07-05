import { create_empty_hit_record, HitRecord, Hittable, set_face_normal } from './hittable';
import {
    cross_vec3,
    cross_vec3_r,
    div_vec3_s,
    dot_vec3,
    fma_vec3_s_s_r,
    fma_vec3_s_vec3,
    fma_vec3_s_vec3_r,
    len_vec3,
    mul_vec3_s_r,
    Point3,
    set_vec3,
    sq_len_vec3,
    sub_vec3,
    sub_vec3_r,
    unit_vec3_r,
    Vec3,
    vec3_dirty
} from '../math/vec3.gen';
import { MegaMaterial } from '../materials/megamaterial';
import { AABB } from './aabb';
import { ray_dirty, Ray, ray_set, ray_at_r } from '../math/ray';
import { Texture } from '../texture/texture';
import { columns_to_mat3_r, mat3_dirty, mul_mat3_vec3_r, transpose_mat3, transpose_mat3_r } from '../math/mat3.gen';

const tmp_hit = create_empty_hit_record();
const tmp_ray = ray_dirty();
const tmp_cross = vec3_dirty();

export interface NormalStrategy {
    get_normal(barycentric_weights: Vec3): Vec3;
}

export class ConstantNormal implements NormalStrategy {
    normal: Vec3;
    constructor(positions: TriangleVec3) {
        const u = sub_vec3(positions[1], positions[0]);
        const v = sub_vec3(positions[2], positions[0]);
        this.normal = cross_vec3(u, v);
    }
    get_normal(): Vec3 {
        return this.normal;
    }
}

export class InterpolatedNormal implements NormalStrategy {
    normals: TriangleVec3;
    constructor(normals: TriangleVec3) {
        this.normals = normals;
    }
    get_normal(barycentric_weights: Vec3): Vec3 {
        const result = vec3_dirty();
        interpolate_vec3_r(result, barycentric_weights, this.normals);
        unit_vec3_r(result, result);
        return result;
    }
}

const tangent_space_transform = mat3_dirty();
export class NormalMap implements NormalStrategy {
    uvs: TriangleVec2;
    normals: TriangleVec3;
    //todo: Vec4
    tangents: TriangleVec3;
    tangent_ws: Vec3;
    normal_map: Texture;
    constructor(normals: TriangleVec3, tangents: TriangleVec3, tangent_ws: Vec3, uvs: TriangleVec2, normal_map: Texture) {
        this.normal_map = normal_map;
        this.uvs = uvs;
        this.normals = normals;
        this.tangents = tangents;
        this.tangent_ws = tangent_ws;

    }
    get_normal(barycentric_weights: Vec3): Vec3 {
        const vertex_normal = vec3_dirty();
        interpolate_vec3_r(vertex_normal, barycentric_weights, this.normals);
        unit_vec3_r(vertex_normal, vertex_normal);

        const vertex_tangent = vec3_dirty();
        interpolate_vec3_r(vertex_tangent, barycentric_weights, this.tangents);
        unit_vec3_r(vertex_tangent, vertex_tangent);

        const w = interpolate_scalar(barycentric_weights, this.tangent_ws);

        const bitangent = cross_vec3(vertex_normal, vertex_tangent);
        mul_vec3_s_r(bitangent, bitangent, w);
        unit_vec3_r(bitangent, bitangent);

        //todo: Vec2
        const uvs = vec3_dirty();
        interpolate_vec3_r(uvs, barycentric_weights, this.uvs);

        columns_to_mat3_r(tangent_space_transform, vertex_tangent, bitangent, vertex_normal);

        const result = this.normal_map.value(uvs[0], uvs[1], uvs);

        fma_vec3_s_s_r(result, result, 2, -1);
        mul_mat3_vec3_r(result, tangent_space_transform, result);
        unit_vec3_r(result, result);
        return result;

    }
}

export type TriangleVec2 = [Vec3, Vec3, Vec3];
export type TriangleVec3 = [Vec3, Vec3, Vec3];

export const interpolate_scalar = (barycentric_weights: Vec3, scalars: Vec3) => {
    return scalars[0] * barycentric_weights[0] + scalars[1] * barycentric_weights[1] + scalars[2] * barycentric_weights[2];
}

export const interpolate_vec2_r = (result: Vec3, barycentric_weights: Vec3, vec2s: TriangleVec2): Vec3 => {
    result[0] = vec2s[0][0] * barycentric_weights[0] + vec2s[1][0] * barycentric_weights[1] + vec2s[2][0] * barycentric_weights[2];
    result[1] = vec2s[0][1] * barycentric_weights[0] + vec2s[1][1] * barycentric_weights[1] + vec2s[2][1] * barycentric_weights[2];
    return result;
}

export const interpolate_vec3_r = (result: Vec3, barycentric_weights: Vec3, vec3s: TriangleVec3): Vec3 => {
    result[0] = vec3s[0][0] * barycentric_weights[0] + vec3s[1][0] * barycentric_weights[1] + vec3s[2][0] * barycentric_weights[2];
    result[1] = vec3s[0][1] * barycentric_weights[0] + vec3s[1][1] * barycentric_weights[1] + vec3s[2][1] * barycentric_weights[2];
    result[2] = vec3s[0][2] * barycentric_weights[0] + vec3s[1][2] * barycentric_weights[1] + vec3s[2][2] * barycentric_weights[2];
    return result;
}


const planar_hitpt_vector = vec3_dirty();
const intersection = vec3_dirty();

const barycentric_coordinates = vec3_dirty();

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
    tex_coords: TriangleVec2[];

    constructor(vertex_positions: TriangleVec3, normal_strategy: NormalStrategy, uvs: TriangleVec2[], mat: MegaMaterial) {
        super();

        const a = vertex_positions[0];
        const b = vertex_positions[1];
        const c = vertex_positions[2];

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

        ray_at_r(intersection, r, t);
        sub_vec3_r(planar_hitpt_vector, intersection, this.q);
        cross_vec3_r(tmp_cross, planar_hitpt_vector, this.v)
        const a = dot_vec3(this.w, tmp_cross);
        cross_vec3_r(tmp_cross, this.u, planar_hitpt_vector)
        const b = dot_vec3(this.w, tmp_cross);

        if (!this.is_interior(a, b, hit)) {
            return false;
        }

        hit.t = t;

        set_vec3(barycentric_coordinates, 1 - (a + b), a, b);
        const normal = this.normal_strategy.get_normal(barycentric_coordinates);

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
