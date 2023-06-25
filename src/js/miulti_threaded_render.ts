import { RenderParameters } from './types';
import { ColorWriter } from './color-writers';
import { RenderWorkerMessageData } from './render_worker';
import { color } from './vec3';

export async function multiThreadedRender(thread_number: number, render_parameters: RenderParameters, writer: ColorWriter): Promise<void> {
    const {
        image_width,
        image_height,
        samples_per_pixel,
        aspect_ratio,
        max_depth,
        scene_creation_random_numbers
    } = render_parameters;

    const { writeColor, dumpLine, dumpImage } = writer;
    const outputBuffer = new Float64Array(image_width * image_height * 3);
    const outputLineCompleteness = new Uint8Array(image_height);
    const promises = [];
    let samples_sent = 0;
    for (let i = 0; i < thread_number; i++) {
        const worker = new Worker(new URL('./render_worker.js', import.meta.url), {type: 'module'});
        let eventCount = 0;
        const samples_to_send = Math.floor((i + 1) * samples_per_pixel / thread_number) - samples_sent;
        samples_sent += samples_to_send;
        worker.postMessage({
            aspect_ratio,
            image_width,
            image_height,
            samples_per_pixel: samples_to_send,
            max_depth,
            scene_creation_random_numbers
        } as RenderParameters);

        promises.push(new Promise<void>(resolve => {
            worker.onmessage = (ev: MessageEvent): void => {
                eventCount++;
                const {y, pixels} = ev.data as RenderWorkerMessageData;
                const completeness = ++outputLineCompleteness[y];
                const y_offset = y * image_width * 3;
                for (let line_component_index = 0; line_component_index < image_width * 3; line_component_index++) {
                    outputBuffer[y_offset + line_component_index] += pixels[line_component_index];
                }

                for (let x = 0; x < image_width; x++) {
                    const pixelColor = color(
                        outputBuffer[y_offset + x * 3],
                        outputBuffer[y_offset + x * 3 + 1],
                        outputBuffer[y_offset + x * 3 + 2]
                    );
                    writeColor(x, y, pixelColor, samples_per_pixel * completeness / thread_number);
                }
                dumpLine(y);

                if (eventCount === image_height) {
                    resolve();
                }
            };
        }))
    }

    for (const p of promises) {
        await p;
    }

    dumpImage();
}
