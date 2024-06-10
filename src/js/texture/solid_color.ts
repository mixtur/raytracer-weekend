import { Texture } from './texture';
import { color, Color } from '../math/vec3';

export class SolidColor implements Texture {
    color: Color;
    constructor(color: Color) {
        this.color = color;
    }
    value(u: number, v: number): Color {
        return this.color;
    }
}

export const sColor = (r: number, g: number, b: number) => new SolidColor(color(r, g, b));
