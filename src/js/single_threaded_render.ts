import { RenderParameters } from './types';
import { ArenaVec3Allocator, color_dirty } from './math/vec3.gen';
import { ray_color_iterative } from './ray_color';
import { ColorWriter } from './ui/color-writers';
import { async_run_with_hooks } from './utils';
import { ColorFlowItem } from './color-flow';
import { configure_camera, get_ray } from './camera';
import { schedule_tiles, TILES_COUNT } from './work-scheduling';
import { render_tile } from './render_tile';

export async function single_threaded_render({
    aspect_ratio,
    image_height,
    image_width,
    samples_per_pixel,
    max_depth,
    scene
}: RenderParameters, writer: ColorWriter, color_flow: ColorFlowItem) {
    const { write_color, dump_tile, dump_image } = writer;
    const cam = scene.camera;
    configure_camera(cam, aspect_ratio);
    const [tiles] = schedule_tiles(image_width, image_height, samples_per_pixel, 1);

    const rays_casted_per_tile = new Uint32Array(TILES_COUNT);
    const max_tile_size = tiles.reduce((max_size, tile) => Math.max(max_size, tile.width * tile.height), 0);
    const tile_data_allocator = new ArenaVec3Allocator(max_tile_size);
    const output_buffer = new Float64Array(image_width * image_height * 3);
    const tmp_color = color_dirty();
    await async_run_with_hooks(async () => {
        for (let i = 0; i < tiles.length; i++) {
            const tile = tiles[i];
            const mark = `progressive tiles remaining ${tiles.length - i - 1}`;
            console.time(mark);
            tile_data_allocator.reset();
            render_tile(tile, scene, image_width, image_height, max_depth, tile_data_allocator);
            const pixels = tile_data_allocator.dump;
            const { tile_index, x, y, width, height, sample_count } = tile;
            rays_casted_per_tile[tile_index] += sample_count;

            for (let i = 0; i < height; i++) {
                const w_offset = ((y + i) * image_width + x) * 3;
                const r_offset = (i * width) * 3;
                for (let j = 0; j < width; j++) {
                    tmp_color[0] = output_buffer[w_offset + j * 3]     += pixels[r_offset + j * 3];
                    tmp_color[1] = output_buffer[w_offset + j * 3 + 1] += pixels[r_offset + j * 3 + 1];
                    tmp_color[2] = output_buffer[w_offset + j * 3 + 2] += pixels[r_offset + j * 3 + 2];
                    write_color(x + j, (image_height - y - i - 1), tmp_color, rays_casted_per_tile[tile_index], color_flow);
                }
            }

            console.timeEnd(mark);
            await new Promise(resolve => setTimeout(resolve, 0));
            dump_tile(x, (image_height - y - height - 1), width, height);
        }
    });
    dump_image();
    console.log('Done!');
}
