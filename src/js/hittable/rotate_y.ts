import { HitRecord, Hittable, set_face_normal } from './hittable';
import { AABB } from './aabb';
import { point3, vec3, vec3_set } from '../math/vec3';
import { Ray, ray_allocator } from '../math/ray';
import { degrees_to_radians } from '../utils';

export class RotateY extends Hittable {
    obj: Hittable;
    sin_theta: number;
    cos_theta: number;
    aabb: AABB;
    constructor(obj: Hittable, angle: number) {
        super();
        const rad_angle = degrees_to_radians(angle);
        const cos = this.sin_theta = Math.sin(rad_angle);
        const sin = this.cos_theta = Math.cos(rad_angle);
        this.obj = obj;
        const obj_aabb = AABB.createEmpty();
        obj.get_bounding_box(0, 1, obj_aabb);//todo: 0..1?

        const aabb = this.aabb = new AABB(
            point3( Infinity, obj_aabb.min[1],  Infinity),
            point3(-Infinity, obj_aabb.max[1], -Infinity)
        );
        for (let i = 0; i < 2; i++) {
            for (let k = 0; k < 2; k++) {
                const x = i * obj_aabb.min[0] + (1 - i) * obj_aabb.max[0];
                const z = k * obj_aabb.min[2] + (1 - k) * obj_aabb.max[2];

                const new_x =  cos * x + sin * z;
                const new_z = -sin * x + cos * z;

                aabb.min[0] = Math.min(aabb.min[0], new_x);
                aabb.max[0] = Math.max(aabb.max[0], new_x);
                aabb.min[2] = Math.min(aabb.min[2], new_z);
                aabb.max[2] = Math.max(aabb.max[2], new_z);
            }
        }
    }

    hit(r: Ray, t_min: number, t_max: number, hit: HitRecord): boolean {
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

        const r_rotated = ray_allocator.alloc(new_origin, new_direction, r.time);

        if (!this.obj.hit(r_rotated, t_min, t_max, hit)) return false;

        vec3_set(hit.p,
             cos_theta * hit.p[0] + sin_theta * hit.p[2],
            hit.p[1],
            -sin_theta * hit.p[0] + cos_theta * hit.p[2],
        );

        vec3_set(hit.normal,
            cos_theta * hit.normal[0] + sin_theta * hit.normal[2],
            hit.normal[1],
            -sin_theta * hit.normal[0] + cos_theta * hit.normal[2]
        );

        set_face_normal(hit, r_rotated, hit.normal);

        return true;
    }

    get_bounding_box(time0: number, time1: number, aabb: AABB): void {
        aabb.min.set(this.aabb.min);
        aabb.max.set(this.aabb.max);
    }
}
