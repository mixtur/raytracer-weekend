import { Ray } from './ray';
import { color, Color, vec3Add2, vec3Add3, vec3MulV2 } from './vec3';
import { Hittable } from './hittable/hittable';
import { dispatch_scatter } from './materials/dispatch_scatter';

export const ray_color = (r: Ray, background: Color, world: Hittable, depth: number): Color => {
    if (depth <= 0) {
        return color(0, 0, 0);
    }
    {// world
        const hit = world.hit(r, 0.0001, Infinity);
        if (hit !== null) {
            // const bounce = hit.material.scatter(r, hit);
            const bounce = dispatch_scatter(hit.material, r, hit);
            let totalEmission = hit.material.emitted(hit.u, hit.v, hit.p);
            if (bounce) {
                const bounceColor = ray_color(bounce.scattered, background, world, depth - 1);
                //vec3Add3 shouldn't work here because we may screw up the light source
                totalEmission = vec3Add2(totalEmission, vec3MulV2(bounceColor, bounce.attenuation));
            }
            return totalEmission;
        }
    }

    return background;
};

