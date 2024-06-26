import { ArenaVec3Allocator, Point3, use_vec3_allocator, vec3, Vec3 } from './vec3.gen';
import { run_with_hooks } from '../utils';

export type Ray = {
    origin: Vec3,
    direction: Vec3,
    time: number;
};

export const ray = (origin: Vec3, direction: Vec3, time: number): Ray => {
    return {
        origin,
        direction,
        time
    };
};

export const ray_set = (ray: Ray, origin: Point3, direction: Vec3, time: number): void => {
    ray.origin.set(origin);
    ray.direction.set(direction);
    ray.time = time;
}

export class RayArenaAllocator {
    storage: Ray[] = [];
    currentRayIndex: number = 0;
    currentRay: Ray;
    constructor(size: number) {
        for (let i = 0; i < size; i++) {
            this.storage.push(ray(vec3(0, 0, 0), vec3(0, 0, 0), 0));
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
        return r;
    }
    reset(): void {
        this.currentRayIndex = 0;
        this.currentRay = this.storage[0];
    }
}

export const ray_allocator = run_with_hooks(() => {
    use_vec3_allocator(new ArenaVec3Allocator(512));
    return new RayArenaAllocator(256);
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
