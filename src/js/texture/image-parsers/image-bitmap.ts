import { PixelsData } from './types';


export const load_dom_image = async (url: string): Promise<PixelsData> => {
    const response = await fetch(url);
    const image_bitmap = await createImageBitmap(await response.blob(), {
        premultiplyAlpha: 'none',
        colorSpaceConversion: 'none'
    });
    const tmp_canvas = new OffscreenCanvas(image_bitmap.width, image_bitmap.height);
    const ctx = tmp_canvas.getContext('2d');
    if (ctx === null) {
        throw new Error('cannot acquire canvas 2d context');
    }
    ctx.drawImage(image_bitmap, 0, 0);
    const image_data = ctx.getImageData(0, 0, tmp_canvas.width, tmp_canvas.height);

    const pixels = new Uint8Array(new SharedArrayBuffer(image_data.data.buffer.byteLength));
    pixels.set(image_data.data);

    return {
        width: image_data.width,
        height: image_data.height,
        pixels,
        normalization: 1 / 255
    };
}
