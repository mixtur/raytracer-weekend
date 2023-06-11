import { HitRecord, Hittable } from './hittable';
import { point3, vec3, Vec3, vec3Add2 } from '../vec3';
import { Ray, rayAt2 } from '../ray';

export class ZXGrid implements Hittable {
    cells: (Hittable | null)[][] = [];
    cellSize: number;
    min: Vec3;
    max: Vec3;
    w: number;// todo: name w/h better
    h: number;

    constructor(w: number, h: number, cellSize: number, min: Vec3) {
        this.w = w;
        this.h = h;
        this.cellSize = cellSize;
        this.min = min;
        this.max = vec3Add2(min, vec3(w * cellSize, cellSize, h * cellSize));
        for (let i = 0; i < h; i++) {
            this.cells[i] = [];
            for (let j = 0; j < w; j++) {
                this.cells[i][j] = null;
            }
        }
    }

    addHittable(gx: number, gz: number, obj: Hittable): void {
        const cell = this.cells[gz][gx];
        if (cell !== null) { throw new Error(`Only one object is allowed per grid cell`); }
        this.cells[gz][gx] = obj;
    }

    get_t(val: number, o: number, d: number, default_t: number): number {
        // val = o + d * t; t = (val - o) / d;
        if (Math.abs(d) < 0.00001) return default_t;
        return (val - o) / d;
    }

    hit(r: Ray, t_min: number, t_max: number): HitRecord | null {
        const { cellSize, w, h } = this;
        const [ox, oy, oz] = r.origin;
        const [dx, dy, dz] = r.direction;
        const [min_x, min_y, min_z] = this.min;
        const [max_x, max_y, max_z] = this.max;

        const tx0 = this.get_t(dx > 0 ? min_x : max_x, ox, dx, -Infinity);
        const ty0 = this.get_t(dy > 0 ? min_y : max_y, oy, dy, -Infinity);
        const tz0 = this.get_t(dz > 0 ? min_z : max_z, oz, dz, -Infinity);
        const tx1 = this.get_t(dx > 0 ? max_x : min_x, ox, dx, Infinity);
        const ty1 = this.get_t(dy > 0 ? max_y : min_y, oy, dy, Infinity);
        const tz1 = this.get_t(dz > 0 ? max_z : min_z, oz, dz, Infinity);

        let enterFromTheMiddle = false;
        const t_enter = Math.max(tx0, ty0, tz0);
        const t_exit = Math.min(tx1, ty1, tz1);
        let current_t = t_enter;
        if (t_exit < t_enter) return null;// not intersection
        if (t_exit < t_min) return null; // the entire intersection is on the wrong side of the ray
        if (!Number.isFinite(t_enter)) return null; // very short direction?
        if (t_enter < 0) {// ray origin is inside the grid
            enterFromTheMiddle = true;
            current_t = 0;
        }

        // find initial cell
        let i, j;
        if (enterFromTheMiddle) {
            i = Math.floor((oz - min_z) / cellSize);
            j = Math.floor((ox - min_x) / cellSize);
        } else {
            if (t_enter === ty0) {// enter from top or bottom
                const z = oz + dz * t_enter;
                const x = ox + dx * t_enter;
                i = Math.floor((z - min_z) / cellSize);
                j = Math.floor((x - min_x) / cellSize);
            } else if (t_enter === tz0) { // enter from a side. Need to determine the side first
                i = dz > 0 ? 0 : (h - 1);
                const x = ox + dx * t_enter;
                j = Math.floor((x - min_x) / cellSize);
            } else {
                j = dx > 0 ? 0 : (w - 1);
                const z = oz + dz * t_enter;
                i = Math.floor((z - min_z) / cellSize);
            }
        }
        if (i < 0 || i >= h || j < 0 || j >= h) return null;

        const di = Math.sign(dz);
        const dj = Math.sign(dx);

        let current_z = i * cellSize + min_z;
        let current_x = j * cellSize + min_x;
        if (dx < 0) current_x += cellSize;
        if (dz < 0) current_z += cellSize;
        const zInc = Math.sign(dz) * cellSize;
        const xInc = Math.sign(dx) * cellSize;
        while (current_t < t_exit) {
            const obj = this.cells[i][j];
            if (obj !== null) {// try to hit the object in the cell
                const hit = obj.hit(r, t_min, t_max);
                if (hit) {
                    return hit;
                }
            }
            // find the next cell to hit
            const t_i_next = this.get_t(current_z + zInc, oz, dz, Infinity);
            const t_j_next = this.get_t(current_x + xInc, ox, dx, Infinity);
            if (t_i_next < t_j_next) {
                i += di;
                current_z += zInc;
                current_t = t_i_next;
            } else {
                j += dj;
                current_x += xInc;
                current_t = t_j_next;
            }
        }
        return null;
    }
}
