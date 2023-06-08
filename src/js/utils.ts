const degRadFactor = Math.PI / 180;

export const degrees_to_radians = (deg: number): number => deg * degRadFactor;

export const clamp = (x: number, min: number, max: number): number => {
    if (x < min) return min;
    if (x > max) return max;
    return x;
}