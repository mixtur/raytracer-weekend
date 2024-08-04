import { create_empty_hit_record, create_hittable_type, Hittable, hittable_types, set_hit_r } from './hittable';
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

const speculative_hit = create_empty_hit_record()
hittable_types.alpha_blend = create_hittable_type({
    hit: (hittable, r, t_min, t_max, hit) => {
        const alpha_blend = hittable as IAlphaBlend;

        const hit_result = hittable_types[alpha_blend.hittable.type].hit(alpha_blend.hittable, r, t_min, t_max, speculative_hit);
        if (hit_result === false) {
            return false;
        }

        const uv = update_uv(speculative_hit);
        const alpha = texture_get_value[alpha_blend.alpha_texture.type](alpha_blend.alpha_texture, uv[0], uv[1], speculative_hit.p)[0];

        if (Math.random() < alpha) {
            set_hit_r(hit, speculative_hit);
            return true;
        }
        return false;
    },

    get_bounding_box: (hittable, time0, time1, aabb) => {
        const alpha_blend = hittable as IAlphaBlend;
        hittable_types[alpha_blend.hittable.type].get_bounding_box(alpha_blend.hittable, time0, time1, aabb);
    }
})
