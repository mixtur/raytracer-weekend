import { Ray } from "../ray";
import { HitRecord, Hittable } from "./hittable";
import { AABB, surrounding_box } from './aabb';

export class HittableList implements Hittable {
    objects: Hittable[];

    constructor(objects: Hittable[] = []) {
        this.objects = objects;
    }
    
    hit(r: Ray, t_min: number, t_max: number): HitRecord | null {
        let current_t_max = t_max;
        let current_hit = null;
        for (let i = 0; i < this.objects.length; i++) {
            const obj = this.objects[i];
            const hit = obj.hit(r, t_min, current_t_max);
            if (hit !== null) {
                current_t_max = hit.t;
                current_hit = hit;
            }
        }
        return current_hit;
    }

    get_bounding_box(time0: number, time1: number): AABB {
        const result = AABB.createEmpty();
        for (const obj of this.objects) {
            result.consume(obj.get_bounding_box(time0, time1));
        }
        return result;
    }
}
