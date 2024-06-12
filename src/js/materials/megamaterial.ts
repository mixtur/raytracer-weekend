import { Texture } from '../texture/texture';
import { sColor } from '../texture/solid_color';
import { ray, Ray } from '../math/ray';
import { HitRecord } from '../hittable/hittable';
import { color, Color, vec3 } from '../math/vec3';
import { PDF, SpherePDF } from '../math/pdf';

export interface MegaMaterial {
    scatter: ScatterFunction;
    scattering_pdf: ScatteringPDF;
    emit: EmitFunction;
    ior: number; // dielectric
    emissive: Texture;
    albedo: Texture;
    fuzz: number;// metal
}

export interface BounceRecord {
    attenuation: Color;
    scatter_pdf: PDF;
    sampling_pdf: number;
    skip_pdf: boolean;
    skip_pdf_ray: Ray;
}

export type EmitFunction = (mat: MegaMaterial, r_in: Ray, hit: HitRecord) => Color;
export type ScatterFunction = (mat: MegaMaterial, r_in: Ray, hit: HitRecord, bounce: BounceRecord) => boolean;
export type ScatteringPDF = (r_in: Ray, hit: HitRecord, scattered: Ray) => number;

export const createBounceRecord = (): BounceRecord => {
    return {
        scatter_pdf: new SpherePDF(),
        attenuation: color(0, 0, 0),
        sampling_pdf: NaN,
        skip_pdf: false,
        skip_pdf_ray: ray(vec3(0, 0, 0), vec3(0, 0, 0), 0)
    }
};

export const defaultScatter: ScatterFunction = () => false;
export const defaultScatteringPDF: ScatteringPDF = () => 0;
export const defaultEmit: EmitFunction = (mat, r_in, hit) => mat.emissive.value(hit.u, hit.v, hit.p);

export const createMegaMaterial = (config: Partial<MegaMaterial>): MegaMaterial => {
    return {
        scatter: config.scatter ?? defaultScatter,
        scattering_pdf: config.scattering_pdf ?? defaultScatteringPDF,
        emit: config.emit ?? defaultEmit,
        ior: config.ior ?? 0,
        emissive: config.emissive ?? sColor(0, 0, 0),
        albedo: config.albedo ?? sColor(0, 0, 0),
        fuzz: config.fuzz ?? 0
    };
}
