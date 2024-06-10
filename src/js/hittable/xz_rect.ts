import { HitRecord, Hittable, set_face_normal } from './hittable';
import { AABB } from './aabb';
import { vec3Set } from '../math/vec3';
import { Ray } from '../math/ray';
import { MegaMaterial } from '../materials/megamaterial';

export class XZRect implements Hittable {
    x0: number;
    z0: number;
    x1: number;
    z1: number;
    y: number;
    material: MegaMaterial;
    constructor(x0: number, x1: number, z0: number, z1: number, y: number, material: MegaMaterial) {
        this.x0 = x0;
        this.x1 = x1;
        this.z0 = z0;
        this.z1 = z1;
        this.y = y;
        this.material = material;
    }
    get_bounding_box(time0: number, time1: number, aabb: AABB): void {
        vec3Set(aabb.min, this.x0, this.y - 0.0001, this.z0);
        vec3Set(aabb.max, this.x1, this.y + 0.0001, this.z1);
    }
    hit(r: Ray, t_min: number, t_max: number, hit: HitRecord): boolean {
        const t = (this.y - r.origin[1]) / r.direction[1];
        if (t < t_min || t > t_max) {
            return false;
        }
        const x = r.origin[0] + r.direction[0] * t;
        const z = r.origin[2] + r.direction[2] * t;
        const {x0, x1, z0, z1, y} = this;
        if (x < x0 || x > x1 || z < z0 || z > z1) {
            return false;
        }
        vec3Set(hit.p, x, y, z);
        vec3Set(hit.normal, 0, 1, 0);
        hit.t = t;
        hit.material = this.material;
        hit.u = (x - x0) / (x1 - x0);
        hit.v = (z - z0) / (z1 - z0);

        set_face_normal(hit, r, hit.normal);

        return true;
    }
}
