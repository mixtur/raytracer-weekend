import { GLTF2 } from './gltf_spec';
import { GLPrimitiveMode } from './gl_types';
import { create_lambertian } from '../materials/lambertian';
import { solid_color } from '../texture/solid_color';
import { INormalStrategy } from '../hittable/triangle';
import {
    ArenaMat3Allocator,
    ArenaMat3x4Allocator,
    mat3x4,
    Mat3x4,
    mat4,
    mat4_to_mat3x4,
    mul_mat3x4,
    trs_to_mat3x4, use_mat3_allocator,
    use_mat3x4_allocator
} from '../math/mat3.gen';
import { ArenaVec3Allocator, use_vec3_allocator, Vec3, vec3 } from '../math/vec3.gen';
import { quat } from '../math/quat.gen';
import { run_with_hooks } from '../utils';
import { load_dom_image } from '../texture/image-parsers/image-bitmap';
import { Hittable } from '../hittable/hittable';
import { create_bvh_node } from '../hittable/bvh';
import { create_transform } from '../hittable/transform';
import { create_hittable_list } from '../hittable/hittable_list';
import {
    triangle_type_ids,
    TriangleRefAttribute,
    TriangleRefAttributeSemantic,
    TriangleRefPrimitive
} from '../hittable/triangle_reference';
import { create_packed_bvh } from '../hittable/packed_bvh_triangles';
import { create_material_parser } from './parse_material';
import { create_accessor_parser } from './parse_accessor';
import { create_parse_alpha_mode_parser } from './parse_alpha_mode';

export const load_gltf_light = async (url: string, vec3_arena_size: number, mat_arena_size: number, emissive_scale: number = 20): Promise<Hittable> => {
    const base_url = new URL(url, location.href);
    const gltf = await fetch(url).then(res => res.json()) as GLTF2.Root;
    const [buffers, images] = await Promise.all([
        Promise.all((gltf.buffers ?? []).map((b) =>
            fetch(new URL(b.uri as string, base_url))
                .then(async b => {
                    const buffer = await b.arrayBuffer();
                    const view = new Uint8Array(buffer);
                    const shared_buffer = new SharedArrayBuffer(buffer.byteLength);
                    const shared_view = new Uint8Array(shared_buffer);
                    shared_view.set(view);
                    return shared_buffer;
                }))),
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

        const accessors = (gltf.accessors ?? []).map(create_accessor_parser({
            buffer_views
        }));

        const textures = (gltf.textures ?? []).map(t => ({
            image: images[t.source!],
            sampler: gltf.samplers?.[t.sampler!] ?? {}
        }));

        const default_material = create_lambertian(solid_color(1, 1, 1));

        const materials = (gltf.materials ?? []).map(create_material_parser({
            textures,
            emissive_scale
        }));

        let next_primitive_index = 0;
        const parse_indexed_primitive = (gltf_primitive: GLTF2.Primitive) => {
            const indices = accessors[gltf_primitive.indices!];
            const position_components = accessors[gltf_primitive.attributes.POSITION];

            const triangle_ref_attributes: TriangleRefAttribute[] = [];
            triangle_ref_attributes.push({
                semantic: TriangleRefAttributeSemantic.POSITION,
                //todo: actual glTF stride / bytes_per_element
                stride: 3,
                view: position_components
            });

            const has_normals = 'NORMAL' in gltf_primitive.attributes;
            if (has_normals) {
                const normals_components = accessors[gltf_primitive.attributes.NORMAL];
                triangle_ref_attributes.push({
                    semantic: TriangleRefAttributeSemantic.NORMAL,
                    //todo: actual glTF stride / bytes_per_element
                    stride: 3,
                    view: normals_components
                });
            }

            const has_tangents = 'TANGENT' in gltf_primitive.attributes;
            if (has_tangents) {
                const tangents_components = accessors[gltf_primitive.attributes.TANGENT];
                triangle_ref_attributes.push({
                    semantic: TriangleRefAttributeSemantic.TANGENT,
                    //todo: actual glTF stride / bytes_per_element
                    stride: 4,
                    view: tangents_components
                });
            }

            //todo: Vec2
            let uv_index = 0;
            while (true) {
                const uv_name = `TEXCOORD_${uv_index}`;
                const has_uv = uv_name in gltf_primitive.attributes;
                if (!has_uv) break;
                const uv_components = accessors[gltf_primitive.attributes[uv_name]];

                const semantic = TriangleRefAttributeSemantic.TEX_COORD_0 + uv_index;
                if (!TriangleRefAttributeSemantic[semantic]?.startsWith('TEX_COORD')) {
                    throw new Error(`Cannot parse ${uv_name} to internal representation`);
                }
                triangle_ref_attributes.push({
                    semantic,
                    //todo: actual glTF stride / bytes_per_element
                    stride: 2,
                    view: uv_components
                });

                uv_index++;
            }

            const mode = gltf_primitive.mode ?? GLPrimitiveMode.TRIANGLES;
            if (mode !== GLPrimitiveMode.TRIANGLES) {
                throw new Error(`don't know how to parse primitive mode ${GLPrimitiveMode[mode]}`)
            }
            const material = gltf_primitive.material === undefined ? default_material : materials[gltf_primitive.material];
            const get_normal_strategy = (has_normals: boolean, has_tangents: boolean, uvs_count: number, has_normal_map: boolean) : INormalStrategy['type'] => {
                if (!has_normals) {
                    return 'constant';
                }
                if (!has_tangents || uvs_count === 0 || !has_normal_map) {
                    return 'interpolated';
                }
                return 'normal-map';
            }

            if (material.normal_map !== null) {
                const report = [];
                if (!has_normals) report.push('NORMAL');
                if (!has_tangents) report.push('TANGENT');

                if (report.length !== 0) {
                    console.warn(`Cannot use normal map without these attributes: ${JSON.stringify(report)}`);
                }
            }

            const key = [
                get_normal_strategy(has_normals, has_tangents, uv_index, material.normal_map !== null),
                uv_index,
                gltf_primitive.material ?? -1
            ].join(':');

            let triangle_type_id = triangle_type_ids.get(key);
            if (triangle_type_id === undefined) {
                triangle_type_id = triangle_type_ids.size;
                triangle_type_ids.set(key, triangle_type_id);
            }

            const primitive: TriangleRefPrimitive = {
                id: next_primitive_index++,
                attributes: triangle_ref_attributes,
                indices,
                material,
                triangle_type_id
            };

            return create_packed_bvh(primitive);
        };

        const parse_alpha_mode = create_parse_alpha_mode_parser({textures});
        const meshes = (gltf.meshes ?? []).map(m => {
            return m.primitives.map((p) => {
                if (p.indices !== undefined) {
                    const material = p.material === undefined ? undefined : (gltf.materials ?? [])[p.material];
                    return parse_alpha_mode(material, parse_indexed_primitive(p));
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

            // return create_bvh_node([
            //     hittables[0], // arrows
            //     hittables[1], // ??
            //     hittables[2], // plates
            //     hittables[3], // #5
            //     hittables[4], // #4
            //     hittables[5], // #3
            //     hittables[6], // #2
            //     hittables[7], // #1
            //     hittables[8] // background
            // ], 0, 1);

        });

        return scenes[0];
    });
}
