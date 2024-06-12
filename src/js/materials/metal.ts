import { Texture } from '../texture/texture';
import { ray_set } from '../math/ray';
import {
    vec3_add_3,
    vec3_dot,
    vec3_muls_2,
    vec3_rand_in_unit_sphere,
    vec3_reflect,
    vec3_unit1
} from '../math/vec3';
import { create_mega_material, MegaMaterial, ScatterFunction } from './megamaterial';

export const create_metal = (albedo: Texture, fuzz: number): MegaMaterial => create_mega_material({
    scatter: metal_scatter,
    albedo,
    fuzz
});

export const metal_scatter: ScatterFunction = (mat, r_in, hit, bounce) => {
    const reflected = vec3_reflect(vec3_unit1(r_in.direction), hit.normal);
    vec3_add_3(reflected, reflected, vec3_muls_2(vec3_rand_in_unit_sphere(), mat.fuzz));
    if (vec3_dot(reflected, hit.normal) <= 0) { return false; }
    ray_set(bounce.skip_pdf_ray, hit.p, reflected, r_in.time);
    bounce.skip_pdf = true;
    bounce.attenuation.set(mat.albedo.value(hit.u, hit.v, hit.p));
    return true;
}
