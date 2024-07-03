import { create_empty_hit_record, HitRecord, Hittable } from './hittable';
import { AABB } from './aabb';
import { Ray, ray_at_r } from '../math/ray';
import { len_vec3, set_vec3 } from '../math/vec3.gen';
import { MegaMaterial } from '../materials/megamaterial';

const hit1 = create_empty_hit_record();
const hit2 = create_empty_hit_record();
export class ConstantMedium extends Hittable {
    boundary: Hittable;
    phase_function: MegaMaterial;
    neg_inv_density: number;

    constructor(boundary: Hittable, density: number, phase_function: MegaMaterial) {
        super();
        this.boundary = boundary;
        this.neg_inv_density = -1 / density;
        this.phase_function = phase_function;
    }

    get_bounding_box(time0: number, time1: number, aabb: AABB): void {
        this.boundary.get_bounding_box(time0, time1, aabb);
    }

    hit(r: Ray, t_min: number, t_max: number, hit: HitRecord): boolean {
        if (!this.boundary.hit(r, -Infinity, Infinity, hit1)) { return false; }
        if (!this.boundary.hit(r, hit1.t + 0.0001, Infinity, hit2)) { return false; };
        if (hit2 === null) return false;
        if (hit1.t < t_min) hit1.t = t_min;
        if (hit2.t > t_max) hit2.t = t_max;
        if (hit1.t >= hit2.t) return false;//how can that happen?
        if (hit1.t < 0) { hit1.t = 0; }// or that?

        const ray_length = len_vec3(r.direction);
        const distance_inside_boundary = (hit2.t - hit1.t) * ray_length;
        const hit_distance = this.neg_inv_density * Math.log(Math.random());
        if (hit_distance > distance_inside_boundary) return false;

        const t = hit1.t + hit_distance / ray_length;
        ray_at_r(hit.p, r, t);
        set_vec3(hit.normal, 1, 0, 0);
        hit.t = t;
        hit.material = this.phase_function;
        hit.u = 0;
        hit.v = 0;
        return true;
    }
}
