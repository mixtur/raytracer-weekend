import { create_scene, Scene } from './scene';
import { Camera } from '../camera';
import { point3, vec3 } from '../math/vec3.gen';
import { create_noise_texture } from '../texture/noise_texture';
import { solid_color } from '../texture/solid_color';
import { create_lambertian } from '../materials/lambertian';
import { create_diffuse_light } from '../materials/diffuse_light';
import { Skybox } from '../hittable/skybox';
import { create_quad } from '../hittable/quad';
import { create_sphere } from '../hittable/sphere';
import { create_hittable_list } from '../hittable/hittable_list';

const perlin_texture = create_noise_texture(4);

const light1 = create_quad(point3(3,1,-2), vec3(2,0,0), vec3(0,2,0), create_diffuse_light(solid_color(0.5, 4, 1)));
const light2 = create_sphere(point3(0, 7, 0), 2, create_diffuse_light(solid_color(4, 1, 0.5)));
export const simple_light: Scene = create_scene({
    root_hittable: create_hittable_list([
        create_sphere(point3(0, -1000, 0), 1000, create_lambertian(perlin_texture)),
        create_sphere(point3(0, 2, 0), 2, create_lambertian(perlin_texture)),
        light1,
        light2
    ]),
    light: create_hittable_list([
        light1,
        light2
    ]),
    camera: new Camera({
        look_from: point3(26, 3, 6),
        look_at: point3(0, 2, 0),
        v_up: vec3(0, 1, 0),
        focus_dist: 10,
        aperture: 0,
        y_fov: 20,
        time0: 0,
        time1: 1
    }),
    background: Skybox.create_black()
});
