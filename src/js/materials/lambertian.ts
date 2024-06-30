import { Texture } from '../texture/texture';
import {
    create_mega_material,
    MegaMaterial,
    ScatterFunction
} from './megamaterial';
import { CosinePDF } from '../math/pdf';

export const lambertian_scatter: ScatterFunction = (material, r_in, hit, bounce) => {
    const scattering_pdf = material.scattering_pdf as CosinePDF;
    scattering_pdf.setDirection(hit.normal);
    bounce.skip_pdf = false;
    return true;
};

export const create_lambertian = (albedo: Texture): MegaMaterial => create_mega_material({
    scatter: lambertian_scatter,
    scattering_pdf: new CosinePDF(),
    albedo
});
