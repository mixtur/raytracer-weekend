import { Ray } from './ray';
import { color, Color, vec3Add2, vec3Add3, vec3MulV2, vec3MulV3, vec3MulVAddV4 } from './vec3';
import { Hittable } from './hittable/hittable';

export const ray_color = (r: Ray, background: Color, world: Hittable, depth: number): Color => {
    if (depth <= 0) {
        return color(0, 0, 0);
    }
    {// world
        const hit = world.hit(r, 0.0001, Infinity);
        if (hit !== null) {
            const bounce = hit.material.scatter(hit.material, r, hit);
            let totalEmission = hit.material.emit.value(hit.u, hit.v, hit.p);
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

export const ray_color_iterative = (r: Ray, background: Color, world: Hittable, depth: number): Color => {
    const totalEmission = color(0, 0, 0);
    const totalAttenuation = color(1, 1, 1);
    for (let i = 0; i < depth; i++) {
        const hit = world.hit(r, 0.0001, Infinity);
        if (hit === null) {
            vec3MulVAddV4(totalEmission, totalAttenuation, background, totalEmission);
            break;
        }
        const bounce = hit.material.scatter(hit.material, r, hit);
        const emission = hit.material.emit.value(hit.u, hit.v, hit.p);
        vec3MulVAddV4(totalEmission, totalAttenuation, emission, totalEmission);
        if (bounce) {
            vec3MulV3(totalAttenuation, totalAttenuation, bounce.attenuation);
            r = bounce.scattered;
        } else {
            break;
        }
    }
    return totalEmission;
};
