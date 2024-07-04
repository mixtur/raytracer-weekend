import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { extract_fn_body, gen_fn, gen_output, gen_signature, ind, sig } from './utils.mjs';

const preamble = `
import { random, random_min_max } from './random'
import { run_hook } from '../utils'

export type Vec3 = Float64Array
export type Color = Vec3
export type Point3 = Vec3

export class ArenaVec3Allocator {
    nextToAlloc: number = 0;
    dump: Float64Array;
    vectors: Float64Array[] = [];
    constructor(max_vectors: number) {
        const vector_byte_length = Float64Array.BYTES_PER_ELEMENT * 3;
        const buffer = new ArrayBuffer(max_vectors * vector_byte_length);
        this.dump = new Float64Array(buffer);
        for (let i = 0; i < max_vectors; i++) {
            this.vectors.push(new Float64Array(buffer, i * vector_byte_length, 3));
        }
    }
    alloc(a: number, b: number, c: number): Vec3 {
        if (this.nextToAlloc >= this.vectors.length) {
            throw new Error(\`Arena is full cannot alloc. Limit = \${this.vectors.length}\`);
        }
        const result = this.vectors[this.nextToAlloc++];
        result[0] = a;
        result[1] = b;
        result[2] = c;
        return result;
    }
    alloc_dirty(): Vec3 {
        if (this.nextToAlloc >= this.vectors.length) {
            throw new Error('arena is full cannot alloc');
        }
        return this.vectors[this.nextToAlloc++];        
    }
    reset(): void {
        this.nextToAlloc = 0;
    }
}

export const default_allocator = new ArenaVec3Allocator(1024)

let allocator = default_allocator;

export const use_vec3_allocator = (a: ArenaVec3Allocator): void => {
    run_hook(() => {
        const prev_allocator = allocator;
        allocator = a;
        return () => {
            allocator = prev_allocator
        };
    })
}

export const len_vec3 = (v: Vec3): number => {
    return Math.hypot(v[0], v[1], v[2]);
}

export const sq_len_vec3 = (v: Vec3): number => {
    return v[0] ** 2 + v[1] ** 2 + v[2] ** 2;
}

export const vec3 = (a: number, b: number, c: number): Vec3 => {
    return allocator.alloc(a, b, c);
};

export const vec3_dirty = (): Vec3 => {
    return allocator.alloc_dirty();
}

export const color = vec3;
export const point3 = vec3;
export const color_dirty = vec3_dirty;
export const point3_dirty = vec3_dirty;

export const set_vec3 = (v: Vec3, x: number, y: number, z: number): void => {
    v[0] = x;
    v[1] = y;
    v[2] = z;
};
`;

const gen_vec_vec_bin_op = (op_name, op_code) => use_result_arg => {
    const name = `${op_name}_vec3`;
    const signature = gen_signature(use_result_arg, sig('Vec3', 'a: Vec3, b: Vec3'));
    const body = gen_output(use_result_arg, 'vec3', [0, 1, 2].map(i => `a[${i}] ${op_code} b[${i}]`));
    return gen_fn(name, signature, body, use_result_arg);
};

const gen_vec_scalar_bin_op = (op_name, op_code) => use_result_arg => {
    const name = `${op_name}_vec3_s`;
    const signature = gen_signature(use_result_arg, sig('Vec3', 'a: Vec3, s: number'));
    const body = gen_output(use_result_arg, 'vec3', [0, 1, 2].map(i => `a[${i}] ${op_code} s`));
    return gen_fn(name, signature, body, use_result_arg);
};

const gen_fma_vec3_s_s = (use_result_arg) => {
    const name = `fma_vec3_s_s`;
    const signature = gen_signature(use_result_arg, sig('Vec3', 'a: Vec3, b: number, c: number'));
    const body = gen_output(use_result_arg, 'vec3', [
        `a[0] * b + c`,
        `a[1] * b + c`,
        `a[2] * b + c`,
    ]);
    return gen_fn(name, signature, body, use_result_arg);
};

const gen_fma_vec3_s_vec3 = (use_result_arg) => {
    const name = `fma_vec3_s_vec3`;
    const signature = gen_signature(use_result_arg, sig('Vec3', 'a: Vec3, b: number, c: Vec3'));
    const body = gen_output(use_result_arg, 'vec3', [
        `a[0] * b + c[0]`,
        `a[1] * b + c[1]`,
        `a[2] * b + c[2]`,
    ]);
    return gen_fn(name, signature, body, use_result_arg);
};

