import { ArenaVec3Allocator } from '../math/vec3.gen';
import { InitRenderWorkerParameters } from '../types';
import { configure_camera } from '../camera';

import '../hittable';
import '../materials';
import '../texture';
import { render_tile } from '../render_tile';

export interface TileResult {
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

const BATCH_MIN_TIME = 100;
const BATCH_MAX_SIZE = 4;
function render(parameters: InitRenderWorkerParameters): void {
    const {
        aspect_ratio,
        work,
        scene
    } = parameters;
    const cam = scene.camera;
    configure_camera(cam, aspect_ratio);

    const full_work = work.reduce((sum, tile) => sum + tile.width * tile.height * tile.sample_count, 0);
    let work_so_far = 0;
    const max_tile_size = work.reduce((max_size, tile) => Math.max(max_size, tile.width * tile.height), 0);
    const output_allocators: ArenaVec3Allocator[] = [];
    for (let i = 0; i < BATCH_MAX_SIZE; i++) {
        output_allocators.push(new ArenaVec3Allocator(max_tile_size));
    }
    const tile_report: TileResult[] = [];
    let t0 = 0;
    for (let i = 0; i < work.length; i++) {
        if (tile_report.length === 0) {
            t0 = performance.now();
        }
        const output_allocator = output_allocators[tile_report.length];
        const tile = work[i];
        output_allocator.reset();
        render_tile(tile, scene, output_allocator, parameters);
        work_so_far += tile.width * tile.height * tile.sample_count;
        tile_report.push({
            tile_index: tile.tile_index,
            x: tile.x,
            y: tile.y,
            width: tile.width,
            height: tile.height,
            pixels: output_allocator.dump,
            samples_per_pixel: tile.sample_count,
            progress: work_so_far / full_work
        });
        const dt = performance.now() - t0;
        if (dt > BATCH_MIN_TIME || tile_report.length >= BATCH_MAX_SIZE) {
            postMessage(tile_report);
            tile_report.length = 0;
        }
    }

    if (tile_report.length > 0) {
        postMessage(tile_report);
    }
}
