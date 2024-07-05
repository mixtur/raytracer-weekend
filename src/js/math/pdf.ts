// Probability Distribution Function
import {
    add_vec3,
    dot_vec3, rand_vec3_cosine_unit,
    rand_vec3_on_unit_hemisphere,
    rand_vec3_unit, reflect_incident_vec3, reflect_incident_vec3_r, reflect_vec3, unit_vec3, unit_vec3_r,
    Vec3, vec3_dirty
} from './vec3.gen';
import { Hittable } from '../hittable/hittable';
import {
    invert_quat_r,
    mul_quat_vec3,
    mul_quat_vec3_r,
    newz_to_quat,
    newz_to_quat_r,
    Quat,
    quat_dirty
} from './quat.gen';

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
    use_pdf1 = false;

    value(direction: Vec3): number {
        return (this.pdf1.value(direction) + this.pdf2.value(direction)) / 2;
    }

    generate(): Vec3 {
        this.use_pdf1 = Math.random() < 0.5;
        return this.use_pdf1
            ? this.pdf1.generate()
            : this.pdf2.generate();
    }
}

//note: anisotropic micro-facet distribution would require tangent, not just normal,
//      and quaternion would be computed differently (not sure how yet)
export abstract class SpecularIsotropicMicroFacetPDF implements PDF {
    quat: Quat = quat_dirty();
    inv_quat: Quat = quat_dirty();
    unit_view: Vec3 = vec3_dirty();

    protected abstract _generate_h(): Vec3;
    protected abstract _value_h(unit_h: Vec3): number;

    setup(unit_normal: Vec3, unit_view: Vec3): void {
        newz_to_quat_r(this.quat, unit_normal);
        invert_quat_r(this.inv_quat, this.quat);
        this.unit_view.set(unit_view);
    }

    generate(): Vec3 {
        const h = this._generate_h();
        mul_quat_vec3_r(h, this.quat, h);
        return reflect_vec3(this.unit_view, h);
    }

    value(unit_l: Vec3): number {
        const h = add_vec3(
            this.unit_view,
            unit_l
        );
        unit_vec3_r(h, h);
        // at this point h is correct, except it is in world space
        // rotate h back to local space
        mul_quat_vec3_r(h, this.inv_quat, h);
        if (h[2] < 0) return 0;
        // now we can compute local-space h value.
        // divide by 2, transformation from h to unit_l is linear (in spherical coordinates), and it's determinant is 2
        //todo: according to people on the Internet, this is wrong. Determinant of Jacobian for reflection operator is apparently not just constant 2.
        //      Need to understand why. (Or maybe this is fine for my case)
        return this._value_h(h) / 2;
    }
}
