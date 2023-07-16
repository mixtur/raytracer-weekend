import { Texture } from '../texture/texture';
import { sColor } from '../texture/solid_color';
import { ray, Ray, rayAllocator } from '../ray';
import { HitRecord } from '../hittable/hittable';
import { color, Color, vec3 } from '../vec3';

export interface MegaMaterial {
    scatter: ScatterFunction;
    scattering_pdf: ScatteringPDF;
    ior: number; // dielectric
    emit: Texture;
    albedo: Texture;
    fuzz: number;// metal
}

export interface BounceRecord {
    scattered: Ray;
    attenuation: Color;
    sampling_pdf: number;
}

export type ScatterFunction = (mat: MegaMaterial, r_in: Ray, hit: HitRecord, bounce: BounceRecord) => boolean;
export type ScatteringPDF = (r_in: Ray, hit: HitRecord, scattered: Ray) => number;

export const createBounceRecord = (): BounceRecord => {
    return {
        scattered: ray(vec3(0, 0, 0), vec3(0, 0, 0), 0),
        attenuation: color(0, 0, 0),
        sampling_pdf: NaN
    }
};

export const defaultScatter: ScatterFunction = () => false;
export const defaultScatteringPDF: ScatteringPDF = () => 0;

export const createMegaMaterial = (scatter: ScatterFunction | null, scattering_pdf: ScatteringPDF | null, config: Partial<MegaMaterial>): MegaMaterial => {
    return {
        scatter: scatter ?? defaultScatter,
        scattering_pdf: scattering_pdf ?? defaultScatteringPDF,
        ior: config.ior ?? 0,
        emit: config.emit ?? sColor(0, 0, 0),
        albedo: config.albedo ?? sColor(0, 0, 0),
        fuzz: config.fuzz ?? 0
    };
}
