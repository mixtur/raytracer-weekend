import { Ray } from '../ray';
import { HitRecord } from '../hittable/hittable';
import { dielectric_scatter, dielectric_scatter_id } from './dielectric';
import { diffuse_light_scatter, diffuse_light_scatter_id } from './diffuse_light';
import { isotropic_phase_function_scatter, isotropic_phase_function_scatter_id } from './isotropic_phase_function';
import { lambertian_scatter, lambertian_scatter_id } from './lambertian';
import { metal_scatter, metal_scatter_id } from './metal';
import { BounceRecord, MegaMaterial } from './megamaterial';

export const dispatch_scatter = (mat: MegaMaterial, r_in: Ray, hit: HitRecord): BounceRecord | null => {
    switch (mat.scatter_id) {
        case dielectric_scatter_id: return dielectric_scatter(mat, r_in, hit);
        case diffuse_light_scatter_id: return diffuse_light_scatter(mat, r_in, hit);
        case isotropic_phase_function_scatter_id: return isotropic_phase_function_scatter(mat, r_in, hit);
        case lambertian_scatter_id: return lambertian_scatter(mat, r_in, hit);
        case metal_scatter_id: return metal_scatter(mat, r_in, hit);
    }

    throw new Error(`unknown scatter_id ${mat.scatter_id}`)
};

