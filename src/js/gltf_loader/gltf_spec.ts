import { GLDataType, GLPrimitiveMode, GLTextureFilter, GLVertexBufferTarget, GLWrappingMode } from './gl_types';

/**
 * https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#properties-reference
 */
export namespace GLTF2 {
    export interface Entity {
        /** Application-specific data. */
        extras?: Record<string, unknown>;
        /** Dictionary object with extension-specific objects. */
        extensions?: Record<string, unknown>;
    }

    /**
     * A typed view into a bufferView. A bufferView contains raw binary data.
     * An accessor provides a typed view into a bufferView or a subset of a bufferView similar to how WebGL's `vertexAttribPointer()` defines an attribute in a buffer.
     * https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#reference-accessor
     */
    export interface Accessor extends Entity {
        /** The index of the bufferView. */
        bufferView?: number;
        /** The offset relative to the start of the bufferView in bytes. (default: `0`) */
        byteOffset?: number;
        /** The datatype of components in the attribute. */
        componentType: GLDataType;
        /** Specifies whether integer data values should be normalized. (default: `false`) */
        normalized?: boolean;
        /** The number of attributes referenced by this accessor. */
        count: number;
        /** Specifies if the attribute is a scalar, vector, or matrix. */
        type?: AccessorType;
        /** Maximum value of each component in this attribute. Required for `POSITION` accessor. */
        max?: Array<number>;
        /** Minimum value of each component in this attribute. Required for `POSITION` accessor. */
        min?: Array<number>;
        /** Sparse storage of attributes that deviate from their initialization value. */
        sparse?: Sparce;
        /** The user-defined name of this object. */
        name?: string;
    }

    export type AccessorType = 'SCALAR' | 'VEC2' | 'VEC3' | 'VEC4' | 'MAT2' | 'MAT3' | 'MAT4';

    /**
     * Sparse storage of attributes that deviate from their initialization value.
     * https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#reference-sparse
     */
    export interface Sparce extends Entity {
        /** Number of entries stored in the sparse array. */
        count: number;
        /** Index array of size count that points to those accessor attributes that deviate from their initialization value. Indices must strictly increase. */
        indices: SparceIndices;
        /** Array of size count times number of components, storing the displaced accessor attributes pointed by indices. Substituted values must have the same componentType and number of components as the base accessor. */
        values: SparceValues;
    }

    /**
     * Indices of those attributes that deviate from their initialization value.
     * https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#reference-indices
     */
    export interface SparceIndices extends Entity {
        /** The index of the bufferView with sparse indices. Referenced bufferView can't have ARRAY_BUFFER or ELEMENT_ARRAY_BUFFER target. */
        bufferView: number;
        /** The offset relative to the start of the bufferView in bytes. Must be aligned. (default: `0`) */
        byteOffset?: number;
        /** The datatype of components in the attribute. */
        componentType: GLDataType;
    }

    /**
     * Array of size `accessor.sparse.count` times number of components storing the displaced accessor attributes pointed by `accessor.sparse.indices`.
     * https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#reference-values
     */
    export interface SparceValues extends Entity {
        /** The index of the bufferView with sparse values. Referenced bufferView can't have ARRAY_BUFFER or ELEMENT_ARRAY_BUFFER target. */
        bufferView: number;
        /** The offset relative to the start of the bufferView in bytes. Must be aligned. (default: `0`) */
        byteOffset?: number;
    }

    /**
     * A keyframe animation.
     * https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#reference-animation
     */
    export interface Animation extends Entity {
        /**
         * An array of channels, each of which targets an animation's sampler at a node's property.
         * Different channels of the same animation can't have equal targets.
         */
        channels: Array<AnimationChannel>;
        /** An array of samplers that combines input and output accessors with an interpolation algorithm to define a keyframe graph (but not its target). */
        samplers: Array<AnimationSampler>;
        /** The user-defined name of this object. */
        name?: string;
    }

    /**
     * Combines input and output accessors with an interpolation algorithm to define a keyframe graph (but not its target).
     * https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#reference-animation-sampler
     */
    export interface AnimationSampler extends Entity {
        /** The index of an accessor containing keyframe input values, e.g., time. */
        input: number;
        /** Interpolation algorithm. (default: `"LINEAR"`) */
        interpolation?: AnimationInterpolation;
        /** The index of an accessor, containing keyframe output values. */
        output: number;
    }

    /**
     * Interpolation algorithm.
     *
     * - "LINEAR" The animated values are linearly interpolated between keyframes. When targeting a rotation, spherical linear interpolation (slerp) should be used to interpolate quaternions. The number output of elements must equal the number of input elements.
     * - "STEP" The animated values remain constant to the output of the first keyframe, until the next keyframe. The number of output elements must equal the number of input elements.
     * - "CUBICSPLINE" The animation's interpolation is computed using a cubic spline with specified tangents. The number of output elements must equal three times the number of input elements. For each input element, the output stores three elements, an in-tangent, a spline vertex, and an out-tangent. There must be at least two keyframes when using this interpolation.
     */
    export type AnimationInterpolation = 'LINEAR' | 'STEP' | 'CUBICSPLINE';

