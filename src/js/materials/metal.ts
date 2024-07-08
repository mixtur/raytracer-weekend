import { Texture } from '../texture/texture';
import { ray_set } from '../math/ray';
import {
    add_vec3_r, dot_vec3,
    mul_vec3_s, rand_vec3_in_unit_sphere,
    reflect_incident_vec3, unit_vec3
} from '../math/vec3.gen';
import {
    create_material_type,
    create_mega_material,
    material_types,
    MegaMaterial,
    ScatterFunction
} from './megamaterial';

export const create_metal = (albedo: Texture, fuzz: number): MegaMaterial => create_mega_material({
    type: 'metal',
    albedo,
    fuzz
});

export const metal_scatter: ScatterFunction = (mat, r_in, hit, bounce) => {
    const reflected = reflect_incident_vec3(unit_vec3(r_in.direction), hit.normal);
    add_vec3_r(reflected, reflected, mul_vec3_s(rand_vec3_in_unit_sphere(), mat.fuzz));
    if (dot_vec3(reflected, hit.normal) <= 0) { return false; }
    ray_set(bounce.skip_pdf_ray, hit.p, reflected, r_in.time);
    bounce.skip_pdf = true;
    return true;
}

material_types.metal = create_material_type({
    scatter: metal_scatter
});
