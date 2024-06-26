import { run_hook } from '../utils';

export type Random = () => number;

let current_random: Random = Math.random;

export const use_random = (random: Random) => run_hook(() => {
    const prev_random = current_random;
    current_random = random;
    return () => { current_random = prev_random; }
});

export const get_predefined_random = (numbers: number[]): Random => {
    let i = 0;
    const N = numbers.length;
    return () => {
        i = (i + 1) % N;
        return numbers[i];
    };
}

export const random = () => current_random();

export const random_min_max = (min: number, max: number): number => {
    return min + (max - min) * current_random();
};

export const random_int_min_max = (min: number, max: number): number => {
    return Math.floor(random_min_max(min, max + 1));
}
