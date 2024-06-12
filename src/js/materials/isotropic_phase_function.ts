import { Texture } from '../texture/texture';
import { Ray } from '../math/ray';
import { create_mega_material, MegaMaterial, ScatterFunction, ScatteringPDF } from './megamaterial';
import { HitRecord } from '../hittable/hittable';
import { SpherePDF } from '../math/pdf';

export const isotropic_phase_function_scatter: ScatterFunction = (mat, r_in, hit, bounce) => {
    bounce.scatter_pdf = new SpherePDF();
    bounce.attenuation.set(mat.albedo.value(hit.u, hit.v, hit.p));
    bounce.sampling_pdf = 1 / (4 * Math.PI);
    bounce.skip_pdf = false;
    return true;
};

export const isotropic_phase_function_scattering_pdf: ScatteringPDF = (r_in: Ray, hit: HitRecord, scattered: Ray): number => {
    return 1 / (Math.PI * 4);
};

export const create_isotropic_phase_function = (albedo: Texture): MegaMaterial => create_mega_material({
    scatter: isotropic_phase_function_scatter,
    scattering_pdf: isotropic_phase_function_scattering_pdf,
    albedo
});

