import { gen_fn, gen_output, gen_signature, ind, sig } from './utils.mjs';
import path from 'node:path';
import url from 'node:url';
import fs from 'node:fs';

const preamble = `
import {
    vec3, vec3_dirty,
    Vec3,
    orthogonal_vec3_r,
    unit_vec3_r
} from './vec3.gen';
import { run_hook } from '../utils';

export type Quat = Float64Array;

export class ArenaQuatAllocator {
    nextToAlloc: number = 0;
    quats: Float64Array[] = [];
    constructor(max_vectors: number) {
        const quat_byte_length = Float64Array.BYTES_PER_ELEMENT * 4;
        const buffer = new ArrayBuffer(max_vectors * quat_byte_length);
        for (let i = 0; i < max_vectors; i++) {
            this.quats.push(new Float64Array(buffer, i * quat_byte_length, 4));
        }
    }
    alloc(x: number, y: number, z: number, w: number): Quat {
        if (this.nextToAlloc >= this.quats.length) {
            throw new Error('arena is full cannot alloc');
        }
        const result = this.quats[this.nextToAlloc++];
        result[0] = x;
        result[1] = y;
        result[2] = z;
        result[3] = w;
        return result;
    }
    alloc_dirty(): Quat {
        if (this.nextToAlloc >= this.quats.length) {
            throw new Error('arena is full cannot alloc');
        }
        return this.quats[this.nextToAlloc++];
    }

    reset(): void {
        this.nextToAlloc = 0;
    }
}

let allocator = new ArenaQuatAllocator(64);
export const use_quat_allocator = (new_allocator: ArenaQuatAllocator) => run_hook(() => {
    const prev_allocator = allocator;
    allocator = new_allocator;
    return () => { allocator = prev_allocator; }
});

export const quat = (x: number, y: number, z: number, w: number): Quat => allocator.alloc(x, y, z, w);

export const quat_dirty = () => allocator.alloc_dirty();

export const quat_sq_len = (q: Quat) => q[0] ** 2 +
                                        q[1] ** 2 +
                                        q[2] ** 2 +
                                        q[3] ** 2;
                                        
const im = vec3_dirty();
const tmp_vec = vec3_dirty();
`;

const gen_unit = (use_result_arg) => {
    const name = 'unit_quat';
    const signature = gen_signature(use_result_arg, sig('Quat', 'q: Quat'));
    const body = [
        `const len = Math.hypot(q[0], q[1], q[2], q[3])`,
        gen_output(use_result_arg, 'quat', [0, 1, 2, 3].map(i => `q[${i}] / len`))
    ].join('\n\n');

    return gen_fn(name, signature, body, use_result_arg);
}

const gen_newz_rotation = (use_result_arg) => {
    const name = 'newz_to_quat';
    const signature = gen_signature(use_result_arg, sig('Quat', '_new_z: Vec3'));
    const body = [
        `const new_z = tmp_vec;`,
        `unit_vec3_r(new_z, _new_z);`,
        `// we use these two lines as a special case of vec3_cross_3(im, z_vec3, new_z);`,
        `im[0] = - new_z[1];`,
        `im[1] = new_z[0];`,
        ...(use_result_arg
            ? [
                    `result[0] = im[0];`,
                    `result[1] = im[1];`,
                    `result[2] = im[2];`,
                    `result[3] = new_z[2] + 1; // new_z[2] is a special case of vec3_dot(z_vec3, new_z)`,
            ]
            : [
                `const result = quat(`,
                `    im[0],`,
                `    im[1],`,
                `    im[2],`,
                `    new_z[2] + 1 // new_z[2] is a special case of vec3_dot(z_vec3, new_z)`,
                `);`
            ]),
        ``,
        `const sq_len = quat_sq_len(result);`,
        `if (sq_len < 0.00001) {`,
        `    orthogonal_vec3_r(im, new_z);`,
        `    result[0] = im[0];`,
        `    result[1] = im[1];`,
        `    result[2] = im[2];`,
        `    result[3] = 0;`,
        `}`,
        ``,
        `unit_quat_r(result, result);`,
        ...(use_result_arg ? [] : [`return result;`]),
    ].map(x => (x === '') ? x : ind + x).join('\n');

    return gen_fn(name, signature, body, use_result_arg);
};

const gen_mul_quat_vec = (use_result_arg) => {
    const name = 'mul_quat_vec3';
    const signature = gen_signature(use_result_arg, sig('Quat', 'q: Quat, v: Vec3'));

    const code = [
        `const x = q[0];`,
        `const y = q[1];`,
        `const z = q[2];`,
        `const w = q[3];`,
        ``,
        `const tx = v[0];`,
        `const ty = v[1];`,
        `const tz = v[2];`,
        ``,
        `const ax = x + x;`,
        `const ay = y + y;`,
        `const az = z + z;`,
        ``,
        `const bx = y * tz - z * ty + w * tx;`,
        `const by = z * tx - x * tz + w * ty;`,
        `const bz = x * ty - y * tx + w * tz;`,
    ].map(x => (x === '') ? x : ind + x);

    const components = [
        `tx + ay * bz - az * by`,
        `ty + az * bx - ax * bz`,
        `tz + ax * by - ay * bx`,
    ];

    const body = [
        code.join('\n'),
        gen_output(use_result_arg, 'vec3', components),
    ].join('\n\n');

    return gen_fn(name, signature, body, use_result_arg);
};

export const gen_quat_module = () => {
    const module_code = [
        preamble,
        ...[
            gen_unit,
            gen_newz_rotation,
            gen_mul_quat_vec
        ].flatMap(f => [f(false), f(true)])
    ].join('\n\n') + '\n';

    const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
    const math_path = path.join(__dirname, '../js/math');
    fs.writeFileSync(path.join(math_path, 'quat.gen.ts'), module_code);
}
