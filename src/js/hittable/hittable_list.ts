import { Ray } from "../math/ray";
import { HitRecord, Hittable } from "./hittable";
import { AABB } from './aabb';
import { Vec3 } from '../math/vec3.gen';

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

    pdf_value(origin: Vec3, direction: Vec3): number {
        let pdf = 0;
        for (let i = 0; i < this.objects.length; i++){
            pdf += this.objects[i].pdf_value(origin, direction);
        }
        return pdf / this.objects.length;
    }

    random(origin: Vec3): Vec3 {
        return this.objects[Math.floor(Math.random() * this.objects.length)].random(origin);
    }
}
