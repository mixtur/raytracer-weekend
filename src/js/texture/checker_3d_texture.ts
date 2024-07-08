import { Texture, texture_get_value } from './texture';
import { Color, Point3 } from '../math/vec3.gen';

export interface IChecker3DTexture extends Texture {
    type: 'checker3d';
    even: Texture;
    odd: Texture;
}

export const create_checker_3d_texture = (even: Texture, odd: Texture): IChecker3DTexture => {
    return {
        type: 'checker3d',
        even,
        odd
    }
};

texture_get_value.checker3d = (tex, u: number, v: number, p: Point3): Color => {
    const checker_tex = tex as IChecker3DTexture;
    const sines = Math.sin(10*p[0]) * Math.sin(10*p[1]) * Math.sin(10*p[2]);
    return sines < 0
        ? texture_get_value[checker_tex.odd.type](checker_tex.odd, u, v, p)
        : texture_get_value[checker_tex.even.type](checker_tex.even, u, v, p);
};
