import { HitRecord, Hittable, set_face_normal } from './hittable';
import { AABB } from './aabb';
import { point3, vec3 } from '../vec3';
import { ray, Ray } from '../ray';
import { degrees_to_radians } from '../utils';

export class RotateY implements Hittable {
    obj: Hittable;
    sin_theta: number;
    cos_theta: number;
    aabb: AABB;
    constructor(obj: Hittable, angle: number) {
        const rad_angle = degrees_to_radians(angle);
        const cos = this.sin_theta = Math.sin(rad_angle);
        const sin = this.cos_theta = Math.cos(rad_angle);
        this.obj = obj;
        const objAABB = obj.get_bounding_box(0, 1);//todo: 0..1?

        const aabb = this.aabb = new AABB(
            point3( Infinity, objAABB.min[1],  Infinity),
            point3(-Infinity, objAABB.max[1], -Infinity)
        );
        for (let i = 0; i < 2; i++) {
            for (let k = 0; k < 2; k++) {
                const x = i * objAABB.min[0] + (1 - i) * objAABB.max[0];
                const z = k * objAABB.min[2] + (1 - k) * objAABB.max[2];

                const newX =  cos * x + sin * z;
                const newZ = -sin * x + cos * z;

                aabb.min[0] = Math.min(aabb.min[0], newX);
                aabb.max[0] = Math.max(aabb.max[0], newX);
                aabb.min[2] = Math.min(aabb.min[2], newZ);
                aabb.max[2] = Math.max(aabb.max[2], newZ);
            }
        }
    }

    hit(r: Ray, t_min: number, t_max: number): HitRecord | null {
        const { origin, direction } = r;
        const { cos_theta, sin_theta } = this;
        const new_origin = vec3(
            cos_theta * origin[0] - sin_theta * origin[2],
            origin[1],
            sin_theta * origin[0] + cos_theta * origin[2]
        );
        const new_direction = vec3(
            cos_theta * direction[0] - sin_theta * direction[2],
            direction[1],
            sin_theta * direction[0] + cos_theta * direction[2]
        );

        const r_rotated = ray(new_origin, new_direction, r.time);

        const hit = this.obj.hit(r_rotated, t_min, t_max);
        if (hit === null) return null;

        hit.p = vec3(
             cos_theta * hit.p[0] + sin_theta * hit.p[2],
            hit.p[1],
            -sin_theta * hit.p[0] + cos_theta * hit.p[2],
        );

        hit.normal = vec3(
            cos_theta * hit.normal[0] + sin_theta * hit.normal[2],
            hit.normal[1],
            -sin_theta * hit.normal[0] + cos_theta * hit.normal[2]
        );

        set_face_normal(hit, r_rotated, hit.normal);

        return hit;
    }

    get_bounding_box(time0: number, time1: number): AABB {
        return this.aabb;
    }
}
