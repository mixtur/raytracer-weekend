import { Ray } from "../ray";
import { Point3, Vec3, vec3Dot, vec3Negate1 } from "../vec3";

export interface HitRecord {
    p: Point3;
    normal: Vec3;
    t: number;
    front_face: boolean;
}

export const set_face_normal = (rec: HitRecord, r: Ray, outward_normal: Vec3): void => {
    rec.front_face = vec3Dot(r.direction, outward_normal) < 0;
    rec.normal = rec.front_face ? outward_normal : vec3Negate1(outward_normal);
};


export interface Hittable {
    hit(r: Ray, t_min: number, t_max: number): HitRecord | null;
}