    /**
     * Targets an animation's sampler at a node's property.
     * https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#reference-channel
     */
    export interface AnimationChannel extends Entity {
        /** The index of a sampler in this animation used to compute the value for the target. */
        sampler: number;
        /** The index of the node and TRS property to target. */
        target: AnimationTarget;
    }

    /**
     * The index of the node and TRS property that an animation channel targets.
     * https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#reference-target
     */
    export interface AnimationTarget extends Entity {
        /** The index of the node to target. */
        node?: number;
        /**
         * The name of the node's TRS property to modify, or the "weights" of the Morph Targets it instantiates.
         * For the "translation" property, the values that are provided by the sampler are the translation along the x, y, and z axes.
         * For the "rotation" property, the values are a quaternion in the order (x, y, z, w), where w is the scalar.
         * For the "scale" property, the values are the scaling factors along the x, y, and z axes.
         */
        path: AnimationTargetPath;
    }

    export type AnimationTargetPath = 'translation' | 'rotation' | 'scale' | 'weights';

    /**
     * Metadata about the glTF asset.
     * https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#reference-asset
     */
    export interface Asset extends Entity {
        /** A copyright message suitable for display to credit the content creator. */
        copyright?: string;
        /** Tool that generated this glTF model. Useful for debugging. */
        generator?: string;
        /** The glTF version that this asset targets. */
        version: string;
        /** The minimum glTF version that this asset targets. */
        minVersion?: string;
    }

    /**
     * A buffer points to binary geometry, animation, or skins.
     * https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#reference-buffer
     */
    export interface Buffer extends Entity {
        /** The uri of the buffer. */
        uri?: string;
        /** The length of the buffer in bytes. */
        byteLength: number;
        /** The user-defined name of this object. */
        name?: string;
    }

    export type BufferViewTarget = GLVertexBufferTarget.ARRAY_BUFFER | GLVertexBufferTarget.ELEMENT_ARRAY_BUFFER;

    /**
     * A view into a buffer generally representing a subset of the buffer.
     * https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#reference-bufferview
     */
    export interface BufferView extends Entity {
        /** The index of the buffer. */
        buffer: number;
        /** The offset into the buffer in bytes. (default: `0`) */
        byteOffset?: number;
        /** The length of the bufferView in bytes. */
        byteLength: number;
        /** The stride, in bytes. */
        byteStride?: number;
        /** The target that the GPU buffer should be bound to. (`34962` ARRAY_BUFFER or `34963` ELEMENT_ARRAY_BUFFER) */
        target?: BufferViewTarget;
        /** The user-defined name of this object. */
        name?: string;
    }

    /**
     * A camera's projection. A node can reference a camera to apply a transform to place the camera in the scene.
     * https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#reference-camera
     */
    export interface Camera extends Entity {
        /** An orthographic camera containing properties to create an orthographic projection matrix. */
        orthographic?: CameraOrthographic;
        /** A perspective camera containing properties to create a perspective projection matrix. */
        perspective?: CameraPerspective;
        /** Specifies if the camera uses a perspective or orthographic projection. */
        type: 'perspective' | 'orthographic';
        /** The user-defined name of this object. */
        name?: string;
    }

    /**
     * An orthographic camera containing properties to create an orthographic projection matrix.
     * https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#reference-orthographic
     */
    export interface CameraOrthographic extends Entity {
        /** The floating-point horizontal magnification of the view. Must not be zero. */
        xmag: number;
        /** The floating-point vertical magnification of the view. Must not be zero. */
        ymag: number;
        /** The floating-point distance to the far clipping plane. `zfar` must be greater than `znear`. */
        zfar: number;
        /** The floating-point distance to the near clipping plane. */
        znear: number;
    }

    /**
     * A perspective camera containing properties to create a perspective projection matrix.
     * https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#reference-perspective
     */
    export interface CameraPerspective extends Entity {
        /** The floating-point aspect ratio of the field of view. */
        aspectRatio?: number;
        /** The floating-point vertical field of view in radians. */
        yfov: number;
        /** The floating-point distance to the far clipping plane. */
        zfar?: number;
        /** The floating-point distance to the near clipping plane. */
        znear: number;
    }

