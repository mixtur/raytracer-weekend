import { point3, Point3, Vec3, vec3 } from '../math/vec3';
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
        for (let a = 0; a < 3; a++) {
            const inv_d = 1 / r.direction[a];
            let t0 = (this.min[a] - r.origin[a]) * inv_d;
            let t1 = (this.max[a] - r.origin[a]) * inv_d;
            if (inv_d < 0) { const t = t0; t0 = t1; t1 = t; }
            t_min = Math.max(t0, t_min);
            t_max = Math.min(t1, t_max);
            if (t_max <= t_min) {
                return false;
            }
        }
        return true;
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
