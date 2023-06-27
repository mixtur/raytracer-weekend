import { Texture } from '../texture/texture';
import { ray, Ray } from '../ray';
import { HitRecord } from '../hittable/hittable';
import { Color, color, Point3, vec3Add2, vec3NearZero, vec3RandUnit } from '../vec3';
import { BounceRecord, Material } from './material';
import { register_scatter_id } from './register_scatter_id';

export const lambertian_scatter_id = register_scatter_id();
export class Lambertian extends Material {
    scatter_id = lambertian_scatter_id;
    albedo: Texture;
    constructor(albedo: Texture) {
        super();
        this.albedo = albedo;
    }
    scatter(r_in: Ray, hit: HitRecord): BounceRecord | null {
        //todo: this is not exactly Lambertian isn't it?
        let scatter_direction = vec3Add2(hit.normal, vec3RandUnit());
        if (vec3NearZero(scatter_direction)) {
            scatter_direction = hit.normal;
        }
        return {
            scattered: ray(hit.p, scatter_direction, r_in.time),
            attenuation: this.albedo.value(hit.u, hit.v, hit.p)
        };
    }
}
