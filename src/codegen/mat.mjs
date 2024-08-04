import { gen_expr, gen_fn, gen_output, gen_signature, ind, optimize_expr, sig } from './utils.mjs';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const gen_type_name = ({rows, cols}) => {
    return cols === rows
        ? `Mat${rows}`
        : `Mat${rows}x${cols}`;
};

const get_idx_fn = (matrix_layout) => {
    return (row_index, col_index) => col_index * matrix_layout.rows + row_index;
};

// we follow the standard math notation, where m12 is an element on row 1 and column 2
// matrices are stored in column-major order, so for 2x2 matrix the order would be m00, m10, m01, m11
export const gen_mat_preamble = ({rows, cols}) => {
    const mat_type_name = gen_type_name({rows, cols});
    const size = cols * rows;

    const constructor_args = [];
    for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
            constructor_args.push('m' + j + i);
        }
    }

    const allocator_type_name = `Arena${mat_type_name}Allocator`;

    const mat_name = mat_type_name.toLowerCase();
    const allocator_name = `${mat_name}_allocator`

    return [
        `export type ${mat_type_name} = Float64Array;`,
        `export class ${allocator_type_name} {`,
        ind + 'nextToAlloc: number = 0',
        ind + 'matrices: Array<Float64Array> = []',
        ind + 'constructor (max_items: number, shared = false) {',
        ind + ind + `const matrix_byte_length = Float64Array.BYTES_PER_ELEMENT * ${size};`,
        ind + ind + `const buffer_type = shared ? SharedArrayBuffer : ArrayBuffer;`,
        ind + ind + `const buffer = new buffer_type(max_items * matrix_byte_length);`,
        ind + ind + `for (let i = 0; i < max_items; i++) {`,
        ind + ind + ind + `this.matrices.push(new Float64Array(buffer, i * matrix_byte_length, ${size}));`,
        ind + ind + `}`,
        ind + '}',
        ind + '// we follow the standard math notation, where m12 is an element on row 1 and column 2',
        ind + `alloc(${constructor_args.map(a => `${a}: number`).join(', ')}): ${mat_type_name} {`,
        ind + ind + `if (this.nextToAlloc >= this.matrices.length) {`,
        ind + ind + ind + `throw new Error('${mat_type_name} arena is full cannot alloc')`,
        ind + ind + `}`,
        ind + ind + `const result = this.matrices[this.nextToAlloc++];`,
        ...constructor_args.map((a, i) => {
            return ind + ind + `result[${i}] = ${a};`
        }),
        ind + ind + 'return result;',
        ind + `}`,
        ind + `alloc_dirty(): ${mat_type_name} {`,
        ind + ind + `if (this.nextToAlloc >= this.matrices.length) {`,
        ind + ind + ind + `throw new Error('${mat_type_name} arena is full cannot alloc')`,
        ind + ind + `}`,
        ind + ind + `return this.matrices[this.nextToAlloc++];`,
        ind + `}`,
        ind + `reset(): void {`,
        ind + ind + `this.nextToAlloc = 0;`,
        ind + `}`,
        '}',
        '',
        `let ${allocator_name} = new ${allocator_type_name}(64);`,
        `export const use_${mat_name}_allocator = (a: ${allocator_type_name}) => run_hook(() => {`,
        ind + `const prev = ${allocator_name}`,
        ind + `${allocator_name} = a;`,
        ind + `return () => { ${allocator_name} = prev; };`,
        `});`,
        '',
        `export const ${mat_name} = (${constructor_args.map(a => `${a}: number`).join(', ')}): ${mat_type_name} => {`,
        ind + `return ${allocator_name}.alloc(${constructor_args.join(', ')});`,
        `}`,
        '',
        `export const ${mat_name}_dirty = (): ${mat_type_name} => ${allocator_name}.alloc_dirty();`,
    ].join('\n');
}

export const s = 's';

const el = (template_el, sym) => (template_el === s) ? sym : template_el;

