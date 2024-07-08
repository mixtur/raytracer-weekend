import {
    Hittable,
    create_empty_hit_record, create_hittable_type,
    HitRecord,
    hittable_types,
    set_face_normal
} from './hittable';
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
import { AABB, union_aabb_point_r, create_empty_aabb, expand_aabb_r } from '../math/aabb';
import { ray_dirty, Ray, ray_set, ray_at_r } from '../math/ray';
import { Texture } from '../texture/texture';
import { columns_to_mat3_r, mat3_dirty, mul_mat3_vec3_r, transpose_mat3, transpose_mat3_r } from '../math/mat3.gen';

const tmp_hit = create_empty_hit_record();
const tmp_ray = ray_dirty();
const tmp_cross = vec3_dirty();

export type INormalStrategy = {
    type: 'constant';
    normal: Vec3;
} | {
    type: 'interpolated';
    normals: TriangleVec3;
} | {
    type: 'normal-map';
    uvs: TriangleVec2;
    normals: TriangleVec3;
    //todo: Vec4
    tangents: TriangleVec3;
    tangent_ws: Vec3;
    normal_map: Texture;
} | {
    type: 'unknown'// to make typescript happier in the default case
}

export const create_constant_normal = (positions: TriangleVec3): INormalStrategy => {
    const u = sub_vec3(positions[1], positions[0]);
    const v = sub_vec3(positions[2], positions[0]);
    const normal = cross_vec3(u, v);
    return {
        type: 'constant',
        normal
    };
};

export const create_interpolated_normal = (normals: TriangleVec3): INormalStrategy => {
    return {
        type: 'interpolated',
        normals
    };
};

export const create_normal_map = (normals: TriangleVec3, tangents: TriangleVec3, tangent_ws: Vec3, uvs: TriangleVec2, normal_map: Texture): INormalStrategy => {
    return {
        type: 'normal-map',
        normals,
        tangents,
        tangent_ws,
        uvs,
        normal_map
    };
}

