import { InitRenderWorkerParameters, RenderParameters } from './types';
import { ColorWriter } from './ui/color-writers';
import { TileResult } from './entry-points/render_worker';
import { color } from './math/vec3.gen';
import { ProgressReporter } from './ui/progress-reporters';
import { ColorFlowItem } from './color-flow';
import { schedule_tiles, TILES_COUNT } from './work-scheduling';

export interface MultiThreadedRenderConfig {
    thread_count: number;
    render_parameters: RenderParameters;
    writer: ColorWriter;
    color_flow: ColorFlowItem;
    progress_reporter: ProgressReporter;
}

export async function multi_threaded_render({render_parameters, thread_count, writer, progress_reporter, color_flow}: MultiThreadedRenderConfig): Promise<void> {
    const {
        image_width,
        image_height,
        samples_per_pixel: total_samples_per_pixel,
        aspect_ratio,
        max_depth,
        scene
    } = render_parameters;

    const load = schedule_tiles(image_width, image_height, total_samples_per_pixel, thread_count);

    const { write_color, dump_tile, dump_image } = writer;
    const output_buffer = new Float64Array(image_width * image_height * 3);
    const rays_casted_per_tile = new Uint32Array(TILES_COUNT);
    const promises = [];
    const total_rays = image_width * image_height * total_samples_per_pixel;
    const t0 = performance.now();

    const workers = [];
    //create workers in a separate loop, because the first message to workers can be heavy, and they still need to initialize
    for (let thread_id = 0; thread_id < load.length; thread_id++) {
        workers.push(new Worker(new URL('./render_worker.js', import.meta.url), {type: 'module'}));
    }

    for (let thread_id = 0; thread_id < load.length; thread_id++) {
        const worker = workers[thread_id];
        let event_count = 0;
        // note: tried to use transferables explicitly, but it seems Chrome doesn't care. It even makes things slightly slower.
        worker.postMessage({
            aspect_ratio,
            image_width,
            image_height,
            max_depth,
            work: load[thread_id],
            scene
        } as InitRenderWorkerParameters);

        const tmp_color = color(0, 0, 0);
        promises.push(new Promise<void>(resolve => {
            worker.onmessage = (ev: MessageEvent): void => {
                event_count++;
                const tiles = ev.data as TileResult[];
                for (let i = 0; i < tiles.length; i++){
                    const {tile_index, x, y, width, height, pixels, samples_per_pixel, progress} = tiles[i];
                    rays_casted_per_tile[tile_index] += samples_per_pixel;

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

                    dump_tile(x, (image_height - y - height), width, height);
                    const dt = performance.now() - t0;
                    progress_reporter.report(thread_id, progress, samples_per_pixel * width * height, total_rays, dt);

                    if (event_count === load[thread_id].length) {
                        progress_reporter.report_thread_done(thread_id);
                        worker.terminate();
                        resolve();
                    }
                }
            };
        }));
    }

    await Promise.all(promises);

    const total_time_ms = performance.now() - t0;
    progress_reporter.report_done(total_rays, total_time_ms);
    dump_image();
}
