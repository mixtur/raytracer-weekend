import {
    AttenuationFunction,
    BounceRecord,
    create_mega_material, create_material_type, EmitFunction, material_types,
    MegaMaterial,
    ScatterFunction
} from '../megamaterial';
import { Texture, texture_get_value } from '../../texture/texture';
import {
    cosine_pdf_set_direction, create_cosine_pdf,
    create_partial_reflection_pdf, create_reflection_pdf_type,
    ICosinePDF,
    IReflectionPDF,
    PDF,
    pdf_types, setup_reflection_pdf
} from '../../math/pdf';
import {
    add_vec3_r,
    dot_vec3,
    mix_vec3,
    mix_vec3_r, mul_vec3,
    mul_vec3_s, mul_vec3_s_r, negate_vec3, set_vec3,
    sub_vec3, sub_vec3_r,
    unit_vec3, Vec3,
    vec3, vec3_dirty
} from '../../math/vec.gen';
import { clamp, remap } from '../../utils';
import { Ray } from '../../math/ray';
import { HitRecord } from '../../hittable/hittable';
import { interpolate_vec2_r } from '../../hittable/triangle';
import { solid_color } from '../../texture/solid_color';
import { is_image_texture } from '../../texture/image_texture';
import { update_uv } from '../../uv';
import {
    burley_brdf_reflect,
    create_reflection_ggx_pdf,
    IReflectionGGXPDF,
    set_reflection_ggx_pdf_alpha
} from './reflection';
import { burley_brdf_refract } from './refraction';

export interface IBurleyPDF extends PDF {
    type: 'burley_pdf',
    pdf1: ICosinePDF;
    pdf2: IReflectionGGXPDF;
    use_pdf1: boolean;
}

export const create_burley_pdf = (): IBurleyPDF => {
    return {
        type: 'burley_pdf',
        pdf1: create_cosine_pdf(),
        pdf2: create_reflection_ggx_pdf(),
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
//      But the problem is that PBR actually uses 2 PDFs. One for refraction and another for reflection.
//      If we used MixturePDF to combine the two, the fix would multiply by mixture of reflection and refraction pdfs which
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
        burley_brdf_refract(material, r_in, hit, bounce, scattered, albedo, _metallic, _roughness);
    } else {
        // reflection pdf, therefore
        burley_brdf_reflect(material, r_in, hit, bounce, scattered, albedo, _metallic, _roughness);
    }
    mul_vec3_s_r(bounce.attenuation, bounce.attenuation, 2);
    // bounce.attenuation.set(fma_vec3_s_s(hit.normal, 0.5, 0.5));
};

const burley_scatter: ScatterFunction = (material, r_in, hit, bounce) => {
    const mixture_pdf = material.scattering_pdf as IBurleyPDF;
    flip_burley_pdf(mixture_pdf);
    const diffuse_pdf = mixture_pdf.pdf1;
    const reflection_pdf = mixture_pdf.pdf2;
    const unit_normal = unit_vec3(hit.normal);
    const unit_view = negate_vec3(unit_vec3(r_in.direction));
    cosine_pdf_set_direction(diffuse_pdf, unit_normal);

    //todo: roughness is sampled twice now. Once here and another time in attenuation
    //      we'd better avoid it.
    const uv = update_uv(hit);
    const roughness = texture_get_value[material.roughness.type](material.roughness, uv[0], uv[1], hit.p)[1];
    const _roughness = remap(clamp(roughness ?? 1, 0, 1), 0, 1, 0.001, 0.999) ** 2;
    set_reflection_ggx_pdf_alpha(reflection_pdf, _roughness);
    setup_reflection_pdf(reflection_pdf, unit_normal, unit_view);

    bounce.skip_pdf = false;
    return true;
};

const uv_aware_emit: EmitFunction = (material, r_in, hit) => {
    if (is_image_texture(material.emissive)) {
        const uv = update_uv(hit);
        return texture_get_value[material.emissive.type](material.emissive, uv[0], uv[1], hit.p);
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
