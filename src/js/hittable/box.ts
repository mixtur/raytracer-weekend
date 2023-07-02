import { HitRecord, Hittable, set_face_normal } from './hittable';
import { Point3, vec3 } from '../vec3';
import { Ray, rayAt2 } from '../ray';
import { AABB } from './aabb';
import { MegaMaterial } from '../materials/megamaterial';

function get_t(val: number, o: number, d: number, default_t: number): number {
    // val = o + d * t; t = (val - o) / d;
    if (Math.abs(d) < 0.00001) return default_t;
    return (val - o) / d;
}

export class Box implements Hittable {
    min: Point3;
    max: Point3;
    mat: MegaMaterial;
    constructor(p0: Point3, p1: Point3, mat: MegaMaterial) {
        this.min = p0;
        this.max = p1;
        this.mat = mat;
    }

    hit(r: Ray, t_min: number, t_max: number): HitRecord | null {
        const ox = r.origin[0];
        const oy = r.origin[1];
        const oz = r.origin[2];
        const dx = r.direction[0];
        const dy = r.direction[1];
        const dz = r.direction[2];
        const min_x = this.min[0];
        const min_y = this.min[1];
        const min_z = this.min[2];
        const max_x = this.max[0];
        const max_y = this.max[1];
        const max_z = this.max[2];

        const tx0 = get_t(dx > 0 ? min_x : max_x, ox, dx, -Infinity);
        const ty0 = get_t(dy > 0 ? min_y : max_y, oy, dy, -Infinity);
        const tz0 = get_t(dz > 0 ? min_z : max_z, oz, dz, -Infinity);
        const tx1 = get_t(dx > 0 ? max_x : min_x, ox, dx, Infinity);
        const ty1 = get_t(dy > 0 ? max_y : min_y, oy, dy, Infinity);
        const tz1 = get_t(dz > 0 ? max_z : min_z, oz, dz, Infinity);

        const t_enter = Math.max(tx0, ty0, tz0);
        const t_exit = Math.min(tx1, ty1, tz1);

        if (t_exit < t_enter) return null;// no intersection
        let hit: HitRecord;
        if (t_min <= t_enter && t_enter <= t_max) {
            const p = rayAt2(r, t_enter);
            hit = {
                p,
                material: this.mat,
                front_face: true,
                normal:
                    t_enter === tx0 ? vec3(dx > 0 ? -1 : 1, 0, 0) :
                    t_enter === ty0 ? vec3(0, dy > 0 ? -1 : 1, 0) :
                    vec3(0, 0, dz > 0 ? -1 : 1),
                t: t_enter,
                u:
                    t_enter === tx0 ? (p[1] - min_y) / (max_y - min_y) :
                    t_enter === ty0 ? (p[2] - min_z) / (max_z - min_z) :
                    (p[0] - min_x) / (max_x - min_x),
                v:
                    t_enter === tx0 ? (p[2] - min_z) / (max_z - min_z) :
                    t_enter === ty0 ? (p[0] - min_x) / (max_x - min_x) :
                    (p[1] - min_y) / (max_y - min_y),
            };
        } else if (t_min <= t_exit && t_exit <= t_max) {
            const p = rayAt2(r, t_exit);
            hit = {
                p,
                material: this.mat,
                front_face: true,
                normal:
                    t_exit === tx1 ? vec3(dx > 0 ? 1 : -1, 0, 0) :
                    t_exit === ty1 ? vec3(0, dy > 0 ? 1 : -1, 0) :
                    vec3(0, 0, dz > 0 ? 1 : -1),
                t: t_exit,
                u:
                    t_exit === tx1 ? (p[1] - min_y) / (max_y - min_y) :
                    t_exit === ty1 ? (p[2] - min_z) / (max_z - min_z) :
                    (p[0] - min_x) / (max_x - min_x),
                v:
                    t_exit === tx1 ? (p[2] - min_z) / (max_z - min_z) :
                    t_exit === ty1 ? (p[0] - min_x) / (max_x - min_x) :
                    (p[1] - min_y) / (max_y - min_y),
            };
        } else {
            return null;
        }

        set_face_normal(hit, r, hit.normal);

        return hit;
    }

    get_bounding_box(time0: number, time1: number): AABB {
        return new AABB(this.min, this.max);
    }
}