    /**
     * Image data used to create a texture. Image can be referenced by URI or {@link BufferView} index.
     * `mimeType` is required in the latter case.
     * https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#reference-image
     */
    export interface Image extends Entity {
        /** The uri of the image. */
        uri?: string;
        /** The image's MIME type. Required if bufferView is defined. */
        mimeType?: ImageMimeType;
        /** The index of the bufferView that contains the image. Use this instead of the image's uri property. */
        bufferView?: number;
        /** The user-defined name of this object. */
        name?: string;
    }

    export type ImageMimeType = 'image/jpeg' | 'image/png';

    /**
     * The material appearance of a primitive.
     * https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#reference-material
     */
    export interface Material extends Entity {
        /** The user-defined name of this object. */
        name?: string;
        /**
         * A set of parameter values that are used to define the metallic-roughness material model from Physically-Based Rendering (PBR) methodology.
         * When not specified, all the default values of {@link PBRMetallicRoughness | pbrMetallicRoughness} apply.
         */
        pbrMetallicRoughness?: PBRMetallicRoughness;
        /** The normal map texture. */
        normalTexture?: NormalTextureInfo;
        /** The occlusion map texture. */
        occlusionTexture?: OcclusionTextureInfo;
        /** The emissive map texture. */
        emissiveTexture?: TextureInfo;
        /** The emissive color of the material. (default: `[0, 0, 0]`) */
        emissiveFactor?: [number, number, number];
        /** The alpha rendering mode of the material. (default: `"OPAQUE"`) */
        alphaMode?: AlphaMode;
        /** The alpha cutoff value of the material. (default: `0.5`) */
        alphaCutoff?: number;
        /** Specifies whether the material is double sided. (default: `false`) */
        doubleSided?: boolean;
    }

    export type AlphaMode = 'OPAQUE' | 'MASK' | 'BLEND';

    /**
     * Reference to a normal map texture.
     * https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#reference-normaltextureinfo
     */
    export interface NormalTextureInfo extends TextureInfo {
        /** The scalar multiplier applied to each normal vector of the normal texture. (default: `1`) */
        scale?: number;
    }

    /**
     * Reference to a occlusion map texture.
     * https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#reference-occlusiontextureinfo
     */
    export interface OcclusionTextureInfo extends TextureInfo {
        /** A scalar multiplier controlling the amount of occlusion applied. (default: `1`) */
        strength?: number;
    }

    /**
     * Reference to a texture.
     * https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#reference-textureinfo
     */
    export interface TextureInfo extends Entity {
        /** The index of the texture. */
        index: number;
        /** The set index of texture's TEXCOORD attribute used for texture coordinate mapping. (default: `0`) */
        texCoord?: number;
    }

    /**
     * A set of parameter values that are used to define the metallic-roughness material model from Physically-Based Rendering (PBR) methodology.
     * https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#reference-pbrmetallicroughness
     */
    export interface PBRMetallicRoughness extends Entity {
        /** The material's base color factor. (default: `[1, 1, 1, 1]`) */
        baseColorFactor?: [number, number, number, number];
        /** The base color texture. */
        baseColorTexture?: TextureInfo;
        /** The metalness of the material. (default: `1`) */
        metallicFactor?: number;
        /** The roughness of the material. (default: `1`) */
        roughnessFactor?: number;
        /** The metallic-roughness texture. */
        metallicRoughnessTexture?: TextureInfo;
    }

    /**
     * A texture and its sampler.
     * https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#reference-texture
     */
    export interface Texture extends Entity {
        /** The index of the sampler used by this texture. When undefined, a sampler with repeat wrapping and auto filtering should be used. */
        sampler?: number;
        /**
         * The index of the image used by this texture.
         * When undefined, it is expected that an extension or other mechanism will supply an alternate texture source,
         * otherwise behavior is undefined.
         * */
        source?: number;
        /** The user-defined name of this object. */
        name?: string;
    }

    /**
     * Texture sampler properties for filtering and wrapping modes.
     * https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#reference-sampler
     */
    export interface Sampler extends Entity {
        /** Magnification filter. */
        magFilter?: GLTextureFilter;
        /** Minification filter. */
        minFilter?: GLTextureFilter;
        /** s wrapping mode. (default: `10497` - REPEAT) */
        wrapS?: GLWrappingMode;
        /** t wrapping mode. (default: `10497` - REPEAT) */
        wrapT?: GLWrappingMode;
        /** The user-defined name of this object. */
        name?: string;
    }

    /**
     * A set of primitives to be rendered. A node can contain one mesh. A node's transform places the mesh in the scene.
     * https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#reference-mesh
     */
    export interface Mesh extends Entity {
        /** An array of primitives, each defining geometry to be rendered with a material. */
        primitives: Array<Primitive>;
        /** Array of weights to be applied to the Morph Targets. */
        weights?: Array<number>;
        /** The user-defined name of this object. */
        name?: string;
    }

