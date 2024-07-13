import { TileScheduleItem } from './work-scheduling';
import { Scene } from './scenes/scene';
import { get_ray } from './camera';
import { ray_color } from './ray_color';
import { add_vec3_r, ArenaVec3Allocator, use_vec3_allocator } from './math/vec3.gen';
import { ArenaQuatAllocator, use_quat_allocator } from './math/quat.gen';
import { run_with_hooks } from './utils';

export const render_tile = (tile: TileScheduleItem, scene: Scene, image_width: number, image_height: number, max_depth: number, color_allocator: ArenaVec3Allocator) => {
    run_with_hooks(() => {
        const x_px_step = 1 / image_width;
        const y_px_step = 1 / image_height;

        const vec3_allocator = new ArenaVec3Allocator(8192);
        const quat_allocator = new ArenaQuatAllocator(640);

        use_vec3_allocator(vec3_allocator);
        use_quat_allocator(quat_allocator);

        for (let y = tile.y; y < tile.y + tile.height; y++) {
            for (let x = tile.x; x < tile.x + tile.width; x++) {
                const px_color = color_allocator.alloc(0, 0, 0);
                for (let i = 0; i < tile.sample_count; i++) {
                    vec3_allocator.reset();
                    quat_allocator.reset();
                    //todo: stratification
                    const v = (y + Math.random()) * y_px_step;
                    const u = (x + Math.random()) * x_px_step;
                    const ray = get_ray(scene.camera, u, v);
                    const color = ray_color(ray, scene.background, scene.root_hittable, scene.light, max_depth);
                    add_vec3_r(px_color, px_color, color);
                }
            }
        }
    })

}
