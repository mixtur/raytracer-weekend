import { writeColor } from "./color";
import { Hittable } from "./hittable/hittable";
import { HittableList } from "./hittable/hittable_list";
import { Sphere } from "./hittable/sphere";
import { Ray } from './ray';
import {
    color,
    Color,
    vec3Mix4,
    point3,
    vec3Add3,
    vec3AllocatorScope, vec3MulV2
} from './vec3';
import { Camera } from './camera';
import { ArenaVec3Allocator } from './vec3_allocators';
import { Dielectric, Lambertian, Metal } from './material';
import { clamp } from './utils';

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
document.body.appendChild(canvas);

const material_ground = new Lambertian(color(0.8, 0.8, 0.0));
const material_center = new Lambertian(color(0.1, 0.2, 0.5));
const material_left   = new Dielectric(1.5);
const material_right  = new Metal(color(0.8, 0.6, 0.2), 0.0);

const world = new HittableList([]);

world.objects.push(new Sphere(point3( 0.0, -100.5, -1.0), 100.0, material_ground));
world.objects.push(new Sphere(point3( 0.0,    0.0, -1.0),   0.5, material_center));
world.objects.push(new Sphere(point3(-1.0,    0.0, -1.0),   0.5, material_left));
world.objects.push(new Sphere(point3(-1.0,    0.0, -1.0),  -0.4, material_left));
world.objects.push(new Sphere(point3( 1.0,    0.0, -1.0),   0.5, material_right));


const camera = new Camera();

const aspect_ratio = 16 / 9;
const image_width = 400;
const image_height = image_width / aspect_ratio;
const samples_per_pixel = 100;
const max_depth = 50;

const imageData = new ImageData(image_width, image_height, { colorSpace: "srgb" });

const rayArenaAllocator = new ArenaVec3Allocator(2048);

const ray_color = (r: Ray, world: Hittable, depth: number): Color => {
    if (depth <= 0) {
        return color(0, 0, 0);
    }
    {// world
        const hit = world.hit(r, 0.0001, Infinity);
        if (hit !== null) {
            const bounce = hit.material.scatter(r, hit);
            if (bounce) {
                return vec3MulV2(bounce.attenuation, ray_color(bounce.scattered, world, depth - 1));
            }
            return color(0, 0, 0);
        }
    }

    {// background
        const t = clamp(0.5 * (r.direction[1] + 1), 0, 1);
        vec3Mix4(r.direction, color(1, 1, 1), color(0.5, 0.7, 1), t);
        return r.direction;
    }
};

async function main() {
    canvas.width = image_width;
    canvas.height = image_height;
    for (let j = 0; j < image_height; j++) {
        console.log(`scanline remaining ${image_height - j}`);
        for (let i = 0; i < image_width; i++) {
            const x = i;
            const y = image_height -1 - j;

            const pixelColor = color(0, 0, 0);
            vec3AllocatorScope(rayArenaAllocator, () => {
                for (let s = 0; s < samples_per_pixel; s++) {
                    rayArenaAllocator.reset();
                    const u = (i + Math.random()) / (image_width - 1);
                    const v = (j + Math.random()) / (image_height - 1);

                    const r = camera.get_ray(u, v);
                    vec3Add3(pixelColor, pixelColor, ray_color(r, world, max_depth));
                }
            })
            writeColor(imageData, x, y, pixelColor, samples_per_pixel);
        }
        await new Promise(resolve => setTimeout(resolve, 0));
        ctx.putImageData(imageData, 0, 0);
    }
    ctx.putImageData(imageData, 0, 0);
    console.log('Done!');
}

main().catch((e) => {
    console.log(e);
});
