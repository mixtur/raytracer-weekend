import { Ray } from "../math/ray";
import { HitRecord, Hittable } from "./hittable";
import { AABB } from './aabb';

export class HittableList extends Hittable {
    objects: Hittable[];

    constructor(objects: Hittable[] = []) {
        super();
        this.objects = objects;
    }

    hit(r: Ray, t_min: number, t_max: number, hit: HitRecord): boolean {
        let current_t_max = t_max;
        let is_hit = false;
        for (let i = 0; i < this.objects.length; i++) {
            const obj = this.objects[i];
            if (obj.hit(r, t_min, current_t_max, hit)) {
                current_t_max = hit.t;
                is_hit = true;
            }
        }
        return is_hit;
    }

    get_bounding_box(time0: number, time1: number, aabb: AABB): void {
        const tmp = AABB.createEmpty();
        aabb.min.set(tmp.min);
        aabb.max.set(tmp.max);
        for (const obj of this.objects) {
            obj.get_bounding_box(time0, time1, tmp);
            aabb.consumeAABB(tmp);
        }
    }
}
