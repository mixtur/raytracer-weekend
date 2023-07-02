import { ray } from '../ray';
import { color, vec3Dot, vec3Reflect, vec3Refract, vec3Unit1 } from '../vec3';
import { register_scatter_id } from './register_scatter_id';
import { createMegaMaterial, MegaMaterial, ScatterFunction } from './megamaterial';

export const dielectric_scatter_id = register_scatter_id();

export const createDielectric = (ior: number): MegaMaterial => createMegaMaterial(dielectric_scatter_id, { ior });

const _reflectance = (cos: number, ref_idx: number): number => {
    // Use Schlick's approximation for reflectance.
    let r0 = ((1-ref_idx) / (1+ref_idx)) ** 2;
    return r0 + (1 - r0) * ((1 - cos) ** 5);
}

export const dielectric_scatter: ScatterFunction = (mat, r_in, hit) => {
    const refraction_ratio = hit.front_face ? (1 / mat.ior) : mat.ior;
    const unit_direction = vec3Unit1(r_in.direction);
    const cos_theta = -vec3Dot(unit_direction, hit.normal);
    const sin_theta = Math.sqrt(1.0 - cos_theta*cos_theta);

    const cannot_refract = refraction_ratio * sin_theta > 1.0;
    const reflectance = _reflectance(cos_theta, refraction_ratio);

    const direction = (cannot_refract || (reflectance > Math.random()))
        ? vec3Reflect(unit_direction, hit.normal)
        : vec3Refract(unit_direction, hit.normal, refraction_ratio);

    return {
        scattered: ray(hit.p, direction, r_in.time),
        attenuation: color(1, 1, 1)
    };
}
