import { Scene } from './scene';
import { Camera } from '../camera';
import { HittableList } from '../hittable/hittable_list';
import { sColor } from '../texture/solid_color';
import { YZRect } from '../hittable/yz_rect';
import { XZRect } from '../hittable/xz_rect';
import { XYRect } from '../hittable/xy_rect';
import { color, point3, vec3 } from '../math/vec3';
import { Box } from '../hittable/box';
import { RotateY } from '../hittable/rotate_y';
import { Translate } from '../hittable/translate';
import { createLambertian } from '../materials/lambertian';
import { createDiffuseLight } from '../materials/diffuse_light';

const red = createLambertian(sColor(.65, .05, .05));
const white = createLambertian(sColor(.73, .73, .73));
const green = createLambertian(sColor(.12, .45, .15));
const light = createDiffuseLight(sColor(15, 15, 15));

export const cornell_box: Scene = {
    root_hittable: new HittableList([
        new YZRect(0,   555, 0,   555, 555, green),
        new YZRect(0,   555, 0,   555, 0,   red),
        new XZRect(213, 343, 227, 332, 554, light),
        new XZRect(0,   555, 0,   555, 555, white),
        new XZRect(0,   555, 0,   555, 0,   white),
        new XYRect(0,   555, 0,   555, 555, white),

        new Translate(
            new RotateY(
                new Box(point3(0, 0, 0), point3(165, 330, 165), white),
                15
            ),
            vec3(265, 0, 295)
        ),
        new Translate(
            new RotateY(
                new Box(point3(0, 0, 0), point3(165, 165, 165), white),
                -18
            ),
            vec3(130, 0, 65)
        )
    ]),
    create_camera(aspect_ratio: number): Camera {
        const look_from = point3(278, 278, -800);
        const look_at = point3(278, 278, 0);

        return new Camera({
            look_from,
            look_at,
            v_up: vec3(0, 1, 0),
            focus_dist: 10,
            aspect_ratio,
            aperture: 0,
            y_fov: 40,
            time0: 0,
            time1: 1
        });
    },
    background: color(0, 0, 0)
};
