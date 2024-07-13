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
    work: TileScheduleItem[],
    max_depth: number,
    scene: Scene
}
