import { Texture } from './texture';
import { Color, Point3 } from '../math/vec3.gen';

export class Checker3DTexture implements Texture {
    even: Texture;
    odd: Texture;
    constructor(even: Texture, odd: Texture) {
        this.even = even;
        this.odd = odd;
    }

    value(u: number, v: number, p: Point3): Color {
        const sines = Math.sin(10*p[0]) * Math.sin(10*p[1]) * Math.sin(10*p[2]);
        return sines < 0
            ? this.odd.value(u, v, p)
            : this.even.value(u, v, p);
    }
}
