import { Texture, texture_get_value } from './texture';
import { color, Color } from '../math/vec3.gen';

export interface ISolidColor extends Texture{
    type: 'solid';
    color: Color;
}

texture_get_value.solid = (tex) => (tex as ISolidColor).color;

export const create_solid_color = (color: Color) => {
    return {
        type: 'solid',
        color
    };
}

export const solid_color = (r: number, g: number, b: number): ISolidColor => {
    return {
        type: 'solid',
        color: color(r, g, b)
    };
};
