import { HitRecord, Hittable } from './hittable';
import { AABB } from './aabb';
import { Ray, rayAt2 } from '../ray';
import { vec3, vec3Len } from '../vec3';
import { MegaMaterial } from '../materials/megamaterial';

export class ConstantMedium implements Hittable {
    boundary: Hittable;
    phase_function: MegaMaterial;
    neg_inv_density: number;

    constructor(boundary: Hittable, density: number, phase_function: MegaMaterial) {
        this.boundary = boundary;
        this.neg_inv_density = -1 / density;
        this.phase_function = phase_function;
    }

    get_bounding_box(time0: number, time1: number): AABB {
        return this.boundary.get_bounding_box(time0, time1);
    }

    hit(r: Ray, t_min: number, t_max: number): HitRecord | null {
        const hit1 = this.boundary.hit(r, -Infinity, Infinity);
        if (hit1 === null) return null;
        const hit2 = this.boundary.hit(r, hit1.t + 0.0001, Infinity);
        if (hit2 === null) return null;
        if (hit1.t < t_min) hit1.t = t_min;
        if (hit2.t > t_max) hit2.t = t_max;
        if (hit1.t >= hit2.t) return null;//how can that happen?
        if (hit1.t < 0) { hit1.t = 0; }// or that?

        const ray_length = vec3Len(r.direction);
        const distance_inside_boundary = (hit2.t - hit1.t) * ray_length;
        const hit_distance = this.neg_inv_density * Math.log(Math.random());
        if (hit_distance > distance_inside_boundary) return null;

        const t = hit1.t + hit_distance / ray_length;
        return {
            t,
            u: 0,
            v: 0,
            p: rayAt2(r, t),
            normal: vec3(1, 0, 0),
            front_face: true,
            material: this.phase_function
        };
    }
}
