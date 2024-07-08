import { Texture, texture_get_value } from './texture';
import { PixelsData } from './image-parsers/types';
import { Color, mix_vec3, mix_vec3_r, set_vec3, vec3_dirty } from '../math/vec3.gen';
import { clamp } from '../utils';
import { GLWrappingMode } from '../gltf_loader/gl_types';

export interface ImageConfig {
    wrap_s?: GLWrappingMode;
    wrap_t?: GLWrappingMode;
    flip_y?: boolean;
    filter?: boolean;
    decode_srgb?: boolean;
}

export interface IImageTexture extends Texture {
    type: 'image';
    _pixels_data: PixelsData;
    wrap_s: GLWrappingMode;
    wrap_t: GLWrappingMode;
    flip_y: boolean;
    filter: boolean;
    decode_srgb: boolean;
}

export const is_image_texture = (tex: Texture): tex is IImageTexture => {
    return tex.type === 'image';
}

export const create_image_texture = (pixels_data: PixelsData, config: ImageConfig): IImageTexture => {
    return {
        type: 'image',
        _pixels_data:  pixels_data,
        wrap_s:  config.wrap_s ?? GLWrappingMode.CLAMP_TO_EDGE,
        wrap_t:  config.wrap_t ?? GLWrappingMode.CLAMP_TO_EDGE,
        flip_y:  config.flip_y ?? false,
        filter:  config.filter ?? false,
        decode_srgb:  config.decode_srgb ?? false,
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

function _read_color_r(tex: IImageTexture, result: Color, offset: number): void {
    const { pixels, normalization } = tex._pixels_data;
    const r = pixels[offset] * normalization;
    const g = pixels[offset + 1] * normalization;
    const b = pixels[offset + 2] * normalization;

    if (tex.decode_srgb) {
        set_vec3(result, r ** 2.2, g ** 2.2, b ** 2.2);
    } else {
        set_vec3(result, r, g, b);
    }
}

const tmp_a = vec3_dirty();
const tmp_b = vec3_dirty();
const tmp_c = vec3_dirty();
const tmp_d = vec3_dirty();

texture_get_value.image = (tex, s: number, t: number): Color => {
    const img_tex = tex as IImageTexture;
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

        _read_color_r(img_tex, tmp_a, (top_index * width + left_index) * 4);
        _read_color_r(img_tex, tmp_b, (top_index * width + right_index) * 4);
        _read_color_r(img_tex, tmp_c, (bottom_index * width + left_index) * 4);
        _read_color_r(img_tex, tmp_d, (bottom_index * width + right_index) * 4);

        mix_vec3_r(tmp_a, tmp_a, tmp_b, wx);
        mix_vec3_r(tmp_c, tmp_c, tmp_d, wx);
        return mix_vec3(tmp_a, tmp_c, wy);

    } else {
        const i = Math.floor(center_s);
        const j = Math.floor(center_t);

        const result = vec3_dirty();
        _read_color_r(img_tex, result, (j * width + i) * 4);
        return result;
    }
};

