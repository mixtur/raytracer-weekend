import { set_vec3, Vec3, vec3_dirty } from './math/vec3.gen';
import { HitRecord } from './hittable/hittable';
import { interpolate_vec2_r } from './hittable/triangle';

//todo: vec2
const uv = vec3_dirty();
const barycentric_weights = vec3_dirty();
export const update_uv = (hit: HitRecord): Vec3 => {
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