const lin = {
    rows: 3,
    cols: 3,
    template: [
        [s, s, s, 0],
        [s, s, s, 0],
        [s, s, s, 0],
        [0, 0, 0, 1],
    ]
};

const aff = {
    rows: 3,
    cols: 4,
    template: [
        [s, s, s, s],
        [s, s, s, s],
        [s, s, s, s],
        [0, 0, 0, 1],
    ]
};

const hom = {
    rows: 4,
    cols: 4,
    template: [
        [s, s, s, s],
        [s, s, s, s],
        [s, s, s, s],
        [s, s, s, s],
    ]
};

export const gen_is_identity = (matrix_layout) => {
    const mat_type_name = gen_type_name(matrix_layout);

    const mat_name = mat_type_name.toLowerCase();

    const name = 'is_identity_' + mat_name;
    const signature = sig('boolean', `mat: ${mat_type_name}`);

    const mat_idx = get_idx_fn(matrix_layout);

    const checks = [];
    for (let col = 0; col < matrix_layout.cols; col++) {
        for (let row = 0; row < matrix_layout.rows; row++) {
            checks.push(`mat[${mat_idx(row, col)}] === ${col === row ? 1 : 0}`);
        }
    }

    return gen_fn(name, signature, `return ${checks.join(' && ')};`);
}

export const gen_mul_mat_vec = (matrix_layout) => (use_result_arg) => {
    const {rows, cols, template} = matrix_layout;
    const mat_type_name = gen_type_name(matrix_layout);

    const mat_name = mat_type_name.toLowerCase();

    const fn_name = `mul_${mat_name}_vec3`;
    const signature = gen_signature(use_result_arg, sig('Vec3', `mat: ${mat_type_name}, vec: Vec3`));

    const mat_idx = get_idx_fn(matrix_layout);
    const component = (row_index) => gen_expr(optimize_expr(
        ['+', ...template[row_index].map((x, i) => {
            return [
                '*',
                el(x, `mat[${mat_idx(row_index, i)}]`),
                i === 3 ? 1 : 'xyz'[i]
            ];
        })]
    ));

    const x = component(0);
    const y = component(1);
    const z = component(2);
    const w = component(3);

    const body = [
        ind + 'const x = vec[0];',
        ind + 'const y = vec[1];',
        ind + 'const z = vec[2];',
        ...(
            w === '1'
                ? [
                    gen_output(use_result_arg, 'vec3', [x, y, z])
                ]
                : [
                    ind + `const inv_w = 1 / ${w}`,
                    gen_output(use_result_arg, 'vec3', [x, y, z].map(c => {
                        return c + ' * inv_w';
                    }))
                ]
        )
    ].join('\n');

    return gen_fn(fn_name, signature, body, use_result_arg);
};

export const gen_mul_mat = (left_layout, right_layout, result_layout) => (use_result_arg) => {
    const type_name_left = gen_type_name(left_layout);
    const type_name_right = gen_type_name(right_layout);
    const type_name_result = gen_type_name(result_layout);

    const idx_left = get_idx_fn(left_layout);
    const idx_right = get_idx_fn(right_layout);

    const preamble = [];
    const signature = gen_signature(use_result_arg, sig(type_name_result, `left: ${type_name_left}, right: ${type_name_right}`));
    for (let col = 0; col < left_layout.cols; col++) {
        for (let row = 0; row < left_layout.rows; row++) {
            preamble.push(`const l${row}${col} = left[${idx_left(row, col)}]`)
        }
    }
    for (let col = 0; col < right_layout.cols; col++) {
        for (let row = 0; row < right_layout.rows; row++) {
            preamble.push(`const r${row}${col} = right[${idx_right(row, col)}]`);
        }
    }

    const result_elements = [];
    for (let col = 0; col < result_layout.cols; col++) {
        for (let row = 0; row < result_layout.rows; row++) {
            const sum = ['+'];
            for (let i = 0; i < 4; i++) {
                const left_col = i;
                const left_row = row;
                const left_arg = el(left_layout.template[left_row][left_col], `l${left_row}${left_col}`);

                const right_col = col;
                const right_row = i;
                const right_arg = el(right_layout.template[right_row][right_col], `r${right_row}${right_col}`);

                sum.push(['*', left_arg, right_arg]);
            }

            result_elements.push(gen_expr(optimize_expr(sum)));
        }
    }

    const left_mat_name = type_name_left.toLowerCase();
    const right_mat_name = type_name_right.toLowerCase();

    const name = left_mat_name === right_mat_name
            ? `mul_${left_mat_name}`
            : `mul_${left_mat_name}_${right_mat_name}`
    const constructor_name = type_name_result.toLowerCase();
    const body = [
        preamble.map(line => ind + line).join('\n'),
        gen_output(use_result_arg, constructor_name, result_elements)
    ].join('\n\n');

    return gen_fn(name, signature, body, use_result_arg);
}

