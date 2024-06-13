import { Color } from './math/vec3';
import { clamp } from './utils';

export interface ColorWriter {
    dump_line: (y: number) => void;
    dump_image: () => void;
    write_color: (x: number, y: number, pixelColor: Color, samples_per_pixel: number) => void;
}

export const create_canvas_color_writer = (image_width: number, image_height: number): ColorWriter => {
    const canvas = document.createElement('canvas');
    const _ctx = canvas.getContext('2d');
    if (_ctx === null) {
        throw new Error(`failed to acquire canvas 2d context`);
    }

    const ctx = _ctx;
    canvas.width = image_width;
    canvas.height = image_height;
    document.body.appendChild(canvas);

    const image_data = new ImageData(image_width, image_height);

    return {
        write_color: (x: number, y: number, pixel_color: Color, samples_per_pixel: number): void => {
            let [r, g, b] = pixel_color;
            const scale = 1 / samples_per_pixel;
            r = Math.sqrt(r * scale);
            g = Math.sqrt(g * scale);
            b = Math.sqrt(b * scale);
            image_data.data[(y * image_data.width + x) * 4 + 0] = 256 * clamp(r, 0, 0.999999);
            image_data.data[(y * image_data.width + x) * 4 + 1] = 256 * clamp(g, 0, 0.999999);
            image_data.data[(y * image_data.width + x) * 4 + 2] = 256 * clamp(b, 0, 0.999999);
            image_data.data[(y * image_data.width + x) * 4 + 3] = 255;
        },
        dump_line: (y: number): void => {
            ctx.putImageData(image_data, 0, 0, 0, y, image_width, 1);
        },
        dump_image: (): void => {
            ctx.putImageData(image_data, 0, 0);
        }
    }
};

export const create_array_writer = (image_width: number, image_height: number, image_data_callback: (data: Uint8Array) => void): ColorWriter => {
    const data = new Uint8Array(image_width * image_height * 4);

    return {
        write_color: (x: number, y: number, pixel_color: Color, samples_per_pixel: number): void => {
            let [r, g, b] = pixel_color;
            const scale = 1 / samples_per_pixel;
            r = Math.sqrt(r * scale);
            g = Math.sqrt(g * scale);
            b = Math.sqrt(b * scale);
            data[(x + y * image_width) * 4 + 0] = 256 * clamp(r, 0, 0.999999);
            data[(x + y * image_width) * 4 + 1] = 256 * clamp(g, 0, 0.999999);
            data[(x + y * image_width) * 4 + 2] = 256 * clamp(b, 0, 0.999999);
        },
        dump_line(): void {},
        dump_image(): void {
            image_data_callback(data);
        }
    }
};
