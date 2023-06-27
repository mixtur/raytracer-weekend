import { BounceRecord, Material } from './material';
import { Ray } from '../ray';
import { HitRecord } from '../hittable/hittable';
import { Color, Point3 } from '../vec3';
import { Texture } from '../texture/texture';

export class DiffuseLight extends Material {
    emit: Texture;
    constructor(emit: Texture) {
        super();
        this.emit = emit;
    }
    scatter(r_in: Ray, hit: HitRecord): BounceRecord | null {
        return null;
    }
    emitted(u: number, v: number, p: Point3): Color {
        return this.emit.value(u, v, p);
    }
}
