import { Texture } from '../texture/texture';
import { vec3_dot, vec3_len } from '../math/vec3';
import { create_mega_material, MegaMaterial, ScatterFunction, ScatteringPDF } from './megamaterial';
import { CosinePDF } from '../math/pdf';

const lambertian_scatter: ScatterFunction = (material, r_in, hit, bounce) => {
    bounce.attenuation.set(material.albedo.value(hit.u, hit.v, hit.p));
    bounce.scatter_pdf = new CosinePDF(hit.normal);
    bounce.skip_pdf = false;
    return true;
};

const lambertian_scatter_pdf: ScatteringPDF = (r_in, hit, scattered): number => {
    const cos = vec3_dot(hit.normal, scattered.direction) / (vec3_len(scattered.direction) * vec3_len(hit.normal));
    return cos < 0 ? 0 : cos / Math.PI;
};

export const create_lambertian = (albedo: Texture): MegaMaterial => create_mega_material({
    scatter: lambertian_scatter,
    scattering_pdf: lambertian_scatter_pdf,
    albedo
});
