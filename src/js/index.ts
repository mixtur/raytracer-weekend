import { writeColor } from "./color";
import { ray, Ray, rayAt2 } from './ray';
import {
    color,
    vec3,
    vec3Mix3,
    vec3Unit1,
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

const hit_sphere = (center: Point3, radius: number, r: Ray): number => {
    const oc = vec3Sub2(r.origin, center);
    const a = vec3Dot(r.direction, r.direction);
    const half_b = vec3Dot(oc, r.direction);
    const c = vec3Dot(oc, oc) - radius * radius;
    const D = half_b * half_b - a * c;
    return D < 0
        ? -1
        : ( -half_b - Math.sqrt(D) ) / a;
}

const ray_color = (r: Ray): Color => {
    {// sphere
        const sphere_center = point3(0, 0, -1);
        const sphere_radius = 0.5;
        const t = hit_sphere(sphere_center, sphere_radius, r);
        if (t > 0) {
            const n = vec3Sub2(rayAt2(r, t), sphere_center);
            vec3DivS3(n, n, sphere_radius);// make the normal have unit length


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

        const pixelColor = ray_color(r);
        writeColor(imageData, x, y, pixelColor);
    }
}
console.log('Done!');

canvas.width = image_width;
canvas.height = image_height;
ctx.putImageData(imageData, 0, 0);

