import { vec3, Vec3, vec3_cross_2, vec3_unit1 } from './vec3';
import { run_hook } from '../utils';

//matrices are column-major
export type Mat3 = Float64Array;

export class ArenaMat3Allocator {
    nextToAlloc: number = 0;
    matrices: Array<Float64Array> = [];
    constructor(max_vectors: number) {
        const matrix_byte_length = Float64Array.BYTES_PER_ELEMENT * 9;
        const buffer = new ArrayBuffer(max_vectors * matrix_byte_length);
        for (let i = 0; i < max_vectors; i++) {
            this.matrices.push(new Float64Array(buffer, i * matrix_byte_length, 9));
        }
    }
    alloc(a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number): Mat3 {
        if (this.nextToAlloc >= this.matrices.length) {
            throw new Error('arena is full cannot alloc');
        }
        const result = this.matrices[this.nextToAlloc++];

        result[0] = a;
        result[1] = b;
        result[2] = c;
        result[3] = d;
        result[4] = e;
        result[5] = f;
        result[6] = g;
        result[7] = h;
        result[8] = i;

        return result;
    }
    reset(): void {
        this.nextToAlloc = 0;
    }
}

let allocator = new ArenaMat3Allocator(64);
export const use_mat3_allocator = (a: ArenaMat3Allocator) => run_hook(() => {
    const prev = allocator;
    allocator = a;
    return () => { allocator = prev; };
});

export const mat3 = (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number): Mat3 => {
    return allocator.alloc(a ,b, c, d, e, f, g, h, i);
}

export const mul_mat3_vec3_2 = (mat: Mat3, vec: Vec3): Vec3 => {
    const x = vec[0];
    const y = vec[1];
    const z = vec[2];
    return vec3(
        x * mat[0] + y * mat[3] + z * mat[6],
        x * mat[1] + y * mat[4] + z * mat[7],
        x * mat[2] + y * mat[5] + z * mat[8]
    );
};

export const mul_mat3_vec3_3 = (result: Vec3, mat: Mat3, vec: Vec3): void => {
    const x = vec[0];
    const y = vec[1];
    const z = vec[2];

    result[0] = x * mat[0] + y * mat[3] + z * mat[6];
    result[1] = x * mat[1] + y * mat[4] + z * mat[7];
    result[2] = x * mat[2] + y * mat[5] + z * mat[8];
};

export const mat3_from_z_1 = (base_z: Vec3): Mat3 => {
    const z = vec3_unit1(base_z);
    const a = (Math.abs(base_z[0]) < 0.9) ? vec3(1, 0, 0) : vec3(0, 1, 0);
    const x = vec3_cross_2(z, a);
    const y = vec3_cross_2(z, x);

    return mat3(
        x[0], x[1], x[2],
        y[0], y[1], y[2],
        z[0], z[1], z[2]
    );
}

export const mat3_from_z_2 = (result: Mat3, base_z: Vec3): void => {
    const z = vec3_unit1(base_z);
    const a = (Math.abs(base_z[0]) < 0.9) ? vec3(1, 0, 0) : vec3(0, 1, 0);
    const x = vec3_cross_2(z, a);
    const y = vec3_cross_2(z, x);

    result[0] = x[0];
    result[1] = x[1];
    result[2] = x[2];
    result[3] = y[0];
    result[4] = y[1];
    result[5] = y[2];
    result[6] = z[0];
    result[7] = z[1];
    result[8] = z[2];
}