export const gen_mat_conversion = (from_layout, to_layout) => (use_result_arg) => {
    const from_type_name = gen_type_name(from_layout);
    const to_type_name = gen_type_name(to_layout);

    const from_name = from_type_name.toLowerCase();
    const to_name = to_type_name.toLowerCase();

    const name = `${from_name}_to_${to_name}`;
    const signature = gen_signature(use_result_arg, sig(to_type_name, `mat: ${from_type_name}`));
    const idx = get_idx_fn(from_layout);
    const components = [];
    for (let col = 0; col < to_layout.cols; col++) {
        for (let row = 0; row < to_layout.rows; row++) {
            components.push(el(to_layout.template[row][col], `mat[${idx(row, col)}]`));
        }
    }

    return gen_fn(name, signature, gen_output(use_result_arg, to_name, components), use_result_arg);
};

export const gen_columns_to_mat = (matrix_layout) => (use_result_arg) => {
    const mat_type_name = gen_type_name(matrix_layout);
    const mat_name = mat_type_name.toLowerCase();
    const name = `columns_to_${mat_name}`;
    const signature = gen_signature(use_result_arg, {
        return_type: mat_type_name,
        args: new Array(matrix_layout.cols).fill('').map((_, i) => ({ name: `col${i}`, type: 'Vec3' })),
    });
    const components = [];
    for (let col = 0; col < matrix_layout.cols; col++) {
        for (let row = 0; row < matrix_layout.rows; row++) {
            components.push(el(matrix_layout.template[row][col], `col${col}[${row}]`));
        }
    }
    return gen_fn(name, signature, gen_output(use_result_arg, mat_name, components), use_result_arg);
}

export const gen_inv_mat3 = (use_result_arg) => {
    const code = [
        `const m00 = mat[0];`,
        `const m10 = mat[1];`,
        `const m20 = mat[2];`,
        `const m01 = mat[3];`,
        `const m11 = mat[4];`,
        `const m21 = mat[5];`,
        `const m02 = mat[6];`,
        `const m12 = mat[7];`,
        `const m22 = mat[8];`,
        `const c00 = m11 * m22 - m21 * m12;`,
        `const c10 = m10 * m22 - m20 * m12;`,
        `const c20 = m10 * m21 - m20 * m11;`,
        `const c01 = m01 * m22 - m21 * m02;`,
        `const c11 = m00 * m22 - m20 * m02;`,
        `const c21 = m00 * m21 - m20 * m01;`,
        `const c02 = m01 * m12 - m11 * m02;`,
        `const c12 = m00 * m12 - m10 * m02;`,
        `const c22 = m00 * m11 - m10 * m01;`,
        `const inv_det = 1 / (m00 * c00 - m10 * c01 + m20 * c02);`,
        `const inv_neg_det = -inv_det;`,
    ].map(x => ind + x);

    const components = [
        `c00 * inv_det`,
        `c10 * inv_neg_det`,
        `c20 * inv_det`,
        `c01 * inv_neg_det`,
        `c11 * inv_det`,
        `c21 * inv_neg_det`,
        `c02 * inv_det`,
        `c12 * inv_neg_det`,
        `c22 * inv_det`,
    ];

    const name = 'invert_mat3';
    const signature = gen_signature(use_result_arg, sig('Mat3', 'mat: Mat3'));
    const body = [
        code.join('\n'),
        gen_output(use_result_arg, 'mat3', components)
    ].join('\n\n');
    return gen_fn(name, signature, body, use_result_arg);
};

