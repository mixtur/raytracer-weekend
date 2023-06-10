import { Color } from "./vec3";
import { clamp } from './utils';

export const writeColor = (image_data: ImageData, x: number, y: number, color: Color, samples_per_pixel): void => {
    let [r, g, b] = color;
    const scale = 1 / samples_per_pixel;
    r = Math.sqrt(r * scale);
    g = Math.sqrt(g * scale);
    b = Math.sqrt(b * scale);
    image_data.data[(y * image_data.width + x) * 4 + 0] = 256 * clamp(r, 0, 0.999999);
    image_data.data[(y * image_data.width + x) * 4 + 1] = 256 * clamp(g, 0, 0.999999);
    image_data.data[(y * image_data.width + x) * 4 + 2] = 256 * clamp(b, 0, 0.999999);
    image_data.data[(y * image_data.width + x) * 4 + 3] = 255;
}
