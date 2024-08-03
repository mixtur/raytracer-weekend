import { GLTF2 } from './gltf_spec';
import { GLDataType, GLPrimitiveMode, GLTextureFilter } from './gl_types';
import { create_lambertian } from '../materials/lambertian';
import { solid_color } from '../texture/solid_color';
import {
    create_constant_normal, create_interpolated_normal, create_normal_map, create_triangle,
    TriangleVec2,
    TriangleVec3
} from '../hittable/triangle';
import {
    ArenaMat3Allocator,
    ArenaMat3x4Allocator, mat3,
    mat3x4,
    Mat3x4,
    mat4,
    mat4_to_mat3x4,
    mul_mat3x4,
    trs_to_mat3x4, use_mat3_allocator,
    use_mat3x4_allocator
} from '../math/mat3.gen';
import { ArenaVec3Allocator, use_vec3_allocator, Vec3, vec3 } from '../math/vec3.gen';
import { axis_angle_to_quat, quat } from '../math/quat.gen';
import { run_with_hooks } from '../utils';
import { create_burley_pbr_separate } from '../materials/burley-pbr-separate';
import { load_dom_image } from '../texture/image-parsers/image-bitmap';
import { Texture } from '../texture/texture';
import { Hittable } from '../hittable/hittable';
import { create_bvh_node } from '../hittable/bvh';
import { create_transform } from '../hittable/transform';
import { create_hittable_list } from '../hittable/hittable_list';
import { create_image_texture } from '../texture/image_texture';
import { create_texture_transform } from '../texture/texture_transform';

const gltf_components_per_element = {
    SCALAR: 1,
    VEC2: 2,
    VEC3: 3,
    VEC4: 4,
    MAT2: 4,
    MAT3: 9,
    MAT4: 16
}

