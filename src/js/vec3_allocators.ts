import type { Vec3 } from './vec3';

export interface Vec3Allocator {
    alloc(a: number, b: number, c: number): Vec3;
}

export class GCVec3Allocator implements Vec3Allocator {
    alloc(a: number, b: number, c: number): Vec3 {
        const result = new Float64Array(3)
        result[0] = a;
        result[1] = b;
        result[2] = c;
        return result;
    }
}

export class ArenaVec3Allocator implements Vec3Allocator {
    nextToAlloc: number = 0;
    dump: Float64Array;
    vectors: Array<Float64Array> = [];
    constructor(maxVectors: number) {
        const vectorByteLength = Float64Array.BYTES_PER_ELEMENT * 3;
        const buffer = new ArrayBuffer(maxVectors * vectorByteLength);
        this.dump = new Float64Array(buffer);
        for (let i = 0; i < maxVectors; i++) {
            this.vectors.push(new Float64Array(buffer, i * vectorByteLength, 3));
        }
    }
    alloc(a: number, b: number, c: number): Vec3 {
        if (this.nextToAlloc >= this.vectors.length) {
            throw new Error('arena is full cannot alloc');
        }
        const result = this.vectors[this.nextToAlloc++];
        result[0] = a;
        result[1] = b;
        result[2] = c;
        return result;
    }
    reset(): void {
        this.nextToAlloc = 0;
    }
}
