const deg_rad_factor = Math.PI / 180;

export const degrees_to_radians = (deg: number): number => deg * deg_rad_factor;

export const clamp = (x: number, min: number, max: number): number => {
    if (x < min) return min;
    if (x > max) return max;
    return x;
}

export const format_time = (ms: number): string => {
    const ms_int = Math.floor(ms);
    const s = Math.floor(ms_int / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);

    const pad_start = (x: number, p: number): string => Math.floor(x).toString().padStart(p, '0');

    return `${pad_start(h, 2)}:${pad_start(m % 60, 2)}:${pad_start(s % 60, 2)}.${pad_start(ms % 1000, 3)}`;
};

const teardowns: Array<() => void> = [];
export const run_with_hooks = <T>(f: () => T): T => {
    teardowns.length = 0;
    try {
        return f();
    } finally {
        for (let i = 0; i < teardowns.length; i++){
            teardowns[i]();
        }
    }
};


export const async_run_with_hooks = async <T>(f: () => Promise<T>): Promise<T> => {
    teardowns.length = 0;
    try {
        return await f();
    } finally {
        for (let i = 0; i < teardowns.length; i++){
            teardowns[i]();
        }
    }
};

export const run_hook = (f: () => () => void) => teardowns.push(f());
