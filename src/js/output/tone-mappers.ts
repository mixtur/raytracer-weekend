import {
    add_vec3_s, add_vec3_s_r,
    Color, color_dirty,
    div_vec3_r,
    fma_vec3_s_s, fma_vec3_s_s_r,
    mul_vec3, mul_vec3_r, mul_vec3_s_r,
    sub_vec3_s_r
} from '../math/vec3.gen';
import { clamp } from '../utils';
import { mat3, mul_mat3_vec3_r, transpose_mat3, transpose_mat3_r } from '../math/mat3.gen';

export type ToneMapper = (result: Color, hdr_color: Color) => void;

export const compose_tone_mappers = (mappers: ToneMapper[]): ToneMapper => (result, hdr_color) => {
    result.set(hdr_color);
    for (let i = 0; i < mappers.length; i++) {
        const mapper = mappers[i];
        mapper(result, result);
    }
}

export const clip_to_unit_range: ToneMapper = (result, hdr_color) => {
    result[0] = clamp(hdr_color[0], 0, 0.999999);
    result[1] = clamp(hdr_color[1], 0, 0.999999);
    result[2] = clamp(hdr_color[2], 0, 0.999999);
}

export const apply_gamma = (gamma: number): ToneMapper =>(result, hdr_color) => {
    result[0] = hdr_color[0] ** gamma;
    result[1] = hdr_color[1] ** gamma;
    result[2] = hdr_color[2] ** gamma;
};

export interface ExposuerConfig {
    aperture: number;
    shutter_speed: number;
    ISO: number;
    exp_comp: number;
}

export const expose = ({aperture, shutter_speed, ISO, exp_comp}: ExposuerConfig): ToneMapper => {
    const EV100 = Math.log2(aperture ** 2 / shutter_speed * 100 / ISO) - exp_comp;
    const max_luminance = 2 ** (EV100 - 3);
    const exposure = 1 / max_luminance;
    return (result, hdr_color) => {
        mul_vec3_s_r(result, hdr_color, exposure);
    };
};


// https://github.com/TheRealMJP/BakingLab/blob/master/BakingLab/ACES.hlsl
export const ACES = ((): ToneMapper => {
    // sRGB => XYZ => D65_2_D60 => AP1 => RRT_SAT
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const ACES_input_mat = transpose_mat3(mat3(
        0.59719, 0.35458, 0.04823,
        0.07600, 0.90834, 0.01566,
        0.02840, 0.13383, 0.83777
    ));

    // ODT_SAT => XYZ => D60_2_D65 => sRGB
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const ACES_output_mat = transpose_mat3(mat3(
        1.60475, -0.53108, -0.07367,
        -0.10208,  1.10813, -0.00605,
        -0.00327, -0.07276,  1.07602
    ));

    const tmp_a = color_dirty();
    const tmp_b = color_dirty();
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const RRT_and_ODT_fit_r = (result: Color, v: Color): void => {
        // float3 a = v * (v + 0.0245786f) - 0.000090537f;
        add_vec3_s_r(tmp_a, v, 0.0245786);
        mul_vec3_r(tmp_a, v, tmp_a);
        sub_vec3_s_r(tmp_a, tmp_a, 0.000090537);

        // float3 b = v * (0.983729f * v + 0.4329510f) + 0.238081f;
        fma_vec3_s_s_r(tmp_b, v, 0.983729, 0.4329510)
        mul_vec3_r(tmp_b, v, tmp_b)
        add_vec3_s_r(tmp_b, tmp_b, 0.238081);

        div_vec3_r(result, tmp_a, tmp_b);
    };

    return (result, hdr_color) => {
        mul_mat3_vec3_r(result, ACES_input_mat, hdr_color);
        RRT_and_ODT_fit_r(result, result);
        mul_mat3_vec3_r(result, ACES_output_mat, result);
    };
})();
