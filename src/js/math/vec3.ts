import { random, random_min_max } from './random';
import { ArenaVec3Allocator, GCVec3Allocator, Vec3Allocator } from './vec3_allocators';
import { async_run_with_hooks, run_hook, run_with_hooks } from '../utils';

export type Vec3 = Float64Array;
export type Color = Vec3;
export type Point3 = Vec3;

export const gc_allocator = new GCVec3Allocator();
export const default_allocator = new ArenaVec3Allocator(1024);

let allocator: Vec3Allocator = default_allocator;
export const use_vec3_allocator = (a: Vec3Allocator) => run_hook(() => {
    const prev_allocator = allocator;
    allocator = a;
    return () => {
        allocator = prev_allocator
    };
});

export const vec3 = (x: number, y: number, z: number): Vec3 => allocator.alloc(x, y, z);
export const color = vec3;
export const point3 = vec3;

export const vec3_set = (v: Vec3, x: number, y: number, z: number): void => {
    v[0] = x;
    v[1] = y;
    v[2] = z;
}

export const vec3_sub_2 = (a: Vec3, b: Vec3): Vec3 => vec3(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
export const vec3_sub_3 = (result: Vec3, a: Vec3, b: Vec3): void => {
    result[0] = a[0] - b[0];
    result[1] = a[1] - b[1];
    result[2] = a[2] - b[2];
};

export const vec3_add_2 = (a: Vec3, b: Vec3): Vec3 => vec3(a[0] + b[0], a[1] + b[1], a[2] + b[2]);
export const vec3_add_3 = (result: Vec3, a: Vec3, b: Vec3): void => {
    result[0] = a[0] + b[0];
    result[1] = a[1] + b[1];
    result[2] = a[2] + b[2];
};

export const vec3_muls_2 = (a: Vec3, s: number): Vec3 => vec3(a[0] * s, a[1] * s, a[2] * s);
export const vec3_muls_3 = (result: Vec3, b: Vec3, s: number): void => {
    result[0] = b[0] * s;
    result[1] = b[1] * s;
    result[2] = b[2] * s;
};

export const vec3_divs_2 = (a: Vec3, s: number): Vec3 => vec3(a[0] / s, a[1] / s, a[2] / s);
export const vec3_divs_3 = (result: Vec3, a: Vec3, s: number): void => {
    result[0] = a[0] / s;
    result[1] = a[1] / s;
    result[2] = a[2] / s;
};

export const vec3_len = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
export const vec3_sq_len = (a: Vec3): number => a[0] ** 2 + a[1] ** 2 + a[2] ** 2;

export const vec3_mulv_2 = (a: Vec3, b: Vec3): Vec3 => vec3(a[0] * b[0], a[1] * b[1], a[2] * b[2]);
export const vec3_mulv_3 = (result: Vec3, a: Vec3, b: Vec3): void => {
    result[0] = a[0] * b[0];
    result[1] = a[1] * b[1];
    result[2] = a[2] * b[2];
};

// a * b + c
export const vec3_mulv_addv_3 = (a: Vec3, b: Vec3, c: Vec3): Vec3 => {
    return vec3(
        a[0] * b[0] + c[0],
        a[1] * b[1] + c[1],
        a[2] * b[2] + c[2]
    );
}

export const vec3_mulv_addv_4 = (result: Vec3, a: Vec3, b: Vec3, c: Vec3): void => {
    result[0] = a[0] * b[0] + c[0];
    result[1] = a[1] * b[1] + c[1];
    result[2] = a[2] * b[2] + c[2];
}

export const vec3_muls_addv_3 = (a: Vec3, b: number, c: Vec3): Vec3 => {
    return vec3(
        a[0] * b + c[0],
        a[1] * b + c[1],
        a[2] * b + c[2]
    );
};

export const vec3_muls_addv_4 = (result: Vec3, a: Vec3, b: number, c: Vec3): void => {
    result[0] = a[0] * b + c[0];
    result[1] = a[1] * b + c[1];
    result[2] = a[2] * b + c[2];
}

export const vec3_dot = (a: Vec3, b: Vec3): number => {
    return a[0] * b[0]
         + a[1] * b[1]
         + a[2] * b[2];
}

export const vec3_cross2 = (a: Vec3, b: Vec3): Vec3 => {
    return vec3(
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    );
};

export const vec3_cross3 = (result: Vec3, a: Vec3, b: Vec3): void => {
    const x =   a[1] * b[2] - a[2] * b[1];
    const y =   a[2] * b[0] - a[0] * b[2];
    result[2] = a[0] * b[1] - a[1] * b[0];
    result[0] = x;
    result[1] = y;
};

export const x_vec3 = vec3(1, 0, 0);
export const y_vec3 = vec3(0, 1, 0);
export const z_vec3 = vec3(0, 0, 1);

export const vec3_orthogonal_1 = (v: Vec3): Vec3 => {
    const t = v[0] > 0.9 ? y_vec3 : x_vec3;
    return vec3_cross2(t, v);
}

export const vec3_orthogonal_2 = (result: Vec3, v: Vec3): void => {
    const x = v[0];
    const y = v[1];
    const z = v[2];
    const ax = Math.abs(x);
    const ay = Math.abs(y);
    const az = Math.abs(z);

    if (ax <= ay && ax <= az) {
        result[0] = 0;
        result[1] = z;
        result[2] = -y;
    } else if (ay <= az) {
        result[0] = -z;
        result[1] = 0;
        result[2] = x;
    } else {
        result[0] = y;
        result[1] = -x;
        result[2] = 0;
    }
}

export const vec3_unit1 = (a: Vec3): Vec3 => vec3_muls_2(a, 1 / vec3_len(a));

export const vec3_unit2 = (result: Vec3, a: Vec3): void => vec3_divs_3(result, a, vec3_len(a));

export const vec3_mix3 = (a: Vec3, b: Vec3, t: number): Vec3 => {
    const q = 1 - t;
    return vec3(
        q * a[0] + t * b[0],
        q * a[1] + t * b[1],
        q * a[2] + t * b[2],
    );
};

export const vec3_mix4 = (result: Vec3, a: Vec3, b: Vec3, t: number): void => {
    const q = 1 - t;
    result[0] = q * a[0] + t * b[0];
    result[1] = q * a[1] + t * b[1];
    result[2] = q * a[2] + t * b[2];
};

export const vec3_negate1 = (a: Vec3): Vec3 => {
    return vec3(-a[0], -a[1], -a[2]);
};

export const vec3_negate2 = (result: Vec3, a: Vec3): void => {
    result[0] = -a[0];
    result[1] = -a[1];
    result[2] = -a[2];
};

export const vec3_rand = (): Vec3 => vec3(random(), random(), random());
export const vec3_rand1 = (v: Vec3): void => {
    v[0] = random();
    v[1] = random();
    v[2] = random();
}

export const vec3_rand_min_max2 = (min: number, max: number): Vec3 => vec3(random_min_max(min, max), random_min_max(min, max), random_min_max(min, max));
export const vec3_rand_min_max3 = (result: Vec3, min: number, max: number): void => {
    result[0] = random_min_max(min, max);
    result[1] = random_min_max(min, max);
    result[2] = random_min_max(min, max);
};

export const vec3_rand_in_unit_sphere = (): Vec3 => {
    const v = vec3_rand_min_max2(-1, 1);
    while (vec3_sq_len(v) >= 1) {
        vec3_rand_min_max3(v, -1, 1);
    }
    return v;
};

export const vec3_rand_in_unit_sphere1 = (result: Vec3): void => {
    vec3_rand_min_max3(result, -1, 1);
    while (vec3_sq_len(result) >= 1) {
        vec3_rand_min_max3(result, -1, 1);
    }
};

export const vec3_rand_unit = (): Vec3 => {
    const r1 = Math.random();
    const r2 = Math.random() * Math.PI * 2;
    const cos_t = 1 - 2 * r1;
    const sin_t = Math.sqrt(1 - cos_t * cos_t);
    const cos_p = Math.cos(r2);
    const sin_p = Math.sin(r2);

    return vec3(
        sin_t * cos_p,
        sin_t * sin_p,
        cos_t
    );
};

export const vec3_rand_unit1 = (result: Vec3): void => {
    const r1 = Math.random();
    const r2 = Math.random() * Math.PI * 2;
    const cos_t = 1 - 2 * r1;
    const sin_t = Math.sqrt(1 - cos_t * cos_t);
    const cos_p = Math.cos(r2);
    const sin_p = Math.sin(r2);

    result[0] = sin_t * cos_p;
    result[1] = sin_t * sin_p;
    result[2] = cos_t;
};

export const vec3_rand_unit_on_hemisphere = (): Vec3 => {
    const r1 = Math.random();
    const r2 = Math.random() * Math.PI * 2;
    const cos_t = r1;// which is the same as 1 - r1
    const sin_t = Math.sqrt(1 - cos_t * cos_t);
    const sin_p = Math.sin(r2);
    const cos_p = Math.cos(r2);

    return vec3(
        sin_t * cos_p,
        sin_t * sin_p,
        cos_t
    );
}

export const vec3_rand_unit_on_hemisphere1 = (v: Vec3): void => {
    const r1 = Math.random();
    const r2 = Math.random() * Math.PI * 2;
    const cos_t = r1;// which is the same as 1 - r1
    const sin_t = Math.sqrt(1 - cos_t * cos_t);
    const sin_p = Math.sin(r2);
    const cos_p = Math.cos(r2);

    v[0] = sin_t * cos_p;
    v[1] = sin_t * sin_p;
    v[2] = cos_t;
}


export const vec3_rand_cosine_unit = (): Vec3 => {
    const r1 = Math.random() * Math.PI * 2;
    const r2 = Math.random();

    const cos_p = Math.cos(r1);
    const sin_p = Math.sin(r1);
    const cos_t = Math.sqrt(1 - r2);
    const sin_t = Math.sqrt(r2);

    return vec3(
        cos_p * sin_t,
        sin_p * sin_t,
        cos_t
    );
}

export const vec3_rand_cosine_unit1 = (result: Vec3): void => {
    const r1 = Math.random() * Math.PI * 2;
    const r2 = Math.random();

    const cos_p = Math.cos(r1);
    const sin_p = Math.sin(r1);
    const cos_t = Math.sqrt(1 - r2);
    const sin_t = Math.sqrt(r2);

    result[0] = cos_p * sin_t;
    result[1] = sin_p * sin_t;
    result[2] = cos_t;
}

export const vec3_random_in_hemisphere = (normal: Vec3) : Vec3 => {
    const in_unit_sphere = vec3_rand_in_unit_sphere();
    return vec3_dot(in_unit_sphere, normal) < 0
        ? vec3_negate1(in_unit_sphere)
        : in_unit_sphere;
};

export const vec3_near_zero = (v: Vec3): boolean => {
    const eps = 1e-8;
    return Math.abs(v[0]) < eps && Math.abs(v[1]) < eps && Math.abs(v[2]) < eps;
};

export const vec3_reflect = (v: Vec3, normal: Vec3): Vec3 => {
    const result = vec3_muls_2(normal, 2 * vec3_dot(v, normal));
    vec3_sub_3(result, v, result);
    return result;
};

export const vec3_refract = (v: Vec3, normal: Vec3, ior: number): Vec3 => {
    const cos_theta = -vec3_dot(normal, v);
    const v_proj = vec3_muls_2(normal, cos_theta);
    const out_x_dir = v_proj;
    vec3_add_3(out_x_dir, v, v_proj);
    const out_x = out_x_dir;
    vec3_muls_3(out_x, out_x_dir, ior);
    const out_y = vec3_muls_2(normal, -Math.sqrt(1 - vec3_sq_len(out_x)));
    vec3_add_3(out_x, out_x, out_y);
    return out_x;
};


export const vec3_rand_in_unit_disk = (): Vec3 => {
    while (true) {
        const p = vec3(random_min_max(-1, 1), random_min_max(-1, 1), 0);
        if (vec3_sq_len(p) >= 1) continue;
        return p;
    }
}
