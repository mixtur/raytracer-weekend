import { Hittable } from '../hittable/hittable';
import {
    color,
    point3,
    vec3,
    vec3_add_2,
    vec3_allocator_scope_sync,
    vec3_len,
    vec3_rand,
    vec3_rand_min_max2,
    vec3_sub_2
} from '../math/vec3';
import { ArenaVec3Allocator } from '../math/vec3_allocators';
import { Checker3DTexture } from '../texture/checker_3d_texture';
import { solid_color, SolidColor } from '../texture/solid_color';
import { Sphere } from '../hittable/sphere';
import { get_predefined_random, random, random_min_max, random_scope_sync } from '../math/random';
import { MovingSphere } from '../hittable/moving_sphere';
import { ZXGrid } from '../hittable/zx-grid';
import { BVHNode } from '../hittable/bvh';
import { Camera } from '../camera';
import { Scene } from './scene';
import { create_lambertian } from '../materials/lambertian';
import { create_metal } from '../materials/metal';
import { create_dielectric } from '../materials/dielectric';
import { MegaMaterial } from '../materials/megamaterial';

function create_lots_of_spheres(scene_creation_random_numbers: number[]): Hittable {
    const rng = get_predefined_random(scene_creation_random_numbers);
    return random_scope_sync(rng, () => {
        return vec3_allocator_scope_sync(new ArenaVec3Allocator(1024 * 1024), () => {
            const world_objects: Hittable[] = [];
            const ground_material = create_lambertian(new Checker3DTexture(solid_color(0.2, 0.3, 0.1), solid_color(0.9, 0.9, 0.9)));
            world_objects.push(new Sphere(point3(0, -1000, 0), 1000, ground_material));
            const objects = [];
            for (let a = -11; a < 11; a++) {
                for (let b = -11; b < 11; b++) {
                    const choose_mat = random();
                    const center1 = point3(a + 0.2 + 0.6 * random(), 0.2, b + 0.2 + 0.6 * random());
                    if (vec3_len(vec3_sub_2(center1, point3(4, 0.2, 0))) > 0.9) {
                        let sphere_mat: MegaMaterial;
                        if (choose_mat < 0.8) {
                            sphere_mat = create_lambertian(new SolidColor(vec3_rand()));
                        } else if (choose_mat < 0.95) {
                            sphere_mat = create_metal(new SolidColor(vec3_rand_min_max2(0.5, 1)), random_min_max(0, 0.5));
                        } else {
                            sphere_mat = create_dielectric(1.5);
                        }
                        const center2 = vec3_add_2(center1, vec3(0, random_min_max(0, 0.5), 0));
                        objects.push({
                            xCell: a + 11,
                            zCell: b + 11,
                            obj: new MovingSphere(center1, center2, 0, 1, 0.2, sphere_mat)
                        });
                    }
                }
            }
            const grid = new ZXGrid(22, 22, 0.9, 1, vec3(-11, 0, -11));
            for (const obj of objects) { grid.addHittable(obj.xCell, obj.zCell, obj.obj); }
            world_objects.push(grid);

            // const bvh = new BVHNode(objects.map(o => o.obj), 0, 1);
            // world_objects.push(bvh);

            // const plainList = new HittableList(objects.map(o => o.obj));
            // world_objects.push(plainList);

            const mat1 = create_dielectric(1.5);
            const mat2 = create_lambertian(new SolidColor(color(0.4, 0.2, 0.1)));
            const mat3 = create_metal(new SolidColor(color(0.7, 0.6, 0.5)), 0.0);

            world_objects.push(new Sphere(point3(0, 1, 0), 1.0, mat1));
            world_objects.push(new Sphere(point3(-4, 1, 0), 1.0, mat2));
            world_objects.push(new Sphere(point3(4, 1, 0), 1.0, mat3));

            return new BVHNode(world_objects, 0, 1);
            // return new HittableList(world_objects);
        });
    });
}

const look_from = point3(13, 2, 3);
const look_at = point3(0, 0, 0);

const create_camera = (aspect_ratio: number): Camera => new Camera({
    look_from,
    look_at,
    v_up: vec3(0, 1, 0),
    focus_dist: 10,
    aspect_ratio,
    aperture: 0.1,
    y_fov: 20,
    time0: 0,
    time1: 1
});


export const book1_final_scene = (scene_creation_random_numbers: number[]): Scene => ({
    create_camera,
    light: null,
    root_hittable: create_lots_of_spheres(scene_creation_random_numbers),
    background: color(0.7, 0.8, 1.0)
});