export const gen_inv_mat3x4 = (use_result_arg) => {
    const code = [
        `const e00 = mat[0];`,
        `const e10 = mat[1];`,
        `const e20 = mat[2];`,
        `const e01 = mat[3];`,
        `const e11 = mat[4];`,
        `const e21 = mat[5];`,
        `const e02 = mat[6];`,
        `const e12 = mat[7];`,
        `const e22 = mat[8];`,
        `const e03 = mat[9];`,
        `const e13 = mat[10];`,
        `const e23 = mat[11];`,
        ``,
        `const c0103 = e12 * e23 - e13 * e22;`,
        `const c0203 = e11 * e23 - e13 * e21;`,
        `const c0303 = e11 * e22 - e12 * e21;`,
        `const c1203 = e10 * e23 - e13 * e20;`,
        `const c1303 = e10 * e22 - e12 * e20;`,
        `const c2303 = e10 * e21 - e11 * e20;`,
        ``,
        `const c00 = e11 * e22 - e12 * e21;`,
        `const c01 = e01 * e22 - e02 * e21;`,
        `const c02 = e01 * e12 - e02 * e11;`,
        `const c03 = e01 * c0103 - e02 * c0203 + e03 * c0303;`,
        ``,
        `const c10 = e10 * e22 - e12 * e20;`,
        `const c11 = e00 * e22 - e02 * e20;`,
        `const c12 = e00 * e12 - e02 * e10;`,
        `const c13 = e00 * c0103 - e02 * c1203 + e03 * c1303;`,
        ``,
        `const c20 = e10 * e21 - e11 * e20;`,
        `const c21 = e00 * e21 - e01 * e20;`,
        `const c22 = e00 * e11 - e01 * e10;`,
        `const c23 = e00 * c0203 - e01 * c1203 + e03 * c2303;`,
        ``,
        `const inv_det = 1 / (e00 * c00 - e01 * c10 + e02 * c20);`,
        `const inv_neg_det = -inv_det;`,
    ].map(x => x !== '' ? (ind + x): x);

    const components = [
        `c00 * inv_det`,
        `c10 * inv_neg_det`,
        `c20 * inv_det`,
        `c01 * inv_neg_det`,
        `c11 * inv_det`,
        `c21 * inv_neg_det`,
        `c02 * inv_det`,
        `c12 * inv_neg_det`,
        `c22 * inv_det`,
        `c03 * inv_neg_det`,
        `c13 * inv_det`,
        `c23 * inv_neg_det`,
    ];

    const name = 'invert_mat3x4';
    const signature = gen_signature(use_result_arg, sig('Mat3x4', 'mat: Mat3x4'));
    const body = [
        code.join('\n'),
        gen_output(use_result_arg, 'mat3x4', components)
    ].join('\n\n');
    return gen_fn(name, signature, body, use_result_arg);
}

