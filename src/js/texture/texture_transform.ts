import { Texture, texture_get_value } from './texture';
import { Mat2x3, Mat3, Mat3x4, mul_mat2x3_vec2_r, mul_mat3_vec3_r } from '../math/mat.gen';
import { set_vec2, set_vec3, vec2_dirty, vec3_dirty } from '../math/vec.gen';

export interface TextureTransform extends Texture {
    type: 'transform';
    matrix: Mat2x3;
    child_texture: Texture;
}

export const create_texture_transform = (matrix: Mat3x4, child_texture: Texture): TextureTransform => {
    return {
        type: 'transform',
        matrix,
        child_texture
    }
}

const tmp_vec = vec2_dirty();
texture_get_value.transform = (tex, u, v, p) => {
    const { matrix, child_texture } = tex as TextureTransform;
    set_vec2(tmp_vec, u, v);
    mul_mat2x3_vec2_r(tmp_vec, matrix, tmp_vec);
    return texture_get_value[child_texture.type](child_texture, tmp_vec[0], tmp_vec[1], p);
};
