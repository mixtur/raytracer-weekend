import { Scene } from './scene';
import { Camera } from '../camera';
import { HittableList } from '../hittable/hittable_list';
import { solid_color } from '../texture/solid_color';
import { Quad } from '../hittable/quad';
import { color, point3, vec3, vec3_allocator_scope_sync } from '../math/vec3';
import { Box } from '../hittable/box';
import { RotateY } from '../hittable/rotate_y';
import { Translate } from '../hittable/translate';
import { create_lambertian } from '../materials/lambertian';
import { create_diffuse_light } from '../materials/diffuse_light';
import { ArenaVec3Allocator } from '../math/vec3_allocators';
import { create_metal } from '../materials/metal';
import { create_dielectric } from '../materials/dielectric';
import { Sphere } from '../hittable/sphere';

const scene_vec3_allocator = new ArenaVec3Allocator(128);

const hittables = vec3_allocator_scope_sync(scene_vec3_allocator, () => {
    const aluminum = create_metal(solid_color(0.8, 0.85, 0.88), 0);
    const glass = create_dielectric(1.5);
    const red = create_lambertian(solid_color(.65, .05, .05));
    const white = create_lambertian(solid_color(.73, .73, .73));
    const green = create_lambertian(solid_color(.12, .45, .15));
    const light = create_diffuse_light(solid_color(15, 15, 15));

    const light_hittable = new Quad(point3(343, 554, 332), vec3(-130,0,0), vec3(0,0,-105), light);

    const root = new HittableList([
        new Quad(point3(555, 0, 0), vec3(0, 555, 0), vec3(0, 0, 555), green),
        new Quad(point3(0, 0, 0), vec3(0, 555, 0), vec3(0, 0, 555), red),
        light_hittable,
        new Quad(point3(0, 555, 0), vec3(555, 0, 0), vec3(0, 0, 555), white),
        new Quad(point3(0, 0, 0), vec3(555, 0, 0), vec3(0, 0, 555), white),
        new Quad(point3(0, 0, 555), vec3(555, 0, 0), vec3(0, 555, 0), white),

        new Translate(
            new RotateY(
                new Box(point3(0, 0, 0), point3(165, 330, 165), white),
                15
            ),
            vec3(265, 0, 295)
        ),
        new Sphere(point3(190,90,190), 90, glass),
        // new Translate(
        //     new RotateY(
        //         new Box(point3(0, 0, 0), point3(165, 165, 165), white),
        //         -18
        //     ),
        //     vec3(130, 0, 65)
        // )
    ]);

    return {
        root,
        light: new HittableList([
            light_hittable,
            new Sphere(point3(190,90,190), 90, glass)
        ])
    };
});

export const cornell_box: Scene = {
    root_hittable: hittables.root,
    light: hittables.light,
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
    background: color(0, 0, 0)
};
