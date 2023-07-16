import { Texture } from '../texture/texture';
import { createMegaMaterial, MegaMaterial, ScatterFunction } from './megamaterial';

export const createDiffuseLight = (emit: Texture): MegaMaterial => createMegaMaterial(diffuse_light_scatter, null, { emit });

export const diffuse_light_scatter: ScatterFunction = () => false;
