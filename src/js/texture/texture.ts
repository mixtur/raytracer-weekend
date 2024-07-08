import { Color, Point3 } from '../math/vec3.gen';

export interface Texture {
    type: string;
}

export interface UV {
    u: number;
    v: number;
}

export const uv = (u: number, v: number): UV => {
    return {u, v};
}

export type GetTextureValue = (tex: Texture, u: number, v: number, p: Point3) => Color;

export const texture_get_value: Record<string, GetTextureValue> = {};