    /**
     * Geometry to be rendered with the given material.
     * https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#reference-primitive
     */
    export interface Primitive extends Entity {
        /** A dictionary object, where each key corresponds to mesh attribute semantic and each value is the index of the accessor containing attribute's data. */
        attributes: Record<string, number>;
        /** The index of the accessor that contains the indices. */
        indices?: number;
        /** The index of the material to apply to this primitive when rendering. */
        material?: number;
        /** The type of primitives to render. (default: `4` - TRIANGLES) */
        mode?: GLPrimitiveMode;
        /**
         * An array of Morph Targets, each Morph Target is a dictionary mapping attributes
         * (only POSITION, NORMAL, and TANGENT supported) to their deviations in the Morph Target.
         */
        targets?: Array<MorphTarget>;
    }

    export interface MorphTarget {
        NORMAL?: number;
        POSITION?: number;
        TANGENT?: number;
    }

    /**
     * A node in the node hierarchy. When the node contains {@link Skin}, all mesh.primitives must contain JOINTS_0 and WEIGHTS_0 attributes.
     * A node can have either a matrix or any combination of `translation/rotation/scale` (TRS) properties.
     * TRS properties are converted to matrices and postmultiplied in the `T * R * S` order to compose the transformation matrix; first the scale is applied to the vertices, then the rotation, and then the translation.
     * If none are provided, the transform is the identity. When a node is targeted for animation (referenced by an animation.channel.target), only TRS properties may be present; `matrix` will not be present.
     * https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#reference-node
     */
    export interface Node extends Entity {
        /** The index of the camera referenced by this node. */
        camera?: number;
        /** The indices of this node's children. */
        children?: Array<number>;
        /** The index of the skin referenced by this node. */
        skin?: number;
        /** A floating-point 4x4 transformation matrix stored in column-major order. (default: `[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]`) */
        matrix?: [
            number, number, number, number,
            number, number, number, number,
            number, number, number, number,
            number, number, number, number,
        ];
        /** The index of the mesh in this node. */
        mesh?: number;
        /** The node's unit quaternion rotation in the order (x, y, z, w), where w is the scalar. (default: `[0, 0, 0, 1]`) */
        rotation?: [number, number, number, number];
        /** The node's non-uniform scale, given as the scaling factors along the x, y, and z axes. (default: `[1, 1, 1]`) */
        scale?: [number, number, number];
        /** The node's translation along the x, y, and z axes. (default: `[0, 0, 0]`) */
        translation?: [number, number, number];
        /** The weights of the instantiated Morph Target. Number of elements must match number of Morph Targets of used mesh. */
        weights?: Array<number>;
        /** The user-defined name of this object. */
        name?: string;
    }

    /**
     * The root nodes of a scene.
     * https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#reference-scene
     */
    export interface Scene extends Entity {
        /** The indices of each root node. */
        nodes?: Array<number>;
        /** The user-defined name of this object. */
        name?: string;
    }

    /**
     * Joints and matrices defining a skin.
     * https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#reference-skin
     */
    export interface Skin extends Entity {
        /**
         * The index of the accessor containing the floating-point 4x4 inverse-bind matrices.
         * The default is that each matrix is a 4x4 identity matrix, which implies that inverse-bind matrices were pre-applied.
         */
        inverseBindMatrices?: number;
        /** The index of the node used as a skeleton root. */
        skeleton?: number;
        /** Indices of skeleton nodes, used as joints in this skin. */
        joints: Array<number>;
        /** The user-defined name of this object. */
        name?: string;
    }

    /**
     * The root object for a glTF asset.
     * https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#reference-gltf
     */
    export interface Root extends Entity {
        /** Names of glTF extensions used somewhere in this asset. */
        extensionsUsed?: Array<string>;
        /** Names of glTF extensions required to properly load this asset. */
        extensionsRequired?: Array<string>;
        /** An array of accessors. */
        accessors?: Array<Accessor>;
        /** An array of keyframe animations. */
        animations?: Array<Animation>;
        /** Metadata about the glTF asset. */
        asset: Asset;
        /** An array of buffers. */
        buffers?: Array<Buffer>;
        /** An array of bufferViews. */
        bufferViews?: Array<BufferView>;
        /** An array of cameras. */
        cameras?: Array<Camera>;
        /** An array of images. */
        images?: Array<Image>;
        /** An array of materials. */
        materials?: Array<Material>;
        /** An array of meshes. */
        meshes?: Array<Mesh>;
        /** An array of nodes. */
        nodes?: Array<Node>;
        /** An array of samplers. */
        samplers?: Array<Sampler>;
        /** The index of the default scene. */
        scene?: number;
        /** An array of scenes. */
        scenes?: Array<Scene>;
        /** An array of skins. */
        skins?: Array<Skin>;
        /** An array of textures. */
        textures?: Array<Texture>;
    }
}
