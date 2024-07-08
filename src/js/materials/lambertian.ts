import { Texture } from '../texture/texture';
import {
    create_material_type,
    create_mega_material, material_types,
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
    type: 'lambertian',
    scattering_pdf: new CosinePDF(),
    albedo
});

material_types.lambertian = create_material_type({
    scatter: lambertian_scatter
});
