import { create_empty_hit_record, create_hittable_type, Hittable, hittable_types, set_hit_r } from './hittable';
import { Texture, texture_get_value } from '../texture/texture';
import { update_uv } from '../uv';

export interface IAlphaMask extends Hittable {
    type: 'alpha_mask',
    hittable: Hittable,
    alpha_texture: Texture,
    cut_off: number
}

export const create_alpha_mask = (hittable: Hittable, alpha_texture: Texture, cut_off: number): IAlphaMask => {
    return {
        type: 'alpha_mask',
        hittable,
        alpha_texture,
        cut_off
    };
}

const speculative_hit = create_empty_hit_record()
hittable_types.alpha_mask = create_hittable_type({
    hit: (hittable, r, t_min, t_max, hit) => {
        const alpha_mask = hittable as IAlphaMask;

        const hit_result = hittable_types[alpha_mask.hittable.type].hit(alpha_mask.hittable, r, t_min, t_max, speculative_hit);
        if (hit_result === false) {
            return false;
        }

        const uv = update_uv(speculative_hit);
        const alpha = texture_get_value[alpha_mask.alpha_texture.type](alpha_mask.alpha_texture, uv[0], uv[1], speculative_hit.p)[0];

        if (alpha_mask.cut_off < alpha) {
            set_hit_r(hit, speculative_hit);
            return true;
        }
        return false;
    },

    get_bounding_box: (hittable, time0, time1, aabb) => {
        const alpha_blend = hittable as IAlphaMask;
        hittable_types[alpha_blend.hittable.type].get_bounding_box(alpha_blend.hittable, time0, time1, aabb);
    }
})
