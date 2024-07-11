import { create_scene } from './scene';
import { create_camera } from '../camera';
import { solid_color } from '../texture/solid_color';
import { ArenaVec3Allocator, point3, use_vec3_allocator, vec3 } from '../math/vec3.gen';
import { create_diffuse_light } from '../materials/diffuse_light';
import { create_lambertian } from '../materials/lambertian';
import { create_isotropic_phase_function } from '../materials/isotropic_phase_function';
import { Skybox } from '../hittable/skybox';
import { trs_to_mat3x4 } from '../math/mat3.gen';
import { axis_angle_to_quat } from '../math/quat.gen';
import { degrees_to_radians, run_with_hooks } from '../utils';
import { create_quad } from '../hittable/quad';
import { create_bvh_node } from '../hittable/bvh';
import { create_constant_medium } from '../hittable/constant_medium';
import { create_transform } from '../hittable/transform';
import { create_box } from '../hittable/box';

export const create = () => {
    const red = create_lambertian(solid_color(.65, .05, .05));
    const white = create_lambertian(solid_color(.73, .73, .73));
    const green = create_lambertian(solid_color(.12, .45, .15));
    const light = create_diffuse_light(solid_color(7, 7, 7));

    const light_hittable = create_quad(point3(113,554,127), vec3(330,0,0), vec3(0,0,305), light);

    return run_with_hooks(() => {
        use_vec3_allocator(new ArenaVec3Allocator(1024));
        return create_scene({
            root_hittable: create_bvh_node([
                create_quad(point3(555, 0, 0), vec3(0, 555, 0), vec3(0, 0, 555), green),
                create_quad(point3(0, 0, 0), vec3(0, 555, 0), vec3(0, 0, 555), red),
                light_hittable,
                create_quad(point3(0, 555, 0), vec3(555, 0, 0), vec3(0, 0, 555), white),
                create_quad(point3(0, 0, 0), vec3(555, 0, 0), vec3(0, 0, 555), white),
                create_quad(point3(0, 0, 555), vec3(555, 0, 0), vec3(0, 555, 0), white),

                create_constant_medium(
                    create_transform(
                        trs_to_mat3x4(
                            vec3(265, 0, 295),
                            axis_angle_to_quat(vec3(0, 1, 0), degrees_to_radians(15)),
                            vec3(1, 1, 1)
                        ),
                        create_box(point3(0, 0, 0), point3(165, 330, 165), white),
                    ),
                    0.01,
                    create_isotropic_phase_function(solid_color(0, 0, 0))
                ),

                create_constant_medium(
                    create_transform(
                        trs_to_mat3x4(
                            vec3(130, 0, 65),
                            axis_angle_to_quat(vec3(0, 1, 0), degrees_to_radians(-18)),
                            vec3(1, 1, 1)
                        ),
                        create_box(point3(0, 0, 0), point3(165, 165, 165), white)
                    ),
                    0.01,
                    create_isotropic_phase_function(solid_color(1, 1, 1))
                )
            ], 0, 1),

            light: light_hittable,

            camera: create_camera({
                look_from: point3(278, 278, -800),
                look_at: point3(278, 278, 0),
                v_up: vec3(0, 1, 0),
                focus_dist: 10,
                aperture: 0,
                y_fov: 40,
                time0: 0,
                time1: 1
            }),
            background: Skybox.create_black()
        });
    });
};
