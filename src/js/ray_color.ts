import { ray, Ray, ray_set } from './math/ray';
import { color, Color, fma_vec3, fma_vec3_r, mul_vec3_r, mul_vec3_s, vec3, } from './math/vec3.gen';
import { create_empty_hit_record, HitRecord, Hittable } from './hittable/hittable';
import { BounceRecord, create_bounce_record } from './materials/megamaterial';
import { HittablePDF, MixturePDF } from './math/pdf';

const hit = create_empty_hit_record();
const bounce = create_bounce_record();
const hit_stack: HitRecord[] = [];
const bounce_stack: BounceRecord[] = [];
for (let i = 0; i < 100; i++) {
    hit_stack.push(create_empty_hit_record());
    bounce_stack.push(create_bounce_record());
}
const scattered = ray(vec3(0, 0, 0), vec3(0, 0, 0), 0);

const light_pdf = new HittablePDF();
const mix_pdf = new MixturePDF();

export const ray_color = (r: Ray, background: Color, world: Hittable, lights: Hittable | null, depth: number): Color => {
    const hit = hit_stack[depth];
    const bounce = bounce_stack[depth];
    if (depth <= 0) {
        return color(0, 0, 0);
    }
    if (!world.hit(r, 0.0001, Infinity, hit)) {
        return background;
    }
    const emitted = hit.material.emit(hit.material, r, hit);
    if (!hit.material.scatter(hit.material, r, hit, bounce)) {
        return emitted;
    }

    let pdf = bounce.scatter_pdf;
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
        bounce.sampling_pdf = pdf.value(scattered.direction);

        pdf_factor = hit.material.scattering_pdf.value(scattered.direction) / bounce.sampling_pdf;
    }

    const bounce_color = ray_color(scattered, background, world, lights, depth - 1);
    return fma_vec3(bounce_color, mul_vec3_s(bounce.attenuation, pdf_factor), emitted);
}

export const ray_color_iterative = (r: Ray, background: Color, world: Hittable, lights: Hittable | null, depth: number): Color => {
    const total_emission = color(0, 0, 0);
    const total_attenuation = color(1, 1, 1);
    for (let i = 0; i < depth; i++) {
        if (!world.hit(r, 0.0001, Infinity, hit)) {
            fma_vec3_r(total_emission, total_attenuation, background, total_emission);
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
            let pdf = bounce.scatter_pdf;
            if (lights !== null) {
                light_pdf.hittable = lights;
                light_pdf.origin = hit.p;
                mix_pdf.pdf1 = light_pdf;
                mix_pdf.pdf2 = pdf;
                pdf = mix_pdf;
            }

            ray_set(scattered, hit.p, pdf.generate(), r.time);
            bounce.sampling_pdf = pdf.value(scattered.direction);

            pdf_factor = hit.material.scattering_pdf.value(scattered.direction) / bounce.sampling_pdf;
        }

        mul_vec3_r(total_attenuation, total_attenuation, mul_vec3_s(bounce.attenuation, pdf_factor));
        r = scattered;
    }
    return total_emission;
};
