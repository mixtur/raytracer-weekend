import { Ray, ray_at_r } from '../math/ray';
import { div_vec3_s_r, dot_vec3, mix_vec3_r, Point3, sub_vec3_r, vec3, Vec3 } from '../math/vec3.gen';
import { Hittable, create_hittable_type, HitRecord, hittable_types, set_face_normal } from "./hittable";
import { AABB } from '../math/aabb';
import { get_sphere_uv } from './sphere';
import { MegaMaterial } from '../materials/megamaterial';

const tmp1 = vec3(0, 0, 0);
const tmp2 = vec3(0, 0, 0);
const oc = vec3(0, 0, 0);
const r_vector = vec3(0, 0, 0);

export interface IMovingSphere extends Hittable {
    type: 'moving_sphere',
    center0: Point3;
    center1: Point3;
    time0: number;
    time1: number;
    dt: number;
    radius: number;
    material: MegaMaterial;
}

const get_center_r = (result: Vec3, sphere: IMovingSphere, time: number): void => {
    const p = (time - sphere.time0) / sphere.dt;
    mix_vec3_r(result, sphere.center0, sphere.center1, p);
};

export const create_moving_sphere = (center0: Point3, center1: Point3, time0: number, time1: number, radius: number, material: MegaMaterial): IMovingSphere => {
    return {
        type: 'moving_sphere',
        center0,
        center1,
        time0,
        time1,
        dt: time1 - time0,
        radius,
        material
    }
};

hittable_types.moving_sphere = create_hittable_type({
    hit(hittable, r: Ray, t_min: number, t_max: number, hit: HitRecord): boolean {
        const sphere = hittable as IMovingSphere;
        const {radius} = sphere;
        const center = tmp1;
        get_center_r(center, sphere, r.time);

        sub_vec3_r(oc, r.origin, center);
        const a = dot_vec3(r.direction, r.direction);
        const half_b = dot_vec3(oc, r.direction);
        const c = dot_vec3(oc, oc) - radius ** 2;
        const D = half_b * half_b - a * c;
        if (D < 1e-10) return false;
        const sqrt_d = Math.sqrt(D);
        let t = ( -half_b - sqrt_d ) / a;
        if (t < t_min || t_max < t) {
            t = ( -half_b + sqrt_d ) / a;
            if (t < t_min || t_max < t) {
                return false;
            }
        }
        const p = hit.p;
        ray_at_r(p, r, t);
        sub_vec3_r(r_vector, p, center)
        div_vec3_s_r(hit.normal, r_vector, radius);
        hit.t = t;
        hit.material = sphere.material;
        get_sphere_uv(hit.normal, hit);
        set_face_normal(hit, r, hit.normal, hit.normal);

        return true;
    },

    get_bounding_box(hittable, time0: number, time1: number, aabb: AABB): void {
        const sphere = hittable as IMovingSphere;

        const c0 = tmp1;
        const c1 = tmp2;

        get_center_r(c0, sphere, time0);
        get_center_r(c1, sphere, time1);
        aabb.min[0] = Math.min(c0[0], c1[0]) - sphere.radius;
        aabb.min[1] = Math.min(c0[1], c1[1]) - sphere.radius;
        aabb.min[2] = Math.min(c0[2], c1[2]) - sphere.radius;
        aabb.max[0] = Math.max(c0[0], c1[0]) + sphere.radius;
        aabb.max[1] = Math.max(c0[1], c1[1]) + sphere.radius;
        aabb.max[2] = Math.max(c0[2], c1[2]) + sphere.radius;
    }
});
