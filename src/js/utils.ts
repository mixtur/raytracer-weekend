const deg_rad_factor = Math.PI / 180;

export const degrees_to_radians = (deg: number): number => deg * deg_rad_factor;

export const clamp = (x: number, min: number, max: number): number => {
    if (x < min) return min;
    if (x > max) return max;
    return x;
};

export const remap = (x: number, src_lo: number, src_hi: number, dst_lo: number, dst_hi: number): number => {
    return dst_lo + (dst_hi - dst_lo) * (x - src_lo) / (src_hi - src_lo);
};

export const format_time = (ms: number): string => {
    const ms_int = Math.floor(ms);
    const s = Math.floor(ms_int / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);

    const pad_start = (x: number, p: number): string => Math.floor(x).toString().padStart(p, '0');

    return `${pad_start(h, 2)}:${pad_start(m % 60, 2)}:${pad_start(s % 60, 2)}.${pad_start(ms % 1000, 3)}`;
};

type TeardownPoolItem = (() => void)[];
const teardowns_pool: TeardownPoolItem[] = [];
const alloc_teardown_list = () => {
    const list = teardowns_pool.pop();
    if (list === undefined) {
        return [];
    }
    list.length = 0;
    return list;
}

const free_teardown_list = (list: TeardownPoolItem) => {
    teardowns_pool.push(list);
}
let current_teardowns: TeardownPoolItem | undefined;
export const run_with_hooks = <T>(f: () => T): T => {
    const prev_teardowns = current_teardowns;
    const teardowns = alloc_teardown_list();
    current_teardowns = teardowns;
    const result = f();
    for (let i = 0; i < teardowns.length; i++){
        teardowns[i]();
    }
    free_teardown_list(teardowns);
    current_teardowns = prev_teardowns;
    return result;
};


export const async_run_with_hooks = async <T>(f: () => Promise<T>): Promise<T> => {
    const prev_teardowns = current_teardowns;
    const teardowns = alloc_teardown_list();
    current_teardowns = teardowns;
    try {
        return await f();
    } finally {
        for (let i = 0; i < teardowns.length; i++){
            teardowns[i]();
        }
        free_teardown_list(teardowns);
        current_teardowns = prev_teardowns;
    }
};

export const run_hook = (f: () => () => void) => {
    if (current_teardowns === undefined) {
        throw new Error(`hooks must be run either inside run_with_hooks or async_run_with_hooks`);
    }
    current_teardowns.push(f())
};
