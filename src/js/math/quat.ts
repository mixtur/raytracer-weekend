import {
    vec3,
    Vec3,
    vec3_cross_3,
    vec3_dot,
    vec3_orthogonal_2,
    z_vec3,
    vec3_unit2
} from './vec3';
import { run_hook } from '../utils';

export type Quat = Float64Array;

export class ArenaQuatAllocator {
    nextToAlloc: number = 0;
    quats: Array<Float64Array> = [];
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

export const quat_sq_len = (q: Quat) => q[0] ** 2 +
                                        q[1] ** 2 +
                                        q[2] ** 2 +
                                        q[3] ** 2;

export const normalize_quat_1 = (q: Quat): Quat => {
    const len = Math.hypot(q[0], q[1], q[2], q[3]);
    return quat(
        q[0] / len,
        q[1] / len,
        q[2] / len,
        q[3] / len,
    );
}

export const normalize_quat_2 = (result: Quat, q: Quat): void => {
    const len = Math.hypot(q[0], q[1], q[2], q[3]);
    result[0] = q[0] / len;
    result[1] = q[1] / len;
    result[2] = q[2] / len;
    result[3] = q[3] / len;
}

const im = vec3(0, 0, 0);
const tmp_vec = vec3(0, 0, 0);
export const quat_from_z_1 = (_new_z: Vec3): Quat => {
    const new_z = tmp_vec;
    vec3_unit2(new_z, _new_z);
    // we use these two lines as a special case of vec3_cross_3(im, z_vec3, new_z);
    im[0] = - new_z[1];
    im[1] = new_z[0];
    const result = quat(
        im[0],
        im[1],
        im[2],
        new_z[2] + 1 // new_z[2] is a special case of vec3_dot(z_vec3, new_z)
    );

    const sq_len = quat_sq_len(result);
    if (sq_len < 0.00001) {
        vec3_orthogonal_2(im, new_z);
        result[0] = im[0];
        result[1] = im[1];
        result[2] = im[2];
        result[3] = 0;
    }

    normalize_quat_2(result, result);

    return result;
}

export const quat_from_z_2 = (result: Quat, new_z: Vec3): void => {
    im[0] = - new_z[1];
    im[1] = new_z[0];
    result[0] = im[0];
    result[1] = im[1];
    result[2] = im[2];
    result[3] = new_z[2] + 1;

    const sq_len = quat_sq_len(result);
    if (sq_len < 0.00001) {
        vec3_orthogonal_2(im, new_z);
        result[0] = im[0];
        result[1] = im[1];
        result[2] = im[2];
        result[3] = 0;
    }

    normalize_quat_2(result, result);
}

export const mul_quat_vec3_2 = (q: Quat, v: Vec3): Vec3 => {
    const x = q[0];
    const y = q[1];
    const z = q[2];
    const w = q[3];

    const tx = v[0];
    const ty = v[1];
    const tz = v[2];

    const ax = x + x;
    const ay = y + y;
    const az = z + z;

    const bx = y * tz - z * ty + w * tx;
    const by = z * tx - x * tz + w * ty;
    const bz = x * ty - y * tx + w * tz;

    return vec3(
        tx + ay * bz - az * by,
        ty + az * bx - ax * bz,
        tz + ax * by - ay * bx,
    );
}

export const mul_quat_vec3_3 = (result: Vec3, q: Quat, v: Vec3): void => {
    const x = q[0];
    const y = q[1];
    const z = q[2];
    const w = q[3];

    const tx = v[0];
    const ty = v[1];
    const tz = v[2];

    const ax = x + x;
    const ay = y + y;
    const az = z + z;

    const bx = y * tz - z * ty + w * tx;
    const by = z * tx - x * tz + w * ty;
    const bz = x * ty - y * tx + w * tz;

    result[0] = tx + ay * bz - az * by;
    result[1] = ty + az * bx - ax * bz;
    result[2] = tz + ax * by - ay * bx;
}
