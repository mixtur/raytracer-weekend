import { HDRPixelsData } from './types';

export const decode_gamma = (gamma: number, pixels_data: HDRPixelsData): HDRPixelsData => {
    return {
        width: pixels_data.width,
        height: pixels_data.height,
        pixels: pixels_data.pixels.map((p, i) => {
            if (i % 4 === 3) return p;
            return p ** gamma;
        })
    };
}
