// Probability Distribution Function
import {
    Point3,
    Vec3,
    vec3_dot,
    vec3_rand_cosine_unit,
    vec3_rand_unit,
    vec3_rand_unit_on_hemisphere,
    vec3_unit1
} from './vec3';
import { Hittable } from '../hittable/hittable';
import { mul_quat_vec3_2, Quat, quat_from_z_1 } from './quat';

export interface PDF {
    value(direction: Vec3): number;
    generate(): Vec3;
}

export class SpherePDF implements PDF {
    value(direction: Vec3): number {
        return 1 / (4 * Math.PI);
    }

    generate(): Vec3 {
        return vec3_rand_unit();
    }
}

export class HemispherePDF implements PDF {
    quat: Quat;
    constructor(lobe_direction: Vec3) {
        this.quat = quat_from_z_1(lobe_direction);
    }

    value(_direction: Vec3): number {
        return 1 / (2 * Math.PI);
    }

    generate(): Vec3 {
        return mul_quat_vec3_2(this.quat, vec3_rand_unit_on_hemisphere());
    }
}

export class CosinePDF implements PDF {
    quat!: Quat;
    lobe_direction!: Vec3;
    setDirection(lobe_direction: Vec3): void {
        this.quat = quat_from_z_1(lobe_direction);
        this.lobe_direction = vec3_unit1(lobe_direction);
    }

    value(direction: Vec3): number {
        const cos_t = vec3_dot(vec3_unit1(direction), this.lobe_direction);
        return Math.max(0, cos_t / Math.PI);
    }
    generate(): Vec3 {
        return mul_quat_vec3_2(this.quat, vec3_rand_cosine_unit());
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
