import { Texture } from '../texture/texture';
import { create_mega_material, MegaMaterial, ScatterFunction } from './megamaterial';
import { SpherePDF } from '../math/pdf';

export const isotropic_phase_function_scatter: ScatterFunction = (mat, r_in, hit, bounce) => {
    bounce.skip_pdf = false;
    return true;
};

export const create_isotropic_phase_function = (albedo: Texture): MegaMaterial => create_mega_material({
    scatter: isotropic_phase_function_scatter,
    scattering_pdf: new SpherePDF(),
    albedo
});

