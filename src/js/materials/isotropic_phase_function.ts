import { Texture } from '../texture/texture';
import {
    create_material_type,
    create_mega_material,
    material_types,
    MegaMaterial,
    ScatterFunction
} from './megamaterial';
import { SpherePDF } from '../math/pdf';

export const isotropic_phase_function_scatter: ScatterFunction = (mat, r_in, hit, bounce) => {
    bounce.skip_pdf = false;
    return true;
};

export const create_isotropic_phase_function = (albedo: Texture): MegaMaterial => create_mega_material({
    type: 'isotropic_phase_function',
    scattering_pdf: new SpherePDF(),
    albedo
});

material_types.isotropic_phase_function = create_material_type({
    scatter: isotropic_phase_function_scatter,
});
