import {
    AttenuationFunction,
    BounceRecord,
    create_mega_material, create_material_type, EmitFunction, material_types,
    MegaMaterial,
    ScatterFunction
} from './megamaterial';
import { Texture, texture_get_value } from '../texture/texture';
import {
    cosine_pdf_set_direction, create_cosine_pdf,
    create_partial_reflection_pdf, create_reflection_pdf_type,
    ICosinePDF,
    IReflectionPDF,
    PDF,
    pdf_types, setup_reflection_pdf
} from '../math/pdf';
import {
    add_vec3_r,
    dot_vec3,
    mix_vec3,
    mix_vec3_r, mul_vec3,
    mul_vec3_s, mul_vec3_s_r, negate_vec3, set_vec3,
    sub_vec3, sub_vec3_r,
    unit_vec3, Vec3,
    vec3, vec3_dirty
} from '../math/vec3.gen';
import { clamp, remap } from '../utils';
import { Ray } from '../math/ray';
import { HitRecord } from '../hittable/hittable';
import { interpolate_vec2_r } from '../hittable/triangle';
import { solid_color } from '../texture/solid_color';
import { is_image_texture } from '../texture/image_texture';
import { update_uv } from '../uv';

const chi_plus = (x: number) => x < 0 ? 0 : 1;

const walter_g_partial = (sep_dot_h: number, sep_dot_n: number, alpha_g_squared: number, tan_theta_sep_squared: number): number => {
    return chi_plus(sep_dot_h / sep_dot_n) * 2 / (1 + (1 + alpha_g_squared * tan_theta_sep_squared) ** 0.5);
};

const burley_diffuse_partial = (f_d90: number, cos_theta_sep: number) => {
    return 1 + (f_d90 - 1) * ((1 - cos_theta_sep) ** 5);
};

const f0_vec = vec3_dirty();
const one_vec = vec3(1, 1, 1);
const specular_weight = vec3_dirty();
const diffuse_weight = vec3_dirty();

const burley_brdf_diffuse = (material: MegaMaterial, r_in: Ray, hit: HitRecord, bounce: BounceRecord, scattered: Ray, albedo: Vec3, metallic: number, roughness: number) => {
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


    // aka Cook-Torrance F, aka Fresnel Factor, aka Schlick's approximation
    const ior = hit.front_face ? (1 / material.ior) : material.ior;
    const f0 = ((1 - ior) / (1 + ior)) ** 2;//1 - assuming we're rendering in the air
    set_vec3(f0_vec, f0, f0, f0);//typically f0 == 0.0
    mix_vec3_r(f0_vec, f0_vec, albedo, metallic);

    // we want to compute this f0 + (1 - f0) * (1 - l_dot_h) ** 5
    // except that f0 and 1 are vectors, so
    add_vec3_r(specular_weight,
        f0_vec,
        mul_vec3_s(
            sub_vec3(one_vec, f0_vec),
            (1 - l_dot_h) ** 5
        )
    );
    sub_vec3_r(diffuse_weight, one_vec, specular_weight);
    mul_vec3_s_r(diffuse_weight, diffuse_weight, 1 - metallic);

    //note: don't divide by PI, because CosinePDF. (implicitly multiplied by l_dot_n / PI)
    // lambert's diffuse:
    // const diffuse = albedo;
    //
    // disney's diffuse
    const fd_90 = 0.5 + 2 * roughness * l_dot_h ** 2;
    const diffuse_factor = burley_diffuse_partial(fd_90, l_dot_n)
        * burley_diffuse_partial(fd_90, v_dot_n);
    const diffuse = mul_vec3_s(albedo, diffuse_factor);

    const attenuation_value = mul_vec3(diffuse_weight, diffuse);

    bounce.attenuation.set(attenuation_value);
}

const burley_brdf_specular = (material: MegaMaterial, r_in: Ray, hit: HitRecord, bounce: BounceRecord, scattered: Ray, albedo: Vec3, metallic: number, roughness: number) => {
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
    add_vec3_r(specular_weight,
        f0_vec,
        mul_vec3_s(
            sub_vec3(one_vec, f0_vec),
            (1 - l_dot_h) ** 5
        )
    );
    sub_vec3_r(diffuse_weight, one_vec, specular_weight);

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

    mul_vec3_s_r(bounce.attenuation, specular_weight, g * l_dot_h / v_dot_n);
}

export interface ISpecularGGXPDF extends IReflectionPDF<'specular_burley_pdf'> {
    alpha_squared: number;
}

export const create_specular_ggxpdf = (): ISpecularGGXPDF => {
    return {
        ...create_partial_reflection_pdf('specular_burley_pdf'),
        alpha_squared: 0.5
    };
};

const set_specular_ggx_pdf_alpha = (pdf: ISpecularGGXPDF, alpha: number) => {
    pdf.alpha_squared = alpha ** 2
};

pdf_types.specular_burley_pdf = create_reflection_pdf_type<'specular_burley_pdf'>({
    generate_h(pdf): Vec3 {
        const r1 = Math.random();
        const r2 = Math.random();
        const { alpha_squared } = pdf as ISpecularGGXPDF;
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
        const { alpha_squared } = pdf as ISpecularGGXPDF;
        return alpha_squared / (Math.PI * (1 + (alpha_squared - 1) * (cos_theta_h ** 2)) ** 2);
    }
})

export interface IBurleyPDF extends PDF {
    type: 'burley_pdf',
    pdf1: ICosinePDF;
    pdf2: ISpecularGGXPDF;
    use_pdf1: boolean;
}

