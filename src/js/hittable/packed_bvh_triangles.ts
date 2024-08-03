import { Hittable, create_hittable_type, HitRecord, hittable_types } from './hittable';
import {
    AABB,
    aabb_set_empty,
    aabb_surface_area, create_aabb,
    create_empty_aabb, expand_aabb_r,
    hit_aabb, pack_aabb, quantize_aabb,
    surrounding_box, union_aabb_point_r,
    union_aabb_r, unpack_aabb
} from '../math/aabb';
import { Ray } from '../math/ray';
import { ArenaVec3Allocator, use_vec3_allocator, Vec3, vec3_dirty } from '../math/vec3.gen';
import { load_vec3, TriangleRefAttributeSemantic, TriangleRefPrimitive, unpack_triangle } from './triangle_reference';
import { run_with_hooks } from '../utils';
import { LRUCache } from '../lru';
import { ITriangle } from './triangle';

const b0 = create_empty_aabb();
const b1 = create_empty_aabb();
const current_left_aabb = create_empty_aabb();
const current_right_aabb = create_empty_aabb();

export interface IPackedBVH extends Hittable {
    type: 'packed_bvh';
    root_aabb: AABB;
    primitive: TriangleRefPrimitive;
    root_index: number;
    triangles_count: number;
    // 30 bits - size + 2 bits - axis, todo: do we actually need to store size?
    // 31 bits left + 1 bit triangle flag
    // 31 bits right + 1 bit triangle flag
    nodes: Uint32Array; // 3 * 4 bytes per triangle
    packed_aabbs: Uint8ClampedArray; // 6 bytes per triangle
    aabb_stack: AABB[];
}

