import { Texture } from '../texture/texture';
import { ray } from '../ray';
import { vec3Add2, vec3NearZero, vec3RandUnit } from '../vec3';
import { register_scatter_id } from './register_scatter_id';
import { createMegaMaterial, MegaMaterial, ScatterFunction } from './megamaterial';

export const lambertian_scatter_id = register_scatter_id();

export const createLambertian = (albedo: Texture): MegaMaterial => createMegaMaterial(lambertian_scatter, { albedo });

export const lambertian_scatter: ScatterFunction = (mat, r_in, hit) => {
    //todo: this is not exactly Lambertian isn't it?
    let scatter_direction = vec3Add2(hit.normal, vec3RandUnit());
    if (vec3NearZero(scatter_direction)) {
        scatter_direction = hit.normal;
    }
    return {
        scattered: ray(hit.p, scatter_direction, r_in.time),
        attenuation: mat.albedo.value(hit.u, hit.v, hit.p)
    };
};
