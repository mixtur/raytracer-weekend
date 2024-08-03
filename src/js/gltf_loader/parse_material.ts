import { solid_color } from '../texture/solid_color';
import { create_image_texture } from '../texture/image_texture';
import { GLTextureFilter } from './gl_types';
import { create_burley_pbr_separate } from '../materials/burley-pbr-separate';
import { GLTF2 } from './gltf_spec';
import { Texture } from '../texture/texture';
import { mat3, trs_to_mat3x4 } from '../math/mat3.gen';
import { vec3 } from '../math/vec3.gen';
import { axis_angle_to_quat } from '../math/quat.gen';
import { create_texture_transform } from '../texture/texture_transform';
import { PixelsData } from '../texture/image-parsers/types';

const parse_texture_transform = (material_texture: GLTF2.TextureInfo, tex: Texture): Texture => {
    interface KHR_texture_transform {
        offset?: [number, number],
        rotation?: number,
        scale?: [number, number],
        texCoord?: number
    }

    const extensions = (material_texture.extensions ?? {}) as {KHR_texture_transform?: KHR_texture_transform};
    if (extensions.KHR_texture_transform !== undefined) {
        const {
            offset = [0, 0],
            rotation = 0,
            scale = [1, 1]
        } = extensions.KHR_texture_transform;

        const affine_matrix3 = trs_to_mat3x4(
            vec3(offset[0], offset[1], 0),
            axis_angle_to_quat(vec3(0, 0, -1), rotation),
            vec3(scale[0], scale[1], 1)
        );

        const matrix = mat3(
            affine_matrix3[0], affine_matrix3[1], affine_matrix3[2],
            affine_matrix3[3], affine_matrix3[4], affine_matrix3[5],
            affine_matrix3[9], affine_matrix3[10], affine_matrix3[11]
        )

        return create_texture_transform(matrix, tex);
    }

    return tex;
}

export interface ParseMaterialContext {
    textures: Array<{
        image: PixelsData,
        sampler: GLTF2.Sampler
    }>,
    emissive_scale: number
}

export const create_material_parser = ({ textures, emissive_scale }: ParseMaterialContext) => (m: GLTF2.Material) => {
    // todo: tex_coord
    // todo: combine factor and texture
    const color = m.pbrMetallicRoughness?.baseColorFactor ?? [1, 1, 1, 1];
    const roughness = m.pbrMetallicRoughness?.roughnessFactor ?? 1;
    const metalness = m.pbrMetallicRoughness?.metallicFactor ?? 1;

    const color_texture_info = m.pbrMetallicRoughness?.baseColorTexture;
    const metallic_roughness_texture_info = m.pbrMetallicRoughness?.metallicRoughnessTexture;
    const normal_map_info = m.normalTexture;
    const emissive_map_info = m.emissiveTexture;

    const metallic_roughness = metallic_roughness_texture_info === undefined
        ? solid_color(0, roughness, metalness)
        : parse_texture_transform(metallic_roughness_texture_info, create_image_texture(textures[metallic_roughness_texture_info.index].image, {
            wrap_s: textures[metallic_roughness_texture_info.index].sampler.wrapS,
            wrap_t: textures[metallic_roughness_texture_info.index].sampler.wrapT,
            filter: textures[metallic_roughness_texture_info.index].sampler.magFilter !== GLTextureFilter.NEAREST
        }));

    const albedo = color_texture_info === undefined
        ? solid_color(color[0], color[1], color[2])
        : parse_texture_transform(color_texture_info, create_image_texture(textures[color_texture_info.index].image, {
            wrap_s: textures[color_texture_info.index].sampler.wrapS,
            wrap_t: textures[color_texture_info.index].sampler.wrapT,
            filter: textures[color_texture_info.index].sampler.magFilter !== GLTextureFilter.NEAREST,
            decode_srgb: true
        }));

    const normal_map = normal_map_info === undefined
        ? null
        : parse_texture_transform(normal_map_info, create_image_texture(textures[normal_map_info.index].image, {
            wrap_s: textures[normal_map_info.index].sampler.wrapS,
            wrap_t: textures[normal_map_info.index].sampler.wrapT,
            filter: textures[normal_map_info.index].sampler.magFilter !== GLTextureFilter.NEAREST,
        }));

    const emissive_map = emissive_map_info === undefined
        ? null
        : parse_texture_transform(emissive_map_info, create_image_texture({
            ...textures[emissive_map_info.index].image,
            normalization: textures[emissive_map_info.index].image.normalization * emissive_scale
        }, {
            wrap_s: textures[emissive_map_info.index].sampler.wrapS,
            wrap_t: textures[emissive_map_info.index].sampler.wrapT,
            filter: textures[emissive_map_info.index].sampler.magFilter !== GLTextureFilter.NEAREST,
            decode_srgb: true
        }));

    return create_burley_pbr_separate(albedo, metallic_roughness, metallic_roughness, normal_map, emissive_map);
};
