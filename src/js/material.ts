import { HitRecord } from './hittable/hittable';
import { ray, Ray } from './ray';
import {
    Color,
    vec3Add2,
    vec3Add3,
    vec3Dot, vec3MulS2,
    vec3NearZero,
    vec3RandInUnitSphere,
    vec3RandUnit,
    vec3Reflect,
    vec3Unit1
} from './vec3';

export interface BounceRecord {
    scattered: Ray;
    attenuation: Color;
}

export interface Material {
    scatter(r_in: Ray, hit: HitRecord): BounceRecord | null;
}

export class Lambertian implements Material {
    albedo: Color;
    constructor(albedo: Color) {
        this.albedo = albedo;
    }
    scatter(r_in: Ray, hit: HitRecord): BounceRecord | null {
        //todo: this is not exactly Lambertian isn't it?
        let scatter_direction = vec3Add2(hit.normal, vec3RandUnit());
        if (vec3NearZero(scatter_direction)) {
            scatter_direction = hit.normal;
        }
        return {
            scattered: ray(hit.p, scatter_direction),
            attenuation: this.albedo
        };
    }
}

export class Metal implements Material {
    albedo: Color;
    fuzz: number;
    constructor(albedo: Color, fuzz: number) {
        this.albedo = albedo;
        this.fuzz = fuzz;
    }
    scatter(r_in: Ray, hit: HitRecord): BounceRecord | null {
        const reflected = vec3Reflect(vec3Unit1(r_in.direction), hit.normal);
        vec3Add3(reflected, reflected, vec3MulS2(vec3RandInUnitSphere(), this.fuzz));
        if (vec3Dot(reflected, hit.normal) <= 0) { return null; }
        return {
            scattered: ray(hit.p, reflected),
            attenuation: this.albedo
        };
    }
}
