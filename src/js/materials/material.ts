import { HitRecord } from '../hittable/hittable';
import { Ray } from '../ray';
import {
    color,
    Color, Point3
} from '../vec3';

export interface BounceRecord {
    scattered: Ray;
    attenuation: Color;
}

export abstract class Material {
    abstract scatter(r_in: Ray, hit: HitRecord): BounceRecord | null;
    emitted(u: number, v: number, p: Point3): Color {
        return color(0, 0, 0);
    }
}
