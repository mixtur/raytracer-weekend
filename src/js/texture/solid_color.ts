import { Texture } from './texture';
import { color, Color } from '../math/vec3.gen';

export class SolidColor implements Texture {
    color: Color;
    constructor(color: Color) {
        this.color = color;
    }
    value(u: number, v: number): Color {
        return this.color;
    }
}

export const solid_color = (r: number, g: number, b: number) => new SolidColor(color(r, g, b));