export const gen_inv_mat4 = (use_result_arg) => {
    const code = [
        `const e00 = mat[0];`,
        `const e10 = mat[1];`,
        `const e20 = mat[2];`,
        `const e30 = mat[3];`,
        `const e01 = mat[4];`,
        `const e11 = mat[5];`,
        `const e21 = mat[6];`,
        `const e31 = mat[7];`,
        `const e02 = mat[8];`,
        `const e12 = mat[9];`,
        `const e22 = mat[10];`,
        `const e32 = mat[11];`,
        `const e03 = mat[12];`,
        `const e13 = mat[13];`,
        `const e23 = mat[14];`,
        `const e33 = mat[15];`,
        `const c1010 = e22 * e33 - e23 * e32;`,
        `const c2010 = e21 * e33 - e23 * e31;`,
        `const c3010 = e21 * e32 - e22 * e31;`,
        `const c1020 = e12 * e33 - e13 * e32;`,
        `const c2020 = e11 * e33 - e13 * e31;`,
        `const c3020 = e11 * e32 - e12 * e31;`,
        `const c1030 = e12 * e23 - e13 * e22;`,
        `const c2030 = e11 * e23 - e13 * e21;`,
        `const c3030 = e11 * e22 - e12 * e21;`,
        `const c2110 = e20 * e33 - e23 * e30;`,
        `const c3110 = e20 * e32 - e22 * e30;`,
        `const c2120 = e10 * e33 - e13 * e30;`,
        `const c3120 = e10 * e32 - e12 * e30;`,
        `const c2130 = e10 * e23 - e13 * e20;`,
        `const c3130 = e10 * e22 - e12 * e20;`,
        `const c3210 = e20 * e31 - e21 * e30;`,
        `const c3220 = e10 * e31 - e11 * e30;`,
        `const c3230 = e10 * e21 - e11 * e20;`,
        `const c00 = e11 * c1010 - e12 * c2010 + e13 * c3010;`,
        `const c10 = e01 * c1010 - e02 * c2010 + e03 * c3010;`,
        `const c20 = e01 * c1020 - e02 * c2020 + e03 * c3020;`,
        `const c30 = e01 * c1030 - e02 * c2030 + e03 * c3030;`,
        `const c01 = e10 * c1010 - e12 * c2110 + e13 * c3110;`,
        `const c11 = e00 * c1010 - e02 * c2110 + e03 * c3110;`,
        `const c21 = e00 * c1020 - e02 * c2120 + e03 * c3120;`,
        `const c31 = e00 * c1030 - e02 * c2130 + e03 * c3130;`,
        `const c02 = e10 * c2010 - e11 * c2110 + e13 * c3210;`,
        `const c12 = e00 * c2010 - e01 * c2110 + e03 * c3210;`,
        `const c22 = e00 * c2020 - e01 * c2120 + e03 * c3220;`,
        `const c32 = e00 * c2030 - e01 * c2130 + e03 * c3230;`,
        `const c03 = e10 * c3010 - e11 * c3110 + e12 * c3210;`,
        `const c13 = e00 * c3010 - e01 * c3110 + e02 * c3210;`,
        `const c23 = e00 * c3020 - e01 * c3120 + e02 * c3220;`,
        `const c33 = e00 * c3030 - e01 * c3130 + e02 * c3230;`,
        `const inv_det = 1 / (e00 * c00 - e01 * c01 + e02 * c02 - e03 * c03);`,
        `const inv_neg_det = -inv_det;`,
    ].map(x => ind + x);
    const components = [
        `c00 * inv_det`,
        `c01 * inv_neg_det`,
        `c02 * inv_det`,
        `c03 * inv_neg_det`,
        `c10 * inv_neg_det`,
        `c11 * inv_det`,
        `c12 * inv_neg_det`,
        `c13 * inv_det`,
        `c20 * inv_det`,
        `c21 * inv_neg_det`,
        `c22 * inv_det`,
        `c23 * inv_neg_det`,
        `c30 * inv_neg_det`,
        `c31 * inv_det`,
        `c32 * inv_neg_det`,
        `c33 * inv_det`,
    ];

    const name = 'invert_mat4';
    const signature = gen_signature(use_result_arg, sig('Mat4', 'mat: Mat4'));
    const body = [
        code.join('\n'),
        gen_output(use_result_arg, 'mat4', components)
    ].join('\n\n');
    return gen_fn(name, signature, body, use_result_arg);
}

