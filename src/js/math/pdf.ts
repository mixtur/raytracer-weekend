// Probability Distribution Function
import {
    add_vec3,
    dot_vec3, rand_vec3_cosine_unit,
    rand_vec3_on_unit_hemisphere,
    rand_vec3_unit, reflect_incident_vec3, reflect_incident_vec3_r, reflect_vec3, unit_vec3, unit_vec3_r,
    Vec3, vec3_dirty
} from './vec3.gen';
import {
    invert_quat_r,
    mul_quat_vec3,
    mul_quat_vec3_r,
    newz_to_quat,
    newz_to_quat_r,
    Quat,
    quat_dirty
} from './quat.gen';
import { Hittable, hittable_types } from '../hittable/hittable';

export interface PDF {
    type: string;
}

export interface PDFType {
    value: (pdf: PDF, direction: Vec3) => number;
    generate: (pdf: PDF) => Vec3;
}

export const pdf_types: Record<string, PDFType> = {};


export interface ISpherePDF extends PDF {
    type: 'sphere';
}

export const create_sphere_pdf = () => ({ type: 'sphere' });

pdf_types.sphere = {
    value(pdf: PDF, direction: Vec3): number {
        return 1 / (4 * Math.PI);
    },

    generate(pdf: PDF): Vec3 {
        return rand_vec3_unit();
    }
}

export interface IHemispherePDF extends PDF {
    type: 'hemisphere';
    quat: Quat;
}

export const create_hemisphere_pdf = (lobe_direction: Vec3): IHemispherePDF => {
    return {
        type: 'hemisphere',
        quat: newz_to_quat(lobe_direction)
    }
}

pdf_types.hemisphere = {
    value(pdf, _direction: Vec3): number {
        return 1 / (2 * Math.PI);
    },

    generate(pdf): Vec3 {
        const hemisphere_pdf = pdf as IHemispherePDF;
        return mul_quat_vec3(hemisphere_pdf.quat, rand_vec3_on_unit_hemisphere());
    }
};

export interface ICosinePDF extends PDF {
    type: 'cosine';
    quat: Quat;
    lobe_direction: Vec3;
}

export const create_cosine_pdf = (): ICosinePDF => {
    return {
        type: 'cosine',
        quat: quat_dirty(),
        lobe_direction: vec3_dirty()
    };
};

export const cosine_pdf_set_direction = (pdf: ICosinePDF, lobe_direction: Vec3) => {
    newz_to_quat_r(pdf.quat, lobe_direction);
    unit_vec3_r(pdf.lobe_direction, lobe_direction);
};

pdf_types.cosine = {
    value(pdf: PDF, direction: Vec3): number {
        const cos_t = dot_vec3(unit_vec3(direction), (pdf as ICosinePDF).lobe_direction);
        return Math.max(0, cos_t / Math.PI);
    },
    generate(pdf: PDF): Vec3 {
        return mul_quat_vec3((pdf as ICosinePDF).quat, rand_vec3_cosine_unit());
    }
};

export interface IHittablePDF extends PDF {
    type: 'hittable';
    hittable: Hittable;
    origin: Vec3;
}

export const create_hittable_pdf = (): IHittablePDF => {
    return {
        type: 'hittable',
        hittable: {type: 'dummy-hittable'},
        origin: vec3_dirty()
    }
};

pdf_types.hittable = {
    value(pdf, direction: Vec3): number {
        const hittable_pdf = pdf as IHittablePDF;
        return hittable_types[hittable_pdf.hittable.type].pdf_value(hittable_pdf.hittable, hittable_pdf.origin, direction);
    },

    generate(pdf): Vec3 {
        const hittable_pdf = pdf as IHittablePDF;
        return hittable_types[hittable_pdf.hittable.type].random(hittable_pdf.hittable, hittable_pdf.origin);
    }
};

export interface IMixturePDF {
    type: 'mixture';
    pdf1: PDF;
    pdf2: PDF;
}

export const create_mixture_pdf = (): IMixturePDF => {
    return {
        type: 'mixture',
        pdf1: { type: 'dummy-pdf'},
        pdf2: { type: 'dummy-pdf'}
    };
};

pdf_types.mixture = {
    value(pdf: PDF, direction: Vec3): number {
        const {pdf1, pdf2} = pdf as IMixturePDF;
        return (
            pdf_types[pdf1.type].value(pdf1, direction) +
            pdf_types[pdf2.type].value(pdf2, direction)
        ) / 2;
    },

    generate(pdf: PDF): Vec3 {
        const {pdf1, pdf2} = pdf as IMixturePDF;
        const use_pdf1 = Math.random() < 0.5;
        return use_pdf1
            ? pdf_types[pdf1.type].generate(pdf1)
            : pdf_types[pdf2.type].generate(pdf2);
    }
};

export interface IReflectionPDF<T extends string> extends PDF {
    type: T;
    quat: Quat;
    inv_quat: Quat;
    unit_view: Vec3;
    unit_normal: Vec3;
}

export const create_partial_reflection_pdf = <T extends string>(type_name: T): IReflectionPDF<T> => {
    return {
        type: type_name,
        quat: quat_dirty(),
        inv_quat: quat_dirty(),
        unit_view: vec3_dirty(),
        unit_normal: vec3_dirty()
    };
};

export interface ReflectionPDFTypeConfig<T extends string> {
    generate_h: (pdf: IReflectionPDF<T>) => Vec3;
    value_h: (pdf: IReflectionPDF<T>, unit_h: Vec3) => number;
}

export const create_reflection_pdf_type = <T extends string>({generate_h, value_h}: ReflectionPDFTypeConfig<T>): PDFType => {
    return {
        generate(pdf): Vec3 {
            const reflection_pdf = pdf as IReflectionPDF<T>;
            const h = generate_h(reflection_pdf);
            mul_quat_vec3_r(h, reflection_pdf.quat, h);
            return reflect_vec3(reflection_pdf.unit_view, h);
        },

        value(pdf, unit_l: Vec3): number {
            const reflection_pdf = pdf as IReflectionPDF<T>;
            const h = add_vec3(
                reflection_pdf.unit_view,
                unit_l
            );
            if (dot_vec3(reflection_pdf.unit_normal, h) < 0) {
                return 0;
            }

            unit_vec3_r(h, h);
            // at this point h is correct, except it is in world space
            // rotate h back to local space
            mul_quat_vec3_r(h, reflection_pdf.inv_quat, h);
            // now we can compute local-space h value.
            // (4 * h[2]) - is determinant of Jacobian of reflection operator
            return value_h(reflection_pdf, h) / (4 * h[2]);
        }
    };
};

//note: anisotropic micro-facet distribution would require tangent, not just normal,
//      and quaternion would be computed differently (not sure how yet)
export const setup_reflection_pdf = <T extends string>(pdf: IReflectionPDF<T>, unit_normal: Vec3, unit_view: Vec3): void => {
    newz_to_quat_r(pdf.quat, unit_normal);
    pdf.unit_normal.set(unit_normal);
    invert_quat_r(pdf.inv_quat, pdf.quat);
    pdf.unit_view.set(unit_view);
};
