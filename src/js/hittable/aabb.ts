import { point3, Point3, Vec3, vec3 } from '../math/vec3.gen';
import { Ray } from '../math/ray';

export class AABB {
    static createEmpty() { return new AABB(vec3(Infinity, Infinity, Infinity), vec3(-Infinity, -Infinity, -Infinity)); }

    min: Point3;
    max: Point3;
    constructor(min: Point3, max: Point3) {
        this.min = min;
        this.max = max;
    }

    hit(r: Ray, t_min: number, t_max: number): boolean {
        let t0_0 = (this.min[0] - r.origin[0]) * r.inv_dir[0];
        let t1_0 = (this.min[1] - r.origin[1]) * r.inv_dir[1];
        let t2_0 = (this.min[2] - r.origin[2]) * r.inv_dir[2];

        let t0_1 = (this.max[0] - r.origin[0]) * r.inv_dir[0];
        let t1_1 = (this.max[1] - r.origin[1]) * r.inv_dir[1];
        let t2_1 = (this.max[2] - r.origin[2]) * r.inv_dir[2];

        if (r.inv_dir[0] < 0) { const t = t0_0; t0_0 = t0_1; t0_1 = t; }
        if (r.inv_dir[1] < 0) { const t = t1_0; t1_0 = t1_1; t1_1 = t; }
        if (r.inv_dir[2] < 0) { const t = t2_0; t2_0 = t2_1; t2_1 = t; }

        return Math.max(t0_0, t1_0, t2_0, t_min) < Math.min(t0_1, t1_1, t2_1, t_max);
    }

    consumeAABB(b: AABB): void {
        this.min[0] = Math.min(this.min[0], b.min[0]);
        this.min[1] = Math.min(this.min[1], b.min[1]);
        this.min[2] = Math.min(this.min[2], b.min[2]);

        this.max[0] = Math.max(this.max[0], b.max[0]);
        this.max[1] = Math.max(this.max[1], b.max[1]);
        this.max[2] = Math.max(this.max[2], b.max[2]);
    }

    consumePoint(p: Vec3): void {
        this.min[0] = Math.min(this.min[0], p[0]);
        this.min[1] = Math.min(this.min[1], p[1]);
        this.min[2] = Math.min(this.min[2], p[2]);

        this.max[0] = Math.max(this.max[0], p[0]);
        this.max[1] = Math.max(this.max[1], p[1]);
        this.max[2] = Math.max(this.max[2], p[2]);
    }

    expand(padding: number): void {
        if (this.max[0] === this.min[0]) {
            this.min[0] -= padding;
            this.max[0] += padding;
        }
        if (this.max[1] === this.min[1]) {
            this.min[1] -= padding;
            this.max[1] += padding;
        }
        if (this.max[2] === this.min[2]) {
            this.min[2] -= padding;
            this.max[2] += padding;
        }
    }
}

export function surrounding_box(b1: AABB, b2: AABB): AABB {
    return new AABB(
        point3(
            Math.min(b1.min[0], b2.min[0]),
            Math.min(b1.min[1], b2.min[1]),
            Math.min(b1.min[2], b2.min[2]),
        ),
        point3(
            Math.max(b1.max[0], b2.max[0]),
            Math.max(b1.max[1], b2.max[1]),
            Math.max(b1.max[2], b2.max[2]),
        )
    );
}
