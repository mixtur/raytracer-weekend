import { Texture } from '../texture/texture';
import { vec3Dot, vec3Len } from '../math/vec3';
import { createMegaMaterial, MegaMaterial, ScatterFunction, ScatteringPDF } from './megamaterial';
import { CosinePDF } from '../math/pdf';

const lambertian_scatter: ScatterFunction = (material, r_in, hit, bounce) => {
    bounce.attenuation.set(material.albedo.value(hit.u, hit.v, hit.p));
    bounce.scatter_pdf = new CosinePDF(hit.normal);
    bounce.skip_pdf = false;
    return true;
};

const lambertian_scatter_pdf: ScatteringPDF = (r_in, hit, scattered): number => {
    const cos = vec3Dot(hit.normal, scattered.direction) / (vec3Len(scattered.direction) * vec3Len(hit.normal));
    return cos < 0 ? 0 : cos / Math.PI;
};

export const createLambertian = (albedo: Texture): MegaMaterial => createMegaMaterial({
    scatter: lambertian_scatter,
    scattering_pdf: lambertian_scatter_pdf,
    albedo
});
