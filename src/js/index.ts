import { create_array_writer, create_canvas_color_writer } from './color-writers';
// import { single_threaded_render } from './single_threaded_render';
import { multi_threaded_render } from './multi_threaded_render';
import { generate_random_permutation_u16, generate_straight_order_u16 } from './utils';
import { DomProgressReporter, ConsoleProgressReporter } from './progress-reporters';

const aspect_ratio = 1;
const image_width = 800;
const image_height = Math.round(image_width / aspect_ratio);
const samples_per_pixel = 100;
const max_depth = 50;

const writer = create_canvas_color_writer(image_width, image_height, document.getElementById('render') as HTMLDivElement);
// const writer = create_array_writer(image_width, image_height, (array) => {
//     console.log(array);
// });


const thread_count = globalThis?.navigator?.hardwareConcurrency
    ? Math.max(1, Math.floor(globalThis?.navigator?.hardwareConcurrency / 2))
    : 4;
// const progress_reporter = new ConsoleProgressReporter(image_height, thread_count);
const progress_reporter = new DomProgressReporter(image_height, thread_count, document.getElementById('stats') as HTMLDivElement);
multi_threaded_render(thread_count, {
    aspect_ratio,
    image_width,
    image_height,
    samples_per_pixel,
    max_depth,
    // line_order: generate_straight_order_u16(image_height)
    line_order: generate_random_permutation_u16(image_height)
}, writer, progress_reporter).catch((e) => {
    console.log(e);
});

//
// single_threaded_render({
//     aspect_ratio,
//     image_width,
//     image_height,
//     samples_per_pixel,
//     max_depth,
//     line_order: generate_random_permutation_u16(image_height)
// }, writer).catch((e) => {
//     console.log(e);
// });
