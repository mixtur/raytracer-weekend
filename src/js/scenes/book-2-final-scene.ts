import { Scene } from './scene';
import { Hittable } from '../hittable/hittable';
import {
    color,
    point3,
    vec3,
    vec3Add2,
    vec3AllocatorScopeAsync,
    vec3AllocatorScopeSync,
    vec3RandMinMax2
} from '../vec3';
import { sColor } from '../texture/solid_color';
import { Box } from '../hittable/box';
import { getPredefinedRandom, randomMinMax, randomScopeAsync, randomScopeSync } from '../random';
import { ZXGrid } from '../hittable/zx-grid';
import { ArenaVec3Allocator } from '../vec3_allocators';
import { HittableList } from '../hittable/hittable_list';
import { XZRect } from '../hittable/xz_rect';
import { MovingSphere } from '../hittable/moving_sphere';
import { Sphere } from '../hittable/sphere';
import { ConstantMedium } from '../hittable/constant_medium';
import earthUrl from './earthmap.jpg';
import { ImageTexture } from '../texture/image_texture';
import { NoiseTexture } from '../texture/noise_texture';
import { Translate } from '../hittable/translate';
import { RotateY } from '../hittable/rotate_y';
import { BVHNode } from '../hittable/bvh';
import { Camera } from '../camera';
import { createDiffuseLight } from '../materials/diffuse_light';
import { createDielectric } from '../materials/dielectric';
import { createMetal } from '../materials/metal';
import { createIsotropicPhaseFunction } from '../materials/isotropic_phase_function';
import { createLambertian } from '../materials/lambertian';

export const book2_final_scene = async (scene_creation_random_numbers: number[]): Promise<Scene> => {
    const rng = getPredefinedRandom(scene_creation_random_numbers);
    return randomScopeAsync(rng, () => {
        return vec3AllocatorScopeAsync(new ArenaVec3Allocator(1024 * 6), async (): Promise<Scene> => {
            const ground = createLambertian(sColor(0.48, 0.83, 0.53));
            const boxes_per_side = 20;

            const w = 100.0;
            const y0 = 0.0;
            const boxes1 = new ZXGrid(boxes_per_side, boxes_per_side, 101, w, point3(-1000, 0, -1000));
            for (let i = 0; i < boxes_per_side; i++) {
                const x0 = -1000.0 + i*w;
                const x1 = x0 + w;
                for (let j = 0; j < boxes_per_side; j++) {
                    const z0 = -1000.0 + j*w;
                    const y1 = randomMinMax(1,101);
                    const z1 = z0 + w;

                    boxes1.addHittable(i, j, new Box(point3(x0,y0,z0), point3(x1,y1,z1), ground))
                }
            }

            const objects = new HittableList();
            objects.objects.push(boxes1);
            const light = createDiffuseLight(sColor(7, 7, 7));
            objects.objects.push(new XZRect(123, 423, 147, 412, 554, light));

            const center1 = point3(400, 400, 200);
            const center2 = vec3Add2(center1, vec3(30,0,0));

            const moving_sphere_material = createLambertian(sColor(0.7, 0.3, 0.1));
            objects.objects.push(new MovingSphere(center1, center2, 0, 1, 50, moving_sphere_material));

            objects.objects.push(new Sphere(point3(260, 150, 45), 50, createDielectric(1.5)));
            objects.objects.push(new Sphere(
                point3(0, 150, 145), 50, createMetal(sColor(0.8, 0.8, 0.9), 1.0)
            ));

            let boundary = new Sphere(point3(360,150,145), 70, createDielectric(1.5));
            objects.objects.push(boundary);
            objects.objects.push(new ConstantMedium(boundary, 0.2, createIsotropicPhaseFunction(sColor(0.2, 0.4, 0.9))));
            boundary = new Sphere(point3(0, 0, 0), 5000, createDielectric(1.5));
            objects.objects.push(new ConstantMedium(boundary, .0001, createIsotropicPhaseFunction(sColor(1, 1, 1))));
            const earthImageBitmap = await createImageBitmap(
                await fetch(earthUrl).then(res => res.blob())
            );

            const emat = createLambertian(new ImageTexture(earthImageBitmap));
            objects.objects.push(new Sphere(point3(400,200,400), 100, emat));
            const pertext = new NoiseTexture(0.1);
            objects.objects.push(new Sphere(point3(220,280,300), 80, createLambertian(pertext)));

            const boxes2: Hittable[] = [];
            const white = createLambertian(sColor(.73, .73, .73));
            const ns = 1000;
            for (let j = 0; j < ns; j++) {
                boxes2.push(new Sphere(vec3RandMinMax2(0,165), 10, white));
            }

            objects.objects.push(new Translate(
                    new RotateY(
                        new BVHNode(boxes2, 0.0, 1.0),
                        15
                    ),
                    vec3(-100,270,395)
                )
            );

            return {
                root_hittable: objects,
                create_camera(aspect_ratio: number): Camera {
                    const look_from = point3(478, 278, -600);
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
        });
    });
};
