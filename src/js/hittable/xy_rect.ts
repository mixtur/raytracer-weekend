import { HitRecord, Hittable, set_face_normal } from './hittable';
import { AABB } from './aabb';
import { point3, vec3, vec3Set } from '../vec3';
import { Ray } from '../ray';
import { MegaMaterial } from '../materials/megamaterial';

export class XYRect implements Hittable {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    z: number;
    material: MegaMaterial;
    constructor(x0: number, x1: number, y0: number, y1: number, z: number, material: MegaMaterial) {
        this.x0 = x0;
        this.x1 = x1;
        this.y0 = y0;
        this.y1 = y1;
        this.z = z;
        this.material = material;
    }
    get_bounding_box(time0: number, time1: number, aabb: AABB): void {
        vec3Set(aabb.min, this.x0, this.y0, this.z - 0.0001);
        vec3Set(aabb.max, this.x1, this.y1, this.z + 0.0001);
    }
    hit(r: Ray, t_min: number, t_max: number, hit: HitRecord): boolean {
        const t = (this.z - r.origin[2]) / r.direction[2];
        if (t < t_min || t > t_max) {
            return false;
        }
        const x = r.origin[0] + r.direction[0] * t;
        const y = r.origin[1] + r.direction[1] * t;
        const {x0, x1, y0, y1, z} = this;
        if (x < x0 || x > x1 || y < y0 || y > y1) {
            return false;
        }
        vec3Set(hit.p, x, y, z);
        vec3Set(hit.normal, 0, 0, 1);
        hit.t = t;
        hit.material = this.material;
        hit.u = (x - x0) / (x1 - x0);
        hit.v = (y - y0) / (y1 - y0);

        set_face_normal(hit, r, hit.normal);

        return true;
    }
}