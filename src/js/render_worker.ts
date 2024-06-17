import { use_vec3_allocator, vec3_add_3 } from './math/vec3';
import { ray_color, ray_color_iterative } from './ray_color';
import { RenderWorkerParametersMessage } from './types';
import { ArenaVec3Allocator } from './math/vec3_allocators';
import { cornell_box_with_smoke } from './scenes/cornell_box_with_smoke';
import { book2_final_scene } from './scenes/book-2-final-scene';
import { simple_light } from './scenes/simple_light';
import { cornell_box } from './scenes/cornell_box';
import { book1_final_scene } from './scenes/book-1-final-scene';
import { create_earth_scene } from './scenes/earth';
import { ArenaQuatAllocator, use_quat_allocator } from './math/quat';
import { run_with_hooks } from './utils';

export interface RenderWorkerMessageData {
    y: number;
    pixels: Float64Array;
    //assuming it can be different from line to line
    samples_per_pixel: number;
}

onmessage = (ev: MessageEvent<RenderWorkerParametersMessage>) => {
    render(ev.data);
};

async function render({
                          aspect_ratio,
                          image_height,
                          image_width,
                          samples_per_pixel,
                          max_depth,
                          line_order,
                          first_line_index
                      }: RenderWorkerParametersMessage): Promise<void> {
    const stratification_grid_size = Math.floor(Math.sqrt(samples_per_pixel));
    const stratification_remainder = samples_per_pixel - stratification_grid_size ** 2;
    const stratification_grid_step = 1 / stratification_grid_size;

    // const scene_creation_random_numbers = [];
    // for (let i = 0; i < 2048; i++) {
    //     scene_creation_random_numbers.push(Math.random());
    // }

    // const scene = await create_earth_scene();
    // const scene = book1_final_scene(scene_creation_random_numbers);
    // const scene = simple_light;
    const scene = cornell_box;
    // const scene = cornell_box_with_smoke;
    // const scene = await book2_final_scene(scene_creation_random_numbers);
    const cam = scene.create_camera(aspect_ratio);

    const local_order = line_order.map((x, i) => line_order[(i + first_line_index) % image_height]);

    run_with_hooks(() => {
        const vec3_allocator = new ArenaVec3Allocator(4096);
        const quat_allocator = new ArenaQuatAllocator(640);
        const output_line_allocator = new ArenaVec3Allocator(image_width);

        use_vec3_allocator(vec3_allocator);
        use_quat_allocator(quat_allocator);
        for (let _j = 0; _j < image_height; _j++) {
            const j = local_order[_j];
            const y = image_height -1 - j;
            output_line_allocator.reset();
            for (let i = 0; i < image_width; i++) {
                const pixel_color = output_line_allocator.alloc(0, 0, 0);

                for (let sj = 0; sj < stratification_grid_size; sj++) {
                    for (let si = 0; si < stratification_grid_size; si++) {
                        vec3_allocator.reset();
                        quat_allocator.reset();
                        const su = stratification_grid_step * (si + Math.random());
                        const sv = stratification_grid_step * (sj + Math.random());

                        const u = (i + su) / (image_width - 1);
                        const v = (j + sv) / (image_height - 1);

                        const r = cam.get_ray(u, v);
                        vec3_add_3(pixel_color, pixel_color, ray_color(r, scene.background, scene.root_hittable, scene.light, max_depth));
                    }
                }


                for (let s = 0; s < stratification_remainder; s++) {
                    vec3_allocator.reset();
                    quat_allocator.reset();
                    const u = (i + Math.random()) / (image_width - 1);
                    const v = (j + Math.random()) / (image_height - 1);

                    const r = cam.get_ray(u, v);
                    vec3_add_3(pixel_color, pixel_color, ray_color(r, scene.background, scene.root_hittable, scene.light, max_depth));
                }
            }
            const message: RenderWorkerMessageData = {
                y,
                pixels: output_line_allocator.dump,
                samples_per_pixel
            };
            postMessage(message);
        }
    });
}
