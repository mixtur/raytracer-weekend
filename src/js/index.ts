import { create_array_writer, create_canvas_color_writer } from './ui/color-writers';
import { single_threaded_render } from './single_threaded_render';
import { multi_threaded_render } from './multi_threaded_render';
import { generate_random_permutation_u16, generate_straight_order_u16 } from './utils';
import { ConsoleProgressReporter, MultipleReporters, ProgressBar, ProgressText } from './progress-reporters';
import { ACES, apply_gamma, clip_to_unit_range, compose_color_flow, expose } from './color-flow';
import { select_model_ui } from './ui/select_model_ui';

const aspect_ratio = 1;
const image_width = 840;
const image_height = Math.round(image_width / aspect_ratio);
const samples_per_pixel = 100;
const max_depth = 50;

const thread_count = globalThis?.navigator?.hardwareConcurrency
    ? globalThis?.navigator?.hardwareConcurrency - 1
    : 4;

const scene = await select_model_ui(document.getElementById('top-row') as HTMLDivElement);

const progress_reporter = new MultipleReporters([
    // new ConsoleProgressReporter(image_height, thread_count),
    new ProgressBar(document.getElementById('top-row') as HTMLDivElement, thread_count, image_height),
    new ProgressText(document.getElementById('statistics-panel') as HTMLDivElement)
]);

const writer = create_canvas_color_writer(document.getElementById('rendering-panel') as HTMLDivElement, image_width, image_height);
// const writer = create_array_writer(image_width, image_height, color_flow, (array) => {
//     console.log(array);
// });

const color_flow = compose_color_flow([
    expose(scene.exposure_config),
    // clip_to_unit_range,
    ACES,
    apply_gamma(1 / 2.2),
]);

multi_threaded_render({
    thread_count,
    color_flow,
    render_parameters: {
        aspect_ratio,
        image_width,
        image_height,
        samples_per_pixel,
        max_depth,
        scene,
        // line_order: generate_straight_order_u16(image_height)
        line_order: generate_random_permutation_u16(image_height),
    },
    writer,
    progress_reporter
}).catch((e) => {
    console.log(e);
});

// single_threaded_render({
//     aspect_ratio,
//     image_width,
//     image_height,
//     samples_per_pixel,
//     max_depth,
//     scene,
//     line_order: generate_random_permutation_u16(image_height)
// }, writer, color_flow).catch((e) => {
//     console.log(e);
// });
