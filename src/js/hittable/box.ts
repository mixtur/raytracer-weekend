import {
    Hittable,
    create_hittable_type,
    HitRecord,
    hittable_types,
    set_face_normal
} from './hittable';
import { len_vec3, Point3, sq_len_vec3, sub_vec3, Vec3, vec3 } from '../math/vec3.gen';
import { Ray, ray_at_r } from '../math/ray';
import { MegaMaterial } from '../materials/megamaterial';
import { random_min_max } from '../math/random';
import { AABB } from '../math/aabb';

function get_t(val: number, o: number, d: number, default_t: number): number {
    // val = o + d * t; t = (val - o) / d;
    if (Math.abs(d) < 0.00001) return default_t;
    return (val - o) / d;
}

export interface IBox extends Hittable {
    type: 'box';
    min: Point3;
    max: Point3;
    mat: MegaMaterial;
}

export const create_box = (p0: Point3, p1: Point3, mat: MegaMaterial): IBox => {
    return {
        type: 'box',
        min: p0,
        max: p1,
        mat
    };
}

const random_side = (box: IBox, px: boolean, py: boolean, pz: boolean, nx: boolean, ny: boolean, nz: boolean): number => {
    const dx = box.max[0] - box.min[0];
    const dy = box.max[1] - box.min[1];
    const dz = box.max[2] - box.min[2];

    const a_xy = dx * dy;
    const a_yz = dy * dz;
    const a_zx = dz * dx;

    const p_px = !px ? 0 : a_yz;
    const p_nx = !nx ? 0 : a_yz;
    const p_py = !py ? 0 : a_zx;
    const p_ny = !ny ? 0 : a_zx;
    const p_pz = !pz ? 0 : a_xy;
    const p_nz = !nz ? 0 : a_xy;

    const c_px = p_px;
    const c_py = p_py + c_px;
    const c_pz = p_pz + c_py;
    const c_nx = p_nx + c_pz;
    const c_ny = p_ny + c_nx;
    const c_nz = p_nz + c_ny;

    // 0..5 = px, py, pz, nx, ny, nz
    const r = Math.random() * c_nz;
    if (r < c_px) return 0;
    if (r < c_py) return 1;
    if (r < c_pz) return 2;
    if (r < c_nx) return 3;
    if (r < c_ny) return 4;
    return 5;
}

