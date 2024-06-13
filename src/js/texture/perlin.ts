import { random_int_min_max } from '../math/random';
import {
    Point3, use_vec3_allocator,
    vec3,
    Vec3,
    vec3_dot,
    vec3_muls_3,
    vec3_rand_min_max2
} from '../math/vec3';
import { ArenaVec3Allocator } from '../math/vec3_allocators';
import { run_with_hooks } from '../utils';

const POINT_COUNT = 256;

function perlin_generate_perm(): Uint16Array {
    const result = new Uint16Array(POINT_COUNT);
    for (let i = 0; i < POINT_COUNT; i++) {
        result[i] = i;
    }
    permute(result);
    return result;
}

function permute(xs: Uint16Array): void {
    for (let i = POINT_COUNT; i >= 0; i--) {
        const j = random_int_min_max(0, i);
        const t = xs[i];
        xs[i] = xs[j];
        xs[j] = t;
    }
}

function perlin_interp(c: Vec3[][][], u: number, v: number, w: number): number {
    let acc = 0;
    const uu = u * u * (3 - 2 * u);
    const vv = v * v * (3 - 2 * v);
    const ww = w * w * (3 - 2 * w);
    for (let i = 0; i < 2; i++)
        for (let j = 0; j < 2; j++)
            for (let k = 0; k < 2; k++) {
                const scalar_weight =
                       (i * uu + (1 - i) * (1 - uu))
                     * (j * vv + (1 - j) * (1 - vv))
                     * (k * ww + (1 - k) * (1 - ww));
                const vector_weight = vec3(
                    (u - i) * scalar_weight,
                    (v - j) * scalar_weight,
                    (w - k) * scalar_weight
                );
                acc += vec3_dot(vector_weight, c[i][j][k]);
            }

    return acc;
}

const trilinear_buffer = run_with_hooks(() => {
    use_vec3_allocator(new ArenaVec3Allocator(8));
    return [
        [
            [vec3(0, 0, 0), vec3(0, 0, 0)],
            [vec3(0, 0, 0), vec3(0, 0, 0)]
        ],
        [
            [vec3(0, 0, 0), vec3(0, 0, 0)],
            [vec3(0, 0, 0), vec3(0, 0, 0)]
        ]
    ];
});

export class Perlin {
    rand_vecs: Vec3[];
    x_perm: Uint16Array;
    y_perm: Uint16Array;
    z_perm: Uint16Array;
    constructor() {
        const rand_vecs: Float64Array[] = this.rand_vecs = [];
        for (let i = 0; i < POINT_COUNT; i++) {
            rand_vecs.push(vec3_rand_min_max2(-1, 1));
        }
        this.x_perm = perlin_generate_perm();
        this.y_perm = perlin_generate_perm();
        this.z_perm = perlin_generate_perm();
    }

    noise(p: Point3): number {
        const i = Math.floor(p[0]);
        const j = Math.floor(p[1]);
        const k = Math.floor(p[2]);

        const u = p[0] - i;
        const v = p[1] - j;
        const w = p[2] - k;
        for (let di = 0; di < 2; di++)
            for (let dj = 0; dj < 2; dj++)
                for (let dk = 0; dk < 2; dk++)
                    trilinear_buffer[di][dj][dk] = this.rand_vecs[
                        this.x_perm[(i + di) & 255] ^
                        this.y_perm[(j + dj) & 255] ^
                        this.z_perm[(k + dk) & 255]
                    ];

        return perlin_interp(trilinear_buffer, u, v, w);
    }

    turb(p: Point3, depth: number): number {
        let acc = 0;
        let weight = 1;
        const temp_p = vec3(p[0], p[1], p[2]);
        for (let i = 0; i < depth; i++) {
            acc += weight * this.noise(temp_p);
            weight *= 0.5;
            vec3_muls_3(temp_p, temp_p, 2);
        }
        return Math.abs(acc);
    }
}
