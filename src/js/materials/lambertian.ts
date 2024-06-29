import { Texture } from '../texture/texture';
import { dot_vec3, len_vec3 } from '../math/vec3.gen';
import { create_mega_material, MegaMaterial, ScatterFunction, ScatteringPDF } from './megamaterial';
import { CosinePDF } from '../math/pdf';

const lambertian_scatter: ScatterFunction = (material, r_in, hit, bounce) => {
    const scattering_pdf = material.scattering_pdf as CosinePDF;
    scattering_pdf.setDirection(hit.normal);
    bounce.scatter_pdf = scattering_pdf;
    bounce.skip_pdf = false;
    return true;
};

const lambertian_scatter_pdf: ScatteringPDF = (r_in, hit, scattered): number => {
    const cos = dot_vec3(hit.normal, scattered.direction) / (len_vec3(scattered.direction) * len_vec3(hit.normal));
    return cos < 0 ? 0 : cos / Math.PI;
};

export const create_lambertian = (albedo: Texture): MegaMaterial => create_mega_material({
    //todo: shouldn't we divide albedo by Math.PI?
    scatter: lambertian_scatter,
    scattering_pdf: new CosinePDF(),
    albedo
});
