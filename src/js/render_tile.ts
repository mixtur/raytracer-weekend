import { TileScheduleItem } from './work-scheduling';
import { Scene } from './scenes/scene';
import { get_ray } from './camera';
import { ray_color } from './ray_color';
import { add_vec3_r, ArenaVec3Allocator, use_vec3_allocator } from './math/vec3.gen';
import { ArenaQuatAllocator, use_quat_allocator } from './math/quat.gen';
import { run_with_hooks } from './utils';
import { RenderParameters } from './types';

export const render_tile = (tile: TileScheduleItem, scene: Scene, color_allocator: ArenaVec3Allocator, config: RenderParameters) => {
    run_with_hooks(() => {
        const stratification_grid_size = Math.floor(Math.sqrt(config.samples_per_pixel));
        const stratification_remainder_threshold = stratification_grid_size ** 2;

        const x_px_step = 1 / config.image_width;
        const y_px_step = 1 / config.image_height;
        const stratification_step = 1 / stratification_grid_size;

        const vec3_allocator = new ArenaVec3Allocator(8192);
        const quat_allocator = new ArenaQuatAllocator(640);

        use_vec3_allocator(vec3_allocator);
        use_quat_allocator(quat_allocator);

        for (let y = tile.y; y < tile.y + tile.height; y++) {
            for (let x = tile.x; x < tile.x + tile.width; x++) {
                const px_color = color_allocator.alloc(0, 0, 0);
                let s = tile.stratification_offset;
                for (let i = 0; i < tile.sample_count; i++) {
                    vec3_allocator.reset();
                    quat_allocator.reset();
                    let x_random = 0;
                    let y_random = 0;
                    if (s > stratification_remainder_threshold) {
                        x_random = Math.random();
                        y_random = Math.random();
                    } else {
                        const sx = s % stratification_grid_size;
                        const sy = Math.floor(s / stratification_grid_size);
                        x_random = (sx + Math.random()) * stratification_step;
                        y_random = (sy + Math.random()) * stratification_step;
                    }
                    s++;
                    const u = (x + x_random) * x_px_step;
                    const v = (y + y_random) * y_px_step;
                    const ray = get_ray(scene.camera, u, v);
                    const color = ray_color(ray, scene.background, scene.root_hittable, scene.light, config.max_depth);
                    add_vec3_r(px_color, px_color, color);
                }
            }
        }
    })

}
