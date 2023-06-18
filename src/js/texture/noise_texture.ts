import { Texture } from './texture';
import { color, Color, Point3, vec3MulS2 } from '../vec3';
import { Perlin } from './perlin';

export class NoiseTexture implements Texture {
    scale: number;
    constructor(scale: number) {
        this.scale = scale;
    }
    noise = new Perlin();
    value(u: number, v: number, p: Point3): Color {
        return vec3MulS2(color(1, 1, 1), 0.5 * (1 + Math.sin(this.scale * p[2] + 10 * this.noise.turb(p, 7))));
    }
}
