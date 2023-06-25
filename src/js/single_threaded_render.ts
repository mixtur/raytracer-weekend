import { RenderParameters } from './types';
import { cornell_box_with_smoke } from './scenes/cornell_box_with_smoke';
import { ArenaVec3Allocator } from './vec3_allocators';
import { color, vec3Add3, vec3AllocatorScope } from './vec3';
import { ray_color } from './ray_color';
import { ColorWriter } from './color-writers';

export async function singleThreadedRender({
                                        aspect_ratio,
                                        image_height,
                                        image_width,
                                        samples_per_pixel,
                                        max_depth
                                    }: RenderParameters, writer: ColorWriter) {
    const { writeColor, dumpLine, dumpImage } = writer;
//    const scene = await create_earth_scene();
//    const scene = lots_of_spheres;
//    const scene = simple_light;
//    const scene = cornell_box;
    const stratification_grid_size = Math.floor(Math.sqrt(samples_per_pixel));
    const stratification_remainder = samples_per_pixel - stratification_grid_size ** 2;
    const stratification_grid_step = 1 / stratification_grid_size;

    const scene = cornell_box_with_smoke;
    const cam = scene.create_camera(aspect_ratio);

    const rayArenaAllocator = new ArenaVec3Allocator(1024 * 64);

    await vec3AllocatorScope(rayArenaAllocator, async () => {
        for (let j = 0; j < image_height; j++) {
            const mark = `scanline remaining ${image_height - j - 1}`;
            const y = image_height -1 - j;
            console.time(mark);
            for (let i = 0; i < image_width; i++) {
                const x = i;
                const pixelColor = color(0, 0, 0);

                for (let sj = 0; sj < stratification_grid_size; sj++) {
                    for (let si = 0; si < stratification_grid_size; si++) {
                        rayArenaAllocator.reset();
                        const su = stratification_grid_step * (si + Math.random());
                        const sv = stratification_grid_step * (sj + Math.random());

                        const u = (i + su) / (image_width - 1);
                        const v = (j + sv) / (image_height - 1);

                        const r = cam.get_ray(u, v);
                        vec3Add3(pixelColor, pixelColor, ray_color(r, scene.background, scene.root_hittable, max_depth));
                    }
                }


                for (let s = 0; s < stratification_remainder; s++) {
                    rayArenaAllocator.reset();
                    const u = (i + Math.random()) / (image_width - 1);
                    const v = (j + Math.random()) / (image_height - 1);

                    const r = cam.get_ray(u, v);
                    vec3Add3(pixelColor, pixelColor, ray_color(r, scene.background, scene.root_hittable, max_depth));
                }
                writeColor(x, y, pixelColor, samples_per_pixel);
            }
            console.timeEnd(mark);
            await new Promise(resolve => setTimeout(resolve, 0));
            dumpLine(y);
        }
    });
    dumpImage();
    console.log('Done!');
}
