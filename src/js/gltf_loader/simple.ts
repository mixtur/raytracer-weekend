import { Hittable } from '../hittable/hittable';
import { GLTF2 } from './gltf_spec';
import { GLDataType, GLPrimitiveMode } from './gl_types';
import { create_lambertian } from '../materials/lambertian';
import { solid_color } from '../texture/solid_color';
import { Triangle } from '../hittable/triangle';
import { BVHNode } from '../hittable/bvh';
import {
    ArenaMat3x4Allocator,
    mat3x4,
    Mat3x4,
    mat4,
    mat4_to_mat3x4,
    mul_mat3x4,
    trs_to_mat3x4,
    use_mat3x4_allocator
} from '../math/mat3.gen';
import { ArenaVec3Allocator, use_vec3_allocator, vec3 } from '../math/vec3.gen';
import { quat } from '../math/quat.gen';
import { HittableList } from '../hittable/hittable_list';
import { Transform } from '../hittable/transform';
import { run_with_hooks } from '../utils';

const gltf_components_per_element = {
    SCALAR: 1,
    VEC2: 2,
    VEC3: 3,
    VEC4: 4,
    MAT2: 4,
    MAT3: 9,
    MAT4: 16
}

export const load_gltf = async (url: string): Promise<Hittable> => {
    const base_url = new URL(url, location.href);
    const gltf = await fetch(url).then(res => res.json()) as GLTF2.Root;
    const buffers = await Promise.all((gltf.buffers ?? []).map((b) => fetch(new URL(b.uri as string, base_url)).then(b => b.arrayBuffer())));

    return run_with_hooks(() => {
        use_vec3_allocator(new ArenaVec3Allocator(102400));
        use_mat3x4_allocator(new ArenaMat3x4Allocator(1024));

        const buffer_views = (gltf.bufferViews ?? []).map(b => {
            const buffer = buffers[b.buffer];
            return new Uint8Array(buffer, b.byteOffset ?? 0, b.byteLength);
        });

        const accessors = (gltf.accessors ?? []).map(a => {
            const buffer_view = buffer_views[a.bufferView ?? 0];
            switch (a.componentType) {
                case GLDataType.FLOAT: return new Float32Array(buffer_view.buffer, (buffer_view.byteOffset ?? 0) + (a.byteOffset ?? 0), a.count * gltf_components_per_element[a.type ?? 'SCALAR']);
                case GLDataType.UNSIGNED_SHORT: return new Uint16Array(buffer_view.buffer, (buffer_view.byteOffset ?? 0) + (a.byteOffset ?? 0), a.count * gltf_components_per_element[a.type ?? 'SCALAR']);
                default: throw new Error(`unknown component type: ${GLDataType[a.componentType]}`);
            }
        });

        const default_material = create_lambertian(solid_color(1, 1, 1));

        const materials = (gltf.materials ?? []).map(m => {
            const color = m.pbrMetallicRoughness?.baseColorFactor ?? [1, 1, 1, 1];
            return create_lambertian(solid_color(color[0], color[1], color[2]));
        });

        const parse_indexed_primitive = (p: GLTF2.Primitive) => {
            const indices = accessors[p.indices!];
            const position_components = accessors[p.attributes.POSITION!];
            const positions = [];
            for (let i = 0; i < position_components.length; i += 3) {
                positions.push(vec3(
                    position_components[i],
                    position_components[i + 1],
                    position_components[i + 2],
                ));
            }
            const mode = p.mode ?? GLPrimitiveMode.TRIANGLES;
            if (mode !== GLPrimitiveMode.TRIANGLES) {
                throw new Error(`don't know how to parse primitive mode ${GLPrimitiveMode[mode]}`)
            }
            const triangles = [];
            const material = p.material === undefined ? default_material : materials[p.material];
            for (let i = 0; i < indices.length; i += 3) {
                const a = positions[indices[i]];
                const b = positions[indices[i + 1]];
                const c = positions[indices[i + 2]];

                triangles.push(new Triangle(a, b, c, material));
            }

            return new BVHNode(triangles, 0, 0);
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
                    hittables.push(new Transform(child_matrix, new HittableList(n.mesh)));
                }
                for (const child of n.children) {
                    collect_hittables(child, child_matrix);
                }
            };

            (s.nodes ?? []).forEach((n_index) => collect_hittables(nodes[n_index], mat3x4(1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0)));

            return new BVHNode(hittables, 0, 1);
        });

        return scenes[0];
    });
}
