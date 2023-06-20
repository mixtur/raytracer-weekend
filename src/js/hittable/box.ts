import { HitRecord, Hittable } from './hittable';
import { HittableList } from './hittable_list';
import { Point3 } from '../vec3';
import { Material } from '../materials/material';
import { XYRect } from './xy_rect';
import { XZRect } from './xz_rect';
import { YZRect } from './yz_rect';
import { Ray } from '../ray';
import { AABB } from './aabb';

export class Box implements Hittable {
    sides: HittableList;
    constructor(p0: Point3, p1: Point3, mat: Material) {
        this.sides = new HittableList();
        this.sides.objects.push(new XYRect(p0[0], p1[0], p0[1], p1[1], p1[2], mat));
        this.sides.objects.push(new XYRect(p0[0], p1[0], p0[1], p1[1], p0[2], mat));

        this.sides.objects.push(new XZRect(p0[0], p1[0], p0[2], p1[2], p1[1], mat));
        this.sides.objects.push(new XZRect(p0[0], p1[0], p0[2], p1[2], p0[1], mat));

        this.sides.objects.push(new YZRect(p0[1], p1[1], p0[2], p1[2], p1[0], mat));
        this.sides.objects.push(new YZRect(p0[1], p1[1], p0[2], p1[2], p0[0], mat));
    }

    hit(r: Ray, t_min: number, t_max: number): HitRecord | null {
        return this.sides.hit(r, t_min, t_max);
    }

    get_bounding_box(time0: number, time1: number): AABB {
        return this.sides.get_bounding_box(time0, time1);
    }
}
