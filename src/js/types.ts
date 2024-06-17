export interface RenderParameters {
    aspect_ratio: number,
    image_width: number,
    image_height: number,
    samples_per_pixel: number,
    max_depth: number,
    line_order: Uint16Array
}

export interface RenderWorkerParametersMessage extends RenderParameters {
    scene_creation_random_numbers: number[],
    first_line_index: number;
}
