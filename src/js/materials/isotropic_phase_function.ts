import { Texture } from '../texture/texture';
import { Ray, raySet } from '../math/ray';
import { vec3RandInUnitSphere } from '../math/vec3';
import { createMegaMaterial, MegaMaterial, ScatterFunction, ScatteringPDF } from './megamaterial';
import { HitRecord } from '../hittable/hittable';

export const createIsotropicPhaseFunction = (albedo: Texture): MegaMaterial => createMegaMaterial(isotropic_phase_function_scatter, isotropic_phase_function_scattering_pdf, { albedo });

export const isotropic_phase_function_scatter: ScatterFunction = (mat, r_in, hit, bounce) => {
    raySet(bounce.scattered, hit.p, vec3RandInUnitSphere(), r_in.time);
    bounce.attenuation.set(mat.albedo.value(hit.u, hit.v, hit.p));
    bounce.sampling_pdf = 1 / (4 * Math.PI);
    return true;
};

export const isotropic_phase_function_scattering_pdf: ScatteringPDF = (r_in: Ray, hit: HitRecord, scattered: Ray): number => {
    return 1 / (Math.PI * 4);
}
