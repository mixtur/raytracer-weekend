import { Scene } from './scenes/scene';

export interface RenderParameters {
    aspect_ratio: number,
    image_width: number,
    image_height: number,
    samples_per_pixel: number,
    max_depth: number,
    line_order: Uint16Array,
    scene: Scene
}

export interface RenderWorkerParametersMessage extends RenderParameters {
    first_line_index: number;
}
