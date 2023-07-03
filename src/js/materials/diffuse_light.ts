import { Texture } from '../texture/texture';
import { register_scatter_id } from './register_scatter_id';
import { createMegaMaterial, MegaMaterial, ScatterFunction } from './megamaterial';

export const diffuse_light_scatter_id = register_scatter_id();

export const createDiffuseLight = (emit: Texture): MegaMaterial => createMegaMaterial(diffuse_light_scatter, { emit });

export const diffuse_light_scatter: ScatterFunction = (): null => null;
