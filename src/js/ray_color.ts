import { ray, Ray, ray_set } from './math/ray';
import {
    color,
    Color,
    point3, vec3,
    vec3_dot,
    vec3_muls_2, vec3_muls_3,
    vec3_mulv_3,
    vec3_mulv_addv_3,
    vec3_mulv_addv_4, vec3_sq_len,
    vec3_sub_2
} from './math/vec3';
import { create_empty_hit_record, HitRecord, Hittable } from './hittable/hittable';
import { BounceRecord, create_bounce_record } from './materials/megamaterial';
import { random_min_max } from './math/random';
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
        // console.log('background');
        return background;
    }
    const emitted = hit.material.emit(hit.material, r, hit);
    if (!hit.material.scatter(hit.material, r, hit, bounce)) {
        // console.log('no hit');
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
    const result = vec3_mulv_addv_3(bounce_color, vec3_muls_2(bounce.attenuation, pdf_factor), emitted);
    if (isNaN(result[0]) || isNaN(result[1]) || isNaN(result[2])) {
        console.log(
            pdf,
            bounce,
            pdf_factor,
            emitted
        );
        debugger;
        if (bounce.sampling_pdf === 0) {
            pdf.value(scattered.direction);
        }
    }
    return result;
}

export const ray_color_iterative = (r: Ray, background: Color, world: Hittable, lights: Hittable | null, depth: number): Color => {
    const total_emission = color(0, 0, 0);
    const total_attenuation = color(1, 1, 1);
    for (let i = 0; i < depth; i++) {
        if (!world.hit(r, 0.0001, Infinity, hit)) {
            vec3_mulv_addv_4(total_emission, total_attenuation, background, total_emission);
            break;
        }
        const emission = hit.material.emit(hit.material, r, hit);
        vec3_mulv_addv_4(total_emission, total_attenuation, emission, total_emission);
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

        vec3_mulv_3(total_attenuation, total_attenuation, vec3_muls_2(bounce.attenuation, pdf_factor));
        r = scattered;
    }
    return total_emission;
};
