import { BounceRecord, Material } from './material';
import { Ray } from '../ray';
import { HitRecord } from '../hittable/hittable';
import { dielectric_scatter_id } from './dielectric';
import { diffuse_light_scatter_id } from './diffuse_light';
import { isotropic_phase_function_scatter_id } from './isotropic_phase_function';
import { lambertian_scatter_id } from './lambertian';
import { metal_scatter_id } from './metal';

export const dispatch_scatter = (m: Material, r_in: Ray, hit: HitRecord): BounceRecord | null => {
    switch (m.scatter_id) {
        case dielectric_scatter_id: return m.scatter(r_in, hit);
        case diffuse_light_scatter_id: return m.scatter(r_in, hit);
        case isotropic_phase_function_scatter_id: return m.scatter(r_in, hit);
        case lambertian_scatter_id: return m.scatter(r_in, hit);
        case metal_scatter_id: return m.scatter(r_in, hit);
    }

    return m.scatter(r_in, hit);
};

