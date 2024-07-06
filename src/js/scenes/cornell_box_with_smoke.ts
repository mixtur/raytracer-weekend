import { create_scene, Scene } from './scene';
import { Camera } from '../camera';
import { solid_color } from '../texture/solid_color';
import { Quad } from '../hittable/quad';
import { point3, vec3 } from '../math/vec3.gen';
import { Box } from '../hittable/box';
import { ConstantMedium } from '../hittable/constant_medium';
import { create_diffuse_light } from '../materials/diffuse_light';
import { create_lambertian } from '../materials/lambertian';
import { create_isotropic_phase_function } from '../materials/isotropic_phase_function';
import { BVHNode } from '../hittable/bvh';
import { Skybox } from '../hittable/skybox';
import { Transform } from '../hittable/transform';
import { trs_to_mat3x4 } from '../math/mat3.gen';
import { axis_angle_to_quat } from '../math/quat.gen';
import { degrees_to_radians } from '../utils';

const red = create_lambertian(solid_color(.65, .05, .05));
const white = create_lambertian(solid_color(.73, .73, .73));
const green = create_lambertian(solid_color(.12, .45, .15));
const light = create_diffuse_light(solid_color(7, 7, 7));

const light_hittable = new Quad(point3(113,554,127), vec3(330,0,0), vec3(0,0,305), light);

export const cornell_box_with_smoke: Scene = create_scene({
    root_hittable: new BVHNode([
        new Quad(point3(555,0,0), vec3(0,555,0), vec3(0,0,555), green),
        new Quad(point3(0,0,0), vec3(0,555,0), vec3(0,0,555), red),
        light_hittable,
        new Quad(point3(0,555,0), vec3(555,0,0), vec3(0,0,555), white),
        new Quad(point3(0,0,0), vec3(555,0,0), vec3(0,0,555), white),
        new Quad(point3(0,0,555), vec3(555,0,0), vec3(0,555,0), white),

        new ConstantMedium(
            new Transform(
                trs_to_mat3x4(
                    vec3(265, 0, 295),
                    axis_angle_to_quat(vec3(0, 1, 0), degrees_to_radians(15)),
                    vec3(1, 1, 1)
                ),
                new Box(point3(0, 0, 0), point3(165, 330, 165), white),
            ),
            0.01,
            create_isotropic_phase_function(solid_color(0, 0, 0))
        ),

        new ConstantMedium(
            new Transform(
                trs_to_mat3x4(
                    vec3(130, 0, 65),
                    axis_angle_to_quat(vec3(0, 1, 0), degrees_to_radians(-18)),
                    vec3(1, 1, 1)
                ),
                new Box(point3(0, 0, 0), point3(165, 165, 165), white)
            ),
            0.01,
            create_isotropic_phase_function(solid_color(1, 1, 1))
        )
    ], 0, 1),

    light: light_hittable,

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
    background: Skybox.create_black()
});
