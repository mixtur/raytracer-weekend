import { Ray } from "../math/ray";
import { dot_vec3, point3, Point3, vec3, Vec3, vec3_dirty } from '../math/vec3.gen';
import { AABB } from './aabb';
import { create_mega_material, MegaMaterial } from '../materials/megamaterial';
import { TriangleVec2 } from './triangle';

export interface HitRecord {
    p: Point3;
    normal: Vec3;
    t: number;
    front_face: boolean;
    material: MegaMaterial;
    u: number;
    v: number;
    tex_channels: TriangleVec2[];
}

const dummy_material: MegaMaterial = create_mega_material({
    fuzz: NaN,
    ior: NaN,
});

export const create_empty_hit_record = (): HitRecord => {
    return {
        p: point3(0, 0, 0),
        normal: vec3(0, 0, 0),
        t: NaN,
        front_face: false,
        material: dummy_material,
        v: NaN,
        u: NaN,
        tex_channels: []
    };
};

export const set_face_normal = (hit: HitRecord, r: Ray, outward_normal: Vec3): void => {
    hit.front_face = dot_vec3(r.direction, outward_normal) < 0;
    const n = hit.normal;
    const l = Math.hypot(n[0], n[1], n[2]);
    if (hit.front_face) {
        hit.normal[0] = outward_normal[0] / l;
        hit.normal[1] = outward_normal[1] / l;
        hit.normal[2] = outward_normal[2] / l;
    } else {
        hit.normal[0] = -outward_normal[0] / l;
        hit.normal[1] = -outward_normal[1] / l;
        hit.normal[2] = -outward_normal[2] / l;
    }
};


export abstract class Hittable {
    abstract hit(r: Ray, t_min: number, t_max: number, hit: HitRecord): boolean;
    abstract get_bounding_box(time0: number, time1: number, aabb: AABB): void;

    pdf_value(origin: Vec3, direction: Vec3): number {
        return 0;
    }

    random(origin: Vec3): Vec3 {
        return vec3(1, 0, 0);
    }
}
