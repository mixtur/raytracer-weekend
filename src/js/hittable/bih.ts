import { create_hittable_type, Hittable, hittable_types } from './hittable';
import { AABB, create_empty_aabb, union_aabb_r } from '../math/aabb';
import { mul_vec3, sub_vec3 } from '../math/vec3.gen';

//note: this one is not exactly Hittable. It can only be hit by hitting the root node. Which is an actual hittable.
export interface BIHNode extends Hittable {
    type: 'bih_node';
    left: Hittable;
    right: Hittable;
    axis: number;
    c0: number;
    c1: number;
}

export interface BIHRoot extends BIHNode {
    aabb: AABB;
}

const b0 = create_empty_aabb();
const b1 = create_empty_aabb();

const create_bih_child = (hittables: Hittable[], time0: number, time1: number): BIHNode => {
    let left: Hittable;
    let right: Hittable;
    let c0 = -Infinity;
    let c1 = Infinity;
    let axis = 0;
    switch (hittables.length) {
        case 0:
            throw new Error(`Cannot create an empty BIH node`);
        case 1:
            left = right = hittables[0];
            break;
        case 2:
            left = hittables[0];
            right = hittables[1];
            break;
        default: {
            let best_score = Infinity;
            let best_split = -1;
            const aabb = create_empty_aabb();
            for (let i = 0; i < hittables.length; i++) {
                const h = hittables[i];
                hittable_types[h.type].get_bounding_box(h, time0, time1, b0);
                union_aabb_r(aabb, aabb, b0);
            }

            const side_areas = [
                (aabb.max[1] - aabb.min[1]) * (aabb.max[2] - aabb.min[2]),
                (aabb.max[2] - aabb.min[2]) * (aabb.max[0] - aabb.min[0]),
                (aabb.max[0] - aabb.min[0]) * (aabb.max[1] - aabb.min[1]),
            ];

            const side_half_perimeters = [
                (aabb.max[1] - aabb.min[1]) + (aabb.max[2] - aabb.min[2]),
                (aabb.max[2] - aabb.min[2]) + (aabb.max[0] - aabb.min[0]),
                (aabb.max[0] - aabb.min[0]) + (aabb.max[1] - aabb.min[1]),
            ];

            for (let candidate_axis = 0; candidate_axis < 3; candidate_axis++) {
                hittables.sort((a, b) => {
                    hittable_types[a.type].get_bounding_box(a, time0, time1, b0);
                    hittable_types[b.type].get_bounding_box(b, time0, time1, b1);
                    return b0.min[candidate_axis] - b1.min[candidate_axis];
                });

                let candidate_c0 = -Infinity;
                for (let i = 0; i < hittables.length - 1; i++) {
                    const h0 = hittables[i];
                    const h1 = hittables[i + 1];
                    hittable_types[h0.type].get_bounding_box(h0, time0, time1, b0);
                    hittable_types[h1.type].get_bounding_box(h1, time0, time1, b1);
                    candidate_c0 = Math.max(candidate_c0, b0.max[candidate_axis]);
                    const candidate_c1 = b1.min[candidate_axis];
                    const left_area = ((candidate_c0 - aabb.min[candidate_axis]) * side_half_perimeters[candidate_axis]) + side_areas[candidate_axis];
                    const right_area = ((aabb.max[candidate_axis] - candidate_c1) * side_half_perimeters[candidate_axis]) + side_areas[candidate_axis];

                    const score = (i + 1) * left_area + (hittables.length - i - 1) * right_area;
                    if (score < best_score) {
                        best_score = score;
                        best_split = i + 1;
                        axis = candidate_axis;
                    }
                }
            }

            if (axis !== 2) {
                hittables.sort((a, b) => {
                    hittable_types[a.type].get_bounding_box(a, time0, time1, b0);
                    hittable_types[b.type].get_bounding_box(b, time0, time1, b1);
                    return b0.min[axis] - b1.min[axis];
                });
            }

            const left_leafs = hittables.slice(0, best_split);
            const right_leafs = hittables.slice(best_split);

            c0 = left_leafs.reduce((prev_c0, h) => {
                hittable_types[h.type].get_bounding_box(h, time0, time1, b0);
                return Math.max(prev_c0, b0.max[axis]);
            }, c0);

            c1 = left_leafs.reduce((prev_c1, h) => {
                hittable_types[h.type].get_bounding_box(h, time0, time1, b0);
                return Math.min(prev_c1, b0.min[axis]);
            }, c1);

            left = create_bih_child(left_leafs, time0, time1);
            right = create_bih_child(right_leafs, time0, time1);
        }
    }

    return {
        type: 'bih_node',
        left,
        right,
        c0, c1,
        axis
    };
};

