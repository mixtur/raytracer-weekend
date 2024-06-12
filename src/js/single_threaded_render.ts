import { RenderParameters } from './types';
import { cornell_box_with_smoke } from './scenes/cornell_box_with_smoke';
import { book2_final_scene } from './scenes/book-2-final-scene';
import { ArenaVec3Allocator } from './math/vec3_allocators';
import { color, vec3_add_3, vec3_allocator_scope_async } from './math/vec3';
import { ray_color, ray_color_iterative } from './ray_color';
import { ColorWriter } from './color-writers';

export async function single_threaded_render({
                                        aspect_ratio,
                                        image_height,
                                        image_width,
                                        samples_per_pixel,
                                        max_depth,
                                        scene_creation_random_numbers
                                    }: RenderParameters, writer: ColorWriter) {
    const { write_color, dump_line, dump_image } = writer;
    const stratification_grid_size = Math.floor(Math.sqrt(samples_per_pixel));
    const stratification_remainder = samples_per_pixel - stratification_grid_size ** 2;
    const stratification_grid_step = 1 / stratification_grid_size;

//    const scene = await create_earth_scene();
//    const scene = lots_of_spheres;
//    const scene = simple_light;
//    const scene = cornell_box;
//    const scene = cornell_box_with_smoke;
    const scene = await book2_final_scene(scene_creation_random_numbers);
    const cam = scene.create_camera(aspect_ratio);

    const ray_arena_allocator = new ArenaVec3Allocator(1024);

    await vec3_allocator_scope_async(ray_arena_allocator, async () => {
        for (let j = 0; j < image_height; j++) {
            const mark = `scanline remaining ${image_height - j - 1}`;
            const y = image_height -1 - j;
            console.time(mark);
            for (let i = 0; i < image_width; i++) {
                const x = i;
                const pixel_color = color(0, 0, 0);

                for (let sj = 0; sj < stratification_grid_size; sj++) {
                    for (let si = 0; si < stratification_grid_size; si++) {
                        ray_arena_allocator.reset();
                        const su = stratification_grid_step * (si + Math.random());
                        const sv = stratification_grid_step * (sj + Math.random());

                        const u = (i + su) / (image_width - 1);
                        const v = (j + sv) / (image_height - 1);

                        const r = cam.get_ray(u, v);
                        vec3_add_3(pixel_color, pixel_color, ray_color_iterative(r, scene.background, scene.root_hittable, scene.light, max_depth));
                    }
                }


                for (let s = 0; s < stratification_remainder; s++) {
                    ray_arena_allocator.reset();
                    const u = (i + Math.random()) / (image_width - 1);
                    const v = (j + Math.random()) / (image_height - 1);

                    const r = cam.get_ray(u, v);
                    vec3_add_3(pixel_color, pixel_color, ray_color_iterative(r, scene.background, scene.root_hittable, scene.light, max_depth));
                }
                write_color(x, y, pixel_color, samples_per_pixel);
            }
            console.timeEnd(mark);
            await new Promise(resolve => setTimeout(resolve, 0));
            dump_line(y);
        }
    });
    dump_image();
    console.log('Done!');
}
