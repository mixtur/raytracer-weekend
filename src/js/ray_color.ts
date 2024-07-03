import { ray_dirty, Ray, ray_set } from './math/ray';
import { color, Color, fma_vec3, fma_vec3_r, mul_vec3_r, mul_vec3_s, mul_vec3_s_r, vec3, } from './math/vec3.gen';
import { create_empty_hit_record, HitRecord, Hittable } from './hittable/hittable';
import { BounceRecord, create_bounce_record } from './materials/megamaterial';
import { HittablePDF, MixturePDF } from './math/pdf';

const hit = create_empty_hit_record();
const bounce = create_bounce_record();
const hit_stack: HitRecord[] = [];
const bounce_stack: BounceRecord[] = [];
const ray_stack: Ray[] = [];
for (let i = 0; i < 100; i++) {
    hit_stack.push(create_empty_hit_record());
    bounce_stack.push(create_bounce_record());
    ray_stack.push(ray_dirty());
}

const light_pdf = new HittablePDF();
const mix_pdf = new MixturePDF();

export const ray_color = (r: Ray, background: Hittable, world: Hittable, lights: Hittable | null, depth: number): Color => {
    const scattered = ray_stack[depth];
    const hit = hit_stack[depth];
    const bounce = bounce_stack[depth];
    if (depth <= 0) {
        return color(0, 0, 0);
    }
    if (!world.hit(r, 0.0001, Infinity, hit)) {
        if (!background.hit(r, 0.0001, Infinity, hit)) {
            return color(0, 0, 0);
        }
    }
    const emitted = hit.material.emit(hit.material, r, hit);
    if (!hit.material.scatter(hit.material, r, hit, bounce)) {
        return emitted;
    }

    let pdf = hit.material.scattering_pdf;
    let pdf_factor = 1;
    if (bounce.skip_pdf) {
        ray_set(scattered, bounce.skip_pdf_ray.origin, bounce.skip_pdf_ray.direction, bounce.skip_pdf_ray.time);
    } else {
        if (lights !== null) {
            light_pdf.hittable = lights;
            light_pdf.origin = hit.p;
            mix_pdf.pdf1 = light_pdf;
            mix_pdf.pdf2 = pdf;
            pdf = mix_pdf;
        }

        ray_set(scattered, hit.p, pdf.generate(), r.time);

        if (pdf !== hit.material.scattering_pdf) {
            pdf_factor = hit.material.scattering_pdf.value(scattered.direction) / pdf.value(scattered.direction);
        }
    }

    hit.material.attenuate(hit.material, r, hit, bounce, scattered);
    mul_vec3_s_r(bounce.attenuation, bounce.attenuation, pdf_factor);

    const bounce_color = ray_color(scattered, background, world, lights, depth - 1);
    return fma_vec3(bounce_color, bounce.attenuation, emitted);
}

export const ray_color_iterative = (r: Ray, background: Hittable, world: Hittable, lights: Hittable | null, depth: number): Color => {
    const scattered = ray_stack[0];
    const total_emission = color(0, 0, 0);
    const total_attenuation = color(1, 1, 1);
    for (let i = 0; i < depth; i++) {
        if (!world.hit(r, 0.0001, Infinity, hit) && !background.hit(r, 0.0001, Infinity, hit)) {
            fma_vec3_r(total_emission, total_attenuation, color(0, 0, 0), total_emission);
            break;
        }
        const emission = hit.material.emit(hit.material, r, hit);
        fma_vec3_r(total_emission, total_attenuation, emission, total_emission);
        if (!hit.material.scatter(hit.material, r, hit, bounce)) {
            break;
        }

        let pdf_factor = 1;
        if (bounce.skip_pdf) {
            ray_set(scattered, bounce.skip_pdf_ray.origin, bounce.skip_pdf_ray.direction, bounce.skip_pdf_ray.time);
        } else {
            let pdf = hit.material.scattering_pdf;
            if (lights !== null) {
                light_pdf.hittable = lights;
                light_pdf.origin = hit.p;
                mix_pdf.pdf1 = light_pdf;
                mix_pdf.pdf2 = pdf;
                pdf = mix_pdf;
            }

            ray_set(scattered, hit.p, pdf.generate(), r.time);

            pdf_factor = hit.material.scattering_pdf.value(scattered.direction) / pdf.value(scattered.direction);
        }

        hit.material.attenuate(hit.material, r, hit, bounce, scattered);

        mul_vec3_r(total_attenuation, total_attenuation, mul_vec3_s(bounce.attenuation, pdf_factor));
        ray_set(r, scattered.origin, scattered.direction, scattered.time);
    }
    return total_emission;
};
