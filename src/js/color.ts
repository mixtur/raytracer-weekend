import { Color } from "./vec3";

export const writeColor = (image_data: ImageData, x: number, y: number, color: Color): void => {
    image_data.data[(y * image_data.width + x) * 4 + 0] = color[0] * 255.99999;
    image_data.data[(y * image_data.width + x) * 4 + 1] = color[1] * 255.99999;
    image_data.data[(y * image_data.width + x) * 4 + 2] = color[2] * 255.99999;
    image_data.data[(y * image_data.width + x) * 4 + 3] = 255;
}
