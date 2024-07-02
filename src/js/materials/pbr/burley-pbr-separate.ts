import {
    AttenuationFunction,
    BounceRecord,
    create_mega_material,
    MegaMaterial,
    ScatterFunction
} from '../megamaterial';
import { Texture } from '../../texture/texture';
import { CosinePDF, MixturePDF, SpecularIsotropicMicroFacetPDF } from '../../math/pdf';
import {
    add_vec3, add_vec3_r,
    dot_vec3,
    mix_vec3,
    mix_vec3_r, mul_vec3,
    mul_vec3_s, mul_vec3_s_r, negate_vec3, set_vec3,
    sub_vec3, sub_vec3_r,
    unit_vec3, Vec3,
    vec3, vec3_dirty
} from '../../math/vec3.gen';
import { clamp, remap } from '../../utils';
import { Ray } from '../../math/ray';
import { HitRecord } from '../../hittable/hittable';
import { get_tex_coords_r } from '../../hittable/triangle';

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
    const alpha_g = (0.5 + (roughness ** 0.5) / 2) ** 2;
    const alpha_g_squared = alpha_g ** 2;
    const tan_theta_l_squared = 1 / l_dot_n ** 2 - 1;
    const tan_theta_v_squared = 1 / v_dot_n ** 2 - 1;
    const g = walter_g_partial(l_dot_h, l_dot_n, alpha_g_squared, tan_theta_l_squared)
        * walter_g_partial(v_dot_h, v_dot_n, alpha_g_squared, tan_theta_v_squared);

    // note: there is no Cook-Torrance D. It is implicit from sampling distribution
    // note: we divide by 2, not 4, because we need to account for sampling light direction by sampling micro-facets
    // const attenuation_value = mul_vec3_s(specular_weight, g / (2 * v_dot_n));

    const attenuation_value = mul_vec3_s(specular_weight, g / (2 * v_dot_n));

    bounce.attenuation.set(attenuation_value);
}

class SpecularGFXPDF extends SpecularIsotropicMicroFacetPDF {
    alpha_squared!: number;

    setAlpha(alpha: number) {
        this.alpha_squared = alpha ** 2;
    }

    _generate_h(): Vec3 {
        const r1 = Math.random();
        const r2 = Math.random();
        const { alpha_squared } = this;
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
    }

    _value_h(h: Vec3): number {
        const cos_theta_h = h[2];
        const { alpha_squared } = this;
        return alpha_squared / (Math.PI * (1 + (alpha_squared - 1) * (cos_theta_h ** 2)) ** 2);
    }
}

const uv = vec3_dirty();
const update_uv = (hit: HitRecord) => {
    const { u, v } = hit;
    if (hit.tex_channels.length > 0) {
        //todo: un-hardcode tex channel
        get_tex_coords_r(uv, u, v, hit.tex_channels[0]);
        uv[0] -= Math.floor(uv[0]);
        uv[1] -= Math.floor(uv[1]);
    } else {
        uv[0] = u;
        uv[1] = v;
    }
}

const burley_attenuation: AttenuationFunction = (material, r_in, hit, bounce, scattered) => {
    const mixture_pdf = material.scattering_pdf as MixturePDF;
    const albedo = material.albedo.value(uv[0], uv[1], hit.p);
    let metallic = 1, roughness = 1;
    if (material.metallic === material.roughness) {
        const metallic_roughness = material.metallic.value(uv[0], uv[1], hit.p);
        roughness = metallic_roughness[1];
        metallic = metallic_roughness[2];
    } else {
        roughness = material.roughness.value(uv[0], uv[1], hit.p)[1];
        metallic = material.metallic.value(uv[0], uv[1], hit.p)[2];
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
};

const burley_scatter: ScatterFunction = (material, r_in, hit, bounce) => {
    const mixture_pdf = material.scattering_pdf as MixturePDF;
    const diffuse_pdf = mixture_pdf.pdf1 as CosinePDF;
    const specular_pdf = mixture_pdf.pdf2 as SpecularGFXPDF;
    const unit_normal = unit_vec3(hit.normal);
    const unit_view = negate_vec3(unit_vec3(r_in.direction));
    diffuse_pdf.setDirection(unit_normal);

    //todo: roughness is sampled twice now. Once here and another time in attenuation
    //      we'd better avoid it.
    update_uv(hit);
    const roughness = material.roughness.value(uv[0], uv[1], hit.p)[1];
    const _roughness = remap(clamp(roughness ?? 1, 0, 1), 0, 1, 0.001, 0.999) ** 2;
    specular_pdf.setAlpha(_roughness);
    specular_pdf.setup(unit_normal, unit_view);

    bounce.skip_pdf = false;
    return true;
};

// implemented by blindly using these parers:
// https://media.disneyanimation.com/uploads/production/publication_asset/48/asset/s2012_pbs_disney_brdf_notes_v3.pdf
// https://www.cs.cornell.edu/~srm/publications/EGSR07-btdf.pdf
export const create_burley_pbr_separate = (albedo: Texture, roughness: Texture, metalness: Texture): MegaMaterial => {
    const scattering_pdf = new MixturePDF();
    scattering_pdf.pdf1 = new CosinePDF();
    scattering_pdf.pdf2 = new SpecularGFXPDF();
    return create_mega_material({
        attenuate: burley_attenuation,
        scatter: burley_scatter,
        albedo,
        scattering_pdf,
        roughness: roughness,
        metallic: metalness
    });
}