export const gen_trs_to_mat = (mat_layout) => (use_result_arg) => {
    const code = [
        `const im_x = rotation[0];`,
        `const im_y = rotation[1];`,
        `const im_z = rotation[2];`,
        `const re = rotation[3];`,
        `const sx = scaling[0];`,
        `const sy = scaling[1];`,
        `const sz = scaling[2];`,
        ``,
        `const sql = im_x * im_x + im_y * im_y + im_z * im_z + re * re;`,
        `const x2 = im_x * 2;`,
        `const y2 = im_y * 2;`,
        `const z2 = im_z * 2;`,
        `const xx2 = im_x * x2;`,
        `const yy2 = im_y * y2;`,
        `const zz2 = im_z * z2;`,
        `const wx2 = re * x2;`,
        `const wy2 = re * y2;`,
        `const wz2 = re * z2;`,
        `const xy2 = im_x * y2;`,
        `const xz2 = im_x * z2;`,
        `const yz2 = im_y * z2;`,
        ``,
        `// rXX - elements of the rotation matrix`,
        `const r00 = sql - (yy2 + zz2);`,
        `const r10 = xy2 + wz2;`,
        `const r20 = xz2 - wy2;`,
        `const r01 = xy2 - wz2;`,
        `const r11 = sql - (xx2 + zz2);`,
        `const r21 = yz2 + wx2;`,
        `const r02 = xz2 + wy2;`,
        `const r12 = yz2 - wx2;`,
        `const r22 = sql - (xx2 + yy2);`,
    ].map(x => ind + x);

    if (mat_layout === lin) {
        const components = [
            `sx * r00`,
            `sx * r10`,
            `sx * r20`,
            `sy * r01`,
            `sy * r11`,
            `sy * r21`,
            `sz * r02`,
            `sz * r12`,
            `sz * r22`,
        ];

        const name = `rs_to_mat3`;
        const signature = gen_signature(use_result_arg, sig('Mat3', 'rotation: Quat, scaling: Vec3'));
        const body = [
            code.join('\n'),
            gen_output(use_result_arg, 'mat3', components)
        ].join('\n');
        return gen_fn(name, signature, body, use_result_arg);
    }
    if (mat_layout === aff) {
        const components = [
            `sx * r00`,
            `sx * r10`,
            `sx * r20`,
            `sy * r01`,
            `sy * r11`,
            `sy * r21`,
            `sz * r02`,
            `sz * r12`,
            `sz * r22`,
            `translation[0]`,
            `translation[1]`,
            `translation[2]`,
        ];

        const name = `trs_to_mat3x4`;
        const signature = gen_signature(use_result_arg, sig('Mat3x4', 'translation: Vec3, rotation: Quat, scaling: Vec3'));
        const body = [
            code.join('\n'),
            gen_output(use_result_arg, 'mat3x4', components)
        ].join('\n');
        return gen_fn(name, signature, body, use_result_arg);
    }
    if (mat_layout === hom) {
        const components = [
            `sx * r00`,
            `sx * r10`,
            `sx * r20`,
            `0`,
            `sy * r01`,
            `sy * r11`,
            `sy * r21`,
            `0`,
            `sz * r02`,
            `sz * r12`,
            `sz * r22`,
            `0`,
            `translation[0]`,
            `translation[1]`,
            `translation[2]`,
            `1`,
        ];

        const name = `trs_to_mat4`;
        const signature = gen_signature(use_result_arg, sig('Mat4', 'translation: Vec3, rotation: Quat, scaling: Vec3'));
        const body = [
            code.join('\n'),
            gen_output(use_result_arg, 'mat4', components)
        ].join('\n');
        return gen_fn(name, signature, body, use_result_arg);
    }

    throw new Error(`Unknown matrix layout`);
}

