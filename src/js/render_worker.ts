import { add_vec3_r, ArenaVec3Allocator, use_vec3_allocator } from './math/vec3.gen';
import { ray_color } from './ray_color';
import { RenderWorkerParametersMessage } from './types';
import { ArenaQuatAllocator, use_quat_allocator } from './math/quat.gen';
import { run_with_hooks } from './utils';
import { configure_camera, get_ray } from './camera';

import './hittable';
import './materials';

export interface RenderWorkerMessageData {
    y: number;
    pixels: Float64Array;
    //assuming it can be different from line to line
    samples_per_pixel: number;
}

onmessage = (ev: MessageEvent<RenderWorkerParametersMessage>) => {
    render(ev.data);
};

function render(
    {
      aspect_ratio,
      image_height,
      image_width,
      samples_per_pixel,
      max_depth,
      line_order,
      first_line_index,
      scene
  }: RenderWorkerParametersMessage
): void {
    const stratification_grid_size = Math.floor(Math.sqrt(samples_per_pixel));
    const stratification_remainder = samples_per_pixel - stratification_grid_size ** 2;
    const stratification_grid_step = 1 / stratification_grid_size;

    const cam = scene.camera;
    configure_camera(cam, aspect_ratio);

    const local_order = line_order.map((x, i) => line_order[(i + first_line_index) % image_height]);

    run_with_hooks(() => {
        const vec3_allocator = new ArenaVec3Allocator(8192);
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

                        const r = get_ray(cam, u, v);
                        add_vec3_r(pixel_color, pixel_color, ray_color(r, scene.background, scene.root_hittable, scene.light, max_depth));
                    }
                }


                for (let s = 0; s < stratification_remainder; s++) {
                    vec3_allocator.reset();
                    quat_allocator.reset();
                    const u = (i + Math.random()) / (image_width - 1);
                    const v = (j + Math.random()) / (image_height - 1);

                    const r = get_ray(cam, u, v);
                    add_vec3_r(pixel_color, pixel_color, ray_color(r, scene.background, scene.root_hittable, scene.light, max_depth));
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
