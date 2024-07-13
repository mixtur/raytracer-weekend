import { create_array_writer, create_canvas_color_writer } from '../ui/color-writers';
import { single_threaded_render } from '../single_threaded_render';
import { multi_threaded_render } from '../multi_threaded_render';
import { ConsoleProgressReporter, MultipleReporters, ProgressBar, ProgressText } from '../progress-reporters';
import { ACES, apply_gamma, clip_to_unit_range, compose_color_flow, expose } from '../color-flow';
import { scenes } from '../scenes/index';

const aspect_ratio = 1;
const image_width = 843;
const image_height = Math.round(image_width / aspect_ratio);
const samples_per_pixel = 101;
const max_depth = 50;

const thread_count = globalThis?.navigator?.hardwareConcurrency
    ? globalThis?.navigator?.hardwareConcurrency - 1
    : 4;

const params = new URLSearchParams(location.search);
const scene_index_str = params.get('scene');
if (scene_index_str === null) {
    throw new Error(`No scene index`);
}
const scene_index = parseInt(scene_index_str);
if (Number.isNaN(scene_index)) {
    throw new Error(`Bad scene index.`);
}
const scene_tuple = scenes[scene_index];
if (scene_tuple === undefined) {
    throw new Error(`No such scene index ${scene_index}`);
}

const [scene_name, _scene_tag, load_scene] = scene_tuple;

document.title = scene_name + ' - Ray tracing in one weekend.'

const scene = await load_scene();

const progress_reporter = new MultipleReporters([
    // new ConsoleProgressReporter(image_height, thread_count),
    new ProgressBar(document.getElementById('top-row') as HTMLDivElement, thread_count),
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
        scene
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
//     scene
// }, writer, color_flow).catch((e) => {
//     console.log(e);
// });
