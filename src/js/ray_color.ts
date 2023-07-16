import { Ray, raySet } from './ray';
import {
    color,
    Color,
    point3,
    vec3Add2, vec3Dot,
    vec3MulS2, vec3MulS3,
    vec3MulV2,
    vec3MulV3,
    vec3MulVAddV3,
    vec3MulVAddV4, vec3SqLen,
    vec3Sub2
} from './vec3';
import { createEmptyHitRecord, Hittable } from './hittable/hittable';
import { createBounceRecord } from './materials/megamaterial';
import { randomMinMax } from './random';

const hit = createEmptyHitRecord();
const bounce = createBounceRecord();
export const ray_color = (r: Ray, background: Color, world: Hittable, depth: number): Color => {
    if (depth <= 0) {
        return color(0, 0, 0);
    }
    if (!world.hit(r, 0.0001, Infinity, hit)) {
        // console.log('background');
        return background;
    }
    const emitted = hit.material.emit.value(hit.u, hit.v, hit.p);
    if (!hit.material.scatter(hit.material, r, hit, bounce)) {
        // console.log('no hit');
        return emitted;
    }

    const on_light = point3(randomMinMax(213, 343), 554, randomMinMax(227, 332));
    const to_light = vec3Sub2(on_light, hit.p);
    const distance_squared = vec3SqLen(to_light);
    vec3MulS3(to_light, to_light, 1 / Math.sqrt(distance_squared));

    if (vec3Dot(to_light, hit.normal) < 0) {
        console.log('light below surface');
        return emitted;
    }

    const light_area = (343 - 213) * (332 - 227);
    const light_cosine = Math.abs(to_light[1]);
    if (light_cosine < 0.000001) {
        // console.log('negative cosine');
        return emitted;
    }

    bounce.sampling_pdf = distance_squared / (light_cosine * light_area);
    raySet(bounce.scattered, hit.p, to_light, r.time);

    const pdfFactor = hit.material.scattering_pdf(r, hit, bounce.scattered) / bounce.sampling_pdf;
    const bounceColor = ray_color(bounce.scattered, background, world, depth - 1);
    // vec3MulVAddV3 may not work because we can screw up the light source
    // if (Math.random() < 0.001) {
    //     console.log('ok', hit.material.scatter, hit.material.scattering_pdf(r, hit, bounce.scattered), bounce.sampling_pdf, emitted);
    // }
    return vec3MulVAddV3(bounceColor, vec3MulS2(bounce.attenuation, pdfFactor), emitted);
}

export const ray_color_iterative = (r: Ray, background: Color, world: Hittable, depth: number): Color => {
    const totalEmission = color(0, 0, 0);
    const totalAttenuation = color(1, 1, 1);
    for (let i = 0; i < depth; i++) {
        if (!world.hit(r, 0.0001, Infinity, hit)) {
            vec3MulVAddV4(totalEmission, totalAttenuation, background, totalEmission);
            break;
        }
        const emission = hit.material.emit.value(hit.u, hit.v, hit.p);
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
