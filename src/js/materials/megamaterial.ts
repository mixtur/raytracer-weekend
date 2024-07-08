import { Texture, texture_get_value } from '../texture/texture';
import { solid_color } from '../texture/solid_color';
import { Ray, ray_dirty } from '../math/ray';
import { HitRecord } from '../hittable/hittable';
import { color, Color, vec3 } from '../math/vec3.gen';
import { PDF, SpherePDF } from '../math/pdf';

export interface MegaMaterial {
    scattering_pdf: PDF;

    type: string;
    ior: number; // dielectric
    emissive: Texture;
    albedo: Texture;
    fuzz: number;// metal

    roughness: Texture;
    metallic: Texture;
    normal_map: Texture | null;
}

export interface MaterialType {
    attenuate: AttenuationFunction;
    scatter: ScatterFunction;
    emit: EmitFunction;
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
        skip_pdf_ray: ray_dirty()
    }
};

export const default_scatter: ScatterFunction = () => false;
export const default_emit: EmitFunction = (mat, r_in, hit) => texture_get_value[mat.emissive.type](mat.emissive, hit.u, hit.v, hit.p);
export const default_attenuate: AttenuationFunction = (mat, r_in, hit, bounce, scattered) => {
    bounce.attenuation.set(texture_get_value[mat.albedo.type](mat.albedo, hit.u, hit.v, hit.p));
};

export const create_material_type = (config: Partial<MaterialType>): MaterialType => {
    return {
        attenuate: config.attenuate ?? default_attenuate,
        scatter: config.scatter ?? default_scatter,
        emit: config.emit ?? default_emit
    };
}

export const material_types: Record<string, MaterialType> = {};

export const create_mega_material = (config: Partial<MegaMaterial>): MegaMaterial => {
    if (config.type === undefined) { throw new Error(`Materials must have a type`); }

    const default_metallic_roughness = solid_color(0, 1, 1);
    return {
        scattering_pdf: config.scattering_pdf ?? new SpherePDF(),
        type: config.type,
        ior: config.ior ?? 1.5,
        emissive: config.emissive ?? solid_color(0, 0, 0),
        albedo: config.albedo ?? solid_color(0, 0, 0),
        fuzz: config.fuzz ?? 0,
        roughness: config.roughness ?? default_metallic_roughness,
        metallic: config.metallic ?? default_metallic_roughness,
        normal_map: config.normal_map ?? null
    };
}
