import { HitRecord, Hittable, set_face_normal } from './hittable';
import { AABB } from './aabb';
import { point3, vec3, vec3Set } from '../vec3';
import { Ray } from '../ray';
import { MegaMaterial } from '../materials/megamaterial';

export class YZRect implements Hittable {
    y0: number;
    z0: number;
    y1: number;
    z1: number;
    x: number;
    material: MegaMaterial;
    constructor(y0: number, y1: number, z0: number, z1: number, x: number, material: MegaMaterial) {
        this.y0 = y0;
        this.y1 = y1;
        this.z0 = z0;
        this.z1 = z1;
        this.x = x;
        this.material = material;
    }
    get_bounding_box(time0: number, time1: number, aabb: AABB): void {
        vec3Set(aabb.min, this.x - 0.0001, this.y0, this.z0);
        vec3Set(aabb.max, this.x + 0.0001, this.y1, this.z1);
    }
    hit(r: Ray, t_min: number, t_max: number, hit: HitRecord): boolean {
        const t = (this.x - r.origin[0]) / r.direction[0];
        if (t < t_min || t > t_max) {
            return false;
        }
        const y = r.origin[1] + r.direction[1] * t;
        const z = r.origin[2] + r.direction[2] * t;
        const {y0, y1, z0, z1, x} = this;
        if (y < y0 || y > y1 || z < z0 || z > z1) {
            return false;
        }

        vec3Set(hit.p, x, y, z);
        vec3Set(hit.normal, 1, 0, 0);
        hit.t = t;
        hit.material = this.material;
        hit.u = (y - y0) / (y1 - y0);
        hit.v = (z - z0) / (z1 - z0);

        set_face_normal(hit, r, hit.normal);

        return true;
    }
}