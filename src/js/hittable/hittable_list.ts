import { Ray } from "../ray";
import { HitRecord, Hittable } from "./hittable";

export class HittableList implements Hittable {
    objects: Hittable[];

    constructor(objects: Hittable[] = []) {
        this.objects = objects;
    }
    
    hit(r: Ray, t_min: number, t_max: number): HitRecord | null {
        let current_t_max = t_max;
        let current_hit = null;
        for (const obj of this.objects) {
            const hit = obj.hit(r, t_min, current_t_max);
            if (hit !== null) {
                current_t_max = hit.t;
                current_hit = hit;
            }
        }
        return current_hit;
    }
}
