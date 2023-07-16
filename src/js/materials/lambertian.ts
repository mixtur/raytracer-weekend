import { Texture } from '../texture/texture';
import { raySet } from '../ray';
import { vec3Add2, vec3Dot, vec3Len, vec3NearZero, vec3RandUnit, vec3Unit1 } from '../vec3';
import { createMegaMaterial, MegaMaterial, ScatterFunction, ScatteringPDF } from './megamaterial';

const lambertian_scatter: ScatterFunction = (mat, r_in, hit, bounce) => {
    let scatter_direction = vec3Add2(hit.normal, vec3RandUnit());

    // Catch degenerate scatter direction
    if (vec3NearZero(scatter_direction))
        scatter_direction = hit.normal;
    raySet(bounce.scattered, hit.p, vec3Unit1(scatter_direction), r_in.time);
    bounce.attenuation.set(mat.albedo.value(hit.u, hit.v, hit.p));
    bounce.sampling_pdf = vec3Dot(hit.normal, bounce.scattered.direction) / Math.PI;
    return true;
};

const lambertian_scatter_pdf: ScatteringPDF = (r_in, hit, scattered): number => {
    const cos = vec3Dot(hit.normal, scattered.direction) / vec3Len(scattered.direction);
    return cos < 0 ? 0 : cos / Math.PI;
};

export const createLambertian = (albedo: Texture): MegaMaterial => createMegaMaterial(lambertian_scatter, lambertian_scatter_pdf, { albedo });
