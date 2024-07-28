import { Ray } from "../math/ray";
import { ArenaVec3Allocator, dot_vec3, point3, Point3, vec3, Vec3, vec3_dirty } from '../math/vec3.gen';
import { AABB } from '../math/aabb';
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

const tex_channel_allocator = new ArenaVec3Allocator(1024);

const copy_triangle_vec2 = (t: TriangleVec2): TriangleVec2 => {
    const A = tex_channel_allocator.alloc_dirty();
    const B = tex_channel_allocator.alloc_dirty();
    const C = tex_channel_allocator.alloc_dirty();

    A.set(t[0])
    B.set(t[1])
    C.set(t[2])

    return [A, B, C];
}

export const assign_tex_channels = (hit: HitRecord, tex_channels: TriangleVec2[]) => {
    for (let i = 0; i < tex_channels.length; i++){
        const hit_channel = hit.tex_channels[i];
        if (hit_channel === undefined) {
            hit.tex_channels[i] = copy_triangle_vec2(tex_channels[i]);
        }
        else {
            for (let j = 0; j < 3; j++) {
                const vec = tex_channels[i][j];
                hit_channel[j].set(vec);
            }
        }
    }
}

export const create_empty_hit_record = (): HitRecord => {
    const dummy_material: MegaMaterial = create_mega_material({
        type: 'dummy',
        fuzz: NaN,
        ior: NaN,
    });

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

export const set_face_normal = (hit: HitRecord, r: Ray, outward_normal: Vec3, rendering_normal: Vec3): void => {
    hit.front_face = dot_vec3(r.direction, outward_normal) < 0;
    if (hit.front_face) {
        hit.normal[0] = rendering_normal[0];
        hit.normal[1] = rendering_normal[1];
        hit.normal[2] = rendering_normal[2];
    } else {
        hit.normal[0] = -rendering_normal[0];
        hit.normal[1] = -rendering_normal[1];
        hit.normal[2] = -rendering_normal[2];
    }
};

// we create POJOs for hittables themselves and register methods in hittable_types,
// We do it like that because we need an ability to send hittables to workers, and this is a way to force it.
export interface Hittable {
    type: string;
}

export interface HittableType {
    hit: (hittable: Hittable, r: Ray, t_min: number, t_max: number, hit: HitRecord) => boolean;
    get_bounding_box: (hittable: Hittable, time0: number, time1: number, aabb: AABB) => void;
    pdf_value: (hittable: Hittable, origin: Point3, direction: Vec3) => number;
    random: (hittable: Hittable, origin: Point3) => Vec3;
}

export interface HittableTypeConfig {
    hit: (hittable: Hittable, r: Ray, t_min: number, t_max: number, hit: HitRecord) => boolean;
    get_bounding_box: (hittable: Hittable, time0: number, time1: number, aabb: AABB) => void;
    pdf_value?: (hittable: Hittable, origin: Point3, direction: Vec3) => number;
    random?: (hittable: Hittable, origin: Point3) => Vec3;
}

// note: we don't want to create wrapping functions for hit, get_bounding_box etc. because that would screw up ICs.
export const hittable_types: Record<string, HittableType> = {};

export const create_hittable_type = (config: HittableTypeConfig): HittableType => {
    return {
        hit: config.hit,
        get_bounding_box: config.get_bounding_box,
        pdf_value: config.pdf_value ?? (() => 0),
        random: config.random ?? (() => vec3(1, 0, 0))
    };
};
