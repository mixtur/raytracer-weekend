export type Random = () => number;

let currentRandom: Random = Math.random;

export const getPredefinedRandom = (numbers: number[]): Random => {
    let i = 0;
    const N = numbers.length;
    return () => {
        i = (i + 1) % N;
        return numbers[i];
    };
}

export const random = () => currentRandom();

export const randomScope = <T>(randomFunc: Random, scope: () => T): T => {
    const prevRandom = currentRandom;
    currentRandom = randomFunc;
    const result = scope();
    currentRandom = prevRandom;
    return result;
}

export const randomMinMax = (min: number, max: number): number => {
    return min + (max - min) * currentRandom();
};

export const randomIntMinMax = (min: number, max: number): number => {
    return Math.floor(randomMinMax(min, max + 1));
}
