import { HDRPixelsData } from './types';


export const load_dom_image = async (url: string): Promise<HDRPixelsData> => {
    const response = await fetch(url);
    const image_bitmap = await createImageBitmap(await response.blob());
    const tmp_canvas = new OffscreenCanvas(image_bitmap.width, image_bitmap.height);
    const ctx = tmp_canvas.getContext('2d');
    if (ctx === null) {
        throw new Error('cannot acquire canvas 2d context');
    }
    ctx.drawImage(image_bitmap, 0, 0);
    const image_data = ctx.getImageData(0, 0, tmp_canvas.width, tmp_canvas.height);

    const elements_count = image_data.width * image_data.height * 4;
    const pixels = new Float64Array(elements_count);

    for (let i = 0; i < elements_count; i++) {
        pixels[i] = image_data.data[i] / 255;
    }

    return {
        width: image_data.width,
        height: image_data.height,
        pixels
    };
}
