import { Texture } from './texture';
import { color, Color, Point3 } from '../math/vec3.gen';
import { clamp } from '../utils';

export class ImageTexture implements Texture {
    private readonly imageData: ImageData;
    constructor(bmp: ImageBitmap) {
        const tmp_canvas = new OffscreenCanvas(bmp.width, bmp.height);
        const ctx = tmp_canvas.getContext('2d');
        if (ctx === null) {
            throw new Error('cannot acquire canvas 2d context');
        }
        ctx.drawImage(bmp, 0, 0);
        this.imageData = ctx.getImageData(0, 0, tmp_canvas.width, tmp_canvas.height);
    }

    value(u: number, v: number, p: Point3): Color {
        const {data, width, height} = this.imageData;
        const i = Math.floor(clamp(u, 0, 1) * width);
        const j = Math.floor((1 - clamp(v, 0, 1)) * height);

        const offset = (j * width + i) * 4;
        const r = data[offset];
        const g = data[offset + 1];
        const b = data[offset + 2];

        return color((r / 255) ** 2.2, (g / 255) ** 2.2, (b / 255) ** 2.2);
    }
}
