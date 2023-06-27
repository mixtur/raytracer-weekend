import { Texture } from '../texture/texture';
import { ray, Ray } from '../ray';
import { HitRecord } from '../hittable/hittable';
import {
    color,
    Color,
    Point3,
    vec3Add3,
    vec3Dot,
    vec3MulS2,
    vec3RandInUnitSphere,
    vec3Reflect,
    vec3Unit1
} from '../vec3';
import { BounceRecord, Material } from './material';
import { register_scatter_id } from './register_scatter_id';

export const metal_scatter_id = register_scatter_id();

export class Metal extends Material {
    scatter_id = metal_scatter_id;
    albedo: Texture;
    fuzz: number;
    constructor(albedo: Texture, fuzz: number) {
        super();
        this.albedo = albedo;
        this.fuzz = fuzz;
    }
    scatter(r_in: Ray, hit: HitRecord): BounceRecord | null {
        const reflected = vec3Reflect(vec3Unit1(r_in.direction), hit.normal);
        vec3Add3(reflected, reflected, vec3MulS2(vec3RandInUnitSphere(), this.fuzz));
        if (vec3Dot(reflected, hit.normal) <= 0) { return null; }
        return {
            scattered: ray(hit.p, reflected, r_in.time),
            attenuation: this.albedo.value(hit.u, hit.v, hit.p)
        };
    }
}
