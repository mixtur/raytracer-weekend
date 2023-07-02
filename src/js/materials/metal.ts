import { Texture } from '../texture/texture';
import { ray } from '../ray';
import {
    vec3Add3,
    vec3Dot,
    vec3MulS2,
    vec3RandInUnitSphere,
    vec3Reflect,
    vec3Unit1
} from '../vec3';
import { register_scatter_id } from './register_scatter_id';
import { createMegaMaterial, MegaMaterial, ScatterFunction } from './megamaterial';

export const metal_scatter_id = register_scatter_id();

export const createMetal = (albedo: Texture, fuzz: number): MegaMaterial => createMegaMaterial(metal_scatter_id, { albedo, fuzz });

export const metal_scatter: ScatterFunction = (mat, r_in, hit) => {
    const reflected = vec3Reflect(vec3Unit1(r_in.direction), hit.normal);
    vec3Add3(reflected, reflected, vec3MulS2(vec3RandInUnitSphere(), mat.fuzz));
    if (vec3Dot(reflected, hit.normal) <= 0) { return null; }
    return {
        scattered: ray(hit.p, reflected, r_in.time),
        attenuation: mat.albedo.value(hit.u, hit.v, hit.p)
    };
}
