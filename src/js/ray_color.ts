import { ray_dirty, Ray, ray_set } from './math/ray';
import { color, Color, fma_vec3, fma_vec3_r, mul_vec3_r, mul_vec3_s, mul_vec3_s_r } from './math/vec3.gen';
import { Hittable, create_empty_hit_record, HitRecord, hittable_types } from './hittable/hittable';
import { BounceRecord, create_bounce_record, material_types } from './materials/megamaterial';
import { create_hittable_pdf, create_mixture_pdf, pdf_types } from './math/pdf';

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

const light_pdf = create_hittable_pdf();
const mix_pdf = create_mixture_pdf();

export const ray_color = (r: Ray, background: Hittable, world: Hittable, lights: Hittable | null, depth: number): Color => {
    const scattered = ray_stack[depth];
    const hit = hit_stack[depth];
    const bounce = bounce_stack[depth];
    if (depth <= 0) {
        return color(0, 0, 0);
    }
    if (!hittable_types[world.type].hit(world, r, 0.0001, Infinity, hit)) {
        if (!hittable_types[background.type].hit(background, r, 0.0001, Infinity, hit)) {
            return color(0, 0, 0);
        }
    }

    const material_type = material_types[hit.material.type];
    const emitted = material_type.emit(hit.material, r, hit);
    if (!material_type.scatter(hit.material, r, hit, bounce)) {
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

        ray_set(scattered, hit.p, pdf_types[pdf.type].generate(pdf), r.time);

        if (pdf === mix_pdf) {
            const scattering_pdf = hit.material.scattering_pdf;
            pdf_factor = pdf_types[scattering_pdf.type].value(scattering_pdf, scattered.direction) / pdf_types[pdf.type].value(pdf, scattered.direction);
        }
    }

    material_type.attenuate(hit.material, r, hit, bounce, scattered);
    mul_vec3_s_r(bounce.attenuation, bounce.attenuation, pdf_factor);

    const bounce_color = ray_color(scattered, background, world, lights, depth - 1);
    return fma_vec3(bounce_color, bounce.attenuation, emitted);
}

export const ray_color_iterative = (r: Ray, background: Hittable, world: Hittable, lights: Hittable | null, depth: number): Color => {
    const scattered = ray_stack[0];
    const total_emission = color(0, 0, 0);
    const total_attenuation = color(1, 1, 1);
    for (let i = 0; i < depth; i++) {
        if (!hittable_types[world.type].hit(world, r, 0.0001, Infinity, hit) && !hittable_types[background.type].hit(background, r, 0.0001, Infinity, hit)) {
            fma_vec3_r(total_emission, total_attenuation, color(0, 0, 0), total_emission);
            break;
        }
        const material_type = material_types[hit.material.type];
        const emission = material_type.emit(hit.material, r, hit);
        fma_vec3_r(total_emission, total_attenuation, emission, total_emission);
        if (!material_type.scatter(hit.material, r, hit, bounce)) {
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

            ray_set(scattered, hit.p, pdf_types[pdf.type].generate(pdf), r.time);

            const scattering_pdf = hit.material.scattering_pdf;
            pdf_factor = pdf_types[scattering_pdf.type].value(scattering_pdf, scattered.direction) / pdf_types[pdf.type].value(pdf, scattered.direction);
        }

        material_type.attenuate(hit.material, r, hit, bounce, scattered);

        mul_vec3_r(total_attenuation, total_attenuation, mul_vec3_s(bounce.attenuation, pdf_factor));
        ray_set(r, scattered.origin, scattered.direction, scattered.time);
    }
    return total_emission;
};
