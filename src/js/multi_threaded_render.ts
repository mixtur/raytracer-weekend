import { RenderParameters, RenderWorkerMessage } from './types';
import { ColorWriter } from './color-writers';
import { RenderWorkerMessageData } from './render_worker';
import { color } from './math/vec3';
import { format_time } from './utils';

export async function multi_threaded_render(thread_number: number, render_parameters: RenderParameters, writer: ColorWriter): Promise<void> {
    const {
        image_width,
        image_height,
        samples_per_pixel: total_samples_per_pixel,
        aspect_ratio,
        max_depth,
        scene_creation_random_numbers,
        line_order
    } = render_parameters;

    thread_number = Math.min(thread_number, total_samples_per_pixel);

    const { write_color, dump_line, dump_image } = writer;
    const output_buffer = new Float64Array(image_width * image_height * 3);
    const rays_casted_per_line = new Uint32Array(image_height);
    const promises = [];
    let samples_sent = 0;
    const total_rays = image_width * image_height * total_samples_per_pixel;
    let done_rays = 0;
    const t0 = performance.now();
    for (let i = 0; i < thread_number; i++) {
        const worker = new Worker(new URL('./render_worker.js', import.meta.url), {type: 'module'});
        let event_count = 0;
        const samples_to_send = Math.floor((i + 1) * total_samples_per_pixel / thread_number) - samples_sent;
        samples_sent += samples_to_send;
        // note: tried to use transferables explicitly, but it seems Chrome doesn't care. It even makes things slightly slower.
        worker.postMessage({
            aspect_ratio,
            image_width,
            image_height,
            samples_per_pixel: samples_to_send,
            max_depth,
            scene_creation_random_numbers,
            first_line_index: Math.floor(i / thread_number * image_height),
            line_order
        } as RenderWorkerMessage);

        const tmp_color = color(0, 0, 0);
        promises.push(new Promise<void>(resolve => {
            worker.onmessage = (ev: MessageEvent): void => {
                event_count++;
                const {y, pixels, samples_per_pixel} = ev.data as RenderWorkerMessageData;
                rays_casted_per_line[y] += samples_per_pixel;
                const y_offset = y * image_width * 3;
                for (let line_component_index = 0; line_component_index < image_width * 3; line_component_index++) {
                    output_buffer[y_offset + line_component_index] += pixels[line_component_index];
                }

                for (let x = 0; x < image_width; x++) {
                    tmp_color[0] = output_buffer[y_offset + x * 3];
                    tmp_color[1] = output_buffer[y_offset + x * 3 + 1];
                    tmp_color[2] = output_buffer[y_offset + x * 3 + 2];
                    write_color(x, y, tmp_color, rays_casted_per_line[y]);
                }
                dump_line(y);

                done_rays += image_width * samples_to_send;
                if (Math.random() < 100 / (image_height * thread_number)) {
                    const dt = performance.now() - t0;
                    const speed = done_rays / dt;
                    const estimated_total_time = total_rays / speed;
                    console.log(`[${format_time(dt)} / ${format_time(estimated_total_time)}]: casted ${(done_rays / total_rays * 100).toFixed(2).padStart(5)}% of all rays`);
                }

                if (event_count === image_height) {
                    console.log(`Thread #${i} - done`);
                    resolve();
                }
            };
        }))
    }

    for (const p of promises) {
        await p;
    }

    dump_image();
}
