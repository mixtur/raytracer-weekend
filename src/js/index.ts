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
    Point3, vec3Dot, vec3DivS3
} from './vec3';

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
document.body.appendChild(canvas);

const ray_color = (r: Ray, world: Hittable): Color => {
    {// world
        const hit = world.hit(r, 0, Infinity);
        if (hit !== null) {
            const n = hit.normal;
            return vec3MulS2(color(n[0] + 1, n[1] + 1, n[2] + 1), 0.5);
        }
    }

    {// background
        const unitDirection = r.direction.slice();
        const t = 0.5 * (unitDirection[1] + 1);
        vec3Mix4(unitDirection, color(1, 1, 1), color(0.5, 0.7, 1), t);
        return unitDirection;
    }
};

const world = new HittableList([
    new Sphere(point3(0, 0, -1), 0.5),
    new Sphere(point3(0, -100.5, -1), 100)
]);


const aspect_ratio = 16 / 9;
const image_width = 400;
const image_height = image_width / aspect_ratio;

const viewport_height = 2;
const viewport_width = viewport_height + aspect_ratio;
const focal_length = 1;

const origin = point3(0, 0, 0);
const horizontal = vec3(viewport_width, 0, 0);
const vertical = vec3(0, viewport_height, 0);
const lower_left_corner = vec3Sub2(
    origin,
    vec3Add2(
        vec3(0, 0, focal_length),
        vec3Add2(
            vec3DivS2(horizontal, 2),
            vec3DivS2(vertical, 2)
        )
    )
);


const imageData = new ImageData(image_width, image_height, { colorSpace: "srgb" });
for (let j = 0; j < image_height; j++) {
    console.log(`scanline remaining ${image_height - j}`);
    for (let i = 0; i < image_width; i++) {
        const x = i;
        const y = image_height -1 - j;

        const u = i / (image_width - 1);
        const v = j / (image_height - 1);

        const r = ray(origin, vec3Sub2(vec3Add2(lower_left_corner, vec3Add2(vec3MulS2(horizontal, u), vec3MulS2(vertical, v))), origin));

        const pixelColor = ray_color(r, world);
        writeColor(imageData, x, y, pixelColor);
    }
}
console.log('Done!');

canvas.width = image_width;
canvas.height = image_height;
ctx.putImageData(imageData, 0, 0);

