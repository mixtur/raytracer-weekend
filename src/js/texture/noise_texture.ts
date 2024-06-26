import { Texture } from './texture';
import { color, Color, mul_vec3_s, Point3 } from '../math/vec3.gen';
import { Perlin } from './perlin';

export class NoiseTexture implements Texture {
    scale: number;
    constructor(scale: number) {
        this.scale = scale;
    }
    noise = new Perlin();
    value(u: number, v: number, p: Point3): Color {
        return mul_vec3_s(color(1, 1, 1), 0.5 * (1 + Math.sin(this.scale * p[2] + 10 * this.noise.turb(p, 7))));
    }
}
