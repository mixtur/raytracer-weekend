export type Vec3 = Float32Array;
export type Color = Vec3;
export type Point3 = Vec3;

export const vec3 = (x: number, y: number, z: number): Vec3 => new Float32Array([x, y, z]);
export const color = vec3;
export const point3 = vec3;

export const vec3Sub2 = (a: Vec3, b: Vec3): Vec3 => vec3(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
export const vec3Sub3 = (a: Vec3, b: Vec3, c: Vec3): void => {
    a[0] = b[0] - c[0];
    a[1] = b[1] - c[1];
    a[2] = b[2] - c[2];    
};

export const vec3Add2 = (a: Vec3, b: Vec3): Vec3 => vec3(a[0] + b[0], a[1] + b[1], a[2] + b[2]);
export const vec3Add3 = (a: Vec3, b: Vec3, c: Vec3): void => {
    a[0] = b[0] + c[0];
    a[1] = b[1] + c[1];
    a[2] = b[2] + c[2];    
};

export const vec3MulS2 = (a: Vec3, s: number): Vec3 => vec3(a[0] * s, a[1] * s, a[2] * s);
export const vec3MulS3 = (a: Vec3, b: Vec3, s: number): void => {
    a[0] = b[0] * s;
    a[1] = b[1] * s;
    a[2] = b[2] * s;
};

export const vec3DivS2 = (a: Vec3, s: number): Vec3 => vec3(a[0] / s, a[1] / s, a[2] / s);
export const vec3DivS3 = (a: Vec3, b: Vec3, s: number): void => {
    a[0] = b[0] / s;
    a[1] = b[1] / s;
    a[2] = b[2] / s;
};

export const vec3Len = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
export const vec3SqLen = (a: Vec3): number => a[0] ** 2 + a[1] ** 2 + a[2] ** 2;

export const vec3MulV2 = (a: Vec3, b: Vec3): Vec3 => vec3(a[0] * b[0], a[1] * b[1], a[2] * b[2]);
export const vec3MulV3 = (a: Vec3, b: Vec3, c: Vec3): void => {
    a[0] = b[0] * c[0];
    a[1] = b[1] * c[1];
    a[2] = b[2] * c[2];    
};

export const vec3Dot = (a: Vec3, b: Vec3): number => {
    return a[0] * b[0]
         + a[1] * b[1]
         + a[2] * b[2];
}

export const vec3Cross2 = (a: Vec3, b: Vec3): Vec3 => {
    return vec3(
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    );
};

export const vec3Cross3 = (a: Vec3, b: Vec3, c: Vec3): void => {
    const x = b[1] * c[2] - b[2] * c[1];
    const y = b[2] * c[0] - b[0] * c[2];
    a[2] = b[0] * c[1] - b[1] * c[0];
    a[0] = x;
    a[1] = y;
};

export const vec3Unit1 = (a: Vec3): Vec3 => vec3DivS2(a, 1 / vec3Len(a));

export const vec3Unit2 = (result: Vec3, a: Vec3): void => vec3DivS3(result, a, 1 / vec3Len(a));

export const vec3Mix3 = (a: Vec3, b: Vec3, t: number): Vec3 => {
    const q = 1 - t;
    return vec3(
        q * a[0] + t * b[0],
        q * a[1] + t * b[1],
        q * a[2] + t * b[2],
    );
};

export const vec3Mix4 = (result: Vec3, a: Vec3, b: Vec3, t: number): void => {
    const q = 1 - t;
    result[0] = q * a[0] + t * b[0];
    result[1] = q * a[1] + t * b[1];
    result[2] = q * a[2] + t * b[2];
};