const UINTS_PER_PACKED_BVH_NODE = 3;
const BYTES_PER_AABB = 6;
const A = vec3_dirty();
const B = vec3_dirty();
const C = vec3_dirty();
export const create_packed_bvh = (primitive: TriangleRefPrimitive): IPackedBVH => {
    const triangles_count = (primitive.indices ? (primitive.indices.length) : (primitive.attributes[0].view.length / primitive.attributes[0].stride)) / 3;
    //todo: shared array buffer
    const packed_nodes = new Uint32Array(triangles_count * UINTS_PER_PACKED_BVH_NODE);
    const packed_aabbs = new Uint8ClampedArray(triangles_count * BYTES_PER_AABB);
    let max_depth = 1;
    let next_node_offset = 0;
    let next_aabb_byte_offset = 0;

    const create_triangle_index = (index: number) => (index << 1) | 1;
    const create_node_index = (index: number) => index << 1;

    const attributes = Object.fromEntries(primitive.attributes.map(a => [a.semantic, a]));
    const position_attribute = attributes[TriangleRefAttributeSemantic.POSITION]

    let bvh_nodes_count = 0;
    const pack_bvh_node = (size: number, axis: number, left: number, right: number, aabb: AABB, parent_aabb: AABB) => {
        bvh_nodes_count++;
        const node_offset = next_node_offset;
        const aabb_byte_offset = next_aabb_byte_offset;
        next_node_offset += UINTS_PER_PACKED_BVH_NODE;
        next_aabb_byte_offset += BYTES_PER_AABB;
        packed_nodes[node_offset + 0] = (size << 2) | axis;
        packed_nodes[node_offset + 1] = left;
        packed_nodes[node_offset + 2] = right;
        pack_aabb(packed_aabbs, aabb_byte_offset, aabb, parent_aabb);
        return create_node_index(node_offset);
    };

    const unpack_aabb_min_axis = (triangle_index: number, axis: number) => {
        let index_a = triangle_index + 0;
        let index_b = triangle_index + 1;
        let index_c = triangle_index + 2;
        if (primitive.indices) {
            index_a = primitive.indices[index_a];
            index_b = primitive.indices[index_b];
            index_c = primitive.indices[index_c];
        }
        return Math.min(
            position_attribute.view[position_attribute.stride * index_a + axis],
            position_attribute.view[position_attribute.stride * index_b + axis],
            position_attribute.view[position_attribute.stride * index_c + axis],
        )
    }
    const unpack_triangle_aabb = (triangle_index: number, aabb: AABB) => {
        let index_a = triangle_index + 0;
        let index_b = triangle_index + 1;
        let index_c = triangle_index + 2;
        if (primitive.indices) {
            index_a = primitive.indices[index_a];
            index_b = primitive.indices[index_b];
            index_c = primitive.indices[index_c];
        }

        load_vec3(aabb.min, position_attribute.view, position_attribute.stride, index_a);
        aabb.max.set(aabb.min);
        load_vec3(B, position_attribute.view, position_attribute.stride, index_b);
        load_vec3(C, position_attribute.view, position_attribute.stride, index_c);
        union_aabb_point_r(aabb, aabb, B);
        union_aabb_point_r(aabb, aabb, C);
        expand_aabb_r(aabb, aabb, 0.0001);
    };

    //note: those are not "triangle"-indices, they are "triangle"-indices multiplied by 3,
    //      so they are rather indices of first vertex of triangles
    const create_index = (triangle_indices: Uint32Array, parent_aabb: AABB, depth: number): number => {
        max_depth = Math.max(max_depth, depth);
        const size = triangle_indices.length;
        let left: number;
        let right: number;
        let axis = 0;
        const aabb = create_aabb(vec3_dirty(), vec3_dirty());

        switch (size) {
            case 0:
                throw new Error('cannot create an empty Packed BVH node');
            case 1:
                return create_triangle_index(triangle_indices[0]);
            case 2:
                left = create_triangle_index(triangle_indices[0]);
                right = create_triangle_index(triangle_indices[1]);
                unpack_triangle_aabb(triangle_indices[0], aabb);
                unpack_triangle_aabb(triangle_indices[1], b1);
                union_aabb_r(aabb, aabb, b1);
                break;
            default: {
                let best_score = Infinity;
                let best_split = -1;// Math.floor(size / 2);
                // axis = Math.floor(Math.random() * 3)

                for (let candidate_axis = 0; candidate_axis < 3; candidate_axis++) {
                    triangle_indices.sort((a, b) => {
                        return unpack_aabb_min_axis(a, candidate_axis) - unpack_aabb_min_axis(b, candidate_axis);
                    });

                    aabb_set_empty(current_right_aabb);
                    const right_areas = [];
                    for (let i = triangle_indices.length - 1; i >= 0; i--) {
                        const o = triangle_indices[i];
                        unpack_triangle_aabb(o, b1);
                        union_aabb_r(current_right_aabb, current_right_aabb, b1);
                        quantize_aabb(current_right_aabb, parent_aabb);
                        right_areas.push(aabb_surface_area(current_right_aabb));
                    }
                    aabb.min.set(current_right_aabb.min);
                    aabb.max.set(current_right_aabb.max);
                    right_areas.reverse();


                    aabb_set_empty(current_left_aabb);
                    for (let i = 0; i < triangle_indices.length - 1; i++) {
                        const h0 = triangle_indices[i];
                        unpack_triangle_aabb(h0, b0);
                        union_aabb_r(current_left_aabb, current_right_aabb, b1);
                        quantize_aabb(current_left_aabb, parent_aabb);

                        const left_area = aabb_surface_area(current_left_aabb);
                        const right_area = right_areas[i + 1];

                        const score = (i + 1) * left_area + (size - i - 1) * right_area;
                        if (score < best_score) {
                            best_score = score;
                            best_split = i + 1;
                            axis = candidate_axis;
                        }
                    }
                }

                if (axis !== 2) {
                    triangle_indices.sort((a, b) => {
                        return unpack_aabb_min_axis(a, axis) - unpack_aabb_min_axis(b, axis);
                    });
                }

                left = create_index(triangle_indices.subarray(0, best_split), aabb, depth + 1);
                right = create_index(triangle_indices.subarray(best_split), aabb, depth + 1);
                break;
            }
        }

        return pack_bvh_node(size, axis, left, right, aabb, parent_aabb);
    }

    const full_aabb = create_empty_aabb();
    const triangle_indices = new Uint32Array(triangles_count);
    for (let i = 0; i < triangles_count; i++) {
        unpack_triangle_aabb(i * 3, b0);
        union_aabb_r(full_aabb, full_aabb, b0);
        triangle_indices[i] = i * 3;
    }


    const root_index = triangles_count === 1
        ? pack_bvh_node(1, 0, create_triangle_index(0), create_triangle_index(0), full_aabb, full_aabb)
        : create_index(triangle_indices, full_aabb, 1);

    const aabb_stack: AABB[] = [];
    //note: this is explicitly non-shared, because this is not actually a part of a model
    //todo: make max_depth global, allocate one aabb_stack for all BVHs
    const aabb_allocator = new ArenaVec3Allocator(max_depth * 2, false);
    for (let i = 0; i < max_depth; i++) {
        aabb_stack.push(
            create_aabb(
                aabb_allocator.alloc_dirty(),
                aabb_allocator.alloc_dirty()
            )
        );
    }

    return {
        type: 'packed_bvh',
        triangles_count,
        primitive,
        root_aabb: full_aabb,
        root_index: root_index >> 1,
        nodes: packed_nodes,
        packed_aabbs,
        aabb_stack
    };
}


