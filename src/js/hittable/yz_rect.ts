import { HitRecord, Hittable, set_face_normal } from './hittable';
import { AABB } from './aabb';
import { point3, vec3 } from '../vec3';
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
    get_bounding_box(time0: number, time1: number): AABB {
        return new AABB(
            point3(
                this.x - 0.0001, this.y0, this.z0
            ),
            point3(
                this.x + 0.0001, this.y1, this.z1
            )
        );
    }
    hit(r: Ray, t_min: number, t_max: number): HitRecord | null {
        const t = (this.x - r.origin[0]) / r.direction[0];
        if (t < t_min || t > t_max) {
            return null;
        }
        const y = r.origin[1] + r.direction[1] * t;
        const z = r.origin[2] + r.direction[2] * t;
        const {y0, y1, z0, z1, x} = this;
        if (y < y0 || y > y1 || z < z0 || z > z1) {
            return null;
        }
        const hit: HitRecord = {
            p: point3(x, y, z),
            normal: vec3(1, 0, 0),
            t,
            front_face: false,
            material: this.material,
            u: (y - y0) / (y1 - y0),
            v: (z - z0) / (z1 - z0),
        };

        set_face_normal(hit, r, hit.normal);

        return hit;
    }
}