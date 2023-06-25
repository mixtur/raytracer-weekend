import {
    color,
    vec3Add3,
    vec3AllocatorScope
} from './vec3';
import { ArenaVec3Allocator } from './vec3_allocators';
// import { simple_light } from './scenes/simple_light';
// import { create_earth_scene } from './scenes/earth';
// import { lots_of_spheres } from './scenes/lots_of_spheres';
// import { two_spheres } from './scenes/two_spheres';
// import { two_perlin_spheres } from './scenes/two_perlin_spheres';
// import { cornell_box } from './scenes/cornell_box';
import { ColorWriter, createArrayWriter, createCanvasColorWriter } from './color-writers';
import { cornell_box_with_smoke } from './scenes/cornell_box_with_smoke';
import { ray_color } from './ray_color';
import { RenderWorkerMessageData } from './render_worker';
import { RenderParameters } from './types';
import { multiThreadedRender } from './miulti_threaded_render';
import { singleThreadedRender } from './single_threaded_render';

const aspect_ratio = 1;
const image_width = 600;
const image_height = Math.round(image_width / aspect_ratio);
const samples_per_pixel = 200;
const max_depth = 50;

const writer = createCanvasColorWriter(image_width, image_height);
// const { writeColor, dumpLine, dumpImage } = createArrayWriter(image_width, image_height, (array) => {
//     console.log(array);
// });

multiThreadedRender(4, {
    aspect_ratio,
    image_width,
    image_height,
    samples_per_pixel,
    max_depth
}, writer).catch((e) => {
    console.log(e);
});


// singleThreadedRender({
//     aspect_ratio,
//     image_width,
//     image_height,
//     samples_per_pixel,
//     max_depth
// }, writer).catch((e) => {
//     console.log(e);
// });
