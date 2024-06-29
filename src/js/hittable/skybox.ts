import { HitRecord, Hittable } from './hittable';
import { Ray, ray_at3 } from '../math/ray';
import { MegaMaterial } from '../materials/megamaterial';
import { negate_vec3_r, unit_vec3, Vec3 } from '../math/vec3.gen';
import { AABB } from './aabb';
import { create_diffuse_light } from '../materials/diffuse_light';
import { solid_color } from '../texture/solid_color';
import { HDRPixelsData } from '../texture/image-parsers/types';
import { ImageTexture } from '../texture/image_texture';
import { PDF, SpherePDF } from '../math/pdf';
import { create_image_based_importance_sampler } from '../texture/image-based-importance-sampler';

export class Skybox extends Hittable {
    static create_white(): Skybox {
        return new Skybox(create_diffuse_light(solid_color(1, 1, 1)), new SpherePDF())
    }

    static create_black(): Skybox {
        return new Skybox(create_diffuse_light(solid_color(0, 0, 0)), new SpherePDF())
    }

    static create_solid(r: number, g: number, b: number): Skybox {
        return new Skybox(create_diffuse_light(solid_color(r, g, b)), new SpherePDF())
    }

    static create(image: HDRPixelsData): Skybox {
        return new Skybox(create_diffuse_light(new ImageTexture(image)), create_image_based_importance_sampler(image));
    }

    material: MegaMaterial;
    pdf: PDF;

    // assuming diffuse_light
    constructor(material: MegaMaterial, pdf: PDF) {
        super();
        this.material = material;
        this.pdf = pdf;
    }

    hit(r: Ray, _t_min: number, t_max: number, hit: HitRecord): boolean {
        const unit_dir = unit_vec3(r.direction);

        const x = unit_dir[0];
        const y = unit_dir[1];
        const z = unit_dir[2];

        const theta = Math.acos(y);//0..pi
        const phi = Math.atan2(z, x);//-pi..pi

        hit.u = (phi / Math.PI + 1) / 2;
        hit.v = theta / Math.PI;
        hit.t = t_max;
        hit.material = this.material;
        negate_vec3_r(hit.normal, unit_dir);
        ray_at3(hit.p, r, t_max);
        hit.front_face = true;

        return true;
    }

    get_bounding_box(time0: number, time1: number, aabb: AABB) {
        aabb.min.fill(-Infinity);
        aabb.max.fill(Infinity);
    }

    random(_origin: Vec3): Vec3 {
        return this.pdf.generate();
    }

    pdf_value(_origin: Vec3, direction: Vec3): number {
        return this.pdf.value(direction);
    }
}
