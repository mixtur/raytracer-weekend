import { Ray, raySet } from './math/ray';
import {
    color,
    Color,
    point3,
    vec3Dot,
    vec3MulS2, vec3MulS3,
    vec3MulV3,
    vec3MulVAddV3,
    vec3MulVAddV4, vec3Set, vec3SqLen,
    vec3Sub2
} from './math/vec3';
import { createEmptyHitRecord, HitRecord, Hittable } from './hittable/hittable';
import { BounceRecord, createBounceRecord } from './materials/megamaterial';
import { randomMinMax } from './math/random';
import { CosinePDF, HemispherePDF, HittablePDF, MixturePDF, SpherePDF } from './math/pdf';

const hit = createEmptyHitRecord();
const bounce = createBounceRecord();
const hitStack: HitRecord[] = [];
const bounceStack: BounceRecord[] = [];
for (let i = 0; i < 100; i++) {
    hitStack.push(createEmptyHitRecord());
    bounceStack.push(createBounceRecord());
}
export const ray_color = (r: Ray, background: Color, world: Hittable, lights: Hittable, depth: number): Color => {
    const hit = hitStack[depth];
    const bounce = bounceStack[depth];
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

    vec3Set(emitted, 0, 0, 0);
    const light_pdf = new HittablePDF(lights, hit.p);
    const cosine_pdf = new CosinePDF(hit.normal);
    const mix_pdf = new MixturePDF(light_pdf, cosine_pdf);

    const pdf = mix_pdf;

    raySet(bounce.scattered, hit.p, pdf.generate(), r.time);
    bounce.sampling_pdf = pdf.value(bounce.scattered.direction);

    const pdfFactor = hit.material.scattering_pdf(r, hit, bounce.scattered) / bounce.sampling_pdf;

    const bounceColor = ray_color(bounce.scattered, background, world, lights, depth - 1);
    // vec3MulVAddV3 may not work because we can screw up the light source
    // if (Math.random() < 0.001) {
    //     console.log('ok', hit.material.scatter, hit.material.scattering_pdf(r, hit, bounce.scattered), bounce.sampling_pdf, emitted);
    // }
    return vec3MulVAddV3(bounceColor, vec3MulS2(bounce.attenuation, pdfFactor), emitted);
}

export const ray_color_iterative = (r: Ray, background: Color, world: Hittable, lights: Hittable, depth: number): Color => {
    const totalEmission = color(0, 0, 0);
    const totalAttenuation = color(1, 1, 1);
    for (let i = 0; i < depth; i++) {
        if (!world.hit(r, 0.0001, Infinity, hit)) {
            vec3MulVAddV4(totalEmission, totalAttenuation, background, totalEmission);
            break;
        }
        const emission = hit.material.emit(hit.material, r, hit);
        vec3MulVAddV4(totalEmission, totalAttenuation, emission, totalEmission);
        if (hit.material.scatter(hit.material, r, hit, bounce)) {
            const on_light = point3(randomMinMax(213, 343), 554, randomMinMax(227, 332));
            const to_light = vec3Sub2(on_light, hit.p);
            const distance_squared = vec3SqLen(to_light);
            vec3MulS3(to_light, to_light, 1 / Math.sqrt(distance_squared));

            if (vec3Dot(to_light, hit.normal) < 0) {
                break;
            }

            const light_area = (343 - 213) * (332 - 227);
            const light_cosine = Math.abs(to_light[1]);
            if (light_cosine < 0.000001) {
                break;
            }

            bounce.sampling_pdf = distance_squared / (light_cosine * light_area);
            const pdfFactor = hit.material.scattering_pdf(r, hit, bounce.scattered) /  bounce.sampling_pdf;
            raySet(bounce.scattered, hit.p, to_light, r.time);

            vec3MulV3(totalAttenuation, totalAttenuation, vec3MulS2(bounce.attenuation, pdfFactor));
            r = bounce.scattered;
        } else {
            break;
        }
    }
    return totalEmission;
};
