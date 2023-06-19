import { ray, Ray } from '../ray';
import { HitRecord } from '../hittable/hittable';
import { Color, color, Point3, vec3Dot, vec3Reflect, vec3Refract, vec3Unit1 } from '../vec3';
import { BounceRecord, Material } from './material';

export class Dielectric implements Material {
    ior: number
    constructor(ior: number) {
        this.ior = ior;
    }
    scatter(r_in: Ray, hit: HitRecord): BounceRecord | null {
        const refraction_ratio = hit.front_face ? (1 / this.ior) : this.ior;
        const unit_direction = vec3Unit1(r_in.direction);
        const cos_theta = -vec3Dot(unit_direction, hit.normal);
        const sin_theta = Math.sqrt(1.0 - cos_theta*cos_theta);

        const cannot_refract = refraction_ratio * sin_theta > 1.0;
        const reflectance = this._reflectance(cos_theta, refraction_ratio);

        const direction = (cannot_refract || (reflectance > Math.random()))
            ? vec3Reflect(unit_direction, hit.normal)
            : vec3Refract(unit_direction, hit.normal, refraction_ratio);

        return {
            scattered: ray(hit.p, direction, r_in.time),
            attenuation: color(1, 1, 1)
        };
    }

    _reflectance(cos: number, ref_idx: number): number {
        // Use Schlick's approximation for reflectance.
        let r0 = ((1-ref_idx) / (1+ref_idx)) ** 2;
        return r0 + (1 - r0) * ((1 - cos) ** 5);
    }
    emitted(u: number, v: number, p: Point3): Color {
        return color(0, 0, 0);
    }
}