const gen_fma_vec3 = (use_result_arg) => {
    const name = `fma_vec3`;
    const signature = gen_signature(use_result_arg, sig('Vec3', 'a: Vec3, b: Vec3, c: Vec3'));
    const body = gen_output(use_result_arg, 'vec3', [
        `a[0] * b[0] + c[0]`,
        `a[1] * b[1] + c[1]`,
        `a[2] * b[2] + c[2]`,
    ]);
    return gen_fn(name, signature, body, use_result_arg);
}

const dot_vec3 = (a, b) => {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
};

const gen_cross = (use_result_arg) => {
    const name = 'cross_vec3';
    const signature = gen_signature(use_result_arg, sig('Vec3', 'a: Vec3, b: Vec3'));
    const body = [
        ind + `const x = a[1] * b[2] - a[2] * b[1];`,
        ind + `const y = a[2] * b[0] - a[0] * b[2];`,
        ind + `const z = a[0] * b[1] - a[1] * b[0];`,
        gen_output(use_result_arg, 'vec3', ['x', 'y', 'z'])
    ].join('\n');
    return gen_fn(name, signature, body, use_result_arg);
}

const gen_vec_orthogonal = (use_result_arg) => {
    const name = `orthogonal_vec3`;
    const signature = gen_signature(use_result_arg, sig('Vec3', 'v: Vec3'));
    const body = [
        ind + 'const x = v[0];',
        ind + 'const y = v[1];',
        ind + 'const z = v[2];',
        ind + 'const ax = Math.abs(x);',
        ind + 'const ay = Math.abs(y);',
        ind + 'const az = Math.abs(z);',
        ind + 'if (ax <= ay && ax <= az) {',
        gen_output(use_result_arg, 'vec3', [
            '0',
            'z',
            '-y',
        ], ind),
        ind + '} else if (ay <= az) {',
        gen_output(use_result_arg, 'vec3', [
            '-z',
            '0',
            'x',
        ], ind),
        ind + '} else {',
        gen_output(use_result_arg, 'vec3', [
            'y',
            '-x',
            '0',
        ], ind),
        ind + '}'
    ].join('\n');

    return gen_fn(name, signature, body, use_result_arg);
};

const gen_unit_vec3 = (use_result_arg) => {
    const name = `unit_vec3`;
    const signature = gen_signature(use_result_arg, sig('Vec3', 'a: Vec3'));
    const body = [
        'const len = Math.hypot(a[0], a[1], a[2]);',
        gen_output(use_result_arg, 'vec3', [0, 1, 2].map(i => `a[${i}] / len`))
    ].join('\n');

    return gen_fn(name, signature, body, use_result_arg);
};

const gen_mix_vec3 = (use_result_arg) => {
    const name = `mix_vec3`;
    const signature = gen_signature(use_result_arg, sig('Vec3', 'a: Vec3, b: Vec3, t: number'));
    const body = [
        ind + `const q = 1 - t`,
        gen_output(use_result_arg, 'vec3', [0, 1, 2].map(i => `a[${i}] * q + b[${i}] * t`))
    ].join('\n');
    return gen_fn(name, signature, body, use_result_arg);
};

const gen_negate_vec3 = (use_result_arg) => {
    const name = `negate_vec3`;
    const signature = gen_signature(use_result_arg, sig('Vec3', 'a: Vec3'));
    const body = gen_output(use_result_arg, 'vec3', [0, 1, 2].map(i => `-a[${i}]`));
    return gen_fn(name, signature, body, use_result_arg);
};

const gen_rand_vec3 = (use_result_arg) => {
    const name = `rand_vec3`;
    const signature = gen_signature(use_result_arg, sig('Vec3'));
    const body = gen_output(use_result_arg, 'vec3', [0, 1, 2].map(() => `random()`));
    return gen_fn(name, signature, body, use_result_arg);
};

const gen_rand_vec3_min_max = (use_result_arg) => {
    const name = `rand_vec3_min_max`;
    const signature = gen_signature(use_result_arg, sig('Vec3', 'min: number, max: number'));
    const body = gen_output(use_result_arg, 'vec3', [0, 1, 2].map(() => `random_min_max(min, max)`));
    return gen_fn(name, signature, body, use_result_arg);
};