const tangent_space_transform = mat3_dirty();
export const get_normal = (normal_strategy: INormalStrategy, barycentric_weights: Vec3): Vec3 => {
    if (normal_strategy.type === 'constant') return normal_strategy.normal;
    if (normal_strategy.type === 'interpolated') {
        const result = vec3_dirty();
        interpolate_vec3_r(result, barycentric_weights, normal_strategy.normals);
        unit_vec3_r(result, result);
        return result;
    }
    if (normal_strategy.type === 'normal-map') {
        const vertex_normal = vec3_dirty();
        interpolate_vec3_r(vertex_normal, barycentric_weights, normal_strategy.normals);
        unit_vec3_r(vertex_normal, vertex_normal);

        const vertex_tangent = vec3_dirty();
        interpolate_vec3_r(vertex_tangent, barycentric_weights, normal_strategy.tangents);
        unit_vec3_r(vertex_tangent, vertex_tangent);

        const w = interpolate_scalar(barycentric_weights, normal_strategy.tangent_ws);

        const bitangent = cross_vec3(vertex_normal, vertex_tangent);
        mul_vec3_s_r(bitangent, bitangent, w);
        unit_vec3_r(bitangent, bitangent);

        //todo: Vec2
        const uvs = vec3_dirty();
        interpolate_vec3_r(uvs, barycentric_weights, normal_strategy.uvs);

        columns_to_mat3_r(tangent_space_transform, vertex_tangent, bitangent, vertex_normal);

        const result = normal_strategy.normal_map.value(uvs[0], uvs[1], uvs);

        fma_vec3_s_s_r(result, result, 2, -1);
        mul_mat3_vec3_r(result, tangent_space_transform, result);
        unit_vec3_r(result, result);
        return result;
    }
    throw new Error(`unknown normal strategy ${normal_strategy.type}`);
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

export interface ITriangle extends Hittable {
    type: 'triangle',
    q: Point3;
    u: Vec3;
    v: Vec3;
    mat: MegaMaterial;
    aabb: AABB;
    normal: Vec3;
    w: Vec3;
    d: number;
    area: number;
    normal_strategy: INormalStrategy;
    //todo: Vec2
    tex_coords: TriangleVec2[];
}

export const create_triangle = (vertex_positions: TriangleVec3, normal_strategy: INormalStrategy, tex_coords: TriangleVec2[], mat: MegaMaterial): ITriangle => {
    const a = vertex_positions[0];
    const b = vertex_positions[1];
    const c = vertex_positions[2];

    const q = a;
    const u = sub_vec3(b, a);
    const v = sub_vec3(c, a);

    const normal = cross_vec3(u, v);
    const area = len_vec3(normal);
    const w = div_vec3_s(normal, dot_vec3(normal, normal));
    unit_vec3_r(normal, normal);
    const d = dot_vec3(q, normal);

    const aabb = create_empty_aabb();
    union_aabb_point_r(aabb, aabb, a);
    union_aabb_point_r(aabb, aabb, b);
    union_aabb_point_r(aabb, aabb, c);

    expand_aabb_r(aabb, aabb, 0.0001);

    return {
        type: 'triangle',
        q, u, v, w, d,
        normal,
        area,
        aabb,
        normal_strategy,
        tex_coords,
        mat
    };
};

const is_triangle_interior = (a: number, b: number, hit: HitRecord): boolean => {
    if (a < 0 || a > 1 || b < 0 || b > 1 || (a + b) > 1) {
        return false;
    }

    hit.u = a;
    hit.v = b;

    return true;
};

//todo: make triangles indexed (mesh-hittable?)
hittable_types.triangle = create_hittable_type({
    get_bounding_box(hittable, time0: number, time1: number, aabb: AABB) {
        const triangle = hittable as ITriangle;
        aabb.min.set(triangle.aabb.min);
        aabb.max.set(triangle.aabb.max);
    },

    hit(hittable, r: Ray, t_min: number, t_max: number, hit: HitRecord): boolean {
        const triangle = hittable as ITriangle;
        const denom = dot_vec3(triangle.normal, r.direction);

        if (Math.abs(denom) < 1e-8) {
            return false;
        }

        const t = (triangle.d - dot_vec3(triangle.normal, r.origin)) / denom;
        if (t < t_min || t > t_max) {
            return false;
        }

        ray_at_r(intersection, r, t);
        sub_vec3_r(planar_hitpt_vector, intersection, triangle.q);
        cross_vec3_r(tmp_cross, planar_hitpt_vector, triangle.v)
        const a = dot_vec3(triangle.w, tmp_cross);
        cross_vec3_r(tmp_cross, triangle.u, planar_hitpt_vector)
        const b = dot_vec3(triangle.w, tmp_cross);

        if (!is_triangle_interior(a, b, hit)) {
            return false;
        }

        hit.t = t;

        set_vec3(barycentric_coordinates, 1 - (a + b), a, b);
        const normal = get_normal(triangle.normal_strategy, barycentric_coordinates);

        hit.normal.set(normal);
        hit.p.set(intersection);
        hit.material = triangle.mat;
        hit.tex_channels = triangle.tex_coords;
        set_face_normal(hit, r, triangle.normal, normal);

        return true;
    },

    pdf_value(hittable, origin: Vec3, direction: Vec3): number {
        const triangle = hittable as ITriangle;
        ray_set(tmp_ray, origin, direction, 0);
        if (!this.hit(triangle, tmp_ray, 0.00001, Infinity, tmp_hit)) {
            return 0;
        }

        const distance_squared = tmp_hit.t * tmp_hit.t * sq_len_vec3(direction);
        const cos = Math.abs(dot_vec3(direction, triangle.normal)) / len_vec3(direction);

        return distance_squared / (cos * triangle.area);
    },

    random(hittable, origin: Vec3): Vec3 {
        const triangle = hittable as ITriangle;
        const r1 = Math.random();
        const r2 = Math.random();
        const p = fma_vec3_s_vec3(triangle.u, r1, triangle.q);
        fma_vec3_s_vec3_r(p, triangle.v, r2, p);
        sub_vec3_r(p, p, origin);
        return p;
    }
});
