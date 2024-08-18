import { gen_fn, gen_output, gen_signature, ind, sig } from './utils.mjs';
import path from 'node:path';
import url from 'node:url';
import fs from 'node:fs';

const preamble = `
import {
    vec2, vec2_dirty,
    Vec2,
    unit_vec2_r
} from './vec.gen';
import { run_hook } from '../utils';

export type Complex = Float64Array;

export class ArenaComplexAllocator {
    nextToAlloc: number = 0;
    complexes: Float64Array[] = [];
    constructor(max_complexes: number) {
        const complex_byte_length = Float64Array.BYTES_PER_ELEMENT * 2;
        const buffer = new ArrayBuffer(max_complexes * complex_byte_length);
        for (let i = 0; i < max_complexes; i++) {
            this.complexes.push(new Float64Array(buffer, i * complex_byte_length, 2));
        }
    }
    alloc(re: number, im: number): Complex {
        if (this.nextToAlloc >= this.complexes.length) {
            throw new Error('arena is full cannot alloc');
        }
        const result = this.complexes[this.nextToAlloc++];
        result[0] = re;
        result[1] = im;
        return result;
    }
    alloc_dirty(): Complex {
        if (this.nextToAlloc >= this.complexes.length) {
            throw new Error('arena is full cannot alloc');
        }
        return this.complexes[this.nextToAlloc++];
    }

    reset(): void {
        this.nextToAlloc = 0;
    }
}

let allocator = new ArenaComplexAllocator(64);
export const use_complex_allocator = (new_allocator: ArenaComplexAllocator) => run_hook(() => {
    const prev_allocator = allocator;
    allocator = new_allocator;
    return () => { allocator = prev_allocator; }
});

export const complex = (re: number, im: number): Complex => allocator.alloc(re, im);

export const complex_dirty = (): Complex => allocator.alloc_dirty();

export const complex_sq_len = (c: Complex) => c[0] ** 2 + c[1] ** 2;

const tmp_vec = vec2_dirty();
`;

const gen_unit = (use_result_arg) => {
    const name = 'unit_complex';
    const signature = gen_signature(use_result_arg, sig('Complex', 'c: Complex'));
    const body = [
        `const len = Math.hypot(c[0], c[1])`,
        gen_output(use_result_arg, 'complex', [0, 1].map(i => `c[${i}] / len`))
    ].join('\n\n');

    return gen_fn(name, signature, body, use_result_arg);
}

const gen_new_y_to_complex = (use_result_arg) => {
    const name = 'new_y_to_complex';
    const signature = gen_signature(use_result_arg, sig('Complex', '_new_y: Vec2'));
    const body = [
        ind + `const new_y = tmp_vec;`,
        ind + `unit_vec2_r(new_y, _new_y);`,
        ind + `const im = new_y[1]`,
        ind + `const re = -new_y[0]`,
        gen_output(use_result_arg, 'complex', ['re', 'im']),
    ].join('\n');

    return gen_fn(name, signature, body, use_result_arg);
};

const gen_angle_to_complex = (use_result_arg) => {
    const name = 'angle_to_complex';
    const signature = gen_signature(use_result_arg, sig('Complex', 'angle: number'));
    const components = [
        `Math.cos(angle)`,
        '-Math.sin(angle)'
    ];

    const body = gen_output(use_result_arg, 'complex', components);

    return gen_fn(name, signature, body, use_result_arg);
}

const gen_mul_complex_vec = (use_result_arg) => {
    const name = 'mul_complex_vec2';
    const signature = gen_signature(use_result_arg, sig('Complex', 'c: Complex, v: Vec2'));

    const body = gen_output(use_result_arg, 'vec2', [
        'v[0] * c[0] - v[1] * c[1]',
        'v[0] * c[1] + v[1] * c[0]',
    ]);

    return gen_fn(name, signature, body, use_result_arg);
};

const gen_invert_complex = (use_result_arg) => {
    const name = 'invert_complex';
    const signature = gen_signature(use_result_arg, sig('Complex', 'c: Complex'));

    const body = [
        ind + `const inv_sq_abs = 1 / (c[0] ** 2 + c[1] ** 2);`,
        gen_output(use_result_arg, 'complex', [
            `c[0] * inv_sq_abs`,
            `c[1] * -inv_sq_abs`,
        ]),
    ].join('\n\n');

    return gen_fn(name, signature, body, use_result_arg);
};

export const gen_complex_module = () => {
    const module_code = [
        preamble,
        ...[
            gen_unit,
            gen_new_y_to_complex,
            gen_mul_complex_vec,
            gen_angle_to_complex,
            gen_invert_complex
        ].flatMap(f => [f(false), f(true)])
    ].join('\n\n') + '\n';

    const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
    const math_path = path.join(__dirname, '../js/math');
    fs.writeFileSync(path.join(math_path, 'complex.gen.ts'), module_code);
}
