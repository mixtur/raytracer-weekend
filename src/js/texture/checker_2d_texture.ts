import { Texture } from './texture';
import { Color, Point3 } from '../math/vec3';

export class Checker2DTexture implements Texture {
    even: Texture;
    odd: Texture;
    uFrequency: number;
    vFrequency: number;
    constructor(even: Texture, odd: Texture, u_frequency: number, v_frequency: number) {
        this.even = even;
        this.odd = odd;
        this.uFrequency = u_frequency;
        this.vFrequency = v_frequency;
    }

    value(u: number, v: number, p: Point3): Color {
        const U = Math.floor(u * this.uFrequency);
        const V = Math.floor(v * this.vFrequency);
        return (U + V) % 2 !== 0
            ? this.odd.value(u, v, p)
            : this.even.value(u, v, p);
    }
}
