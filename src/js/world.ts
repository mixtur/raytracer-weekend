import { HittableList } from './hittable/hittable_list';
import { Dielectric, Lambertian, Material, Metal } from './material';
import { color, point3, vec3AllocatorScope, vec3Len, vec3Rand, vec3RandMinMax, vec3Sub2 } from './vec3';
import { Sphere } from './hittable/sphere';
import { randomMinMax } from './random';
import { ArenaVec3Allocator } from './vec3_allocators';

export const world = new HittableList();

vec3AllocatorScope(new ArenaVec3Allocator(4096), () => {
    const ground_material = new Lambertian(color(0.5, 0.5, 0.5));
    world.objects.push(new Sphere(point3(0,-1000,0), 1000, ground_material));
    for (let a = -11; a < 11; a++) {
        for (let b = -11; b < 11; b++) {
            const choose_mat = Math.random();
            const center = point3(a + 0.9 * Math.random(), 0.2, b + 0.9 * Math.random());
            if (vec3Len(vec3Sub2(center, point3(4, 0.2, 0))) > 0.9) {
                let sphere_mat: Material;
                if (choose_mat < 0.8) {
                    sphere_mat = new Lambertian(vec3Rand());
                } else if (choose_mat < 0.95) {
                    sphere_mat = new Metal(vec3RandMinMax(0.5, 1), randomMinMax(0, 0.5));
                } else {
                    sphere_mat = new Dielectric(1.5);
                }
                world.objects.push(new Sphere(center, 0.2, sphere_mat));
            }
        }
    }

    const mat1 = new Dielectric(1.5);
    const mat2 = new Lambertian(color(0.4, 0.2, 0.1));
    const mat3 = new Metal(color(0.7, 0.6, 0.5), 0.0);

    world.objects.push(new Sphere(point3(0, 1, 0), 1.0, mat1));
    world.objects.push(new Sphere(point3(-4, 1, 0), 1.0, mat2));
    world.objects.push(new Sphere(point3(4, 1, 0), 1.0, mat3));
});

