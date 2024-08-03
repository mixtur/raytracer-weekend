import { create_hittable_type, Hittable, hittable_types } from './hittable';
import { Texture, texture_get_value } from '../texture/texture';
import { update_uv } from '../uv';

export interface IAlphaBlend extends Hittable {
    type: 'alpha_blend',
    hittable: Hittable,
    alpha_texture: Texture
}

export const create_alpha_blend = (hittable: Hittable, alpha_texture: Texture): IAlphaBlend => {
    return {
        type: 'alpha_blend',
        hittable,
        alpha_texture
    };
}

hittable_types.alpha_blend = create_hittable_type({
    hit: (hittable, r, t_min, t_max, hit) => {
        const alpha_blend = hittable as IAlphaBlend;

        const hit_result = hittable_types[alpha_blend.hittable.type].hit(alpha_blend.hittable, r, t_min, t_max, hit);
        if (hit_result === false) {
            return false;
        }

        const uv = update_uv(hit);
        const alpha = texture_get_value[alpha_blend.alpha_texture.type](alpha_blend.alpha_texture, uv[0], uv[1], hit.p)[0];

        return Math.random() < alpha;
    },

    get_bounding_box: (hittable, time0, time1, aabb) => {
        const alpha_blend = hittable as IAlphaBlend;
        hittable_types[alpha_blend.hittable.type].get_bounding_box(alpha_blend.hittable, time0, time1, aabb);
    }
})
