import { HitRecord } from './hittable/hittable';
import { ray, Ray } from './ray';
import {
    color,
    Color,
    vec3Add2,
    vec3Add3,
    vec3Dot, vec3MulS2,
    vec3NearZero,
    vec3RandInUnitSphere,
    vec3RandUnit,
    vec3Reflect, vec3Refract,
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
            scattered: ray(hit.p, vec3Unit1(scatter_direction)),
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
            scattered: ray(hit.p, vec3Unit1(reflected)),
            attenuation: this.albedo
        };
    }
}

export class Dielectric implements Material {
    ior: number
    constructor(ior: number) {
        this.ior = ior;
    }
    scatter(r_in: Ray, hit: HitRecord): BounceRecord | null {
        const refraction_ratio = hit.front_face ? (1 / this.ior) : this.ior;
        const unit_direction = vec3Unit1(r_in.direction);
        const cos_theta = -vec3Dot(unit_direction, hit.normal);
        const sin_theta = Math.sqrt(1.0 - cos_theta*cos_theta);

        const cannot_refract = refraction_ratio * sin_theta > 1.0;
        const reflectance = this._reflectance(cos_theta, refraction_ratio);

        const direction = (cannot_refract || (reflectance > Math.random()))
            ? vec3Reflect(unit_direction, hit.normal)
            : vec3Refract(unit_direction, hit.normal, refraction_ratio);

        return {
            scattered: ray(hit.p, vec3Unit1(direction)),
            attenuation: color(1, 1, 1)
        };
    }

    _reflectance(cos: number, ref_idx: number): number {
        // Use Schlick's approximation for reflectance.
        let r0 = ((1-ref_idx) / (1+ref_idx)) ** 2;
        return r0 + (1 - r0) * ((1 - cos) ** 5);
    }
}
