import { Texture } from './texture';
import { color, Color, Point3 } from '../vec3';
import { clamp } from '../utils';

export class ImageTexture implements Texture {
    private readonly imageData: ImageData;
    constructor(bmp: ImageBitmap) {
        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = bmp.width;
        tmpCanvas.height = bmp.height;
        const ctx = tmpCanvas.getContext('2d');
        if (ctx === null) {
            throw new Error('cannot acquire canvas 2d context');
        }
        ctx.drawImage(bmp, 0, 0);
        this.imageData = ctx.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height);
    }

    value(u: number, v: number, p: Point3): Color {
        const {data, width, height} = this.imageData;
        const i = Math.floor(clamp(u, 0, 1) * width);
        const j = Math.floor((1 - clamp(v, 0, 1)) * height);

        const offset = (j * width + i) * 4;
        const r = data[offset];
        const g = data[offset + 1];
        const b = data[offset + 2];

        return color(r / 255, g / 255, b / 255);
    }
}
