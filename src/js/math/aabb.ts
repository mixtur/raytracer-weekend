import { point3, Point3, vec3 } from './vec3.gen';
import { Ray } from './ray';

export interface AABB {
    min: Point3;
    max: Point3;
}

export const create_aabb = (min: Point3, max: Point3) => {
    return {
        min, max
    };
};

export const hit_aabb = (aabb: AABB, r: Ray, t_min: number, t_max: number): boolean => {
    let t0_0 = (aabb.min[0] - r.origin[0]) * r.inv_dir[0];
    let t1_0 = (aabb.min[1] - r.origin[1]) * r.inv_dir[1];
    let t2_0 = (aabb.min[2] - r.origin[2]) * r.inv_dir[2];

    let t0_1 = (aabb.max[0] - r.origin[0]) * r.inv_dir[0];
    let t1_1 = (aabb.max[1] - r.origin[1]) * r.inv_dir[1];
    let t2_1 = (aabb.max[2] - r.origin[2]) * r.inv_dir[2];

    if (r.inv_dir[0] < 0) { const t = t0_0; t0_0 = t0_1; t0_1 = t; }
    if (r.inv_dir[1] < 0) { const t = t1_0; t1_0 = t1_1; t1_1 = t; }
    if (r.inv_dir[2] < 0) { const t = t2_0; t2_0 = t2_1; t2_1 = t; }

    return Math.max(t0_0, t1_0, t2_0, t_min) < Math.min(t0_1, t1_1, t2_1, t_max);
};

export const union_aabb_r = (result: AABB, a: AABB, b: AABB): void => {
    result.min[0] = Math.min(a.min[0], b.min[0]);
    result.min[1] = Math.min(a.min[1], b.min[1]);
    result.min[2] = Math.min(a.min[2], b.min[2]);

    result.max[0] = Math.max(a.max[0], b.max[0]);
    result.max[1] = Math.max(a.max[1], b.max[1]);
    result.max[2] = Math.max(a.max[2], b.max[2]);
};

export const union_aabb_point_r = (result: AABB, aabb: AABB, p: Point3) => {
    result.min[0] = Math.min(aabb.min[0], p[0]);
    result.min[1] = Math.min(aabb.min[1], p[1]);
    result.min[2] = Math.min(aabb.min[2], p[2]);

    result.max[0] = Math.max(aabb.max[0], p[0]);
    result.max[1] = Math.max(aabb.max[1], p[1]);
    result.max[2] = Math.max(aabb.max[2], p[2]);
};

export const expand_aabb_r = (result: AABB, aabb: AABB, amount: number) => {
    if (aabb.max[0] === aabb.min[0]) {
        result.min[0] = aabb.min[0] - amount;
        result.max[0] = aabb.max[0] + amount;
    } else {
        result.min[0] = aabb.min[0];
        result.max[0] = aabb.max[0];
    }

    if (aabb.max[1] === aabb.min[1]) {
        result.min[1] = aabb.min[1] - amount;
        result.max[1] = aabb.max[1] + amount;
    } else {
        result.min[1] = aabb.min[1];
        result.max[1] = aabb.max[1];
    }

    if (aabb.max[2] === aabb.min[2]) {
        result.min[2] = aabb.min[2] - amount;
        result.max[2] = aabb.max[2] + amount;
    } else {
        result.min[2] = aabb.min[2];
        result.max[2] = aabb.max[2];
    }
};

export const create_empty_aabb = () => create_aabb(vec3(Infinity, Infinity, Infinity), vec3(-Infinity, -Infinity, -Infinity));

export function surrounding_box(b1: AABB, b2: AABB): AABB {
    return create_aabb(
        point3(
            Math.min(b1.min[0], b2.min[0]),
            Math.min(b1.min[1], b2.min[1]),
            Math.min(b1.min[2], b2.min[2]),
        ),
        point3(
            Math.max(b1.max[0], b2.max[0]),
            Math.max(b1.max[1], b2.max[1]),
            Math.max(b1.max[2], b2.max[2]),
        )
    );
}
