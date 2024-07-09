import { Color, color_dirty, mul_vec3_s_r } from '../math/vec3.gen';
import { ColorFlowItem } from '../color-flow';

export interface ColorWriter {
    dump_line: (y: number) => void;
    dump_image: () => void;
    write_color: (x: number, y: number, pixelColor: Color, samples_per_pixel: number, color_flow: ColorFlowItem) => void;
}

export const create_canvas_color_writer = (container: HTMLElement, image_width: number, image_height: number): ColorWriter => {
    const canvas = document.createElement('canvas');
    const _ctx = canvas.getContext('2d');
    if (_ctx === null) {
        throw new Error(`failed to acquire canvas 2d context`);
    }

    const ctx = _ctx;
    canvas.width = image_width;
    canvas.height = image_height;
    container.appendChild(canvas);

    const image_data = new ImageData(image_width, image_height);
    const output_color = color_dirty();

    return {
        write_color: (x: number, y: number, pixel_color: Color, samples_per_pixel: number, color_flow: ColorFlowItem): void => {
            mul_vec3_s_r(output_color, pixel_color, 1 / samples_per_pixel);
            color_flow(output_color, output_color);
            image_data.data[(y * image_data.width + x) * 4 + 0] = 256 * output_color[0];
            image_data.data[(y * image_data.width + x) * 4 + 1] = 256 * output_color[1];
            image_data.data[(y * image_data.width + x) * 4 + 2] = 256 * output_color[2];
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
    const output_color = color_dirty();

    return {
        write_color: (x: number, y: number, pixel_color: Color, samples_per_pixel: number, color_flow: ColorFlowItem): void => {
            mul_vec3_s_r(output_color, pixel_color, 1 / samples_per_pixel);
            color_flow(output_color, output_color);
            data[(x + y * image_width) * 4 + 0] = 256 * output_color[0];
            data[(x + y * image_width) * 4 + 1] = 256 * output_color[1];
            data[(x + y * image_width) * 4 + 2] = 256 * output_color[2];
        },
        dump_line(): void {},
        dump_image(): void {
            image_data_callback(data);
        }
    }
};
