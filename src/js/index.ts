import { create_array_writer, create_canvas_color_writer } from './output/color-writers';
import { single_threaded_render } from './single_threaded_render';
import { multi_threaded_render } from './multi_threaded_render';
import { generate_random_permutation_u16, generate_straight_order_u16 } from './utils';
import { ConsoleProgressReporter, MultipleReporters, ProgressBar, ProgressText } from './progress-reporters';
import { ACES, apply_gamma, clip_to_unit_range, compose_tone_mappers, expose } from './output/tone-mappers';

const aspect_ratio = 1;
const image_width = 840;
const image_height = Math.round(image_width / aspect_ratio);
const samples_per_pixel = 100;
const max_depth = 50;
const tone_mapper = compose_tone_mappers([
    expose({
        aperture: 16,
        shutter_speed: 1/25,
        ISO: 100,
        exp_comp: 1
    }),
    // clip_to_unit_range,
    ACES,
    // apply_gamma(1 / 2.2),
]);

const writer = create_canvas_color_writer(document.getElementById('right-panel') as HTMLDivElement, image_width, image_height);
// const writer = create_array_writer(image_width, image_height, default_tone_mapper, (array) => {
//     console.log(array);
// });

const thread_count = globalThis?.navigator?.hardwareConcurrency
    ? Math.max(1, Math.floor(globalThis?.navigator?.hardwareConcurrency / 2))
    : 4;

const progress_reporter = new MultipleReporters([
    // new ConsoleProgressReporter(image_height, thread_count),
    new ProgressBar(document.getElementById('top-row') as HTMLDivElement, thread_count, image_height),
    new ProgressText(document.getElementById('left-panel') as HTMLDivElement)
]);
multi_threaded_render({
    thread_count,
    tone_mapper,
    render_parameters: {
        aspect_ratio,
        image_width,
        image_height,
        samples_per_pixel,
        max_depth,
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
//     line_order: generate_random_permutation_u16(image_height)
// }, writer, tone_mapper).catch((e) => {
//     console.log(e);
// });
