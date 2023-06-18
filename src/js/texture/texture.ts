import { Color, Point3 } from '../vec3';

export interface Texture {
    value(u: number, v: number, p: Point3): Color;
}

export interface UV {
    u: number;
    v: number;
}

export const uv = (u: number, v: number): UV => {
    return {u, v};
}
