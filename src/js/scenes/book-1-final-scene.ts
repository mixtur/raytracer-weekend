import { Hittable } from '../hittable/hittable';
import {
    color,
    point3,
    vec3,
    vec3Add2,
    vec3AllocatorScopeSync,
    vec3Len,
    vec3Rand,
    vec3RandMinMax,
    vec3Sub2
} from '../vec3';
import { ArenaVec3Allocator } from '../vec3_allocators';
import { Checker3DTexture } from '../texture/checker_3d_texture';
import { sColor, SolidColor } from '../texture/solid_color';
import { Sphere } from '../hittable/sphere';
import { getPredefinedRandom, random, randomMinMax, randomScopeAsync, randomScopeSync } from '../random';
import { MovingSphere } from '../hittable/moving_sphere';
import { ZXGrid } from '../hittable/zx-grid';
import { BVHNode } from '../hittable/bvh';
import { Camera } from '../camera';
import { Scene } from './scene';
import { createLambertian } from '../materials/lambertian';
import { createMetal } from '../materials/metal';
import { createDielectric } from '../materials/dielectric';
import { MegaMaterial } from '../materials/megamaterial';
import { HittableList } from '../hittable/hittable_list';

function createLotsOfSpheres(scene_creation_random_numbers: number[]): Hittable {
    const rng = getPredefinedRandom(scene_creation_random_numbers);
    return randomScopeSync(rng, () => {
        return vec3AllocatorScopeSync(new ArenaVec3Allocator(1024 * 1024), () => {
            const worldObjects: Hittable[] = [];
            const ground_material = createLambertian(new Checker3DTexture(sColor(0.2, 0.3, 0.1), sColor(0.9, 0.9, 0.9)));
            worldObjects.push(new Sphere(point3(0, -1000, 0), 1000, ground_material));
            const objects = [];
            for (let a = -11; a < 11; a++) {
                for (let b = -11; b < 11; b++) {
                    const choose_mat = random();
                    const center1 = point3(a + 0.2 + 0.6 * random(), 0.2, b + 0.2 + 0.6 * random());
                    if (vec3Len(vec3Sub2(center1, point3(4, 0.2, 0))) > 0.9) {
                        let sphere_mat: MegaMaterial;
                        if (choose_mat < 0.8) {
                            sphere_mat = createLambertian(new SolidColor(vec3Rand()));
                        } else if (choose_mat < 0.95) {
                            sphere_mat = createMetal(new SolidColor(vec3RandMinMax(0.5, 1)), randomMinMax(0, 0.5));
                        } else {
                            sphere_mat = createDielectric(1.5);
                        }
                        const center2 = vec3Add2(center1, vec3(0, randomMinMax(0, 0.5), 0));
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
            worldObjects.push(grid);

            // const bvh = new BVHNode(objects.map(o => o.obj), 0, 1);
            // worldObjects.push(bvh);

            // const plainList = new HittableList(objects.map(o => o.obj));
            // worldObjects.push(plainList);

            const mat1 = createDielectric(1.5);
            const mat2 = createLambertian(new SolidColor(color(0.4, 0.2, 0.1)));
            const mat3 = createMetal(new SolidColor(color(0.7, 0.6, 0.5)), 0.0);

            worldObjects.push(new Sphere(point3(0, 1, 0), 1.0, mat1));
            worldObjects.push(new Sphere(point3(-4, 1, 0), 1.0, mat2));
            worldObjects.push(new Sphere(point3(4, 1, 0), 1.0, mat3));

            return new BVHNode(worldObjects, 0, 1);
            // return new HittableList(worldObjects);
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
    root_hittable: createLotsOfSpheres(scene_creation_random_numbers),
    background: color(0.7, 0.8, 1.0)
});
