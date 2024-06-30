import { AttenuationFunction, create_mega_material, MegaMaterial } from '../megamaterial';
import { Texture } from '../../texture/texture';
import { CosinePDF } from '../../math/pdf';
import { lambertian_scatter } from '../lambertian';
import {
    add_vec3, add_vec3_r,
    dot_vec3,
    mix_vec3,
    mix_vec3_r, mul_vec3,
    mul_vec3_s, negate_vec3, set_vec3,
    sub_vec3, sub_vec3_r,
    unit_vec3,
    vec3, vec3_dirty
} from '../../math/vec3.gen';

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

// todo: low roughness values don't produce shiny surfaces
// todo: metals look weird
// todo: create less junk vectors;
// todo: precompute more
const burley_brdf: AttenuationFunction = (material, r_in, hit, bounce, scattered) => {
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
    const alpha = material.roughness;
    const albedo = material.albedo.value(hit.u, hit.v, hit.p);


    // aka Cook-Torrance F, aka Fresnel Factor, aka Schlick's approximation
    const ior = hit.front_face ? (1 / material.ior) : material.ior;
    const f0 = ((1 - ior) / (1 + ior)) ** 2;//1 - assuming we're rendering in the air
    set_vec3(f0_vec, f0, f0, f0);//typically f0 == 0.0
    mix_vec3_r(f0_vec, f0_vec, albedo, material.metalness);

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

    const alpha_squared = alpha ** 2;

    // D factor
    const d_normalization = alpha_squared / Math.PI;
    const d = d_normalization / (1 + (alpha_squared - 1) * l_dot_h ** 2);

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
    const alpha_g = (0.5 + (material.roughness ** 0.5) / 2) ** 2;
    const alpha_g_squared = alpha_g ** 2;
    const tan_theta_l_squared = 1 / l_dot_n ** 2 - 1;
    const tan_theta_v_squared = 1 / v_dot_n ** 2 - 1;
    const g = walter_g_partial(l_dot_h, l_dot_n, alpha_g_squared, tan_theta_l_squared)
            * walter_g_partial(v_dot_h, v_dot_n, alpha_g_squared, tan_theta_v_squared);

    //note: don't divide by PI, because CosinePDF. (implicitly multiplied by l_dot_n / PI)
    // lambert's diffuse:
    // const diffuse = albedo;
    //
    // disney's diffuse
    const fd_90 = 0.5 + 2 * material.roughness * l_dot_h ** 2;
    const diffuse_factor = burley_diffuse_partial(fd_90, l_dot_n)
                         * burley_diffuse_partial(fd_90, v_dot_n);
    const diffuse = mul_vec3_s(albedo, diffuse_factor);

    const attenuation_value = add_vec3(
        mul_vec3_s(specular_weight, d * g / (4 * l_dot_n * v_dot_n) * Math.PI),// * PI, because CosinePDF
        mul_vec3(diffuse_weight, diffuse)
    );

    bounce.attenuation.set(attenuation_value);
}


// implemented by blindly using these parers:
// https://media.disneyanimation.com/uploads/production/publication_asset/48/asset/s2012_pbs_disney_brdf_notes_v3.pdf
// https://www.cs.cornell.edu/~srm/publications/EGSR07-btdf.pdf
export const create_burley_pbr = (albedo: Texture, roughness: number, metalness: number): MegaMaterial => {
    return create_mega_material({
        attenuate: burley_brdf,
        scatter: lambertian_scatter,
        albedo,
        roughness: roughness ** 2,
        scattering_pdf: new CosinePDF(),
        metalness
    })
}
