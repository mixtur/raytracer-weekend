import {
    add_vec3,
    ArenaVec3Allocator,
    len_vec3,
    point3,
    rand_vec3,
    rand_vec3_min_max,
    sub_vec3,
    use_vec3_allocator,
    vec3
} from '../math/vec3.gen';
import { create_checker_3d_texture } from '../texture/checker_3d_texture';
import { create_solid_color, solid_color } from '../texture/solid_color';
import { random, random_min_max } from '../math/random';
import { create_camera } from '../camera';
import { create_scene, Scene } from './scene';
import { create_lambertian } from '../materials/lambertian';
import { create_metal } from '../materials/metal';
import { create_dielectric } from '../materials/dielectric';
import { MegaMaterial } from '../materials/megamaterial';
import { run_with_hooks } from '../utils';
import { Skybox } from '../hittable/skybox';
import { Hittable } from '../hittable/hittable';
import { create_sphere } from '../hittable/sphere';
import { create_moving_sphere } from '../hittable/moving_sphere';
import { create_zx_grid, zx_grid_add_hittable } from '../hittable/zx-grid';
import { create_bvh_node } from '../hittable/bvh';

function create_lots_of_spheres(): Hittable {
    return run_with_hooks(() => {
        use_vec3_allocator(new ArenaVec3Allocator(1024 * 4, true))
        const world_objects: Hittable[] = [];
        const ground_material = create_lambertian(create_checker_3d_texture(solid_color(0.2, 0.3, 0.1), solid_color(0.9, 0.9, 0.9)));
        world_objects.push(create_sphere(point3(0, -1000, 0), 1000, ground_material));
        const objects = [];
        for (let a = -11; a < 11; a++) {
            for (let b = -11; b < 11; b++) {
                const choose_mat = random();
                const center1 = point3(a + 0.2 + 0.6 * random(), 0.2, b + 0.2 + 0.6 * random());
                if (len_vec3(sub_vec3(center1, point3(4, 0.2, 0))) > 0.9) {
                    let sphere_mat: MegaMaterial;
                    if (choose_mat < 0.8) {
                        sphere_mat = create_lambertian(create_solid_color(rand_vec3()));
                    } else if (choose_mat < 0.95) {
                        sphere_mat = create_metal(create_solid_color(rand_vec3_min_max(0.5, 1)), random_min_max(0, 0.5));
                    } else {
                        sphere_mat = create_dielectric(1.5);
                    }
                    const center2 = add_vec3(center1, vec3(0, random_min_max(0, 0.5), 0));
                    objects.push({
                        xCell: a + 11,
                        zCell: b + 11,
                        obj: create_moving_sphere(center1, center2, 0, 1, 0.2, sphere_mat)
                    });
                }
            }
        }
        const grid = create_zx_grid(22, 22, 0.9, 1, vec3(-11, 0, -11));
        for (const obj of objects) { zx_grid_add_hittable(grid, obj.xCell, obj.zCell, obj.obj); }
        world_objects.push(grid);

        // const bvh = new BVHNode(objects.map(o => o.obj), 0, 1);
        // world_objects.push(bvh);

        // const plainList = new HittableList(objects.map(o => o.obj));
        // world_objects.push(plainList);

        const mat1 = create_dielectric(1.5);
        const mat2 = create_lambertian(solid_color(0.4, 0.2, 0.1));
        const mat3 = create_metal(solid_color(0.7, 0.6, 0.5), 0.0);

        world_objects.push(create_sphere(point3(0, 1, 0), 1.0, mat1));
        world_objects.push(create_sphere(point3(-4, 1, 0), 1.0, mat2));
        world_objects.push(create_sphere(point3(4, 1, 0), 1.0, mat3));

        return create_bvh_node(world_objects, 0, 1);
        // return new HittableList(world_objects);
    });
}

export const create = (): Scene => create_scene({
    camera: create_camera({
        look_from: point3(13, 2, 3),
        look_at: point3(0, 0, 0),
        y_up: vec3(0, 1, 0),
        focus_dist: 10,
        aperture: 0.1,
        y_fov: 20,
        time0: 0,
        time1: 1
    }),
    root_hittable: create_lots_of_spheres(),
    background: Skybox.create_solid(0.7, 0.8, 1.0)
});
