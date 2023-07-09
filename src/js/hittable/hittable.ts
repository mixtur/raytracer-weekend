import { Ray } from "../ray";
import { point3, Point3, vec3, Vec3, vec3Dot, vec3Negate1, vec3Unit2 } from '../vec3';
import { AABB } from './aabb';
import { MegaMaterial } from '../materials/megamaterial';
import { sColor } from '../texture/solid_color';

export interface HitRecord {
    p: Point3;
    normal: Vec3;
    t: number;
    front_face: boolean;
    material: MegaMaterial;
    u: number;
    v: number;
}

const dummyMaterial: MegaMaterial = {
    scatter: () => null,
    albedo: sColor(0, 0, 0),
    fuzz: NaN,
    ior: NaN,
    emit: sColor(0, 0, 0)
};

export const createEmptyHitRecord = (): HitRecord => {
    return {
        p: point3(0, 0, 0),
        normal: vec3(0, 0, 0),
        t: NaN,
        front_face: false,
        material: dummyMaterial,
        v: NaN,
        u: NaN
    };
};

export const hitRecord = (p: Point3, normal: Vec3, t: number, front_face: boolean, material: MegaMaterial, u: number, v: number): HitRecord => {
    return { p, normal, t, front_face, material, u, v };
};

export const set_face_normal = (hit: HitRecord, r: Ray, outward_normal: Vec3): void => {
    hit.front_face = vec3Dot(r.direction, outward_normal) < 0;
    vec3Unit2(hit.normal, hit.front_face ? outward_normal : vec3Negate1(outward_normal));
};


export interface Hittable {
    hit(r: Ray, t_min: number, t_max: number, hit: HitRecord): boolean;
    get_bounding_box(time0: number, time1: number, aabb: AABB): void;
}
