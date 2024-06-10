import { Texture } from '../texture/texture';
import { raySet } from '../math/ray';
import {
    vec3Add3,
    vec3Dot,
    vec3MulS2,
    vec3RandInUnitSphere,
    vec3Reflect,
    vec3Unit1
} from '../math/vec3';
import { createMegaMaterial, MegaMaterial, ScatterFunction } from './megamaterial';

export const createMetal = (albedo: Texture, fuzz: number): MegaMaterial => createMegaMaterial(metal_scatter, null, { albedo, fuzz });

export const metal_scatter: ScatterFunction = (mat, r_in, hit, bounce) => {
    const reflected = vec3Reflect(vec3Unit1(r_in.direction), hit.normal);
    vec3Add3(reflected, reflected, vec3MulS2(vec3RandInUnitSphere(), mat.fuzz));
    if (vec3Dot(reflected, hit.normal) <= 0) { return false; }
    raySet(bounce.scattered, hit.p, reflected, r_in.time);
    bounce.attenuation.set(mat.albedo.value(hit.u, hit.v, hit.p));
    return true;
}
