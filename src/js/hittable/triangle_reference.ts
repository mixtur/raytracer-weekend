import { create_hittable_type, Hittable, hittable_types } from './hittable';
import { MegaMaterial } from '../materials/megamaterial';
import {
    create_constant_normal, create_interpolated_normal, create_normal_map,
    create_triangle, IConstantNormalStrategy,
    IInterpolatedNormalStrategy,
    INormalMapNormalStrategy,
    ITriangle,
    triangle_set_vertex_positions, TriangleVec2,
    TriangleVec3
} from './triangle';
import { ArenaVec3Allocator, use_vec3_allocator, Vec3, vec3_dirty } from '../math/vec3.gen';
import { Texture } from '../texture/texture';
import { TypedArray } from '../types';
import { run_with_hooks } from '../utils';

export interface ITriangleReference extends Hittable {
    type: 'triangle_reference';

    primitive: TriangleRefPrimitive;
    triangle_id: number;
}

export enum TriangleRefAttributeSemantic {
    POSITION,
    NORMAL,
    TANGENT,
    TEX_COORD_0,
    TEX_COORD_1,
    TEX_COORD_2,
    TEX_COORD_3,
}

export interface TriangleRefAttribute {
    semantic: TriangleRefAttributeSemantic;
    view: TypedArray;
    stride: number;
}

export interface TriangleRefPrimitive {
    triangle_type_id: number;//this field is set while loading model. But actual triangle caches are created on render
    attributes: TriangleRefAttribute[];
    indices?: TypedArray;
    material: MegaMaterial;
}

export const triangle_type_ids = new Map<string, number>();
const triangles_by_type: Record<number, { id: number, triangle_view: ITriangle }> = {};

const tmp_triangle: TriangleVec3 = [ vec3_dirty(), vec3_dirty(), vec3_dirty() ];
const load_vec4_w = (vec: Vec3, view: TypedArray, stride: number, index_a: number, index_b: number, index_c: number) => {
    vec[0] = view[index_a * stride + 3];
    vec[1] = view[index_b * stride + 3];
    vec[2] = view[index_c * stride + 3];
};

const load_vec3 = (vec: Vec3, view: TypedArray, stride: number, index: number) => {
    vec[0] = view[index * stride];
    vec[1] = view[index * stride + 1];
    vec[2] = view[index * stride + 2];
};

const load_vec2 = (vec: Vec3, view: TypedArray, stride: number, index: number) => {
    vec[0] = view[index * stride];
    vec[1] = view[index * stride + 1];
};

export const create_triangle_reference = (primitive: TriangleRefPrimitive, triangle_id: number): ITriangleReference => {
    return {
        type: 'triangle_reference',
        primitive,
        triangle_id
    };
}

const create_triangle_view_for_primitive = (primitive: TriangleRefPrimitive): ITriangle => {
    return run_with_hooks(() => {
        use_vec3_allocator(new ArenaVec3Allocator(32));

        const vertex_positions: TriangleVec3 = [vec3_dirty(), vec3_dirty(), vec3_dirty()];
        const normals: TriangleVec3 = [vec3_dirty(), vec3_dirty(), vec3_dirty()];
        const tangents: TriangleVec3 = [vec3_dirty(), vec3_dirty(), vec3_dirty()];
        const tangent_ws = vec3_dirty();
        const uvs: TriangleVec2[] = primitive.attributes.filter(a => TriangleRefAttributeSemantic.TEX_COORD_0 <= a.semantic && a.semantic <= TriangleRefAttributeSemantic.TEX_COORD_3)
            .map(() => [vec3_dirty(), vec3_dirty(), vec3_dirty()]);
        const has_normals = primitive.attributes.some(attr => attr.semantic === TriangleRefAttributeSemantic.NORMAL);
        const has_tangent = primitive.attributes.some(attr => attr.semantic === TriangleRefAttributeSemantic.TANGENT);
        const has_normal_map = primitive.material.normal_map !== null;

        const normal_strategy = !has_normals
            ? create_constant_normal(vertex_positions)
            : (has_tangent && has_normal_map)
                ? create_normal_map(normals, tangents, tangent_ws, uvs[0], primitive.material.normal_map as Texture)
                : create_interpolated_normal(normals);

        return create_triangle(vertex_positions, normal_strategy, uvs, primitive.material);
    })
};

