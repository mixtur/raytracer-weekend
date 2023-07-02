import { HitRecord, Hittable, set_face_normal } from './hittable';
import { Vec3, vec3Add3, vec3Sub2 } from '../vec3';
import { ray, Ray } from '../ray';
import { AABB } from './aabb';

export class Translate implements Hittable {
    obj: Hittable;
    displacement: Vec3;
    constructor(obj: Hittable, displacement: Vec3) {
        this.obj = obj;
        this.displacement = displacement;
    }

    hit(r: Ray, t_min: number, t_max: number): HitRecord | null {
        const r_moved = ray(
            vec3Sub2(r.origin, this.displacement),
            r.direction,
            r.time
        );

        const hit = this.obj.hit(r_moved, t_min, t_max);
        if (hit === null) { return null; }
        vec3Add3(hit.p, hit.p, this.displacement);

        set_face_normal(hit, r_moved, hit.normal);

        return hit;
    }

    get_bounding_box(time0: number, time1: number): AABB {
        const bbox = this.obj.get_bounding_box(time0, time1);
        vec3Add3(bbox.min, bbox.min, this.displacement);
        vec3Add3(bbox.max, bbox.max, this.displacement);
        return bbox;
    }
}