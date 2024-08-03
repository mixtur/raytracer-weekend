import { GLDataType } from './gl_types';
import { GLTF2 } from './gltf_spec';

export const gltf_components_per_element = {
    SCALAR: 1,
    VEC2: 2,
    VEC3: 3,
    VEC4: 4,
    MAT2: 4,
    MAT3: 9,
    MAT4: 16
}

export interface AccessorParserContext {
    buffer_views: Uint8Array[]
}

export const create_accessor_parser = ({ buffer_views }: AccessorParserContext) => (a: GLTF2.Accessor) => {
    const buffer_view = buffer_views[a.bufferView ?? 0];
    switch (a.componentType) {
        case GLDataType.FLOAT:
            return new Float32Array(buffer_view.buffer, (buffer_view.byteOffset ?? 0) + (a.byteOffset ?? 0), a.count * gltf_components_per_element[a.type ?? 'SCALAR']);
        case GLDataType.UNSIGNED_BYTE:
            return new Uint8Array(buffer_view.buffer, (buffer_view.byteOffset ?? 0) + (a.byteOffset ?? 0), a.count * gltf_components_per_element[a.type ?? 'SCALAR']);
        case GLDataType.UNSIGNED_SHORT:
            return new Uint16Array(buffer_view.buffer, (buffer_view.byteOffset ?? 0) + (a.byteOffset ?? 0), a.count * gltf_components_per_element[a.type ?? 'SCALAR']);
        case GLDataType.UNSIGNED_INT:
            return new Uint32Array(buffer_view.buffer, (buffer_view.byteOffset ?? 0) + (a.byteOffset ?? 0), a.count * gltf_components_per_element[a.type ?? 'SCALAR']);
        default:
            throw new Error(`unknown component type: ${GLDataType[a.componentType]}`);
    }
}
