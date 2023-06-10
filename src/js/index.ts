import { writeColor } from "./color";
import { Hittable } from "./hittable/hittable";
import { HittableList } from "./hittable/hittable_list";
import { Sphere } from "./hittable/sphere";
import { ray, Ray, rayAt2 } from './ray';
import {
    color,
    vec3,
    Color,
    vec3Mix4,
    point3,
    vec3DivS2,
    vec3Add2,
    vec3Sub2,
    vec3MulS2,
    Point3,
    vec3Dot,
    vec3DivS3,
    vec3Add3,
    vec3RandInUnitSphere,
    vec3RandUnit,
    vec3SetAllocator,
    gcAllocator,
    vec3AllocatorScope
} from './vec3';
import { Camera } from './camera';
import { randomMinMax } from './random';
import { ArenaVec3Allocator } from './vec3_allocators';

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
document.body.appendChild(canvas);

const   ray_color = (r: Ray, world: Hittable, depth: number): Color => {
    if (depth <= 0) {
        return color(0, 0, 0);
    }
    {// world
        const hit = world.hit(r, 0.0001, Infinity);
        if (hit !== null) {
            const target = vec3Add2(hit.p, vec3Add2(hit.normal, vec3RandUnit()));
            return vec3MulS2(ray_color(ray(hit.p, vec3Sub2(target, hit.p)), world, depth - 1), 0.5);
        }
    }

    {// background
        const t = 0.5 * (r.direction[1] + 1);
        vec3Mix4(r.direction, color(1, 1, 1), color(0.5, 0.7, 1), t);
        return r.direction;
    }
};

const world = new HittableList([
    new Sphere(point3(0, 0, -1), 0.5),
    new Sphere(point3(0, -100.5, -1), 100)
]);

const camera = new Camera();

const aspect_ratio = 16 / 9;
const image_width = 400;
const image_height = image_width / aspect_ratio;
const samples_per_pixel = 100;
const max_depth = 50;

const imageData = new ImageData(image_width, image_height, { colorSpace: "srgb" });

const rayArenaAllocator = new ArenaVec3Allocator(2048);

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
