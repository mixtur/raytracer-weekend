import { Scene } from './scenes/scene';
import { TileScheduleItem } from './work-scheduling';

export interface RenderParameters {
    aspect_ratio: number,
    image_width: number,
    image_height: number,
    samples_per_pixel: number,
    max_depth: number,
    scene: Scene
}

export interface InitRenderWorkerParameters {
    aspect_ratio: number,
    image_width: number,
    image_height: number,
    samples_per_pixel: number,
    work: TileScheduleItem[],
    max_depth: number,
    scene: Scene
}

export type TypedArray = Uint8Array | Uint8ClampedArray | Uint16Array | Uint32Array | Int8Array | Int16Array | Int32Array | Float32Array;
