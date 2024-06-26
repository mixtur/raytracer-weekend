// Probability Distribution Function
import {
    dot_vec3, rand_vec3_cosine_unit,
    rand_vec3_on_unit_hemisphere,
    rand_vec3_unit, unit_vec3,
    Vec3
} from './vec3.gen';
import { Hittable } from '../hittable/hittable';
import { mul_quat_vec3, newz_to_quat, Quat } from './quat.gen';

export interface PDF {
    value(direction: Vec3): number;
    generate(): Vec3;
}

export class SpherePDF implements PDF {
    value(direction: Vec3): number {
        return 1 / (4 * Math.PI);
    }

    generate(): Vec3 {
        return rand_vec3_unit();
    }
}

export class HemispherePDF implements PDF {
    quat: Quat;
    constructor(lobe_direction: Vec3) {
        this.quat = newz_to_quat(lobe_direction);
    }

    value(_direction: Vec3): number {
        return 1 / (2 * Math.PI);
    }

    generate(): Vec3 {
        return mul_quat_vec3(this.quat, rand_vec3_on_unit_hemisphere());
    }
}

export class CosinePDF implements PDF {
    quat!: Quat;
    lobe_direction!: Vec3;
    setDirection(lobe_direction: Vec3): void {
        this.quat = newz_to_quat(lobe_direction);
        this.lobe_direction = unit_vec3(lobe_direction);
    }

    value(direction: Vec3): number {
        const cos_t = dot_vec3(unit_vec3(direction), this.lobe_direction);
        return Math.max(0, cos_t / Math.PI);
    }
    generate(): Vec3 {
        return mul_quat_vec3(this.quat, rand_vec3_cosine_unit());
    }
}

export class HittablePDF implements PDF {
    hittable!: Hittable;
    origin!: Vec3;

    value(direction: Vec3): number {
        return this.hittable.pdf_value(this.origin, direction);
    }

    generate(): Vec3 {
        return this.hittable.random(this.origin);
    }
}

export class MixturePDF implements PDF {
    pdf1!: PDF;
    pdf2!: PDF;
    selection = false;

    value(direction: Vec3): number {
        return (this.pdf1.value(direction) + this.pdf2.value(direction)) / 2;
    }

    generate(): Vec3 {
        this.selection = Math.random() < 0.5;
        return this.selection
            ? this.pdf1.generate()
            : this.pdf2.generate();
    }
}
