import { cornell_box_with_smoke } from './scenes/cornell_box_with_smoke';
import { vec3Add3, vec3AllocatorScopeSync } from './vec3';
import { ray_color, ray_color_iterative } from './ray_color';
import { RenderParameters } from './types';
import { ArenaVec3Allocator } from './vec3_allocators';
import { randomIntMinMax } from './random';
import { book2_final_scene } from './scenes/book-2-final-scene';
import { simple_light } from './scenes/simple_light';
import { cornell_box } from './scenes/cornell_box';
import { book1_final_scene } from './scenes/book-1-final-scene';
import { create_earth_scene } from './scenes/earth';

export interface RenderWorkerMessageData {
    y: number;
    pixels: Float64Array;
}

onmessage = (ev: MessageEvent<RenderParameters>) => {
    render(ev.data);
};

async function render({
                          aspect_ratio,
                          image_height,
                          image_width,
                          samples_per_pixel,
                          max_depth,
                          scene_creation_random_numbers
                      }: RenderParameters): Promise<void> {
    const stratification_grid_size = Math.floor(Math.sqrt(samples_per_pixel));
    const stratification_remainder = samples_per_pixel - stratification_grid_size ** 2;
    const stratification_grid_step = 1 / stratification_grid_size;

//    const scene = await create_earth_scene();
//    const scene = book1_final_scene(scene_creation_random_numbers);
//    const scene = simple_light;
//    const scene = cornell_box;
//    const scene = cornell_box_with_smoke;
    const scene = await book2_final_scene(scene_creation_random_numbers);
    const cam = scene.create_camera(aspect_ratio);

    const rayArenaAllocator = new ArenaVec3Allocator(1024);

    function permute(xs: Uint16Array): void {
        for (let i = xs.length; i >= 0; i--) {
            const j = randomIntMinMax(0, i);
            const t = xs[i];
            xs[i] = xs[j];
            xs[j] = t;
        }
    }
    const jRand = new Uint16Array(image_height);
    for (let i = 0; i < image_height; i++) { jRand[i] = i; }
    permute(jRand);

    const outputLineAllocator = new ArenaVec3Allocator(image_width);
    vec3AllocatorScopeSync(rayArenaAllocator, () => {
        for (let _j = 0; _j < image_height; _j++) {
            const j = jRand[_j];
            const y = image_height -1 - j;
            outputLineAllocator.reset();
            for (let i = 0; i < image_width; i++) {
                const pixelColor = outputLineAllocator.alloc(0, 0, 0);

                for (let sj = 0; sj < stratification_grid_size; sj++) {
                    for (let si = 0; si < stratification_grid_size; si++) {
                        rayArenaAllocator.reset();
                        const su = stratification_grid_step * (si + Math.random());
                        const sv = stratification_grid_step * (sj + Math.random());

                        const u = (i + su) / (image_width - 1);
                        const v = (j + sv) / (image_height - 1);

                        const r = cam.get_ray(u, v);
                        vec3Add3(pixelColor, pixelColor, ray_color_iterative(r, scene.background, scene.root_hittable, max_depth));
                    }
                }


                for (let s = 0; s < stratification_remainder; s++) {
                    rayArenaAllocator.reset();
                    const u = (i + Math.random()) / (image_width - 1);
                    const v = (j + Math.random()) / (image_height - 1);

                    const r = cam.get_ray(u, v);
                    vec3Add3(pixelColor, pixelColor, ray_color_iterative(r, scene.background, scene.root_hittable, max_depth));
                }
            }
            postMessage({y, pixels: outputLineAllocator.dump});
        }
    });
}
