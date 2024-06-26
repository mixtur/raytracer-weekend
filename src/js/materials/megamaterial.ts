import { Texture } from '../texture/texture';
import { solid_color } from '../texture/solid_color';
import { ray, Ray } from '../math/ray';
import { HitRecord } from '../hittable/hittable';
import { color, Color, vec3 } from '../math/vec3.gen';
import { PDF, SpherePDF } from '../math/pdf';

export interface MegaMaterial {
    scatter: ScatterFunction;
    scattering_pdf: PDF;
    emit: EmitFunction;
    ior: number; // dielectric
    emissive: Texture;
    albedo: Texture;
    fuzz: number;// metal
}

export interface BounceRecord {
    attenuation: Color;
    // do we even need this now? isn't material.scattering_pdf enough?
    scatter_pdf: PDF;
    sampling_pdf: number;
    skip_pdf: boolean;
    skip_pdf_ray: Ray;
}

export type EmitFunction = (mat: MegaMaterial, r_in: Ray, hit: HitRecord) => Color;
export type ScatterFunction = (mat: MegaMaterial, r_in: Ray, hit: HitRecord, bounce: BounceRecord) => boolean;
export type ScatteringPDF = (r_in: Ray, hit: HitRecord, scattered: Ray) => number;

export const create_bounce_record = (): BounceRecord => {
    return {
        scatter_pdf: new SpherePDF(),
        attenuation: color(0, 0, 0),
        sampling_pdf: NaN,
        skip_pdf: false,
        skip_pdf_ray: ray(vec3(0, 0, 0), vec3(0, 0, 0), 0)
    }
};

export const default_scatter: ScatterFunction = () => false;
export const default_scattering_pdf: ScatteringPDF = () => 0;
export const default_emit: EmitFunction = (mat, r_in, hit) => mat.emissive.value(hit.u, hit.v, hit.p);

export const create_mega_material = (config: Partial<MegaMaterial>): MegaMaterial => {
    return {
        scatter: config.scatter ?? default_scatter,
        scattering_pdf: config.scattering_pdf ?? new SpherePDF(),
        emit: config.emit ?? default_emit,
        ior: config.ior ?? 0,
        emissive: config.emissive ?? solid_color(0, 0, 0),
        albedo: config.albedo ?? solid_color(0, 0, 0),
        fuzz: config.fuzz ?? 0
    };
}
