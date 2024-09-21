import { BounceRecord, MegaMaterial } from '../megamaterial';
import { Ray } from '../../math/ray';
import { HitRecord } from '../../hittable/hittable';
import {
    add_vec3_r,
    dot_vec3,
    mix_vec3,
    mix_vec3_r,
    mul_vec3_s, mul_vec3_s_r,
    negate_vec3,
    set_vec3, sub_vec3, sub_vec3_r,
    unit_vec3, vec3,
    Vec3, vec3_dirty
} from '../../math/vec.gen';
import { create_partial_reflection_pdf, create_reflection_pdf_type, IReflectionPDF, pdf_types } from '../../math/pdf';

const f0_vec = vec3_dirty();
const one_vec = vec3(1, 1, 1);
const reflection_weight = vec3_dirty();
const refraction_weight = vec3_dirty();

const chi_plus = (x: number) => x < 0 ? 0 : 1;

const walter_g_partial = (sep_dot_h: number, sep_dot_n: number, alpha_g_squared: number, tan_theta_sep_squared: number): number => {
    return chi_plus(sep_dot_h / sep_dot_n) * 2 / (1 + (1 + alpha_g_squared * tan_theta_sep_squared) ** 0.5);
};

export const burley_brdf_reflect = (material: MegaMaterial, r_in: Ray, hit: HitRecord, bounce: BounceRecord, scattered: Ray, albedo: Vec3, metallic: number, roughness: number) => {
    const n = unit_vec3(hit.normal);
    const v = negate_vec3(unit_vec3(r_in.direction));
    const l = unit_vec3(scattered.direction);
    const h = unit_vec3(mix_vec3(v, l, 0.5));

    const v_dot_n = dot_vec3(v, n);
    const l_dot_n = dot_vec3(l, n);
    if (l_dot_n < 0) {
        set_vec3(bounce.attenuation, 0, 0, 0);
        return;
    }

    // const h_dot_n = dot_vec3(h, n);
    const l_dot_h = dot_vec3(l, h);// the same as dot_vec3(v, h);
    const v_dot_h = l_dot_h;

    // aka Cook-Torrance F, aka Fresnel Factor, aka Schlick's approximation
    const ior = hit.front_face ? (1 / material.ior) : material.ior;
    const f0 = ((1 - ior) / (1 + ior)) ** 2;//1 - assuming we're rendering in the air
    set_vec3(f0_vec, f0, f0, f0);//typically f0 == 0.0
    mix_vec3_r(f0_vec, f0_vec, albedo, metallic);

    // we want to compute this f0 + (1 - f0) * (1 - l_dot_h) ** 5
    // except that f0 and 1 are vectors, so
    add_vec3_r(reflection_weight,
        f0_vec,
        mul_vec3_s(
            sub_vec3(one_vec, f0_vec),
            (1 - l_dot_h) ** 5
        )
    );
    sub_vec3_r(refraction_weight, one_vec, reflection_weight);

    //G factor
    //
    // wikipedia's G
    // const g = Math.min(
    //     1,
    //     2 * h_dot_n * v_dot_n / l_dot_h,
    //     2 * h_dot_n * l_dot_n / l_dot_h,
    // );
    //
    // disney's G
    // const alpha_g = (0.5 + (roughness ** 0.5) / 2) ** 2;
    // const alpha_g_squared = alpha_g ** 2;
    // const tan_theta_l_squared = 1 / l_dot_n ** 2 - 1;
    // const tan_theta_v_squared = 1 / v_dot_n ** 2 - 1;
    // const g = walter_g_partial(l_dot_h, l_dot_n, alpha_g_squared, tan_theta_l_squared)
    //         * walter_g_partial(v_dot_h, v_dot_n, alpha_g_squared, tan_theta_v_squared);
    // Walter's G
    const alpha_g_squared = roughness ** 2;
    const tan_theta_l_squared = 1 / l_dot_n ** 2 - 1;
    const tan_theta_v_squared = 1 / v_dot_n ** 2 - 1;
    const g = walter_g_partial(l_dot_h, l_dot_n, alpha_g_squared, tan_theta_l_squared)
        * walter_g_partial(v_dot_h, v_dot_n, alpha_g_squared, tan_theta_v_squared);

    //if we were to compute this using uniform sampling we'd have to compute this:
    //    (reflection_weight * D * g / (4 * v_dot_n * l_dot_n)) * l_dot_n =
    //    (reflection_weight * D * g) / (4 * v_dot_n)
    // However we use sampling with the following pdf:
    //    D / J
    // To account for that we adjust our complete formula to be:
    //    (reflection_weight * J * g) / (4 * v_dot_n)
    //
    // with J=16*v_dot_h**3
    // mul_vec3_s_r(bounce.attenuation, reflection_weight, 4 * g * (v_dot_h ** 3) / v_dot_n);
    //
    // with J=4*v_dot_h
    mul_vec3_s_r(bounce.attenuation, reflection_weight, g * v_dot_h / v_dot_n);
    // with J=2
    // mul_vec3_s_r(bounce.attenuation, reflection_weight, g / (2 * v_dot_n));
}


export interface IReflectionGGXPDF extends IReflectionPDF<'reflection_burley_pdf'> {
    alpha_squared: number;
}

export const create_reflection_ggx_pdf = (): IReflectionGGXPDF => {
    return {
        ...create_partial_reflection_pdf('reflection_burley_pdf'),
        alpha_squared: 0.5
    };
};

export const set_reflection_ggx_pdf_alpha = (pdf: IReflectionGGXPDF, alpha: number) => {
    pdf.alpha_squared = alpha ** 2
};

pdf_types.reflection_burley_pdf = create_reflection_pdf_type<'reflection_burley_pdf'>({
    generate_h(pdf): Vec3 {
        const r1 = Math.random();
        const r2 = Math.random();
        const { alpha_squared } = pdf as IReflectionGGXPDF;
        const phi_h = r1 * Math.PI * 2;
        const cos_theta_h_squared = (1 - r2) / (1 + (alpha_squared - 1) * r2);
        const cos_theta_h = Math.sqrt(cos_theta_h_squared);
        const sin_theta_h = Math.sqrt(1 - cos_theta_h_squared);
        const cos_phi_h = Math.cos(phi_h);
        const sin_phi_h = Math.sin(phi_h);

        return vec3(
            sin_theta_h * cos_phi_h,
            sin_theta_h * sin_phi_h,
            cos_theta_h
        );
    },

    value_h(pdf, h: Vec3): number {
        const cos_theta_h = h[2];
        const { alpha_squared } = pdf as IReflectionGGXPDF;
        return alpha_squared / (Math.PI * (1 + (alpha_squared - 1) * (cos_theta_h ** 2)) ** 2);
    }
})