hittable_types.box = create_hittable_type({
    hit: (hittable: Hittable, r: Ray, t_min: number, t_max: number, hit: HitRecord): boolean => {
        const box = hittable as IBox;
        const ox = r.origin[0];
        const oy = r.origin[1];
        const oz = r.origin[2];
        const dx = r.direction[0];
        const dy = r.direction[1];
        const dz = r.direction[2];
        const min_x = box.min[0];
        const min_y = box.min[1];
        const min_z = box.min[2];
        const max_x = box.max[0];
        const max_y = box.max[1];
        const max_z = box.max[2];

        const tx0 = get_t(dx > 0 ? min_x : max_x, ox, dx, -Infinity);
        const ty0 = get_t(dy > 0 ? min_y : max_y, oy, dy, -Infinity);
        const tz0 = get_t(dz > 0 ? min_z : max_z, oz, dz, -Infinity);
        const tx1 = get_t(dx > 0 ? max_x : min_x, ox, dx, Infinity);
        const ty1 = get_t(dy > 0 ? max_y : min_y, oy, dy, Infinity);
        const tz1 = get_t(dz > 0 ? max_z : min_z, oz, dz, Infinity);

        const t_enter = Math.max(tx0, ty0, tz0);
        const t_exit = Math.min(tx1, ty1, tz1);

        if (t_exit < t_enter) return false;
        const p = hit.p;
        if (t_min <= t_enter && t_enter <= t_max) {
            ray_at_r(p, r, t_enter)
            hit.normal.set(t_enter === tx0 ? vec3(dx > 0 ? -1 : 1, 0, 0) :
                           t_enter === ty0 ? vec3(0, dy > 0 ? -1 : 1, 0) :
                                             vec3(0, 0, dz > 0 ? -1 : 1));
            hit.t = t_enter;
            hit.material = box.mat;
            hit.u = t_enter === tx0 ? (p[1] - min_y) / (max_y - min_y) :
                    t_enter === ty0 ? (p[2] - min_z) / (max_z - min_z) :
                                      (p[0] - min_x) / (max_x - min_x);
            hit.v = t_enter === tx0 ? (p[1] - min_y) / (max_y - min_y) :
                    t_enter === ty0 ? (p[2] - min_z) / (max_z - min_z) :
                                      (p[0] - min_x) / (max_x - min_x);
        } else if (t_min <= t_exit && t_exit <= t_max) {
            ray_at_r(p, r, t_exit);
            hit.normal.set(
                t_exit === tx1 ? vec3(dx > 0 ? 1 : -1, 0, 0) :
                t_exit === ty1 ? vec3(0, dy > 0 ? 1 : -1, 0) :
                                 vec3(0, 0, dz > 0 ? 1 : -1));
            hit.t = t_exit;
            hit.material = box.mat;
            hit.u = t_exit === tx1 ? (p[1] - min_y) / (max_y - min_y) :
                    t_exit === ty1 ? (p[2] - min_z) / (max_z - min_z) :
                                     (p[0] - min_x) / (max_x - min_x);
            hit.v = t_exit === tx1 ? (p[2] - min_z) / (max_z - min_z) :
                    t_exit === ty1 ? (p[0] - min_x) / (max_x - min_x) :
                                     (p[1] - min_y) / (max_y - min_y);
        } else {
            return false;
        }

        set_face_normal(hit, r, hit.normal, hit.normal);

        return true;
    },

    get_bounding_box: (hittable: Hittable, time0: number, time1: number, aabb: AABB): void => {
        const box = hittable as IBox;
        aabb.min.set(box.min);
        aabb.max.set(box.max);
    },

    random: (hittable: Hittable, origin: Vec3): Vec3 => {
        const box = hittable as IBox;
        const { min, max } = box;

        const use_px = origin[0] > max[0];
        const use_py = origin[1] > max[1];
        const use_pz = origin[2] > max[2];

        const use_nx = origin[0] < min[0];
        const use_ny = origin[1] < min[1];
        const use_nz = origin[2] < min[2];

        const side = (!use_px && !use_py && !use_pz && !use_nx && !use_ny && !use_nz)
            ? random_side(box, true, true, true, true, true, true)
            : random_side(box, use_px, use_py, use_pz, use_nx, use_ny, use_nz);


        const point_on_the_surface = vec3(
            random_min_max(box.min[0], box.max[0]),
            random_min_max(box.min[1], box.max[1]),
            random_min_max(box.min[2], box.max[2])
        );
        // 0..5 = px, py, pz, nx, ny, nz
        switch (side) {
            case 0: point_on_the_surface[0] = max[0]; break;
            case 1: point_on_the_surface[1] = max[1]; break;
            case 2: point_on_the_surface[2] = max[2]; break;
            case 3: point_on_the_surface[0] = min[0]; break;
            case 4: point_on_the_surface[1] = min[1]; break;
            case 5: point_on_the_surface[2] = min[2]; break;
        }

        return sub_vec3(point_on_the_surface, origin);
    },

    pdf_value: (hittable, origin: Vec3, direction: Vec3): number => {
        const box = hittable as IBox;
        const ox = origin[0];
        const oy = origin[1];
        const oz = origin[2];
        const dx = direction[0];
        const dy = direction[1];
        const dz = direction[2];
        const min_x = box.min[0];
        const min_y = box.min[1];
        const min_z = box.min[2];
        const max_x = box.max[0];
        const max_y = box.max[1];
        const max_z = box.max[2];

        const tx0 = get_t(dx > 0 ? min_x : max_x, ox, dx, -Infinity);
        const ty0 = get_t(dy > 0 ? min_y : max_y, oy, dy, -Infinity);
        const tz0 = get_t(dz > 0 ? min_z : max_z, oz, dz, -Infinity);
        const tx1 = get_t(dx > 0 ? max_x : min_x, ox, dx, Infinity);
        const ty1 = get_t(dy > 0 ? max_y : min_y, oy, dy, Infinity);
        const tz1 = get_t(dz > 0 ? max_z : min_z, oz, dz, Infinity);

        const t_enter = Math.max(tx0, ty0, tz0);
        const t_exit = Math.min(tx1, ty1, tz1);

        const t_min = 0.0001;

        if (t_exit < t_enter) return 0;

        let side: number;// 0..2 = x, y, z
        let t_hit: number;
        if (t_min <= t_enter) {
            side = t_enter === tx0 ? 0:
                   t_enter === ty0 ? 1:
                                     2;
            t_hit = t_enter;
        } else if (t_min <= t_exit) {
            side = t_exit === tx1 ? 0:
                   t_exit === ty1 ? 1:
                                    2;
            t_hit = t_exit;
        } else {
            return 0;
        }

        const distance_squared = t_hit * t_hit * sq_len_vec3(direction);
        const cos = Math.abs(direction[side % 3] / len_vec3(direction));

        const a_xy = (box.max[0] - box.min[0]) * (box.max[1] - box.min[1]);
        const a_yz = (box.max[1] - box.min[1]) * (box.max[2] - box.min[2]);
        const a_zx = (box.max[2] - box.min[2]) * (box.max[0] - box.min[0]);

        const use_px = ox > max_x;
        const use_py = oy > max_y;
        const use_pz = oz > max_z;
        const use_nx = ox < min_x;
        const use_ny = oy < min_y;
        const use_nz = oz < min_z;

        const use_all = (!use_px && !use_py && !use_pz && !use_nx && !use_ny && !use_nz);
        const total_area = use_all
            ? (a_xy + a_yz + a_zx) * 2
            : ((+(use_px || use_nx) * a_yz) +
               (+(use_py || use_ny) * a_zx) +
               (+(use_pz || use_nz) * a_xy));

        return distance_squared / (cos * total_area);
    }
});
