import { Hittable, create_hittable_type, HitRecord, hittable_types } from './hittable';
import {
    AABB,
    aabb_set_empty,
    aabb_surface_area,
    create_empty_aabb,
    hit_aabb,
    surrounding_box,
    union_aabb_r
} from '../math/aabb';
import { Ray } from '../math/ray';
import { Vec3 } from '../math/vec3.gen';

const b0 = create_empty_aabb();
const b1 = create_empty_aabb();
const current_left_aabb = create_empty_aabb();
const current_right_aabb = create_empty_aabb();

export interface IBVHNode extends Hittable {
    type: 'bvh_node';
    size: number;
    axis: number;
    left: Hittable;
    right: Hittable;
    aabb: AABB;
}

const is_bvh_node = (x: Hittable): x is IBVHNode => {
    return x.type === 'bvh_node';
};

export const create_bvh_node = (objects: Hittable[], time0: number, time1: number): IBVHNode => {
    const size = objects.length;
    let left: Hittable;
    let right: Hittable;
    let axis = 0;
    switch (objects.length) {
        case 0:
            throw new Error('cannot create an empty BVH node');
        case 1:
            left = right = objects[0];
            break;
        case 2:
            left = objects[0];
            right = objects[1];
            break;
        default: {
            let best_score = Infinity;
            let best_split = -1;
            for (let candidate_axis = 0; candidate_axis < 3; candidate_axis++) {
                objects.sort((a, b) => {
                    hittable_types[a.type].get_bounding_box(a, time0, time1, b0);
                    hittable_types[b.type].get_bounding_box(b, time0, time1, b1);
                    return b0.min[candidate_axis] - b1.min[candidate_axis];
                });

                aabb_set_empty(current_right_aabb);
                const right_areas = [];
                for (let i = objects.length - 1; i >= 0; i--) {
                    const o = objects[i];
                    hittable_types[o.type].get_bounding_box(o, time0, time1, b1);
                    union_aabb_r(current_right_aabb, current_right_aabb, b1);
                    right_areas.push(aabb_surface_area(current_right_aabb));
                }
                right_areas.reverse();

                aabb_set_empty(current_left_aabb);
                for (let i = 0; i < objects.length - 1; i++) {
                    const h0 = objects[i];
                    hittable_types[h0.type].get_bounding_box(h0, time0, time1, b0);
                    union_aabb_r(current_left_aabb, current_right_aabb, b1);

                    const left_area = aabb_surface_area(current_left_aabb);
                    const right_area = right_areas[i + 1];

                    const score = (i + 1) * left_area + (objects.length - i - 1) * right_area;
                    if (score < best_score) {
                        best_score = score;
                        best_split = i + 1;
                        axis = candidate_axis;
                    }
                }
            }

            if (axis !== 2) {
                objects.sort((a, b) => {
                    hittable_types[a.type].get_bounding_box(a, time0, time1, b0);
                    hittable_types[b.type].get_bounding_box(b, time0, time1, b1);
                    return b0.min[axis] - b1.min[axis];
                });
            }

            left = create_bvh_node(objects.slice(0, best_split), time0, time1);
            right = create_bvh_node(objects.slice(best_split), time0, time1);
        }
        break;
    }

    hittable_types[left.type].get_bounding_box(left, time0, time1, b0);
    hittable_types[right.type].get_bounding_box(right, time0, time1, b1);
    const aabb = surrounding_box(b0, b1);

    return {
        type: 'bvh_node',
        size,
        axis,
        left,
        right,
        aabb
    };
}

hittable_types.bvh_node = create_hittable_type({
    hit: (hittable, r: Ray, t_min: number, t_max: number, hit: HitRecord): boolean => {
        const node = hittable as IBVHNode;
        if (!hit_aabb(node.aabb, r, t_min, t_max)) {
            return false;
        }
        let first_child = node.left;
        let second_child = node.right;

        if (r.direction[node.axis] < 0) {
            first_child = node.right;
            second_child = node.left;
        }

        const first_is_hit = hittable_types[first_child.type].hit(first_child, r, t_min, t_max, hit);
        const second_is_hit = first_is_hit && (first_child === second_child)
            ? true
            : hittable_types[second_child.type].hit(second_child, r, t_min, first_is_hit ? hit.t : t_max, hit);

        return first_is_hit || second_is_hit;
    },

    get_bounding_box: (hittable, time0: number, time1: number, aabb: AABB): void => {
        const node = hittable as IBVHNode;
        aabb.min.set(node.aabb.min);
        aabb.max.set(node.aabb.max);
    },

    pdf_value: (hittable, origin: Vec3, direction: Vec3): number => {
        const node = hittable as IBVHNode;
        if (node.left === node.right) return hittable_types[node.left.type].pdf_value(node.left, origin, direction);

        const l_count = is_bvh_node(node.left) ? node.left.size : 1;
        const r_count = node.size - l_count;

        const left_value = hittable_types[node.left.type].pdf_value(node.left, origin, direction);
        const right_value = hittable_types[node.right.type].pdf_value(node.right, origin, direction);

        return (left_value * l_count + right_value * r_count) / node.size;
    },

    random: (hittable, origin: Vec3): Vec3 => {
        const node = hittable as IBVHNode;
        if (node.left === node.right) return hittable_types[node.left.type].random(node.left, origin);

        const l_count = is_bvh_node(node.left) ? node.left.size : 1;

        return Math.random() * node.size < l_count
            ? hittable_types[node.left.type].random(node.left, origin)
            : hittable_types[node.right.type].random(node.right, origin);
    }
});
