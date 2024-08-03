import { Texture, texture_get_value } from './texture';
import { PixelsData } from './image-parsers/types';
import { Color, mix_vec3, mix_vec3_r, set_vec3, vec3, vec3_dirty } from '../math/vec3.gen';
import { clamp } from '../utils';
import { GLWrappingMode } from '../gltf_loader/gl_types';

export interface AlphaImageConfig {
    //todo: factor out sampling
    wrap_s?: GLWrappingMode;
    wrap_t?: GLWrappingMode;
    flip_y?: boolean;
    filter?: boolean;
}

export interface IAlphaImageTexture extends Texture {
    type: 'alpha_image';
    _pixels_data: PixelsData;
    wrap_s: GLWrappingMode;
    wrap_t: GLWrappingMode;
    flip_y: boolean;
    filter: boolean;
}

export const is_image_texture = (tex: Texture): tex is IAlphaImageTexture => {
    return tex.type === 'alpha_image';
}

export const create_alpha_image_texture = (pixels_data: PixelsData, config: AlphaImageConfig): IAlphaImageTexture => {
    return {
        type: 'alpha_image',
        _pixels_data:  pixels_data,
        wrap_s:  config.wrap_s ?? GLWrappingMode.CLAMP_TO_EDGE,
        wrap_t:  config.wrap_t ?? GLWrappingMode.CLAMP_TO_EDGE,
        flip_y:  config.flip_y ?? false,
        filter:  config.filter ?? false
    };
}

const mirror = (x: number) => x >= 0 ? x : (-1 - x);

function _wrap(mode: GLWrappingMode, size: number, flip: boolean, coord: number): number {
    if (flip) {
        coord = 1 - coord;
    }
    coord *= size - 1;
    switch (mode) {
        case GLWrappingMode.CLAMP_TO_EDGE: return clamp(coord, 0, size - 1);
        case GLWrappingMode.REPEAT: return coord % size;
        case GLWrappingMode.MIRRORED_REPEAT: return (size - 1) - mirror(coord % (2 * size) - size);
    }
    throw new Error(`Unknown wrapping mode ${mode}`);
}

function _read_alpha(tex: IAlphaImageTexture, offset: number): number {
    const { pixels, normalization } = tex._pixels_data;
    return pixels[offset + 3] * normalization;
}

texture_get_value.alpha_image = (tex, s: number, t: number): Color => {
    const img_tex = tex as IAlphaImageTexture;
    const { width, height } = img_tex._pixels_data;

    const center_s = _wrap(img_tex.wrap_s, width, false, s);
    const center_t = _wrap(img_tex.wrap_t, height, img_tex.flip_y, t);

    if (img_tex.filter) {
        const left_index = Math.floor(center_s);
        const right_index = Math.ceil(center_s);
        const top_index = Math.floor(center_t);
        const bottom_index = Math.ceil(center_t);

        const wx = center_s - left_index;
        const wy = center_t - top_index;

        const a = _read_alpha(img_tex, (top_index * width + left_index) * 4);
        const b = _read_alpha(img_tex, (top_index * width + right_index) * 4);
        const c = _read_alpha(img_tex, (bottom_index * width + left_index) * 4);
        const d = _read_alpha(img_tex, (bottom_index * width + right_index) * 4);

        const inv_wx = 1 - wx;
        const inv_wy = 1 - wy;

        const ab = inv_wx * a + wx * b;
        const cd = inv_wx * c + wx * d;
        const abcd = inv_wy * ab + wy * cd;
        return vec3(abcd, abcd, abcd);
    } else {
        const i = Math.floor(center_s);
        const j = Math.floor(center_t);

        const a = _read_alpha(img_tex, (j * width + i) * 4);
        return vec3(a, a, a);
    }
};

