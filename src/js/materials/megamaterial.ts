import { Texture } from '../texture/texture';
import { solid_color } from '../texture/solid_color';
import { ray, Ray } from '../math/ray';
import { HitRecord } from '../hittable/hittable';
import { color, Color, vec3 } from '../math/vec3.gen';
import { PDF, SpherePDF } from '../math/pdf';
import { clamp, remap } from '../utils';

export interface MegaMaterial {
    attenuate: AttenuationFunction;
    scatter: ScatterFunction;
    scattering_pdf: PDF;
    emit: EmitFunction;
    ior: number; // dielectric
    emissive: Texture;
    albedo: Texture;
    fuzz: number;// metal

    roughness: number;
    metalness: number;
}

export interface BounceRecord {
    attenuation: Color;
    // do we even need this now? isn't material.scattering_pdf enough?
    skip_pdf: boolean;
    skip_pdf_ray: Ray;
}

export type EmitFunction = (material: MegaMaterial, r_in: Ray, hit: HitRecord) => Color;
export type ScatterFunction = (material: MegaMaterial, r_in: Ray, hit: HitRecord, bounce: BounceRecord) => boolean;
export type AttenuationFunction = (material: MegaMaterial, r_in: Ray, hit: HitRecord, bounce: BounceRecord, scattered: Ray) => void;

export const create_bounce_record = (): BounceRecord => {
    return {
        attenuation: color(0, 0, 0),
        skip_pdf: false,
        skip_pdf_ray: ray(vec3(0, 0, 0), vec3(0, 0, 0), 0)
    }
};

export const default_scatter: ScatterFunction = () => false;
export const default_emit: EmitFunction = (mat, r_in, hit) => mat.emissive.value(hit.u, hit.v, hit.p);
export const default_attenuate: AttenuationFunction = (mat, r_in, hit, bounce, scattered) => {
    bounce.attenuation.set(mat.albedo.value(hit.u, hit.v, hit.p));
};

export const create_mega_material = (config: Partial<MegaMaterial>): MegaMaterial => {
    return {
        attenuate: config.attenuate ?? default_attenuate,
        scatter: config.scatter ?? default_scatter,
        scattering_pdf: config.scattering_pdf ?? new SpherePDF(),
        emit: config.emit ?? default_emit,
        ior: config.ior ?? 1.5,
        emissive: config.emissive ?? solid_color(0, 0, 0),
        albedo: config.albedo ?? solid_color(0, 0, 0),
        fuzz: config.fuzz ?? 0,
        roughness: config.roughness ?? 1,
        metalness: config.metalness ?? 1,
    };
}
