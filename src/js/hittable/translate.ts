import { HitRecord, Hittable, set_face_normal } from './hittable';
import { Vec3, vec3_add_3, vec3_sub_2 } from '../math/vec3';
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
            vec3_sub_2(r.origin, this.displacement),
            r.direction,
            r.time
        );

        if (!this.obj.hit(r_moved, t_min, t_max, hit)) { return false; }
        vec3_add_3(hit.p, hit.p, this.displacement);

        set_face_normal(hit, r_moved, hit.normal);

        return true;
    }

    get_bounding_box(time0: number, time1: number, aabb: AABB): void {
        this.obj.get_bounding_box(time0, time1, aabb);
        vec3_add_3(aabb.min, aabb.min, this.displacement);
        vec3_add_3(aabb.max, aabb.max, this.displacement);
    }

    random(origin: Vec3): Vec3 {
        return this.obj.random(vec3_sub_2(origin, this.displacement));
    }

    pdf_value(origin: Vec3, direction: Vec3): number {
        return this.obj.pdf_value(vec3_sub_2(origin, this.displacement), direction);
    }
}
