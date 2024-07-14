import { Texture, texture_get_value } from './texture';
import { Mat3, Mat3x4, mul_mat3_vec3_r } from '../math/mat3.gen';
import { set_vec3, vec3_dirty } from '../math/vec3.gen';

export interface TextureTransform extends Texture {
    type: 'transform';
    matrix: Mat3;// todo: Mat2x3
    child_texture: Texture;
}

export const create_texture_transform = (matrix: Mat3x4, child_texture: Texture): TextureTransform => {
    return {
        type: 'transform',
        matrix,
        child_texture
    }
}

const tmp_vec = vec3_dirty();
texture_get_value.transform = (tex, u, v, p) => {
    const { matrix, child_texture } = tex as TextureTransform;
    set_vec3(tmp_vec, u, v, 1);
    mul_mat3_vec3_r(tmp_vec, matrix, tmp_vec);
    return texture_get_value[child_texture.type](child_texture, tmp_vec[0], tmp_vec[1], p);
};
