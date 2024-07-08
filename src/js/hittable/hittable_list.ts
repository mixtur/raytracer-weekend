import { Ray } from "../math/ray";
import { Hittable, create_hittable_type, HitRecord, hittable_types } from "./hittable";
import { AABB, union_aabb_r, create_empty_aabb } from '../math/aabb';
import { Vec3 } from '../math/vec3.gen';

export interface IHittableList extends Hittable {
    type: 'hittable_list';
    objects: Hittable[];
}

export const create_hittable_list = (objects: Hittable[]): IHittableList => {
    return {
        type: 'hittable_list',
        objects,
    };
};

hittable_types.hittable_list = create_hittable_type({
    hit: (hittable, r: Ray, t_min: number, t_max: number, hit: HitRecord): boolean => {
        const list = hittable as IHittableList;
        let current_t_max = t_max;
        let is_hit = false;
        for (let i = 0; i < list.objects.length; i++) {
            const obj = list.objects[i];
            if (hittable_types[obj.type].hit(obj, r, t_min, current_t_max, hit)) {
                current_t_max = hit.t;
                is_hit = true;
            }
        }
        return is_hit;
    },

    get_bounding_box(hittable, time0: number, time1: number, aabb: AABB): void {
        const list = hittable as IHittableList;
        const tmp = create_empty_aabb();
        aabb.min.set(tmp.min);
        aabb.max.set(tmp.max);
        for (const obj of list.objects) {
            hittable_types[obj.type].get_bounding_box(obj, time0, time1, tmp);
            union_aabb_r(aabb, aabb, tmp);
        }
    },

    pdf_value(hittable, origin: Vec3, direction: Vec3): number {
        const list = hittable as IHittableList;
        let pdf = 0;
        for (let i = 0; i < list.objects.length; i++){
            const obj = list.objects[i];
            pdf += hittable_types[obj.type].pdf_value(obj, origin, direction);
        }
        return pdf / list.objects.length;
    },

    random(hittable, origin: Vec3): Vec3 {
        const list = hittable as IHittableList;
        const obj = list.objects[Math.floor(Math.random() * list.objects.length)];
        return hittable_types[obj.type].random(obj, origin);
    }
});
