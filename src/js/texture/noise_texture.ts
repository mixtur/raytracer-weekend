import { Texture, texture_get_value } from './texture';
import { color, Color, mul_vec3_s, Point3 } from '../math/vec3.gen';
import { create_perlin, Perlin, perlin_turb } from './perlin';

export interface INoiseTexture extends Texture {
    type: 'noise';
    scale: number;
    noise: Perlin;
}

export const create_noise_texture = (scale: number): INoiseTexture => {
    return {
        type: 'noise',
        scale,
        noise: create_perlin()
    }
};

texture_get_value.noise = (tex, u: number, v: number, p: Point3): Color => {
    const noise_tex = tex as INoiseTexture;
    return mul_vec3_s(color(1, 1, 1), 0.5 * (1 + Math.sin(noise_tex.scale * p[2] + 10 * perlin_turb(noise_tex.noise, p, 7))));
};