const gen_rand_vec3_in_unit_sphere = (use_result_arg) => {
    const name = `rand_vec3_in_unit_sphere`;
    const signature = gen_signature(use_result_arg, sig('Vec3'));
    const body = use_result_arg
        ? [
            ind + 'do {',
            ind + '    rand_vec3_min_max_r(result, -1, 1)',
            ind + '} while(sq_len_vec3(result) >= 1)',
        ].join('\n')
        : [
            ind + 'const v = rand_vec3_min_max(-1, 1);',
            ind + 'while (sq_len_vec3(v) >= 1) {',
            ind + '    rand_vec3_min_max_r(v, -1, 1);',
            ind + '}',
            ind + 'return v;'
        ].join('\n');
    return gen_fn(name, signature, body, use_result_arg);
};

const gen_rand_vec3_unit = (use_result_arg) => {
    const name = `rand_vec3_unit`;
    const signature = gen_signature(use_result_arg, sig('Vec3'));
    const body = [
        ind + 'const r1 = Math.random()',
        ind + 'const r2 = Math.random() * Math.PI * 2',
        ind + 'const cos_t = 1 - 2 * r1',
        ind + 'const sin_t = Math.sqrt(1 - cos_t * cos_t)',
        ind + 'const cos_p = Math.cos(r2)',
        ind + 'const sin_p = Math.sin(r2)',
        gen_output(use_result_arg, 'vec3', [
            'sin_t * cos_p',
            'sin_t * sin_p',
            'cos_t',
        ])
    ].join('\n');
    return gen_fn(name, signature, body, use_result_arg);
};

const gen_rand_vec3_on_unit_hemisphere = (use_result_arg) => {
    const name = `rand_vec3_on_unit_hemisphere`;
    const signature = gen_signature(use_result_arg, sig('Vec3'));
    const body = [
        ind + 'const r1 = Math.random()',
        ind + 'const r2 = Math.random() * Math.PI * 2',
        ind + 'const cos_t = r1',
        ind + 'const sin_t = Math.sqrt(1 - cos_t * cos_t)',
        ind + 'const cos_p = Math.cos(r2)',
        ind + 'const sin_p = Math.sin(r2)',
        gen_output(use_result_arg, 'vec3', [
            'sin_t * cos_p',
            'sin_t * sin_p',
            'cos_t',
        ])
    ].join('\n');
    return gen_fn(name, signature, body, use_result_arg);
};

const gen_rand_vec3_cosine_unit = (use_result_arg) => {
    const name = `rand_vec3_cosine_unit`;
    const signature = gen_signature(use_result_arg, sig('Vec3'));
    const body = [
        ind + 'const r1 = Math.random()',
        ind + 'const r2 = Math.random() * Math.PI * 2',
        ind + 'const cos_t = Math.sqrt(1 - r1)',
        ind + 'const sin_t = Math.sqrt(r1)',
        ind + 'const cos_p = Math.cos(r2)',
        ind + 'const sin_p = Math.sin(r2)',
        gen_output(use_result_arg, 'vec3', [
            'sin_t * cos_p',
            'sin_t * sin_p',
            'cos_t',
        ])
    ].join('\n');
    return gen_fn(name, signature, body, use_result_arg);
};

const gen_reflect_incident_vec3 = (use_result_arg) => {
    const name = `reflect_incident_vec3`;
    const signature = gen_signature(use_result_arg, sig('Vec3', 'incident_v: Vec3, normal: Vec3'));
    const body = use_result_arg
        ? [
            ind + 'mul_vec3_s_r(result, normal, 2 * dot_vec3(incident_v, normal));',
            ind + 'sub_vec3_r(result, incident_v, result);'
        ].join('\n')
        : [
            ind + 'const result = mul_vec3_s(normal, 2 * dot_vec3(incident_v, normal));',
            ind + 'sub_vec3_r(result, incident_v, result);',
            ind + 'return result;',
        ].join('\n');
    return gen_fn(name, signature, body, use_result_arg);
}

const gen_reflect_vec3 = (use_result_arg) => {
    const name = `reflect_vec3`;
    const signature = gen_signature(use_result_arg, sig('Vec3', 'v: Vec3, normal: Vec3'));
    const body = use_result_arg
        ? [
            ind + 'mul_vec3_s_r(result, normal, 2 * dot_vec3(v, normal));',
            ind + 'sub_vec3_r(result, result, v);'
        ].join('\n')
        : [
            ind + 'const result = mul_vec3_s(normal, 2 * dot_vec3(v, normal));',
            ind + 'sub_vec3_r(result, result, v);',
            ind + 'return result;',
        ].join('\n');
    return gen_fn(name, signature, body, use_result_arg);
}

