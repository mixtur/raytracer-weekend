import { Texture } from '../texture/texture';
import { sColor } from '../texture/solid_color';
import { Ray } from '../ray';
import { HitRecord } from '../hittable/hittable';
import { Color } from '../vec3';

export interface MegaMaterial {
    scatter: ScatterFunction;
    ior: number; // dielectric
    emit: Texture;
    albedo: Texture;
    fuzz: number;// metal
}

export interface BounceRecord {
    scattered: Ray;
    attenuation: Color;
}

export type ScatterFunction = (mat: MegaMaterial, r_in: Ray, hit: HitRecord) => BounceRecord | null;

export const createMegaMaterial = (scatter: ScatterFunction, config: Partial<MegaMaterial>): MegaMaterial => {
    return {
        scatter,
        ior: config.ior ?? 0,
        emit: config.emit ?? sColor(0, 0, 0),
        albedo: config.albedo ?? sColor(0, 0, 0),
        fuzz: config.fuzz ?? 0
    };
}
