import { HitRecord, Hittable, set_face_normal } from './hittable';
import { add_vec3_r, sub_vec3, Vec3 } from '../math/vec3.gen';
import { Ray, ray_allocator } from '../math/ray';
import { AABB } from './aabb';

export class Translate extends Hittable {
    obj: Hittable;
    displacement: Vec3;
    constructor(obj: Hittable, displacement: Vec3) {
        super();
        this.obj = obj;
        this.displacement = displacement;
    }

    hit(r: Ray, t_min: number, t_max: number, hit: HitRecord): boolean {
        const r_moved = ray_allocator.alloc(
            sub_vec3(r.origin, this.displacement),
            r.direction,
            r.time
        );

        if (!this.obj.hit(r_moved, t_min, t_max, hit)) { return false; }
        add_vec3_r(hit.p, hit.p, this.displacement);

        set_face_normal(hit, r_moved, hit.normal);

        return true;
    }

    get_bounding_box(time0: number, time1: number, aabb: AABB): void {
        this.obj.get_bounding_box(time0, time1, aabb);
        add_vec3_r(aabb.min, aabb.min, this.displacement);
        add_vec3_r(aabb.max, aabb.max, this.displacement);
    }

    random(origin: Vec3): Vec3 {
        return this.obj.random(sub_vec3(origin, this.displacement));
    }

    pdf_value(origin: Vec3, direction: Vec3): number {
        return this.obj.pdf_value(sub_vec3(origin, this.displacement), direction);
    }
}
