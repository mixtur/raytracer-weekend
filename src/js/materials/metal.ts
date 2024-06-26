import { Texture } from '../texture/texture';
import { ray_set } from '../math/ray';
import {
    add_vec3_r, dot_vec3,
    mul_vec3_s, rand_vec3_in_unit_sphere,
    reflect_vec3, unit_vec3
} from '../math/vec3.gen';
import { create_mega_material, MegaMaterial, ScatterFunction } from './megamaterial';

export const create_metal = (albedo: Texture, fuzz: number): MegaMaterial => create_mega_material({
    scatter: metal_scatter,
    albedo,
    fuzz
});

export const metal_scatter: ScatterFunction = (mat, r_in, hit, bounce) => {
    const reflected = reflect_vec3(unit_vec3(r_in.direction), hit.normal);
    add_vec3_r(reflected, reflected, mul_vec3_s(rand_vec3_in_unit_sphere(), mat.fuzz));
    if (dot_vec3(reflected, hit.normal) <= 0) { return false; }
    ray_set(bounce.skip_pdf_ray, hit.p, reflected, r_in.time);
    bounce.skip_pdf = true;
    bounce.attenuation.set(mat.albedo.value(hit.u, hit.v, hit.p));
    return true;
}
