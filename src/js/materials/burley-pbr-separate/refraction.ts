import { BounceRecord, MegaMaterial } from '../megamaterial';
import { Ray } from '../../math/ray';
import { HitRecord } from '../../hittable/hittable';
import {
    add_vec3_r,
    dot_vec3,
    mix_vec3,
    mix_vec3_r, mul_vec3,
    mul_vec3_s, mul_vec3_s_r,
    negate_vec3,
    set_vec3, sub_vec3, sub_vec3_r,
    unit_vec3, vec3,
    Vec3, vec3_dirty
} from '../../math/vec.gen';

const burley_diffuse_partial = (f_d90: number, cos_theta_sep: number) => {
    return 1 + (f_d90 - 1) * ((1 - cos_theta_sep) ** 5);
};

const f0_vec = vec3_dirty();
const one_vec = vec3(1, 1, 1);
const reflection_weight = vec3_dirty();
const refraction_weight = vec3_dirty();

export const burley_brdf_refract = (material: MegaMaterial, r_in: Ray, hit: HitRecord, bounce: BounceRecord, scattered: Ray, albedo: Vec3, metallic: number, roughness: number) => {
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
    add_vec3_r(reflection_weight,
        f0_vec,
        mul_vec3_s(
            sub_vec3(one_vec, f0_vec),
            (1 - l_dot_h) ** 5
        )
    );
    sub_vec3_r(refraction_weight, one_vec, reflection_weight);
    mul_vec3_s_r(refraction_weight, refraction_weight, 1 - metallic);

    //note: don't divide by PI, because CosinePDF. (implicitly multiplied by l_dot_n / PI)
    // lambert's diffuse:
    // const diffuse = albedo;
    //
    // disney's diffuse
    const fd_90 = 0.5 + 2 * roughness * l_dot_h ** 2;
    const diffuse_factor = burley_diffuse_partial(fd_90, l_dot_n)
        * burley_diffuse_partial(fd_90, v_dot_n);
    const diffuse = mul_vec3_s(albedo, diffuse_factor);

    const attenuation_value = mul_vec3(refraction_weight, diffuse);

    bounce.attenuation.set(attenuation_value);
}
