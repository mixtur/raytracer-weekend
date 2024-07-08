import { Hittable, create_hittable_type, HitRecord, hittable_types } from './hittable';
import { add_vec3, vec3, Vec3 } from '../math/vec3.gen';
import { Ray } from '../math/ray';
import { AABB, create_aabb } from '../math/aabb';

function get_t(val: number, o: number, d: number, default_t: number): number {
    // val = o + d * t; t = (val - o) / d;
    if (Math.abs(d) < 0.00001) return default_t;
    return (val - o) / d;
}

export interface IZXGrid extends Hittable {
    type: 'zx_grid';
    cells: (Hittable | null)[];
    cell_size: number;
    min: Vec3;
    max: Vec3;
    x_cols: number;
    z_rows: number;
    //todo: aabb
    aabb: AABB;
}

export const create_zx_grid = (x_cols: number, z_rows: number, y_size: number, cell_size: number, min: Vec3): IZXGrid => {
    const max = add_vec3(min, vec3(x_cols * cell_size, y_size, z_rows * cell_size));
    const cells = [];
    for (let i = 0; i < z_rows * x_cols; i++) {
        cells[i] = null;
    }
    const aabb = create_aabb(min, max);

    return {
        type: 'zx_grid',
        cells,
        cell_size,
        min,
        max,
        x_cols,
        z_rows,
        aabb
    };
};

export const zx_grid_add_hittable = (grid: IZXGrid, x_col: number, z_row: number, obj: Hittable) => {
    const p = z_row * grid.x_cols + x_col;
    const cell = grid.cells[p];
    if (cell !== null) { throw new Error(`Only one object is allowed per grid cell`); }
    grid.cells[p] = obj;
};

hittable_types.zx_grid = create_hittable_type({
    hit(hittable, r: Ray, t_min: number, t_max: number, hit: HitRecord): boolean {
        const grid = hittable as IZXGrid;
        const { cell_size, x_cols, z_rows } = grid;
        const ox = r.origin[0];
        const oy = r.origin[1];
        const oz = r.origin[2];
        const dx = r.direction[0];
        const dy = r.direction[1];
        const dz = r.direction[2];
        const min_x = grid.min[0];
        const min_y = grid.min[1];
        const min_z = grid.min[2];
        const max_x = grid.max[0];
        const max_y = grid.max[1];
        const max_z = grid.max[2];

        //todo: can exit earlier if test coordinates one by one
        const tx0 = get_t(dx > 0 ? min_x : max_x, ox, dx, -Infinity);
        const ty0 = get_t(dy > 0 ? min_y : max_y, oy, dy, -Infinity);
        const tz0 = get_t(dz > 0 ? min_z : max_z, oz, dz, -Infinity);
        const tx1 = get_t(dx > 0 ? max_x : min_x, ox, dx, Infinity);
        const ty1 = get_t(dy > 0 ? max_y : min_y, oy, dy, Infinity);
        const tz1 = get_t(dz > 0 ? max_z : min_z, oz, dz, Infinity);

        let enter_from_the_middle = false;
        const t_enter = Math.max(tx0, ty0, tz0);
        const t_exit = Math.min(tx1, ty1, tz1);
        let current_t = t_enter;
        if (t_exit <= t_enter) return false;// no intersection (== only in the corner or on the edge. This is fine to exclude)
        if (t_exit < t_min) return false; // the entire intersection is on the wrong side of the ray
        if (!Number.isFinite(t_enter)) return false; // very short direction?
        if (t_enter < 0) {// ray origin is inside the grid
            enter_from_the_middle = true;
            current_t = 0;
        }

        // find initial cell
        let z_row, x_col;
        if (enter_from_the_middle) {
            z_row = Math.floor((oz - min_z) / cell_size);
            x_col = Math.floor((ox - min_x) / cell_size);
        } else {
            if (t_enter === ty0) {// enter from top or bottom
                const z = oz + dz * t_enter;
                const x = ox + dx * t_enter;
                z_row = Math.floor((z - min_z) / cell_size);
                x_col = Math.floor((x - min_x) / cell_size);
            } else if (t_enter === tz0) { // enter from a side. Need to determine the side first
                z_row = dz > 0 ? 0 : (z_rows - 1);
                const x = ox + dx * t_enter;
                x_col = Math.floor((x - min_x) / cell_size);
            } else {
                x_col = dx > 0 ? 0 : (x_cols - 1);
                const z = oz + dz * t_enter;
                z_row = Math.floor((z - min_z) / cell_size);
            }
        }
        if (z_row < 0 || z_row >= z_rows || x_col < 0 || x_col >= z_rows) return false;// this can happen if dx == 0 or dz == 0

        const row_stride = Math.sign(dz) * x_cols;
        const col_stride = Math.sign(dx);

        let p = z_row * x_cols + x_col;

        let current_z = z_row * cell_size + min_z;
        let current_x = x_col * cell_size + min_x;
        if (dx < 0) current_x += cell_size;
        if (dz < 0) current_z += cell_size;
        const z_inc = Math.sign(dz) * cell_size;
        const x_inc = Math.sign(dx) * cell_size;
        while (current_t < t_exit) {
            const obj = grid.cells[p];
            if (obj !== null) {// try to hit the object in the cell
                if (hittable_types[obj.type].hit(obj, r, t_min, t_max, hit)) {
                    return true;
                }
            }
            // find the next cell to hit
            const t_i_next = get_t(current_z + z_inc, oz, dz, Infinity);
            const t_j_next = get_t(current_x + x_inc, ox, dx, Infinity);
            if (t_i_next < t_j_next) {
                p += row_stride;
                current_z += z_inc;
                current_t = t_i_next;
            } else {
                p += col_stride;
                current_x += x_inc;
                current_t = t_j_next;
            }
        }
        return false;
    },

    get_bounding_box(hittable, time0: number, time1: number, aabb: AABB): void {
        const grid = hittable as IZXGrid;
        aabb.min.set(grid.aabb.min);
        aabb.max.set(grid.aabb.max);
    }
});
