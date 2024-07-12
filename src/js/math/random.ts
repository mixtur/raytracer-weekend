export const random = Math.random;

export const random_min_max = (min: number, max: number): number => {
    return min + (max - min) * random();
};

export const random_int_min_max = (min: number, max: number): number => {
    return Math.floor(random_min_max(min, max + 1));
}
