import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { gen_fn, gen_output, gen_signature, ind, sig } from './utils.mjs';

const gen_vec_preamble = (components_count) => {
    const vec_type_name = `Vec${components_count}`;
    const vec_name = `vec${components_count}`;

    const arena_type_name = `Arena${vec_type_name}Allocator`;
    const component_names = [...'xyzw'.slice(0, components_count)];
    const component_names_decl = component_names.map(x => x + ': number').join(', ');

    const current_allocator_name = `${vec_name}_allocator`;


    return [
        `export type ${vec_type_name} = Float64Array`,
        `export type Point${components_count} = ${vec_type_name}`,
        `export class ${arena_type_name} {`,
        ind + 'nextToAlloc: number = 0;',
        ind + 'dump: Float64Array;',
        ind + 'vectors: Float64Array[] = [];',
        ind + 'constructor(max_vectors: number, shared = false) {',
        ind + ind + `const vector_byte_length = Float64Array.BYTES_PER_ELEMENT * ${components_count};`,
        ind + ind + 'const buffer_type = shared ? SharedArrayBuffer : ArrayBuffer;',
        ind + ind + 'const buffer = new buffer_type(max_vectors * vector_byte_length);',
        ind + ind + 'this.dump = new Float64Array(buffer);',
        ind + ind + 'for (let i = 0; i < max_vectors; i++) {',
        ind + ind + ind + `this.vectors.push(new Float64Array(buffer, i * vector_byte_length, ${components_count}));`,
        ind + ind + '}',
        ind + '}',
        ind + `alloc(${component_names_decl}): ${vec_type_name} {`,
        ind + ind + `if (this.nextToAlloc >= this.vectors.length) {`,
        ind + ind + ind + `throw new Error(\`${arena_type_name} is full cannot alloc. Limit = \${this.vectors.length}\`);`,
        ind + ind + `}`,
        ind + ind + `const result = this.vectors[this.nextToAlloc++];`,
        ...component_names.map((arg_name, i) => ind + ind + `result[${i}] = ${arg_name};`),
        ind + ind + `return result;`,
        ind + `}`,
        ind + `alloc_dirty(): ${vec_type_name} {`,
        ind + ind + `if (this.nextToAlloc >= this.vectors.length) {`,
        ind + ind + ind + `throw new Error('arena is full cannot alloc');`,
        ind + ind + `}`,
        ind + ind + `return this.vectors[this.nextToAlloc++];`,
        ind + `}`,
        ind + `reset(): void {`,
        ind + ind + `this.nextToAlloc = 0;`,
        ind + `}`,
        '}',
        `export const default_${vec_name}_allocator = new ${arena_type_name}(2048)`,
        `let ${current_allocator_name} = default_${vec_name}_allocator;`,
        ``,
        `export const use_${vec_name}_allocator = (a: ${arena_type_name}): void => {`,
        ind + `run_hook(() => {`,
        ind + ind + `const prev_allocator = ${current_allocator_name};`,
        ind + ind + `${current_allocator_name} = a;`,
        ind + ind + `return () => {`,
        ind + ind + ind + `${current_allocator_name} = prev_allocator`,
        ind + ind + `};`,
        ind + `})`,
        `}`,
        '',
        `export const ${vec_name} = (${component_names_decl}): ${vec_type_name} => {`,
        ind + `return ${current_allocator_name}.alloc(${component_names.join(', ')});`,
        `};`,
        '',
        `export const ${vec_name}_dirty = (): ${vec_type_name} => {`,
        ind + `return ${current_allocator_name}.alloc_dirty();`,
        `};`,
        '',
        `export const len_${vec_name} = (v: ${vec_type_name}): number => {`,
        ind + `return Math.hypot(${component_names.map((a, i) => `v[${i}]`).join(', ')});`,
        `}`,
        ``,
        `export const sq_len_${vec_name} = (v: ${vec_type_name}): number => {`,
        ind + `return ${component_names.map((a, i) => `v[${i}] ** 2`).join(' + ')};`,
        `}`,
        `export const point${components_count} = ${vec_name};`,
        `export const point${components_count}_dirty = ${vec_name}_dirty;`,
        ``,
        `export const set_${vec_name} = (result: ${vec_type_name}, ${component_names_decl}): void => {`,
        ...component_names.map((arg, i) => ind + `result[${i}] = ${arg};`),
        `};`,
        '',
        `export const dot_${vec_name} = (a: ${vec_type_name}, b: ${vec_type_name}) => {`,
        ind + `return ${indices(components_count).map(i => `a[${i}] * b[${i}]`).join(' + ')};`,
        `};`,
    ].join('\n');
};


