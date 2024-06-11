import { Texture } from '../texture/texture';
import { raySet } from '../math/ray';
import { vec3Dot, vec3Len, vec3RandCosineUnit } from '../math/vec3';
import { createMegaMaterial, MegaMaterial, ScatterFunction, ScatteringPDF } from './megamaterial';
import { mat3FromZ1, mulMat3Vec3_2 } from '../math/mat3';

const lambertian_scatter: ScatterFunction = (material, r_in, hit, bounce) => {
    const mat = mat3FromZ1(hit.normal);
    const scatter_direction = mulMat3Vec3_2(mat, vec3RandCosineUnit());
    raySet(bounce.scattered, hit.p, scatter_direction, r_in.time);
    bounce.attenuation.set(material.albedo.value(hit.u, hit.v, hit.p));
    bounce.sampling_pdf = vec3Dot(scatter_direction, hit.normal) / Math.PI;
    return true;
};

const lambertian_scatter_pdf: ScatteringPDF = (r_in, hit, scattered): number => {
    const cos = vec3Dot(hit.normal, scattered.direction) / vec3Len(scattered.direction);
    return cos < 0 ? 0 : cos / Math.PI;
};

export const createLambertian = (albedo: Texture): MegaMaterial => createMegaMaterial({
    scatter: lambertian_scatter,
    scattering_pdf: lambertian_scatter_pdf,
    albedo
});
