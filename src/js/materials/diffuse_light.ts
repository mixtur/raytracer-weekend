import { Texture, texture_get_value } from '../texture/texture';
import { create_mega_material, EmitFunction, MegaMaterial, ScatterFunction } from './megamaterial';
import { color } from '../math/vec3.gen';

export const diffuse_light_scatter: ScatterFunction = () => false;
export const black = color(0, 0, 0);
export const diffuse_light_emit: EmitFunction = (mat, r_in, hit) => {
    if (hit.front_face) {
        return texture_get_value[mat.emissive.type](mat.emissive, hit.u, hit.v, hit.p);
    }
    return black;
}

export const create_diffuse_light = (emissive: Texture): MegaMaterial => create_mega_material({
    scatter: diffuse_light_scatter,
    emit: diffuse_light_emit,
    emissive
});
