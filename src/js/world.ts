import { HittableList } from './hittable/hittable_list';
import { Dielectric, Lambertian, Material, Metal } from './material';
import { color, point3, vec3, vec3Add2, vec3AllocatorScope, vec3Len, vec3Rand, vec3RandMinMax, vec3Sub2 } from './vec3';
import { Sphere } from './hittable/sphere';
import { randomMinMax } from './random';
import { ArenaVec3Allocator } from './vec3_allocators';
import { ZXGrid } from './hittable/zx-grid';
import { MovingSphere } from './hittable/moving_sphere';
import { BVHNode } from './hittable/bvh';
import { Hittable } from './hittable/hittable';

export let world;

vec3AllocatorScope(new ArenaVec3Allocator(8192), () => {
    const worldObjects: Hittable[] = [];
    const ground_material = new Lambertian(color(0.5, 0.5, 0.5));
    worldObjects.push(new Sphere(point3(0,-1000,0), 1000, ground_material));
    const objects = [];
    for (let a = -11; a < 11; a++) {
        for (let b = -11; b < 11; b++) {
            const choose_mat = Math.random();
            const center1 = point3(a + 0.2 + 0.6 * Math.random(), 0.2, b + 0.2 + 0.6 * Math.random());
            if (vec3Len(vec3Sub2(center1, point3(4, 0.2, 0))) > 0.9) {
                let sphere_mat: Material;
                if (choose_mat < 0.8) {
                    sphere_mat = new Lambertian(vec3Rand());
                } else if (choose_mat < 0.95) {
                    sphere_mat = new Metal(vec3RandMinMax(0.5, 1), randomMinMax(0, 0.5));
                } else {
                    sphere_mat = new Dielectric(1.5);
                }
                const center2 = vec3Add2(center1, vec3(0, randomMinMax(0, 0.5), 0));
                objects.push({ xCell: a + 11, zCell: b + 11, obj: new MovingSphere(center1, center2, 0, 1, 0.2, sphere_mat)});
            }
        }
    }
    const grid = new ZXGrid(22, 22, 0.9, 1, vec3(-11, 0, -11));
    for (const obj of objects) { grid.addHittable(obj.xCell, obj.zCell, obj.obj); }
    worldObjects.push(grid);

    // const bvh = new BVHNode(objects.map(o => o.obj), 0, 1);
    // world.objects.push(bvh);

    // const plainList = new HittableList(objects.map(o => o.obj));
    // world.objects.push(plainList);

    const mat1 = new Dielectric(1.5);
    const mat2 = new Lambertian(color(0.4, 0.2, 0.1));
    const mat3 = new Metal(color(0.7, 0.6, 0.5), 0.0);

    worldObjects.push(new Sphere(point3(0, 1, 0), 1.0, mat1));
    worldObjects.push(new Sphere(point3(-4, 1, 0), 1.0, mat2));
    worldObjects.push(new Sphere(point3(4, 1, 0), 1.0, mat3));

    world = new BVHNode(worldObjects, 0, 1);
});

