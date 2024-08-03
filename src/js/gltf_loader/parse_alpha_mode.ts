import { GLTF2 } from './gltf_spec';
import { Hittable } from '../hittable/hittable';
import { solid_color } from '../texture/solid_color';
import { create_alpha_image_texture } from '../texture/alpha_image_texture';
import { GLTextureFilter } from './gl_types';
import { create_alpha_blend } from '../hittable/alpha_blend';
import { create_alpha_mask } from '../hittable/alpha_mask';
import { PixelsData } from '../texture/image-parsers/types';

export interface AlphaModeContext {
    textures: Array<{
        image: PixelsData,
        sampler: GLTF2.Sampler
    }>
}

export const create_parse_alpha_mode_parser = ({textures}: AlphaModeContext) => (mat: GLTF2.Material | undefined, hittable: Hittable): Hittable => {
    if (!mat) {
        return hittable;
    }

    const alpha_mode = mat.alphaMode ?? 'OPAQUE';
    if (alpha_mode === 'OPAQUE') {
        return hittable;
    }

    const base_color = mat.pbrMetallicRoughness?.baseColorFactor ?? [0, 0, 0, 1];
    const base_tex_index = mat.pbrMetallicRoughness?.baseColorTexture?.index;

    const texture = base_tex_index === undefined
        ? solid_color(base_color[3], base_color[3], base_color[3])
        : create_alpha_image_texture(textures[base_tex_index].image, {
            wrap_s: textures[base_tex_index].sampler.wrapS,
            wrap_t: textures[base_tex_index].sampler.wrapT,
            filter: textures[base_tex_index].sampler.magFilter !== GLTextureFilter.NEAREST
        });

    if (alpha_mode === 'BLEND') {
        return create_alpha_blend(hittable, texture);
    }
    return create_alpha_mask(hittable, texture, mat.alphaCutoff ?? 0.5);
}
