import { Texture } from '../texture/texture';
import { rayAllocator } from '../ray';
import { vec3RandInUnitSphere } from '../vec3';
import { register_scatter_id } from './register_scatter_id';
import { createMegaMaterial, MegaMaterial, ScatterFunction } from './megamaterial';

export const isotropic_phase_function_scatter_id = register_scatter_id();

export const createIsotropicPhaseFunction = (albedo: Texture): MegaMaterial => createMegaMaterial(isotropic_phase_function_scatter, { albedo });

export const isotropic_phase_function_scatter: ScatterFunction = (mat, r_in, hit) => {
    return {
        scattered: rayAllocator.reuse(hit.p, vec3RandInUnitSphere(), r_in.time),
        attenuation: mat.albedo.value(hit.u, hit.v, hit.p)
    };
};