export const unpack_triangle = (triangle_ref: ITriangleReference): ITriangle => {
    const primitive = triangle_ref.primitive;

    //todo: cache more than just 1 element
    let triangle_record = triangles_by_type[primitive.triangle_type_id];
    if (triangle_record === undefined) {
        triangle_record = triangles_by_type[primitive.triangle_type_id] = {
            id: -1,
            triangle_view: create_triangle_view_for_primitive(primitive)
        };
    }
    const id = triangle_ref.triangle_id;
    const triangle_view = triangle_record.triangle_view;
    if (id === triangle_record.id) {
        return triangle_view;
    }
    triangle_record.id = id;

    let index_a, index_b, index_c;
    if (primitive.indices !== undefined) {
        index_a = primitive.indices[id];
        index_b = primitive.indices[id + 1];
        index_c = primitive.indices[id + 2];
    } else {
        index_a = id;
        index_b = id + 1;
        index_c = id + 2;
    }

    //note: even if the assertions are wrong, corresponding case just won't trigger.
    const { normal } = triangle_view.normal_strategy as (IConstantNormalStrategy);
    const { normals } = triangle_view.normal_strategy as (IInterpolatedNormalStrategy | INormalMapNormalStrategy)
    const { tangents, tangent_ws } = triangle_view.normal_strategy as INormalMapNormalStrategy;
    for (let i = 0; i < primitive.attributes.length; i++) {
        const { view, stride, semantic } = primitive.attributes[i];

        switch (semantic) {
            case TriangleRefAttributeSemantic.POSITION:
                load_vec3(tmp_triangle[0], view, stride, index_a);
                load_vec3(tmp_triangle[1], view, stride, index_b);
                load_vec3(tmp_triangle[2], view, stride, index_c);
                triangle_set_vertex_positions(triangle_view, tmp_triangle);
                if (normal) {
                    normal.set(triangle_view.normal);
                }
                break;
            case TriangleRefAttributeSemantic.NORMAL:
                load_vec3(normals[0], view, stride, index_a);
                load_vec3(normals[1], view, stride, index_b);
                load_vec3(normals[2], view, stride, index_c);
                break;
            case TriangleRefAttributeSemantic.TANGENT:
                load_vec3(tangents[0], view, stride, index_a);
                load_vec3(tangents[1], view, stride, index_b);
                load_vec3(tangents[2], view, stride, index_c);
                load_vec4_w(tangent_ws, view, stride, index_a, index_b, index_c);
                (triangle_view.normal_strategy as INormalMapNormalStrategy).normal_map = primitive.material.normal_map as Texture;
                break;

            case TriangleRefAttributeSemantic.TEX_COORD_0:
            case TriangleRefAttributeSemantic.TEX_COORD_1:
            case TriangleRefAttributeSemantic.TEX_COORD_2:
            case TriangleRefAttributeSemantic.TEX_COORD_3:
                load_vec2(triangle_view.tex_coords[semantic - TriangleRefAttributeSemantic.TEX_COORD_0][0], view, stride, index_a);
                load_vec2(triangle_view.tex_coords[semantic - TriangleRefAttributeSemantic.TEX_COORD_0][1], view, stride, index_b);
                load_vec2(triangle_view.tex_coords[semantic - TriangleRefAttributeSemantic.TEX_COORD_0][2], view, stride, index_c);
                break;
        }
    }

    return triangle_view;
};

hittable_types.triangle_reference = create_hittable_type({
    hit: (hittable, r, t_min, t_max, hit) => {
        const triangle_ref = hittable as ITriangleReference;
        const triangle = unpack_triangle(triangle_ref);
        return hittable_types.triangle.hit(triangle, r, t_min, t_max, hit);
    },
    get_bounding_box: (hittable, time0, time1, aabb) => {
        const triangle_ref = hittable as ITriangleReference;
        const triangle = unpack_triangle(triangle_ref);
        return hittable_types.triangle.get_bounding_box(triangle, time0, time1, aabb);
    },
    random: (hittable, origin) => {
        const triangle_ref = hittable as ITriangleReference;
        const triangle = unpack_triangle(triangle_ref);
        return hittable_types.triangle.random(triangle, origin);
    },
    pdf_value: (hittable, origin, direction) => {
        const triangle_ref = hittable as ITriangleReference;
        const triangle = unpack_triangle(triangle_ref);
        return hittable_types.triangle.pdf_value(triangle, origin, direction);
    }
});
