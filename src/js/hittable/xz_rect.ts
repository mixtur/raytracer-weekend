import { HitRecord, Hittable, set_face_normal } from './hittable';
import { AABB } from './aabb';
import { point3, vec3 } from '../vec3';
import { Ray } from '../ray';
import { Material } from '../materials/material';

export class XZRect implements Hittable {
    x0: number;
    z0: number;
    x1: number;
    z1: number;
    y: number;
    material: Material;
    constructor(x0: number, x1: number, z0: number, z1: number, y: number, material: Material) {
        this.x0 = x0;
        this.x1 = x1;
        this.z0 = z0;
        this.z1 = z1;
        this.y = y;
        this.material = material;
    }
    get_bounding_box(time0: number, time1: number): AABB {
        return new AABB(
            point3(
                this.x0, this.y - 0.0001, this.z0
            ),
            point3(
                this.x1, this.y + 0.0001, this.z1
            )
        );
    }
    hit(r: Ray, t_min: number, t_max: number): HitRecord | null {
        const t = (this.y - r.origin[1]) / r.direction[1];
        if (t < t_min || t > t_max) {
            return null;
        }
        const x = r.origin[0] + r.direction[0] * t;
        const z = r.origin[2] + r.direction[2] * t;
        const {x0, x1, z0, z1, y} = this;
        if (x < x0 || x > x1 || z < z0 || z > z1) {
            return null;
        }
        const hit: HitRecord = {
            u: (x - x0) / (x1 - x0),
            v: (z - z0) / (z1 - z0),
            t,
            p: point3(x, y, z),
            normal: vec3(0, 1, 0),
            material: this.material,
            front_face: false
        };

        set_face_normal(hit, r, hit.normal);

        return hit;
    }
}