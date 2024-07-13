import { ArenaVec3Allocator } from '../math/vec3.gen';
import { InitRenderWorkerParameters } from '../types';
import { configure_camera } from '../camera';

import '../hittable';
import '../materials';
import '../texture';
import { render_tile } from '../render_tile';

export interface RenderWorkerMessageData {
    tile_index: number;
    x: number;
    y: number;
    width: number;
    height: number;
    pixels: Float64Array;
    samples_per_pixel: number;
    progress: number;
}

onmessage = (ev: MessageEvent<InitRenderWorkerParameters>) => {
    render(ev.data);
};

function render(
    {
        aspect_ratio,
        image_height,
        image_width,
        max_depth,
        work,
        scene
    }: InitRenderWorkerParameters
): void {
    const cam = scene.camera;
    configure_camera(cam, aspect_ratio);

    const full_work = work.reduce((sum, tile) => sum + tile.width * tile.height * tile.sample_count, 0);
    let work_so_far = 0;
    const max_tile_size = work.reduce((max_size, tile) => Math.max(max_size, tile.width * tile.height), 0);
    const output_allocator = new ArenaVec3Allocator(max_tile_size);
    for (let i = 0; i < work.length; i++){
        const tile = work[i];
        output_allocator.reset();
        render_tile(tile, scene, image_width, image_height, max_depth, output_allocator);
        work_so_far += tile.width * tile.height * tile.sample_count;
        const message: RenderWorkerMessageData = {
            tile_index: tile.tile_index,
            x: tile.x,
            y: tile.y,
            width: tile.width,
            height: tile.height,
            pixels: output_allocator.dump,
            samples_per_pixel: tile.sample_count,
            progress: work_so_far / full_work
        };
        postMessage(message);
    }
}