export const load_gltf = async (url: string, vec3_arena_size: number, mat_arena_size: number, emissive_scale: number = 20): Promise<Hittable> => {
    const base_url = new URL(url, location.href);
    const gltf = await fetch(url).then(res => res.json()) as GLTF2.Root;
    const [buffers, images] = await Promise.all([
        Promise.all((gltf.buffers ?? []).map((b) =>
            fetch(new URL(b.uri as string, base_url))
                .then(b => b.arrayBuffer()))),
        Promise.all((gltf.images ?? []).map((img) => load_dom_image(new URL(img.uri!, base_url).toString()))),
    ]);

    return run_with_hooks(() => {
        use_vec3_allocator(new ArenaVec3Allocator(vec3_arena_size, true));
        use_mat3x4_allocator(new ArenaMat3x4Allocator(mat_arena_size, true));
        use_mat3_allocator(new ArenaMat3Allocator(mat_arena_size, true));

        const buffer_views = (gltf.bufferViews ?? []).map(b => {
            const buffer = buffers[b.buffer];
            return new Uint8Array(buffer, b.byteOffset ?? 0, b.byteLength);
        });

        const accessors = (gltf.accessors ?? []).map(a => {
            const buffer_view = buffer_views[a.bufferView ?? 0];
            switch (a.componentType) {
                case GLDataType.FLOAT:
                    return new Float32Array(buffer_view.buffer, (buffer_view.byteOffset ?? 0) + (a.byteOffset ?? 0), a.count * gltf_components_per_element[a.type ?? 'SCALAR']);
                case GLDataType.UNSIGNED_SHORT:
                    return new Uint16Array(buffer_view.buffer, (buffer_view.byteOffset ?? 0) + (a.byteOffset ?? 0), a.count * gltf_components_per_element[a.type ?? 'SCALAR']);
                case GLDataType.UNSIGNED_INT:
                    return new Uint32Array(buffer_view.buffer, (buffer_view.byteOffset ?? 0) + (a.byteOffset ?? 0), a.count * gltf_components_per_element[a.type ?? 'SCALAR']);
                default:
                    throw new Error(`unknown component type: ${GLDataType[a.componentType]}`);
            }
        });

        const textures = (gltf.textures ?? []).map(t => ({
            image: images[t.source!],
            sampler: gltf.samplers?.[t.sampler!] ?? {}
        }));

        const default_material = create_lambertian(solid_color(1, 1, 1));

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

        const materials = (gltf.materials ?? []).map(m => {
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
        });

        const parse_indexed_primitive = (p: GLTF2.Primitive) => {
            const indices = accessors[p.indices!];
            const position_components = accessors[p.attributes.POSITION];
            const positions = [];
            //todo: strided attributes
            for (let i = 0; i < position_components.length; i += 3) {
                positions.push(vec3(
                    position_components[i],
                    position_components[i + 1],
                    position_components[i + 2],
                ));
            }
            const normals = [];
            const has_normals = 'NORMAL' in p.attributes;
            if (has_normals) {
                const normals_components = accessors[p.attributes.NORMAL];
                for (let i = 0; i < normals_components.length; i += 3) {
                    normals.push(
                        vec3(
                            normals_components[i],
                            normals_components[i + 1],
                            normals_components[i + 2],
                        )
                    );
                }
            }

            const tangents = [];
            const tangents_ws = [];
            const has_tangents = 'TANGENT' in p.attributes;
            if (has_tangents) {
                const tangents_components = accessors[p.attributes.TANGENT];
                for (let i = 0; i < tangents_components.length; i += 4) {
                    tangents.push(
                        vec3(
                            tangents_components[i],
                            tangents_components[i + 1],
                            tangents_components[i + 2],
                        )
                    );
                    tangents_ws.push(tangents_components[i + 3]);
                }
            }

            //todo: Vec2
            const uv_layers: Vec3[][] = [];
            let uv_index = 0;
            while (true) {
                const uv_name = `TEXCOORD_${uv_index}`;
                const has_uv = uv_name in p.attributes;
                if (!has_uv) break;
                const uv_vectors: Vec3[] = [];
                uv_layers.push(uv_vectors);
                const uv_components = accessors[p.attributes[uv_name]];
                for (let i = 0; i < uv_components.length; i += 2) {
                    uv_vectors.push(
                        vec3(
                            uv_components[i],
                            uv_components[i + 1],
                            0
                        )
                    );
                }

                uv_index++;
            }

            const mode = p.mode ?? GLPrimitiveMode.TRIANGLES;
            if (mode !== GLPrimitiveMode.TRIANGLES) {
                throw new Error(`don't know how to parse primitive mode ${GLPrimitiveMode[mode]}`)
            }
            const triangles = [];
            const material = p.material === undefined ? default_material : materials[p.material];
            const get_normal_strategy = (positions: TriangleVec3, vertex_normals: TriangleVec3 | null, vertex_tangents: TriangleVec3 | null, tangents_ws: Vec3 | null, uvs: TriangleVec2 | null, normal_map: Texture | null) => {
                if (!vertex_normals) {
                    return create_constant_normal(positions);
                }
                if (!vertex_tangents || !tangents_ws || !uvs || !normal_map) {
                    return create_interpolated_normal(vertex_normals);
                }
                return create_normal_map(vertex_normals, vertex_tangents, tangents_ws, uvs, normal_map);
            }

            if (material.normal_map !== null) {
                const report = [];
                if (!has_normals) report.push('NORMAL');
                if (!has_tangents) report.push('TANGENT');

                if (report.length !== 0) {
                    console.warn(`Cannot use normal map without these attributes: ${JSON.stringify(report)}`);
                }
            }

            for (let i = 0; i < indices.length; i += 3) {
                const vertex_positions: TriangleVec3 = [positions[indices[i]], positions[indices[i + 1]], positions[indices[i + 2]]];

                const vertex_normals: TriangleVec3 | null = has_normals ? [normals[indices[i]], normals[indices[i + 1]], normals[indices[i + 2]]] : null;
                const vertex_tangents: TriangleVec3 | null = has_tangents ? [tangents[indices[i]], tangents[indices[i + 1]], tangents[indices[i + 2]]] : null;
                const vertex_tangents_ws: Vec3 | null = has_tangents ? vec3(tangents_ws[indices[i]], tangents_ws[indices[i + 1]], tangents_ws[indices[i + 2]]) : null;

                const uv_channels: TriangleVec2[] = uv_layers.map(layer => [
                    layer[indices[i]], layer[indices[i + 1]], layer[indices[i + 2]]
                ]);

                const normal_strategy = get_normal_strategy(vertex_positions, vertex_normals, vertex_tangents, vertex_tangents_ws, uv_channels[0] ?? null, material.normal_map);
                triangles.push(create_triangle(vertex_positions, normal_strategy, uv_channels, material));
            }

            return create_bvh_node(triangles, 0, 0);
            // return create_bih_root(triangles, 0, 0);
        };

        const meshes = (gltf.meshes ?? []).map(m => {
            return m.primitives.map((p) => {
                if (p.indices !== undefined) {
                    return parse_indexed_primitive(p);
                } else {
                    throw new Error(`un-indexed primitives are not supported`);
                }
            });
        });

        interface Node {
            matrix: Mat3x4;
            mesh: Hittable[],
            child_indices: number[],
            children: Node[]
        }

        const nodes = (gltf.nodes ?? []).map(n => {
            const matrix = n.matrix
                ? mat4_to_mat3x4(mat4(...n.matrix))
                : trs_to_mat3x4(
                    vec3(...(n.translation ?? [0, 0, 0])),
                    quat(...(n.rotation ?? [0, 0, 0, 1])),
                    vec3(...(n.scale ?? [1, 1, 1]))
                );

            return {
                matrix,
                mesh: n.mesh === undefined ? [] : meshes[n.mesh],
                child_indices: n.children ?? [],
                children: []
            } as Node;
        });

        for (const n of nodes) {
            n.children = n.child_indices.map(n => nodes[n]);
        }

        const scenes = (gltf.scenes ?? []).map(s => {
            const hittables: Hittable[] = [];

            const collect_hittables = (n: Node, parent_matrix: Mat3x4) => {
                const child_matrix = mul_mat3x4(parent_matrix, n.matrix);
                if (n.mesh !== null) {
                    hittables.push(create_transform(child_matrix, create_hittable_list(n.mesh)));
                }
                for (const child of n.children) {
                    collect_hittables(child, child_matrix);
                }
            };

            (s.nodes ?? []).forEach((n_index) => collect_hittables(nodes[n_index], mat3x4(1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0)));

            return create_bvh_node(hittables, 0, 1);
        });

        return scenes[0];
    });
}
