import { create_scene, Scene } from './scene';
import { create_camera } from '../camera';
import { solid_color } from '../texture/solid_color';
import { ArenaVec3Allocator, point3, use_vec3_allocator, vec3 } from '../math/vec3.gen';
import { create_lambertian } from '../materials/lambertian';
import { create_diffuse_light } from '../materials/diffuse_light';
import { create_metal } from '../materials/metal';
import { create_dielectric } from '../materials/dielectric';
import { degrees_to_radians, run_with_hooks } from '../utils';
import { trs_to_mat3x4 } from '../math/mat3.gen';
import { axis_angle_to_quat } from '../math/quat.gen';
import { Skybox } from '../hittable/skybox';
import { create_quad } from '../hittable/quad';
import { create_transform } from '../hittable/transform';
import { create_box } from '../hittable/box';
import { create_sphere } from '../hittable/sphere';
import { create_hittable_list } from '../hittable/hittable_list';

const hittables = run_with_hooks(() => {
    use_vec3_allocator(new ArenaVec3Allocator(128));

    const aluminum = create_metal(solid_color(0.8, 0.85, 0.88), 0);
    const glass = create_dielectric(1.5);
    const red = create_lambertian(solid_color(.65, .05, .05));
    const white = create_lambertian(solid_color(.73, .73, .73));
    const green = create_lambertian(solid_color(.12, .45, .15));
    const light = create_diffuse_light(solid_color(15, 15, 15));

    const light_hittable = create_quad(point3(343, 554, 332), vec3(-130,0,0), vec3(0,0,-105), light);

    const metal_box = create_transform(
        trs_to_mat3x4(
            vec3(265, 0, 295),
            axis_angle_to_quat(vec3(0, 1, 0), degrees_to_radians(15)),
            vec3(1, 1, 1)
        ),
        create_box(point3(0, 0, 0), point3(165, 330, 165), aluminum)
    );

    const glass_sphere = create_sphere(point3(190,90,190), 90, glass);
    const root = create_hittable_list([
        create_quad(point3(555, 0, 0), vec3(0, 555, 0), vec3(0, 0, 555), green),
        create_quad(point3(0, 0, 0), vec3(0, 555, 0), vec3(0, 0, 555), red),
        light_hittable,
        create_quad(point3(0, 555, 0), vec3(555, 0, 0), vec3(0, 0, 555), white),
        create_quad(point3(0, 0, 0), vec3(555, 0, 0), vec3(0, 0, 555), white),
        create_quad(point3(0, 0, 555), vec3(555, 0, 0), vec3(0, 555, 0), white),

        metal_box,
        glass_sphere,
        // create_transform(
        //     trs_to_mat3x4(
        //         vec3(130, 0, 65),
        //         axis_angle_to_quat(vec3(0, 1, 0), degrees_to_radians(-18)),
        //         vec3(1, 1 ,1)
        //     ),
        //     create_box(point3(0, 0, 0), point3(165, 165, 165), white)
        // )
    ]);

    return {
        root,
        light: create_hittable_list([
            light_hittable,
            glass_sphere,
            metal_box
        ])
    };
});

export const cornell_box_matrix: Scene = create_scene({
    root_hittable: hittables.root,
    light: hittables.light,
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