const indices = (components_count) => new Array(components_count).fill(0).map((_, i) => i);

const gen_vec_vec_bin_op = (op_name, op_code) => components_count => use_result_arg => {
    const vec_type_name = `Vec${components_count}`;
    const vec_name = `vec${components_count}`;

    const name = `${op_name}_${vec_name}`;
    const signature = gen_signature(use_result_arg, sig(vec_type_name, `a: ${vec_type_name}, b: ${vec_type_name}`));
    const body = gen_output(use_result_arg, vec_name, indices(components_count).map((i) => `a[${i}] ${op_code} b[${i}]`));
    return gen_fn(name, signature, body, use_result_arg);
};

const gen_vec_scalar_bin_op = (op_name, op_code) => components_count => use_result_arg => {
    const vec_type_name = `Vec${components_count}`;
    const vec_name = `vec${components_count}`;

    const name = `${op_name}_${vec_name}_s`;
    const signature = gen_signature(use_result_arg, sig(vec_type_name, `a: ${vec_type_name}, s: number`));
    const body = gen_output(use_result_arg, vec_name, indices(components_count).map(i => `a[${i}] ${op_code} s`));
    return gen_fn(name, signature, body, use_result_arg);
};

const gen_fma_vec_s_s = (components_count) => (use_result_arg) => {
    const vec_type_name = `Vec${components_count}`;
    const vec_name = `vec${components_count}`;

    const name = `fma_${vec_name}_s_s`;
    const signature = gen_signature(use_result_arg, sig(vec_type_name, `a: ${vec_type_name}, b: number, c: number`));
    const body = gen_output(use_result_arg, vec_name, indices(components_count).map(i => `a[${i}] * b + c`));
    return gen_fn(name, signature, body, use_result_arg);
};

const gen_fma_vec_s_vec = (components_count) => (use_result_arg) => {
    const vec_type_name = `Vec${components_count}`;
    const vec_name = `vec${components_count}`;

    const name = `fma_${vec_name}_s_${vec_name}`;
    const signature = gen_signature(use_result_arg, sig(vec_type_name, `a: ${vec_type_name}, b: number, c: ${vec_type_name}`));
    const body = gen_output(use_result_arg, vec_name, indices(components_count).map(i => `a[${i}] * b + c[${i}]`));
    return gen_fn(name, signature, body, use_result_arg);
};

const gen_fma_vec = (components_count) => (use_result_arg) => {
    const vec_type_name = `Vec${components_count}`;
    const vec_name = `vec${components_count}`;

    const name = `fma_${vec_name}`;
    const signature = gen_signature(use_result_arg, sig(vec_type_name, `a: ${vec_type_name}, b: ${vec_type_name}, c: ${vec_type_name}`));
    const body = gen_output(use_result_arg, vec_name, indices(components_count).map(i => `a[${i}] * b[${i}] + c[${i}]`));
    return gen_fn(name, signature, body, use_result_arg);
}

const gen_cross_vec2 = () => {
    return `export const cross_vec2 = (a: Vec2, b: Vec2) => a[0] * b[1] - a[1] * b[0];`;
}

