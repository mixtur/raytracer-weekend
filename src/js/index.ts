import { writeColor } from "./color";
import { Hittable } from "./hittable/hittable";
import { Ray } from './ray';
import {
    color,
    Color,
    vec3Mix4,
    vec3Add3,
    vec3AllocatorScope, vec3Unit1, vec3, vec3MulV3
} from './vec3';
import { ArenaVec3Allocator } from './vec3_allocators';
import { clamp } from './utils';
import { create_earth_scene } from './scenes/earth';
// import { lots_of_spheres } from './scenes/lots_of_spheres';
// import { two_spheres } from './scenes/two_spheres';
// import { two_perlin_spheres } from './scenes/two_perlin_spheres';

const aspect_ratio = 16 / 9;
const image_width = 600;
const image_height = Math.round(image_width / aspect_ratio);
const samples_per_pixel = 100;
const max_depth = 50;

const canvas = document.createElement('canvas');
const _ctx = canvas.getContext('2d');
if (_ctx === null) {
    throw new Error(`failed to acquire canvas 2d context`);
}

const ctx = _ctx;
canvas.width = image_width;
canvas.height = image_height;
document.body.appendChild(canvas);

const imageData = new ImageData(image_width, image_height, { colorSpace: "srgb" });

const rayArenaAllocator = new ArenaVec3Allocator(1024 * 64);

// const ray_color = (r: Ray, world: Hittable, depth: number): Color => {
//     if (depth <= 0) {
//         return color(0, 0, 0);
//     }
//     {// world
//         const hit = world.hit(r, 0.0001, Infinity);
//         if (hit !== null) {
//             const bounce = hit.material.scatter(r, hit);
//             if (bounce) {
//                 return vec3MulV2(bounce.attenuation, ray_color(bounce.scattered, world, depth - 1));
//             }
//             return color(0, 0, 0);
//         }
//     }
//
//     {// background
//         const t = clamp(0.5 * (vec3Unit1(r.direction)[1] + 1), 0, 1);
//         vec3Mix4(r.direction, color(1, 1, 1), color(0.5, 0.7, 1), t);
//         return r.direction;
//     }
// };

const ray_color = (r: Ray, world: Hittable): Color => {
    const totalAttenuation = vec3(1, 1, 1);
    let baseColor = vec3(0, 0, 0);
    for (let i = 0; i < max_depth; i++) {
        const hit = world.hit(r, 0.0001, Infinity);
        if (hit === null) {
            // hit background and exit
            const t = clamp(0.5 * (vec3Unit1(r.direction)[1] + 1), 0, 1);
            vec3Mix4(baseColor, color(1, 1, 1), color(0.5, 0.7, 1), t);
            break;
        }
        const bounce = hit.material.scatter(r, hit);
        if (bounce === null) {
            break;
        }
        vec3MulV3(totalAttenuation, totalAttenuation, bounce.attenuation);
        r = bounce.scattered;
    }
    vec3MulV3(baseColor, baseColor, totalAttenuation);
    return baseColor;
}

async function main() {
    const scene = await create_earth_scene();
    const cam = scene.create_camera(aspect_ratio);

    for (let j = 0; j < image_height; j++) {
        const mark = `scanline remaining ${image_height - j - 1}`;
        const y = image_height -1 - j;
        console.time(mark);
        for (let i = 0; i < image_width; i++) {
            const x = i;

            const pixelColor = color(0, 0, 0);
            vec3AllocatorScope(rayArenaAllocator, () => {
                for (let s = 0; s < samples_per_pixel; s++) {
                    rayArenaAllocator.reset();
                    const u = (i + Math.random()) / (image_width - 1);
                    const v = (j + Math.random()) / (image_height - 1);

                    const r = cam.get_ray(u, v);
                    vec3Add3(pixelColor, pixelColor, ray_color(r, scene.root_hittable));
                }
            })
            writeColor(imageData, x, y, pixelColor, samples_per_pixel);
        }
        console.timeEnd(mark);
        await new Promise(resolve => setTimeout(resolve, 0));
        ctx.putImageData(imageData, 0, 0, 0, y, image_width, 1);
    }
    ctx.putImageData(imageData, 0, 0);
    console.log('Done!');
}

main().catch((e) => {
    console.log(e);
});
