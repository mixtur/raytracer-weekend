import { RenderParameters } from './types';
import { add_vec3_r, ArenaVec3Allocator, color, use_vec3_allocator } from './math/vec3.gen';
import { ray_color_iterative } from './ray_color';
import { ColorWriter } from './ui/color-writers';
import { async_run_with_hooks } from './utils';
import { ArenaQuatAllocator, use_quat_allocator } from './math/quat.gen';
import { ColorFlowItem } from './color-flow';
import { configure_camera, get_ray } from './camera';

export async function single_threaded_render({
    aspect_ratio,
    image_height,
    image_width,
    samples_per_pixel,
    max_depth,
    scene
}: RenderParameters, writer: ColorWriter, color_flow: ColorFlowItem) {
    const { write_color, dump_line, dump_image } = writer;
    const stratification_grid_size = Math.floor(Math.sqrt(samples_per_pixel));
    const stratification_remainder = samples_per_pixel - stratification_grid_size ** 2;
    const stratification_grid_step = 1 / stratification_grid_size;

    const cam = scene.camera;
    configure_camera(cam, aspect_ratio);

    await async_run_with_hooks(async () => {
        const vec3_allocator = new ArenaVec3Allocator(8192);
        const quat_allocator = new ArenaQuatAllocator(640);

        use_vec3_allocator(vec3_allocator);
        use_quat_allocator(quat_allocator);
        for (let j = 0; j < image_height; j++) {
            const mark = `scanline remaining ${image_height - j - 1}`;
            const y = image_height -1 - j;
            console.time(mark);
            for (let i = 0; i < image_width; i++) {
                const x = i;
                const pixel_color = color(0, 0, 0);

                for (let sj = 0; sj < stratification_grid_size; sj++) {
                    for (let si = 0; si < stratification_grid_size; si++) {
                        vec3_allocator.reset();
                        quat_allocator.reset();
                        const su = stratification_grid_step * (si + Math.random());
                        const sv = stratification_grid_step * (sj + Math.random());

                        const u = (i + su) / (image_width - 1);
                        const v = (j + sv) / (image_height - 1);

                        const r = get_ray(cam, u, v);
                        add_vec3_r(pixel_color, pixel_color, ray_color_iterative(r, scene.background, scene.root_hittable, scene.light, max_depth));
                    }
                }


                for (let s = 0; s < stratification_remainder; s++) {
                    vec3_allocator.reset();
                    quat_allocator.reset();
                    const u = (i + Math.random()) / (image_width - 1);
                    const v = (j + Math.random()) / (image_height - 1);

                    const r = get_ray(cam, u, v);
                    add_vec3_r(pixel_color, pixel_color, ray_color_iterative(r, scene.background, scene.root_hittable, scene.light, max_depth));
                }
                write_color(x, y, pixel_color, samples_per_pixel, color_flow);
            }
            console.timeEnd(mark);
            await new Promise(resolve => setTimeout(resolve, 0));
            dump_line(y);
        }
    });
    dump_image();
    console.log('Done!');
}