const gen_cross_vec3 = (use_result_arg) => {
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

const gen_vec_orthogonal = (components_count) => (use_result_arg) => {
    const vec_type_name = `Vec${components_count}`;
    const vec_name = `vec${components_count}`;

    const name = `orthogonal_${vec_name}`;
    const signature = gen_signature(use_result_arg, sig(vec_type_name, `v: ${vec_type_name}`));
    let body;
    switch (components_count) {
        case 3:
            body = [
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
            break;
        case 2:
            body = [
                ind + 'const x = v[0];',
                ind + 'const y = v[1];',
                gen_output(use_result_arg, 'vec2', [
                    '-y',
                    'x'
                ])
            ].join('\n');
            break;
        default:
            throw new Error(`don't know how to create orthogonal ${vec_name}`);
    }

    return gen_fn(name, signature, body, use_result_arg);
};

const gen_unit_vec = (components_count) => (use_result_arg) => {
    const vec_type_name = `Vec${components_count}`;
    const vec_name = `vec${components_count}`;

    const name = `unit_${vec_name}`;
    const signature = gen_signature(use_result_arg, sig(vec_type_name, `a: ${vec_type_name}`));
    const body = [
        `const len = Math.hypot(${indices(components_count).map(i => `a[${i}]`).join(', ')});`,
        gen_output(use_result_arg, vec_name, indices(components_count).map(i => `a[${i}] / len`))
    ].join('\n');

    return gen_fn(name, signature, body, use_result_arg);
};

const gen_mix_vec = (components_count) => (use_result_arg) => {
    const vec_type_name = `Vec${components_count}`;
    const vec_name = `vec${components_count}`;

    const name = `mix_${vec_name}`;
    const signature = gen_signature(use_result_arg, sig(vec_type_name, `a: ${vec_type_name}, b: ${vec_type_name}, t: number`));
    const body = [
        ind + `const q = 1 - t`,
        gen_output(use_result_arg, vec_name, indices(components_count).map(i => `a[${i}] * q + b[${i}] * t`))
    ].join('\n');
    return gen_fn(name, signature, body, use_result_arg);
};

const gen_negate_vec = (components_count) => (use_result_arg) => {
    const vec_type_name = `Vec${components_count}`;
    const vec_name = `vec${components_count}`;

    const name = `negate_${vec_name}`;
    const signature = gen_signature(use_result_arg, sig(vec_type_name, `a: ${vec_type_name}`));
    const body = gen_output(use_result_arg, vec_name, indices(components_count).map(i => `-a[${i}]`));
    return gen_fn(name, signature, body, use_result_arg);
};

const gen_rand_vec = (components_count) => (use_result_arg) => {
    const vec_type_name = `Vec${components_count}`;
    const vec_name = `vec${components_count}`;

    const name = `rand_${vec_name}`;
    const signature = gen_signature(use_result_arg, sig(vec_type_name));
    const body = gen_output(use_result_arg, vec_name, indices(components_count).map(() => `random()`));
    return gen_fn(name, signature, body, use_result_arg);
};

const gen_rand_vec_min_max = (components_count) => (use_result_arg) => {
    const vec_type_name = `Vec${components_count}`;
    const vec_name = `vec${components_count}`;

    const name = `rand_${vec_name}_min_max`;
    const signature = gen_signature(use_result_arg, sig(vec_type_name, 'min: number, max: number'));
    const body = gen_output(use_result_arg, vec_name, indices(components_count).map(() => `random_min_max(min, max)`));
    return gen_fn(name, signature, body, use_result_arg);
};

const gen_rand_vec_in_unit_sphere = (components_count) => (use_result_arg) => {
    const vec_type_name = `Vec${components_count}`;
    const vec_name = `vec${components_count}`;

    const area_name = components_count === 2 ? 'circle' : 'sphere';

    const name = `rand_${vec_name}_in_unit_${area_name}`;
    const signature = gen_signature(use_result_arg, sig(vec_type_name));
    const body =
        [
            ...(use_result_arg ? [] : [ind + `const result = ${vec_name}_dirty();`]),
            ind + 'do {',
            ind + `    rand_${vec_name}_min_max_r(result, -1, 1)`,
            ind + `} while(sq_len_${vec_name}(result) >= 1)`,
            ind + 'return result;'
        ].join('\n');
    return gen_fn(name, signature, body, use_result_arg);
};

const gen_rand_vec_unit = (components_count) => (use_result_arg) => {
    const vec_type_name = `Vec${components_count}`;
    const vec_name = `vec${components_count}`;

    const name = `rand_${vec_name}_unit`;
    const signature = gen_signature(use_result_arg, sig(vec_type_name));
    let body;
    switch (components_count) {
        case 3:
            body = [
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
            ].join('\n')
            break;
        case 2:
            body = [
                ind + 'const r = Math.random() * Math.PI * 2',
                gen_output(use_result_arg, 'vec2', [
                    'Math.cos(r)',
                    'Math.sin(r)'
                ])
            ].join('\n')
            break;
        default:
            throw new Error(`Don't know how to generate unit ${vec_name}`);
    }
    return gen_fn(name, signature, body, use_result_arg);
};

const gen_rand_vec_on_unit_hemisphere = (components_count) => (use_result_arg) => {
    const vec_type_name = `Vec${components_count}`;
    const vec_name = `vec${components_count}`;

    const area_name = components_count === 2 ? 'semicircle' : 'hemisphere';

    const name = `rand_${vec_name}_on_unit_${area_name}`;
    const signature = gen_signature(use_result_arg, sig(vec_type_name));
    let body;
    switch (components_count) {
        case 3:
            body = [
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
            break;
        case 2:
            body = [
                ind + 'const r = Math.random() * Math.PI',
                gen_output(use_result_arg, 'vec2', [
                    'Math.cos(r)',
                    'Math.sin(r)'
                ])
            ].join('\n')
            break;
        default:
            throw new Error(`Don't know how to generate ${vec_name} on a unit ${area_name}`);
    }
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
            ind + 'sub_vec3_r(result, incident_v, result);',
            ind + 'return result;',
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
            ind + 'sub_vec3_r(result, result, v);',
            ind + 'return result;',
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
            ind + 'return out_x;',
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

const gen_rand_vec3_in_unit_disk = (use_result_arg) => {
    const name = 'rand_vec3_in_unit_disk';
    const signature = gen_signature(use_result_arg, sig('Vec3'));
    const code =
        [
            ...(use_result_arg ? []: [`const result = vec3_dirty();`]),
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
        [
            `import { random, random_min_max } from './random'`,
            `import { run_hook } from '../utils'`,
        ].join('\n'),
        gen_vec_preamble(2),
        gen_vec_preamble(3),
        [
            `export type Color = Vec3`,
            `export const color = vec3;`,
            `export const color_dirty = vec3_dirty;`
        ].join('\n'),
        gen_cross_vec2(),
        ...[
            gen_cross_vec3,
            gen_rand_vec3_cosine_unit,
            gen_reflect_incident_vec3,
            gen_reflect_vec3,
            gen_refract_incident_vec3,
            gen_rand_vec3_in_unit_disk,

            ...[

                gen_fma_vec_s_s,
                gen_fma_vec_s_vec,
                gen_fma_vec,
                gen_vec_orthogonal,
                gen_unit_vec,
                gen_mix_vec,
                gen_negate_vec,
                gen_rand_vec,
                gen_rand_vec_min_max,
                gen_rand_vec_in_unit_sphere,
                gen_rand_vec_unit,
                gen_rand_vec_on_unit_hemisphere,

                gen_vec_vec_bin_op('add', '+'),
                gen_vec_vec_bin_op('sub', '-'),
                gen_vec_vec_bin_op('div', '/'),
                gen_vec_vec_bin_op('mul', '*'),

                gen_vec_scalar_bin_op('add', '+'),
                gen_vec_scalar_bin_op('sub', '-'),
                gen_vec_scalar_bin_op('div', '/'),
                gen_vec_scalar_bin_op('mul', '*'),
            ].flatMap(f => [f(2), f(3)]),

        ].flatMap(f => [f(false), f(true)])
    ].join('\n\n') + '\n';

    const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
    const math_path = path.join(__dirname, '../js/math');
    fs.writeFileSync(path.join(math_path, 'vec.gen.ts'), module_code);
};

