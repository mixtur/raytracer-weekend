import { HitRecord } from '../hittable/hittable';
import { Ray } from '../ray';
import {
    Color, Point3
} from '../vec3';

export interface BounceRecord {
    scattered: Ray;
    attenuation: Color;
}

export interface Material {
    scatter(r_in: Ray, hit: HitRecord): BounceRecord | null;
    emitted(u: number, v: number, p: Point3): Color;
}
