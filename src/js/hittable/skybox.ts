import { Hittable, create_hittable_type, HitRecord, hittable_types } from './hittable';
import { Ray, ray_at_r } from '../math/ray';
import { MegaMaterial } from '../materials/megamaterial';
import { negate_vec3_r, unit_vec3, Vec3 } from '../math/vec3.gen';
import { AABB } from '../math/aabb';
import { create_diffuse_light } from '../materials/diffuse_light';
import { solid_color } from '../texture/solid_color';
import { PixelsData } from '../texture/image-parsers/types';
import { PDF, SpherePDF } from '../math/pdf';
import { create_image_based_importance_sampler } from '../math/image-based-importance-sampler';
import { GLWrappingMode } from '../gltf_loader/gl_types';
import { create_image_texture } from '../texture/image_texture';

export interface ISkybox extends Hittable {
    type: 'skybox';
    material: MegaMaterial;
    pdf: PDF;
}

export const create_skybox = (material: MegaMaterial, pdf: PDF): ISkybox => {
    return {
        type: 'skybox',
        // assuming diffuse_light
        material,
        pdf
    }
};

hittable_types.skybox = create_hittable_type({
    hit(hittable, r: Ray, _t_min: number, t_max: number, hit: HitRecord): boolean {
        const skybox = hittable as ISkybox;
        const unit_dir = unit_vec3(r.direction);

        const x = unit_dir[0];
        const y = unit_dir[1];
        const z = unit_dir[2];

        const theta = Math.acos(y);//0..pi
        const phi = Math.atan2(z, x);//-pi..pi

        hit.u = (phi / Math.PI + 1) / 2;
        hit.v = theta / Math.PI;
        hit.t = t_max;
        hit.material = skybox.material;
        negate_vec3_r(hit.normal, unit_dir);
        ray_at_r(hit.p, r, t_max);
        hit.front_face = true;

        return true;
    },

    get_bounding_box(hittable, time0: number, time1: number, aabb: AABB) {
        const skybox = hittable as ISkybox;
        aabb.min.fill(-Infinity);
        aabb.max.fill(Infinity);
    },

    random(hittable, _origin: Vec3): Vec3 {
        const skybox = hittable as ISkybox;
        return skybox.pdf.generate();
    },

    pdf_value(hittable, _origin: Vec3, direction: Vec3): number {
        const skybox = hittable as ISkybox;
        return skybox.pdf.value(direction);
    }
})

export class Skybox {
    static create_white(): ISkybox {
        return create_skybox(create_diffuse_light(solid_color(1, 1, 1)), new SpherePDF())
    }

    static create_black(): ISkybox {
        return create_skybox(create_diffuse_light(solid_color(0, 0, 0)), new SpherePDF())
    }

    static create_solid(r: number, g: number, b: number): ISkybox {
        return create_skybox(create_diffuse_light(solid_color(r, g, b)), new SpherePDF())
    }

    static create_hdr(image: PixelsData): ISkybox {
        return create_skybox(create_diffuse_light(create_image_texture(image, {
            filter: true,
            wrap_s: GLWrappingMode.REPEAT,
            wrap_t: GLWrappingMode.MIRRORED_REPEAT,
            flip_y: true
        })), create_image_based_importance_sampler(image));
    }
}
