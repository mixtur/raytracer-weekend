import { ray_set } from '../math/ray';
import { vec3_dot, vec3_reflect, vec3_refract, vec3_set, vec3_unit1 } from '../math/vec3';
import { create_mega_material, MegaMaterial, ScatterFunction } from './megamaterial';

export const create_dielectric = (ior: number): MegaMaterial => create_mega_material({
    scatter: dielectric_scatter,
    ior
});

const _reflectance = (cos: number, ref_idx: number): number => {
    // Use Schlick's approximation for reflectance.
    const r0 = ((1-ref_idx) / (1+ref_idx)) ** 2;
    return r0 + (1 - r0) * ((1 - cos) ** 5);
}

export const dielectric_scatter: ScatterFunction = (mat, r_in, hit, bounce) => {
    const refraction_ratio = hit.front_face ? (1 / mat.ior) : mat.ior;
    const unit_direction = vec3_unit1(r_in.direction);
    const cos_theta = -vec3_dot(unit_direction, hit.normal);
    const sin_theta = Math.sqrt(1.0 - cos_theta*cos_theta);

    const cannot_refract = refraction_ratio * sin_theta > 1.0;
    const reflectance = _reflectance(cos_theta, refraction_ratio);

    const direction = (cannot_refract || (reflectance > Math.random()))
        ? vec3_reflect(unit_direction, hit.normal)
        : vec3_refract(unit_direction, hit.normal, refraction_ratio);

    ray_set(bounce.skip_pdf_ray, hit.p, direction, r_in.time)
    bounce.skip_pdf = true;
    vec3_set(bounce.attenuation, 1, 1, 1);
    return true;
}