export const gen_transpose = (template) => (use_result_arg) => {
    const mat_size = template.rows;
    const preamble = [];
    const components = [];
    const mat_type_name = gen_type_name(template);
    const mat_name = mat_type_name.toLowerCase();
    const idx = get_idx_fn(template);
    for (let col = 0; col < mat_size; col++) {
        for (let row = 0; row < mat_size; row++) {
            preamble.push(ind + `const m${col}${row} = mat[${idx(row, col)}]`);
            components.push(`m${row}${col}`);
        }
    }

    const name = `transpose_${mat_name}`;
    const signature = gen_signature(use_result_arg, sig(mat_type_name, `mat: ${mat_type_name}`));
    const body = [
        preamble.join('\n'),
        gen_output(use_result_arg, mat_name, components),
    ].join('\n\n');

    return gen_fn(name, signature, body, use_result_arg);
}

export const gen_gl_asymmetric_perspective_projection = (use_result_arg) => {
    const name = 'gl_asymmetric_perspective_projection_to_mat4';
    const signature = gen_signature(use_result_arg, sig('Mat4', 'left: number, right: number, bottom: number, top: number, near: number, far: number'));
    const preamble = [
        'const near2 = near * 2;',
        'const inv_width = 1 / (right - left);',
        'const inv_height = 1 / (top - bottom);',
        'let m10, m14;',
        'if (Number.isFinite(far)) {',
        '    const inv_neg_depth = 1 / (near - far);',
        '    m10 = (near + far) * inv_neg_depth;',
        '    m14 = near2 * far * inv_neg_depth;',
        '} else {',
        '    m10 = -1;',
        '    m14 = -near2;',
        '}',
    ].map(x => ind + x).join('\n');

    const components = [
        'near2 * inv_width',
        '0',
        '0',
        '0',
        '0',
        'near2 * inv_height',
        '0',
        '0',
        '(left + right) * inv_width',
        '(bottom + top) * inv_height',
        'm10',
        '-1',
        '0',
        '0',
        'm14',
        '0',
    ];
    const body = [
        preamble,
        gen_output(use_result_arg, 'mat4', components)
    ].join('\n\n');

    return gen_fn(name, signature, body, use_result_arg);
};

export const gen_gl_perspective_projection = (use_result_arg) => {
    const name = `gl_perspective_projection`;
    const signature = gen_signature(use_result_arg, sig('Mat4', 'aspect: number, y_fov: number, near: number, far: number'));
    const preamble = [
        ind + 'const top = near * Math.tan(y_fov * 0.5);',
        ind + 'const right = top * aspect;',
    ].join('\n');

    const body = [
        preamble,
        use_result_arg
            ? ind + `gl_asymmetric_perspective_projection_to_mat4_r(result, -right, right, -top, top, near, far);`
            : ind + `return gl_asymmetric_perspective_projection_to_mat4(-right, right, -top, top, near, far);`
    ].join('\n\n');

    return gen_fn(name, signature, body, use_result_arg);
}

export const gen_look_direction_to_mat = (matrix_layout) => (use_result_arg) => {
    const mat_type_name = gen_type_name(matrix_layout);

    const mat_name = mat_type_name.toLowerCase();

    const fn_name = `look_direction_to_${mat_name}`;
    const signature = gen_signature(use_result_arg, sig(mat_type_name, `direction: Vec3, up: Vec3`));

    const preamble = [
        'const x = vec3_dirty();',
        'const y = vec3_dirty();',
        'const z = vec3_dirty();',
        '',
        'z.set(direction);',
        'unit_vec3_r(z, z);',
        '',
        'if (!z.every(Number.isFinite)) {',
        'orthogonal_vec3_r(z, up);',
        'unit_vec3_r(z, z);',
        '} else {',
        'negate_vec3_r(z, z);',
        '}',
        '',
        'cross_vec3_r(x, up, z);',
        'unit_vec3_r(x, x);',
        'if (!x.every(Number.isFinite)) {',
        'orthogonal_vec3_r(x, z);',
        '}',
        'cross_vec3_r(y, z, x);'
    ].map(x => ind + x).join('\n');

    const components = [
        'x[0]',
        'x[1]',
        'x[2]',
        '0',
        'y[0]',
        'y[1]',
        'y[2]',
        '0',
        'z[0]',
        'z[1]',
        'z[2]',
        '0',
        '0',
        '0',
        '0',
        '1',
    ].filter((x, i) => {
        const col_index = Math.floor(i / 4);
        const row_index = i % 4;
        return matrix_layout.template[row_index][col_index] === s;
    });

    const body = [
        preamble,
        gen_output(use_result_arg, mat_name, components)
    ].join('\n\n');

    return gen_fn(fn_name, signature, body, use_result_arg);
}

