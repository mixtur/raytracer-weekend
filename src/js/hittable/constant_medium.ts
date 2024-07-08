import {
    Hittable,
    create_empty_hit_record,
    create_hittable_type,
    HitRecord,
    hittable_types
} from './hittable';
import { AABB } from '../math/aabb';
import { Ray, ray_at_r } from '../math/ray';
import { len_vec3, set_vec3 } from '../math/vec3.gen';
import { MegaMaterial } from '../materials/megamaterial';

const hit1 = create_empty_hit_record();
const hit2 = create_empty_hit_record();

export interface IConstantMedium extends Hittable {
    type: 'constant_medium';
    boundary: Hittable;
    phase_function: MegaMaterial;
    neg_inv_density: number;
}

export const create_constant_medium = (boundary: Hittable, density: number, phase_function: MegaMaterial): IConstantMedium => {
    return {
        type: 'constant_medium',
        boundary,
        neg_inv_density: -1 / density,
        phase_function,
    };
}

hittable_types.constant_medium = create_hittable_type({
    get_bounding_box(hittable, time0: number, time1: number, aabb: AABB): void {
        const medium = hittable as IConstantMedium;
        hittable_types[medium.boundary.type].get_bounding_box(medium.boundary, time0, time1, aabb);
    },

    hit(hittable, r: Ray, t_min: number, t_max: number, hit: HitRecord): boolean {
        const medium = hittable as IConstantMedium;
        if (!hittable_types[medium.boundary.type].hit(medium.boundary, r, -Infinity, Infinity, hit1)) { return false; }
        if (!hittable_types[medium.boundary.type].hit(medium.boundary, r, hit1.t + 0.0001, Infinity, hit2)) { return false; }
        if (hit2 === null) return false;
        if (hit1.t < t_min) hit1.t = t_min;
        if (hit2.t > t_max) hit2.t = t_max;
        if (hit1.t >= hit2.t) return false;//how can that happen?
        if (hit1.t < 0) { hit1.t = 0; }// or that?

        const ray_length = len_vec3(r.direction);
        const distance_inside_boundary = (hit2.t - hit1.t) * ray_length;
        const hit_distance = medium.neg_inv_density * Math.log(Math.random());
        if (hit_distance > distance_inside_boundary) return false;

        const t = hit1.t + hit_distance / ray_length;
        ray_at_r(hit.p, r, t);
        set_vec3(hit.normal, 1, 0, 0);
        hit.t = t;
        hit.material = medium.phase_function;
        hit.u = 0;
        hit.v = 0;
        return true;
    }
});
