import { createArrayWriter, createCanvasColorWriter } from './color-writers';
// import { singleThreadedRender } from './single_threaded_render';
import { multiThreadedRender } from './multi_threaded_render';
import { randomIntMinMax } from './math/random';

const aspect_ratio = 1;
const image_width = 500;
const image_height = Math.round(image_width / aspect_ratio);
const samples_per_pixel = 1000;
const max_depth = 50;

const writer = createCanvasColorWriter(image_width, image_height);
// const writer = createArrayWriter(image_width, image_height, (array) => {
//     console.log(array);
// });


//this is needed for all threads to work on the same scene, that is yet random. (didn't want to bother with seeded random)
const scene_creation_random_numbers = [];
for (let i = 0; i < 2048; i++) {
    scene_creation_random_numbers.push(Math.random());
}


function permute(xs: Uint16Array): void {
    for (let i = xs.length - 1; i >= 0; i--) {
        const j = randomIntMinMax(0, i);
        const t = xs[i];
        xs[i] = xs[j];
        xs[j] = t;
    }
}

const jRand = new Uint16Array(image_height);
for (let i = 0; i < image_height; i++) { jRand[i] = i; }
permute(jRand);

multiThreadedRender(globalThis?.navigator?.hardwareConcurrency ?? 4, {
    aspect_ratio,
    image_width,
    image_height,
    samples_per_pixel,
    max_depth,
    scene_creation_random_numbers,
    line_order: jRand
}, writer).catch((e) => {
    console.log(e);
});


// singleThreadedRender({
//     aspect_ratio,
//     image_width,
//     image_height,
//     samples_per_pixel,
//     max_depth,
//     scene_creation_random_numbers
// }, writer).catch((e) => {
//     console.log(e);
// });
