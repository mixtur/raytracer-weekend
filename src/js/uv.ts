import { set_vec3, Vec2, vec2_dirty, vec3_dirty } from './math/vec.gen';
import { HitRecord } from './hittable/hittable';
import { interpolate_vec2_r } from './hittable/triangle';

const uv = vec2_dirty();
const barycentric_weights = vec3_dirty();
export const update_uv = (hit: HitRecord): Vec2 => {
    const { u, v } = hit;
    if (hit.tex_channels.length > 0) {
        //todo: un-hardcode tex channel
        set_vec3(barycentric_weights, 1 - u - v, u, v);
        interpolate_vec2_r(uv, barycentric_weights, hit.tex_channels[0]);
    } else {
        uv[0] = u;
        uv[1] = v;
    }

    return uv;
}
