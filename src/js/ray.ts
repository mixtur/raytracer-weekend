import { vec3, Vec3, vec3Add2, vec3Add3, vec3MulS2 } from "./vec3";

export type Ray = {
    origin: Vec3,
    direction: Vec3
};

export const ray = (origin: Vec3, direction: Vec3): Ray => {
    const rayOrigin = vec3(origin[0], origin[1], origin[2]);
    const rayDirection = vec3(direction[0], direction[1], direction[2]);

    return {
        origin: rayOrigin,
        direction: rayDirection
    };
};

export const rayAt2 = (ray: Ray, t: number): Vec3 => {
    return vec3(
        ray.origin[0] + ray.direction[0] * t,
        ray.origin[1] + ray.direction[1] * t,
        ray.origin[2] + ray.direction[2] * t
    );
};

export const rayAt3 = (result: Vec3, ray: Ray, t: number): void => {
    result[0] = ray.origin[0] + ray.direction[0] * t;
    result[1] = ray.origin[1] + ray.direction[1] * t;
    result[2] = ray.origin[2] + ray.direction[2] * t;
};