export const create_bih_root = (hittables: Hittable[], time0: number, time1: number): BIHRoot => {
    const aabb = create_empty_aabb();
    for (let i = 0; i < hittables.length; i++) {
        const h = hittables[i];
        hittable_types[h.type].get_bounding_box(h, time0, time1, b0);
        union_aabb_r(aabb, aabb, b0);
    }

    const node = create_bih_child(hittables, time0, time1);
    return {
        ...node,
        aabb
    };
}

export const is_bih_node = (hittable: Hittable): hittable is BIHNode => {
    return hittable.type === 'bih_node';
}

hittable_types.bih_node = create_hittable_type({
    hit: (hittable, r, t_min, t_max, hit) => {
        const root = hittable as BIHRoot;

        const root_aabb = root.aabb;
        const { origin, inv_dir } = r;

        const t_enter_vec = mul_vec3(sub_vec3(root_aabb.min, origin), inv_dir);
        const t_exit_vec = mul_vec3(sub_vec3(root_aabb.max, origin), inv_dir);

        if (inv_dir[0] < 0) { const t = t_enter_vec[0]; t_enter_vec[0] = t_exit_vec[0]; t_exit_vec[0] = t; }
        if (inv_dir[1] < 0) { const t = t_enter_vec[1]; t_enter_vec[1] = t_exit_vec[1]; t_exit_vec[1] = t; }
        if (inv_dir[2] < 0) { const t = t_enter_vec[2]; t_enter_vec[2] = t_exit_vec[2]; t_exit_vec[2] = t; }

        const t_enter = Math.max(t_min, t_enter_vec[0], t_enter_vec[1], t_enter_vec[2]);
        let t_exit = Math.min(t_max, t_exit_vec[0], t_exit_vec[1], t_exit_vec[2]);

        const traverse_bih = ({left, right, c0, c1, axis}: BIHNode, local_t_enter: number, local_t_exit: number): boolean => {
            local_t_exit = Math.min(local_t_exit, t_exit);
            if (local_t_enter >= local_t_exit) return false;
            let c_first = c0;
            let c_second = c1;
            let child_first = left;
            let child_second = right;

            if (inv_dir[axis] < 0) {
                // if the ray is coming from the far side, try to hit the far side first.
                c_first = c1;
                c_second = c0;
                child_first = right;
                child_second = left;
            }

            let first_is_hit;
            let second_is_hit;

            if (is_bih_node(child_first)) {
                const first_exit = Math.min(local_t_exit, (c_first - origin[axis]) * inv_dir[axis]);
                first_is_hit = traverse_bih(child_first, local_t_enter, first_exit)
            } else {
                first_is_hit = hittable_types[child_first.type].hit(child_first, r, t_enter, t_exit, hit);
            }
            if (first_is_hit) { local_t_exit = t_exit = hit.t; }

            if (child_first !== child_second) {
                if (is_bih_node(child_second)) {
                    const second_enter = Math.max(local_t_enter, (c_second - origin[axis]) * inv_dir[axis]);
                    second_is_hit = traverse_bih(child_second, second_enter, local_t_exit)
                } else {
                    second_is_hit = hittable_types[child_second.type].hit(child_second, r, t_enter, t_exit, hit);
                    if (second_is_hit) { t_exit = hit.t; }
                }
            }

            return second_is_hit || first_is_hit;
        };

        return traverse_bih(root, t_enter, t_exit);
    },

    get_bounding_box: (hittable, time0, time1, aabb) => {
        aabb.min.set((hittable as BIHRoot).aabb.min);
        aabb.max.set((hittable as BIHRoot).aabb.max);
    }
})
