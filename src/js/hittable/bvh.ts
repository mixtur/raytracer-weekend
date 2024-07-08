import { Hittable, create_hittable_type, HitRecord, hittable_types } from './hittable';
import { AABB, create_empty_aabb, hit_aabb, surrounding_box } from '../math/aabb';
import { Ray } from '../math/ray';
import { random_int_min_max } from '../math/random';
import { Vec3 } from '../math/vec3.gen';

const b0 = create_empty_aabb();
const b1 = create_empty_aabb();

export interface IBVHNode extends Hittable {
    type: 'bvh_node';
    size: number;
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
            const axis = random_int_min_max(0, 2);
            objects.sort((a, b) => {
                hittable_types[a.type].get_bounding_box(a, time0, time1, b0);
                hittable_types[b.type].get_bounding_box(b, time0, time1, b1);
                return b0.min[axis] - b1.min[axis];
            });
            left = create_bvh_node(objects.slice(0, Math.floor(objects.length / 2)), time0, time1);
            right = create_bvh_node(objects.slice(Math.floor(objects.length / 2)), time0, time1);
        }
        break;
    }

    hittable_types[left.type].get_bounding_box(left, time0, time1, b0);
    hittable_types[right.type].get_bounding_box(right, time0, time1, b1);
    const aabb = surrounding_box(b0, b1);

    return {
        type: 'bvh_node',
        size,
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
        const hit_left = hittable_types[node.left.type].hit(node.left, r, t_min, t_max, hit);
        const hit_right = hittable_types[node.right.type].hit(node.right, r, t_min, hit_left ? hit.t : t_max, hit);

        return hit_left || hit_right;
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