const gen_refract_incident_vec3 = (use_result_arg) => {
    const name = `refract_incident_vec3`;
    const signature = gen_signature(use_result_arg, sig('Vec3', 'incident_v: Vec3, normal: Vec3, ior: number'));
    const body = use_result_arg
        ? [
            ind + 'const cos_theta = -dot_vec3(normal, incident_v);',
            ind + 'const v_proj = result;',
            ind + 'mul_vec3_s_r(v_proj, normal, cos_theta);',
            ind + 'const out_x_dir = v_proj;',
            ind + 'add_vec3_r(out_x_dir, incident_v, v_proj);',
            ind + 'const out_x = out_x_dir;',
            ind + 'mul_vec3_s_r(out_x, out_x_dir, ior);',
            //todo: make a tmp variable for out_y
            ind + 'const out_y = mul_vec3_s(normal, -Math.sqrt(1 - sq_len_vec3(out_x)));',
            ind + 'add_vec3_r(out_x, out_x, out_y);',
        ].join('\n')
        : [
            ind + 'const cos_theta = -dot_vec3(normal, incident_v);',
            ind + 'const v_proj = mul_vec3_s(normal, cos_theta);',
            ind + 'const out_x_dir = v_proj;',
            ind + 'add_vec3_r(out_x_dir, incident_v, v_proj);',
            ind + 'const out_x = out_x_dir;',
            ind + 'mul_vec3_s_r(out_x, out_x_dir, ior);',
            //todo: make a tmp variable for out_y
            ind + 'const out_y = mul_vec3_s(normal, -Math.sqrt(1 - sq_len_vec3(out_x)));',
            ind + 'add_vec3_r(out_x, out_x, out_y);',
            ind + 'return out_x;',
        ].join('\n');
    return gen_fn(name, signature, body, use_result_arg);
};

export const gen_rand_vec3_in_unit_disk = (use_result_arg) => {
    const name = 'rand_vec3_in_unit_disk';
    const signature = gen_signature(use_result_arg, sig('Vec3'));
    const code = use_result_arg
        ? [
            `do {`,
            `    set_vec3(result, random_min_max(-1, 1), random_min_max(-1, 1), 0);`,
            `} while (sq_len_vec3(result) >= 1)`,
        ]
        : [
            `const result = vec3_dirty();`,
            `do {`,
            `    set_vec3(result, random_min_max(-1, 1), random_min_max(-1, 1), 0);`,
            `} while (sq_len_vec3(result) >= 1)`,
            `return result;`
        ];

    const body = code.map(x => ind + x).join('\n');

    return gen_fn(name, signature, body, use_result_arg);
};

export const gen_vec_module = () => {
    const module_code = [
        preamble,
        gen_fn('dot_vec3', sig('number', 'a: Vec3, b: Vec3'), ind + extract_fn_body(dot_vec3)),
        ...[
            gen_fma_vec3_s_s,
            gen_fma_vec3_s_vec3,
            gen_fma_vec3,
            gen_cross,
            gen_vec_orthogonal,
            gen_unit_vec3,
            gen_mix_vec3,
            gen_negate_vec3,
            gen_rand_vec3,
            gen_rand_vec3_min_max,
            gen_rand_vec3_in_unit_sphere,
            gen_rand_vec3_unit,
            gen_rand_vec3_on_unit_hemisphere,
            gen_rand_vec3_cosine_unit,
            gen_reflect_incident_vec3,
            gen_reflect_vec3,
            gen_refract_incident_vec3,
            gen_rand_vec3_in_unit_disk,

            gen_vec_vec_bin_op('add', '+'),
            gen_vec_vec_bin_op('sub', '-'),
            gen_vec_vec_bin_op('div', '/'),
            gen_vec_vec_bin_op('mul', '*'),

            gen_vec_scalar_bin_op('add', '+'),
            gen_vec_scalar_bin_op('sub', '-'),
            gen_vec_scalar_bin_op('div', '/'),
            gen_vec_scalar_bin_op('mul', '*'),
        ].flatMap(f => [f(false), f(true)])
    ].join('\n\n') + '\n';

    const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
    const math_path = path.join(__dirname, '../js/math');
    fs.writeFileSync(path.join(math_path, 'vec3.gen.ts'), module_code);
};