export const gen_look_target_to_mat = (matrix_layout) => (use_result_arg) => {
    const mat_type_name = gen_type_name(matrix_layout);

    const mat_name = mat_type_name.toLowerCase();

    const fn_name = `look_target_to_${mat_name}`;
    const signature = gen_signature(use_result_arg, sig(mat_type_name, `origin: Vec3, target: Vec3, up: Vec3`));
    const get_idx = get_idx_fn(matrix_layout);

    const body = [
        // const direction = new Vector3().fromVector(target).subtractVector(origin);
        'const direction = sub_vec3(target, origin);',
        use_result_arg
            ? `look_direction_to_${mat_name}_r(result, direction, up);`
            : `const result = look_direction_to_${mat_name}(direction, up);`,
        `result[${get_idx(0, 3)}] = origin[0];`,
        `result[${get_idx(1, 3)}] = origin[1];`,
        `result[${get_idx(2, 3)}] = origin[2];`,
        ...(use_result_arg
            ? []
            : ['return result;']
        )
    ].map(x => ind + x).join('\n');

    return gen_fn(fn_name, signature, body, use_result_arg);
}

export const gen_mat_module = () => {
    const module_code = [
        `import {Vec3, vec3, vec3_dirty, unit_vec3_r, orthogonal_vec3_r, negate_vec3_r, cross_vec3_r, sub_vec3} from './vec3.gen'`,
        `import {Quat} from './quat.gen'`,
        `import { run_hook } from '../utils';`,
        gen_mat_preamble(lin),
        gen_mat_preamble(aff),
        gen_mat_preamble(hom),

        gen_is_identity(lin),
        gen_is_identity(aff),
        gen_is_identity(hom),

        ...[
            gen_columns_to_mat(lin),
            gen_columns_to_mat(aff),

            gen_mat_conversion(lin, aff),
            gen_mat_conversion(lin, hom),

            gen_mat_conversion(aff, lin),
            gen_mat_conversion(aff, hom),

            gen_mat_conversion(hom, lin),
            gen_mat_conversion(hom, aff),

            gen_mul_mat_vec(lin),
            gen_mul_mat_vec(aff),
            gen_mul_mat_vec(hom),

            gen_mul_mat(lin, lin, lin),
            gen_mul_mat(lin, aff, aff),
            gen_mul_mat(lin, hom, hom),

            gen_mul_mat(aff, lin, aff),
            gen_mul_mat(aff, aff, aff),
            gen_mul_mat(aff, hom, hom),

            gen_mul_mat(hom, lin, hom),
            gen_mul_mat(hom, aff, hom),
            gen_mul_mat(hom, hom, hom),

            gen_inv_mat3,
            gen_inv_mat3x4,
            gen_inv_mat4,

            gen_transpose(lin),
            gen_transpose(hom),

            gen_trs_to_mat(lin),
            gen_trs_to_mat(aff),
            gen_trs_to_mat(hom),

            gen_gl_asymmetric_perspective_projection,
            gen_gl_perspective_projection,

            gen_look_direction_to_mat(lin),
            gen_look_direction_to_mat(aff),
            gen_look_direction_to_mat(hom),

            gen_look_target_to_mat(aff),
            gen_look_target_to_mat(hom),
        ].flatMap(f => [f(false), f(true)])
    ].join('\n\n') + '\n';

    const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
    const math_path = path.join(__dirname, '../js/math');
    fs.writeFileSync(path.join(math_path, 'mat3.gen.ts'), module_code);
}
