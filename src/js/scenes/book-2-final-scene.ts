import { create_scene, Scene } from './scene';
import { add_vec3, ArenaVec3Allocator, point3, rand_vec3_min_max, use_vec3_allocator, vec3 } from '../math/vec3.gen';
import { solid_color } from '../texture/solid_color';
import { random_min_max } from '../math/random';
import earthUrl from './earthmap.jpg';
import { create_camera } from '../camera';
import { create_diffuse_light } from '../materials/diffuse_light';
import { create_dielectric } from '../materials/dielectric';
import { create_metal } from '../materials/metal';
import { create_isotropic_phase_function } from '../materials/isotropic_phase_function';
import { create_lambertian } from '../materials/lambertian';
import { async_run_with_hooks, degrees_to_radians } from '../utils';
import { load_dom_image } from '../texture/image-parsers/image-bitmap';
import { Skybox } from '../hittable/skybox';
import { trs_to_mat3x4 } from '../math/mat3.gen';
import { axis_angle_to_quat } from '../math/quat.gen';
import { create_hittable_list } from '../hittable/hittable_list';
import { create_zx_grid, zx_grid_add_hittable } from '../hittable/zx-grid';
import { create_box } from '../hittable/box';
import { create_quad } from '../hittable/quad';
import { create_moving_sphere } from '../hittable/moving_sphere';
import { create_sphere } from '../hittable/sphere';
import { create_constant_medium } from '../hittable/constant_medium';
import { Hittable } from '../hittable/hittable';
import { create_transform } from '../hittable/transform';
import { create_bvh_node } from '../hittable/bvh';
import { create_image_texture } from '../texture/image_texture';
import { create_noise_texture } from '../texture/noise_texture';

export const create = async (): Promise<Scene> => {
    return async_run_with_hooks(async (): Promise<Scene> => {
        use_vec3_allocator(new ArenaVec3Allocator(1024 * 6, true));

        const objects = create_hittable_list([]);

        const ground = create_lambertian(solid_color(0.48, 0.83, 0.53));
        const boxes_per_side = 20;

        const w = 100.0;
        const y0 = 0.0;
        const boxes1 = create_zx_grid(boxes_per_side, boxes_per_side, 101, w, point3(-1000, 0, -1000));
        for (let i = 0; i < boxes_per_side; i++) {
            const x0 = -1000.0 + i * w;
            const x1 = x0 + w;
            for (let j = 0; j < boxes_per_side; j++) {
                const z0 = -1000.0 + j * w;
                const y1 = random_min_max(1, 101);
                const z1 = z0 + w;

                zx_grid_add_hittable(boxes1, i, j, create_box(point3(x0, y0, z0), point3(x1, y1, z1), ground));
            }
        }
        objects.objects.push(boxes1);
        const light = create_diffuse_light(solid_color(7, 7, 7));
        const light_hittable = create_quad(point3(123, 554, 147), vec3(300, 0, 0), vec3(0, 0, 265), light);
        objects.objects.push(light_hittable);

        const center1 = point3(400, 400, 200);
        const center2 = add_vec3(center1, vec3(30, 0, 0));

        const moving_sphere_material = create_lambertian(solid_color(0.7, 0.3, 0.1));
        objects.objects.push(create_moving_sphere(center1, center2, 0, 1, 50, moving_sphere_material));

        objects.objects.push(create_sphere(point3(260, 150, 45), 50, create_dielectric(1.5)));
        objects.objects.push(create_sphere(
            point3(0, 150, 145), 50, create_metal(solid_color(0.8, 0.8, 0.9), 1.0)
        ));

        const subsurface_scattering_sphere = create_sphere(point3(360, 150, 145), 70, create_dielectric(1.5));
        objects.objects.push(subsurface_scattering_sphere);
        objects.objects.push(create_constant_medium(subsurface_scattering_sphere, 0.2, create_isotropic_phase_function(solid_color(0.2, 0.4, 0.9))));

        const fog_boundary = create_sphere(point3(0, 0, 0), 5000, create_dielectric(1.5));
        objects.objects.push(create_constant_medium(fog_boundary, .0001, create_isotropic_phase_function(solid_color(1, 1, 1))));
        const emat = create_lambertian(create_image_texture(await load_dom_image(earthUrl), {
            flip_y: true,
            decode_srgb: true
        }));
        objects.objects.push(create_sphere(point3(400, 200, 400), 100, emat));
        const pertext = create_noise_texture(0.2);
        objects.objects.push(create_sphere(point3(220, 280, 300), 80, create_lambertian(pertext)));

        const spheres: Hittable[] = [];
        const white = create_lambertian(solid_color(.73, .73, .73));
        const ns = 1000;
        for (let j = 0; j < ns; j++) {
            spheres.push(create_sphere(rand_vec3_min_max(0, 165), 10, white));
        }

        objects.objects.push(create_transform(
            trs_to_mat3x4(
                vec3(-100, 270, 395),
                axis_angle_to_quat(vec3(0, 1, 0), degrees_to_radians(15)),
                vec3(1, 1, 1)
            ),
            create_bvh_node(spheres, 0.0, 1.0)
        ));

        return create_scene({
            root_hittable: objects,
            // light: light_hittable,
            light: create_hittable_list([
                light_hittable,
                subsurface_scattering_sphere
            ]),
            camera: create_camera({
                look_from: point3(478, 278, -600),
                look_at: point3(278, 278, 0),
                y_up: vec3(0, 1, 0),
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