const node_offset_to_aabb_offset = (node_offset: number) => node_offset << 1;
hittable_types.packed_bvh = create_hittable_type({
    hit: (hittable, r: Ray, t_min: number, t_max: number, hit: HitRecord): boolean => {
        const bvh = hittable as IPackedBVH;

        const hit_child_id = (id: number, parent_aabb: AABB, t_max: number, depth: number): boolean => {
            if (id & 1) {
                return hit_packed_triangle(id >> 1, t_max);
            } else {
                return hit_packed_bvh_node(id >> 1, parent_aabb, t_max, depth);
            }
        }

        const hit_packed_triangle = (triangle_id: number, t_max: number) => {
            const triangle = unpack_triangle(bvh.primitive, triangle_id);
            return hittable_types.triangle.hit(triangle, r, t_min, t_max, hit);
        };

        const hit_packed_bvh_node = (node_offset: number, parent_aabb: AABB, t_max: number, depth: number) => {
            const aabb = bvh.aabb_stack[depth];
            const aabb_offset = node_offset_to_aabb_offset(node_offset);
            unpack_aabb(bvh.packed_aabbs, aabb_offset, aabb, parent_aabb);
            // if (globalThis._debug) {
            //     debugger;
            // }
            if (!hit_aabb(aabb, r, t_min, t_max)) {
                return false;
            }
            const axis = bvh.nodes[node_offset] & 3;
            const left =  bvh.nodes[node_offset + 1];
            const right =  bvh.nodes[node_offset + 2];
            let first_child = left;
            let second_child = right;
            if(r.direction[axis] < 0) {
                first_child = right;
                second_child = left;
            }

            const first_is_hit = hit_child_id(first_child, aabb, t_max, depth + 1);
            const second_is_hit = first_is_hit && (first_child === second_child)
                ? true
                : hit_child_id(second_child, aabb, first_is_hit ? hit.t : t_max, depth + 1);

            return first_is_hit || second_is_hit;
        };

        return hit_packed_bvh_node(bvh.root_index, bvh.root_aabb, t_max, 0);
    },

    get_bounding_box: (hittable, time0: number, time1: number, aabb: AABB): void => {
        const node = hittable as IPackedBVH;
        aabb.min.set(node.root_aabb.min);
        aabb.max.set(node.root_aabb.max);
    },

    pdf_value: (hittable, origin: Vec3, direction: Vec3): number => {
        const bvh = hittable as IPackedBVH;
        let pdf = 0;
        for (let i = 0; i < bvh.triangles_count; i++) {
            const triangle_index = i * 3;
            //todo: this operation washes out triangle cache. Need a way to avoid it
            //      A flag or another special cache for this case.
            //      Also we don't need the full triangle here. Just positions and area
            const t = unpack_triangle(bvh.primitive, triangle_index);
            pdf += hittable_types.triangle.pdf_value(t, origin, direction);
        }

        return pdf / bvh.triangles_count;
    },

    random: (hittable, origin: Vec3): Vec3 => {
        const bvh = hittable as IPackedBVH;
        //todo: blind random triangle is wrong.
        //      should at least weight by area (and adjust pdf_value accordingly)
        //      or maybe by projected area
        //todo: don't need full triangle
        //      for this case need 1-element cache instead of general case LRU used for hits
        const triangle_index = Math.floor(bvh.triangles_count * Math.random()) * 3;
        const t = unpack_triangle(bvh.primitive, triangle_index);
        return hittable_types.triangle.random(t, origin);
    }
});
