import { writeColor } from "./color";
import { ray, Ray } from "./ray";
import { color, vec3, vec3Mix3, vec3Unit1, Color, vec3Mix4, point3, vec3DivS2, vec3Add2, vec3Sub2, vec3MulS2 } from "./vec3";

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
document.body.appendChild(canvas);

const rayColor = (r: Ray): Color => {
    const unitDirection = r.direction.slice();
    const t = 0.5 * (unitDirection[1] + 1);
    vec3Mix4(unitDirection, color(1, 1, 1), color(0.5, 0.7, 1), t);
    return unitDirection;
}



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

        const pixelColor = rayColor(r);
        writeColor(imageData, x, y, pixelColor);
    }
}
console.log('Done!');

canvas.width = image_width;
canvas.height = image_height;
ctx.putImageData(imageData, 0, 0);

