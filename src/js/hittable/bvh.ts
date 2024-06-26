import { HitRecord, Hittable } from './hittable';
import { AABB, surrounding_box } from './aabb';
import { Ray } from '../math/ray';
import { random_int_min_max } from '../math/random';
import { Vec3 } from '../math/vec3.gen';

const b0 = AABB.createEmpty();
const b1 = AABB.createEmpty();
export class BVHNode extends Hittable {
    size: number;
    left: Hittable;
    right: Hittable;
    aabb: AABB;

    constructor(objects: Hittable[], time0: number, time1: number) {
        super();
        this.size = objects.length;
        switch (objects.length) {
            case 0:
                throw new Error('cannot create an empty BVH node');
            case 1:
                this.left = this.right = objects[0];
                break;
            case 2:
                this.left = objects[0];
                this.right = objects[1];
                break;
            default:
                {
                    const axis = random_int_min_max(0, 2);
                    objects.sort((a, b) => {
                        a.get_bounding_box(time0, time1, b0);
                        b.get_bounding_box(time0, time1, b1);
                        return b0.min[axis] - b1.min[axis];
                    });
                    this.left = new BVHNode(objects.slice(0, Math.floor(objects.length / 2)), time0, time1);
                    this.right = new BVHNode(objects.slice(Math.floor(objects.length / 2)), time0, time1);
                }
                break;
        }

        this.left.get_bounding_box(time0, time1, b0);
        this.right.get_bounding_box(time0, time1, b1);
        this.aabb = surrounding_box(b0, b1);
    }

    hit(r: Ray, t_min: number, t_max: number, hit: HitRecord): boolean {
        if (!this.aabb.hit(r, t_min, t_max)) {
            return false;
        }
        const hit_left = this.left.hit(r, t_min, t_max, hit);
        const hit_right = this.right.hit(r, t_min, hit_left ? hit.t : t_max, hit);

        return hit_left || hit_right;
    }

    get_bounding_box(time0: number, time1: number, aabb: AABB): void {
        aabb.min.set(this.aabb.min);
        aabb.max.set(this.aabb.max);
    }

    pdf_value(origin: Vec3, direction: Vec3): number {
        if (this.left === this.right) return this.left.pdf_value(origin, direction);

        const l_count = this.left instanceof BVHNode ? this.left.size : 1;
        const r_count = this.size - l_count;

        return (this.left.pdf_value(origin, direction) * l_count + this.right.pdf_value(origin, direction) * r_count) / this.size;
    }

    random(origin: Vec3): Vec3 {
        if (this.left === this.right) return this.left.random(origin);

        const l_count = this.left instanceof BVHNode ? this.left.size : 1;

        return Math.random() * this.size < l_count
            ? this.left.random(origin)
            : this.right.random(origin);
    }
}
