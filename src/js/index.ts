import { Hittable } from "./hittable/hittable";
import { Ray } from './ray';
import {
    color,
    Color,
    vec3Mix4,
    vec3Add3,
    vec3AllocatorScope, vec3Unit1, vec3, vec3MulV3, vec3MulV2
} from './vec3';
import { ArenaVec3Allocator } from './vec3_allocators';
// import { simple_light } from './scenes/simple_light';
// import { create_earth_scene } from './scenes/earth';
// import { lots_of_spheres } from './scenes/lots_of_spheres';
// import { two_spheres } from './scenes/two_spheres';
// import { two_perlin_spheres } from './scenes/two_perlin_spheres';
import { cornell_box } from './scenes/cornell_box';
import { createArrayWriter, createCanvasColorWriter } from './color-writers';

const aspect_ratio = 1;
const image_width = 600;
const image_height = Math.round(image_width / aspect_ratio);
const samples_per_pixel = 200;
const max_depth = 50;

const { writeColor, dumpLine, dumpImage } = createCanvasColorWriter(image_width, image_height);
// const { writeColor, dumpLine, dumpImage } = createArrayWriter(image_width, image_height, (array) => {
//     console.log(array);
// });


const rayArenaAllocator = new ArenaVec3Allocator(1024 * 64);

const ray_color = (r: Ray, background: Color, world: Hittable, depth: number): Color => {
    if (depth <= 0) {
        return color(0, 0, 0);
    }
    {// world
        const hit = world.hit(r, 0.0001, Infinity);
        if (hit !== null) {
            const bounce = hit.material.scatter(r, hit);
            const totalEmission = hit.material.emitted(hit.u, hit.v, hit.p);
            if (bounce) {
                const bounceColor = ray_color(bounce.scattered, background, world, depth - 1);
                vec3Add3(totalEmission, totalEmission, vec3MulV2(bounceColor, bounce.attenuation));
            }
            return totalEmission;
        }
    }

    return background;
};

async function main() {
//    const scene = await create_earth_scene();
//    const scene = lots_of_spheres;
//    const scene = simple_light;
    const scene = cornell_box;
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
                    vec3Add3(pixelColor, pixelColor, ray_color(r, scene.background, scene.root_hittable, max_depth));
                }
            });
            writeColor(x, y, pixelColor, samples_per_pixel);
        }
        console.timeEnd(mark);
        await new Promise(resolve => setTimeout(resolve, 0));
        dumpLine(y);
    }
    dumpImage();
    console.log('Done!');
}

main().catch((e) => {
    console.log(e);
});
