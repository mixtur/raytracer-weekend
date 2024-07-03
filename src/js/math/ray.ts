import { ArenaVec3Allocator, Point3, use_vec3_allocator, vec3, Vec3, vec3_dirty } from './vec3.gen';
import { run_with_hooks } from '../utils';

export type Ray = {
    origin: Vec3,
    direction: Vec3,
    inv_dir: Vec3,
    time: number;
};

export const _ray = (origin: Vec3, direction: Vec3, inv_dir: Vec3, time: number): Ray => {
    return {
        origin,
        direction,
        time,
        inv_dir
    };
};

export const alloc_ray = (origin: Vec3, direction: Vec3, time: number) => ray_allocator.alloc(origin, direction, time);
export const ray_dirty = () => ray_allocator.alloc_dirty();

export const ray_set = (ray: Ray, origin: Point3, direction: Vec3, time: number): void => {
    ray.origin.set(origin);
    ray.direction.set(direction);
    ray.time = time;
    _compute_inv_dir(ray);
}

const _compute_inv_dir = (ray: Ray) => {
    ray.inv_dir[0] = 1 / ray.direction[0];
    ray.inv_dir[1] = 1 / ray.direction[1];
    ray.inv_dir[2] = 1 / ray.direction[2];
}

export class RayArenaAllocator {
    storage: Ray[] = [];
    currentRayIndex: number = 0;
    currentRay: Ray;
    constructor(size: number) {
        for (let i = 0; i < size; i++) {
            this.storage.push(_ray(vec3_dirty(), vec3_dirty(), vec3_dirty(), 0));
        }
        this.currentRay = this.storage[0];
    }
    reuse(origin: Vec3, direction: Vec3, time: number): Ray {
        const r = this.currentRay;
        r.origin[0] = origin[0];
        r.origin[1] = origin[1];
        r.origin[2] = origin[2];
        r.direction[0] = direction[0];
        r.direction[1] = direction[1];
        r.direction[2] = direction[2];
        r.time = time;
        _compute_inv_dir(r);
        return r;
    }
    alloc(origin: Vec3, direction: Vec3, time: number): Ray {
        const r = this.currentRay = this.storage[++this.currentRayIndex];
        r.origin[0] = origin[0];
        r.origin[1] = origin[1];
        r.origin[2] = origin[2];
        r.direction[0] = direction[0];
        r.direction[1] = direction[1];
        r.direction[2] = direction[2];
        r.time = time;
        _compute_inv_dir(r);
        return r;
    }
    alloc_dirty(): Ray {
        return this.currentRay = this.storage[++this.currentRayIndex];
    }
    reset(): void {
        this.currentRayIndex = 0;
        this.currentRay = this.storage[0];
    }
}

export const ray_allocator = run_with_hooks(() => {
    const rays_count = 512;
    use_vec3_allocator(new ArenaVec3Allocator(rays_count * 3));
    return new RayArenaAllocator(rays_count);
});

export const ray_at2 = (ray: Ray, t: number): Vec3 => {
    return vec3(
        ray.origin[0] + ray.direction[0] * t,
        ray.origin[1] + ray.direction[1] * t,
        ray.origin[2] + ray.direction[2] * t
    );
};

export const ray_at3 = (result: Vec3, ray: Ray, t: number): void => {
    result[0] = ray.origin[0] + ray.direction[0] * t;
    result[1] = ray.origin[1] + ray.direction[1] * t;
    result[2] = ray.origin[2] + ray.direction[2] * t;
};
