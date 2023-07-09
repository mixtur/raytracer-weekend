import { Texture } from '../texture/texture';
import { raySet } from '../ray';
import { vec3Add2, vec3NearZero, vec3RandUnit } from '../vec3';
import { createMegaMaterial, MegaMaterial, ScatterFunction } from './megamaterial';

export const createLambertian = (albedo: Texture): MegaMaterial => createMegaMaterial(lambertian_scatter, { albedo });

export const lambertian_scatter: ScatterFunction = (mat, r_in, hit, bounce) => {
    //todo: this is not exactly Lambertian isn't it?
    let scatter_direction = vec3Add2(hit.normal, vec3RandUnit());
    if (vec3NearZero(scatter_direction)) {
        scatter_direction = hit.normal;
    }

    raySet(bounce.scattered, hit.p, scatter_direction, r_in.time);
    bounce.attenuation.set(mat.albedo.value(hit.u, hit.v, hit.p));

    return true;
};
