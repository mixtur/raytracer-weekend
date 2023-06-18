export const randomMinMax = (min: number, max: number): number => {
    return min + (max - min) * Math.random();
};

export const randomIntMinMax = (min: number, max: number): number => {
    return Math.floor(randomMinMax(min, max + 1));
}
