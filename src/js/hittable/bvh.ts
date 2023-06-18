import { HitRecord, Hittable } from './hittable';
import { AABB, surrounding_box } from './aabb';
import { Ray } from '../ray';
import { randomIntMinMax } from '../random';
import { vec3AllocatorScope } from '../vec3';
import { ArenaVec3Allocator } from '../vec3_allocators';

export class BVHNode implements Hittable {
    left: Hittable;
    right: Hittable;
    aabb: AABB;

    constructor(objects: Hittable[], time0: number, time1: number) {
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
                const axis = randomIntMinMax(0, 2);
                //todo: use one ArenaAllocator provided by the top call
                vec3AllocatorScope(new ArenaVec3Allocator(Math.ceil(objects.length * Math.log2(objects.length)) * 16), () => {
                    objects.sort((a, b) => a.get_bounding_box(time0, time1).min[axis] - b.get_bounding_box(time0, time1).min[axis]);
                });
                this.left = new BVHNode(objects.slice(0, Math.floor(objects.length / 2)), time0, time1);
                this.right = new BVHNode(objects.slice(Math.floor(objects.length / 2)), time0, time1);
                break;
        }

        this.aabb = surrounding_box(
            this.left.get_bounding_box(time0, time1),
            this.right.get_bounding_box(time0, time1)
        );
    }

    hit(r: Ray, t_min: number, t_max: number): HitRecord | null {
        if (!this.aabb.hit(r, t_min, t_max)) {
            return null;
        }
        const leftHit = this.left.hit(r, t_min, t_max);
        const rightHit = leftHit === null
            ? this.right.hit(r, t_min, t_max)
            : this.right.hit(r, t_min, leftHit.t);

        if (leftHit === null) return rightHit;
        if (rightHit === null) return leftHit;
        return leftHit.t < rightHit.t ? leftHit : rightHit;
    }

    get_bounding_box(time0: number, time1: number): AABB {
        return this.aabb;
    }
}
