import { ray_set } from '../math/ray';
import { dot_vec3, reflect_vec3, refract_vec3, unit_vec3 } from '../math/vec3.gen';
import { create_mega_material, MegaMaterial, ScatterFunction } from './megamaterial';
import { solid_color } from '../texture/solid_color';

export const create_dielectric = (ior: number): MegaMaterial => create_mega_material({
    scatter: dielectric_scatter,
    ior,
    albedo: solid_color(1, 1, 1)
});

const _reflectance = (cos: number, ref_idx: number): number => {
    // Use Schlick's approximation for reflectance.
    const r0 = ((1-ref_idx) / (1+ref_idx)) ** 2;
    return r0 + (1 - r0) * ((1 - cos) ** 5);
}

export const dielectric_scatter: ScatterFunction = (mat, r_in, hit, bounce) => {
    const refraction_ratio = hit.front_face ? (1 / mat.ior) : mat.ior;
    const unit_direction = unit_vec3(r_in.direction);
    const cos_theta = -dot_vec3(unit_direction, hit.normal);
    const sin_theta = Math.sqrt(1.0 - cos_theta*cos_theta);

    const cannot_refract = refraction_ratio * sin_theta > 1.0;
    const reflectance = _reflectance(cos_theta, refraction_ratio);

    const direction = (cannot_refract || (reflectance > Math.random()))
        ? reflect_vec3(unit_direction, hit.normal)
        : refract_vec3(unit_direction, hit.normal, refraction_ratio);

    ray_set(bounce.skip_pdf_ray, hit.p, direction, r_in.time)
    bounce.skip_pdf = true;
    return true;
}