export const create_burley_pdf = (): IBurleyPDF => {
    return {
        type: 'burley_pdf',
        pdf1: create_cosine_pdf(),
        pdf2: create_specular_ggxpdf(),
        use_pdf1: false
    };
};

export const flip_burley_pdf = (pdf: IBurleyPDF): void => {
    pdf.use_pdf1 = Math.random() < 0.5;
}
//note: We cannot use plain MixturePDF here because importance sampling (that prefers lights) will produce wrong results.
//      Attenuation functions in materials account for use of their pdfs, so that true formula is pre-divided by pdf.
//      When light based importance sampling is working, this pre-division becomes wrong.
//      To fix that ray_color multiplies attenuation by material's pdf and divides by light's pdf.
//      But the problem is that PBR actually uses 2 PDFs. One for diffuse and another for specular.
//      If we used MixturePDF to combine the two, the fix would multiply by mixture of specular and diffuse pdfs which
//      is wrong. To make it right again we do this:
pdf_types.burley_pdf = {
    value(pdf, direction: Vec3): number {
        const { use_pdf1, pdf1, pdf2 } = pdf as IBurleyPDF;
        return use_pdf1
            ? pdf_types[pdf1.type].value(pdf1, direction)
            : pdf_types[pdf2.type].value(pdf2, direction);
    },

    generate(pdf): Vec3 {
        const { use_pdf1, pdf1, pdf2 } = pdf as IBurleyPDF;
        return use_pdf1
            ? pdf_types[pdf1.type].generate(pdf1)
            : pdf_types[pdf2.type].generate(pdf2);
    }
}

const burley_attenuation: AttenuationFunction = (material, r_in, hit, bounce, scattered) => {
    const mixture_pdf = material.scattering_pdf as IBurleyPDF;
    const uv = update_uv(hit);
    const albedo = texture_get_value[material.albedo.type](material.albedo, uv[0], uv[1], hit.p);
    let metallic = 1, roughness = 1;
    if (material.metallic === material.roughness) {
        const metallic_roughness = texture_get_value[material.metallic.type](material.metallic, uv[0], uv[1], hit.p);
        roughness = metallic_roughness[1];
        metallic = metallic_roughness[2];
    } else {
        roughness = texture_get_value[material.roughness.type](material.roughness, uv[0], uv[1], hit.p)[1];
        metallic = texture_get_value[material.metallic.type](material.roughness, uv[0], uv[1], hit.p)[2];
    }

    const _roughness = remap(clamp(roughness ?? 1, 0, 1), 0, 1, 0.001, 0.999) ** 2;
    const _metallic = remap(clamp(metallic ?? 1, 0, 1), 0, 1, 0.001, 0.999);

    if (mixture_pdf.use_pdf1) {
        // cosine pdf, therefore
        burley_brdf_diffuse(material, r_in, hit, bounce, scattered, albedo, _metallic, _roughness);
    } else {
        // specular pdf, therefore
        burley_brdf_specular(material, r_in, hit, bounce, scattered, albedo, _metallic, _roughness);
    }
    mul_vec3_s_r(bounce.attenuation, bounce.attenuation, 2);
    // bounce.attenuation.set(fma_vec3_s_s(hit.normal, 0.5, 0.5));
};

const burley_scatter: ScatterFunction = (material, r_in, hit, bounce) => {
    const mixture_pdf = material.scattering_pdf as IBurleyPDF;
    flip_burley_pdf(mixture_pdf);
    const diffuse_pdf = mixture_pdf.pdf1;
    const specular_pdf = mixture_pdf.pdf2;
    const unit_normal = unit_vec3(hit.normal);
    const unit_view = negate_vec3(unit_vec3(r_in.direction));
    cosine_pdf_set_direction(diffuse_pdf, unit_normal);

    //todo: roughness is sampled twice now. Once here and another time in attenuation
    //      we'd better avoid it.
    const uv = update_uv(hit);
    const roughness = texture_get_value[material.roughness.type](material.roughness, uv[0], uv[1], hit.p)[1];
    const _roughness = remap(clamp(roughness ?? 1, 0, 1), 0, 1, 0.001, 0.999) ** 2;
    set_specular_ggx_pdf_alpha(specular_pdf, _roughness);
    setup_reflection_pdf(specular_pdf, unit_normal, unit_view);

    bounce.skip_pdf = false;
    return true;
};

const uv_aware_emit: EmitFunction = (material, r_in, hit) => {
    if (is_image_texture(material.emissive)) {
        const uv = update_uv(hit);
        return texture_get_value[material.emissive.type](material.emissive, uv[0], uv[1], uv);
    }

    return texture_get_value[material.emissive.type](material.emissive, hit.u, hit.v, hit.p);
};

material_types.burley_pbr = create_material_type({
    attenuate: burley_attenuation,
    scatter: burley_scatter,
    emit: uv_aware_emit
});

// implemented by blindly using these parers:
// https://media.disneyanimation.com/uploads/production/publication_asset/48/asset/s2012_pbs_disney_brdf_notes_v3.pdf
// https://www.cs.cornell.edu/~srm/publications/EGSR07-btdf.pdf
export const create_burley_pbr_separate = (albedo: Texture, roughness: Texture, metalness: Texture, normal_map: Texture | null, emissive: Texture | null): MegaMaterial => {
    return create_mega_material({
        type: 'burley_pbr',
        albedo,
        scattering_pdf: create_burley_pdf(),
        emissive: emissive ?? solid_color(0, 0, 0),
        roughness: roughness,
        metallic: metalness,
        normal_map
    });
}
