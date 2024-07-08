import { Texture, texture_get_value } from './texture';
import { Color, Point3 } from '../math/vec3.gen';

export interface IChecker2DTexture extends Texture {
    type: 'checker2d',
    even: Texture;
    odd: Texture;
    u_frequency: number;
    v_frequency: number;
}

export const create_checker_2d_texture = (even: Texture, odd: Texture, u_frequency: number, v_frequency: number): IChecker2DTexture => {
    return {
        type: 'checker2d',
        even, odd,
        u_frequency,
        v_frequency
    }
};

texture_get_value.checker2d = (tex, u: number, v: number, p: Point3): Color => {
    const checker_tex = tex as IChecker2DTexture;
    const U = Math.floor(u * checker_tex.u_frequency);
    const V = Math.floor(v * checker_tex.v_frequency);
    return (U + V) % 2 !== 0
        ? texture_get_value[checker_tex.odd.type](checker_tex.odd, u, v, p)
        : texture_get_value[checker_tex.even.type](checker_tex.even, u, v, p);
}
