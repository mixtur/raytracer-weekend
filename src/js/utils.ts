const degRadFactor = Math.PI / 180;

export const degrees_to_radians = (deg: number): number => deg * degRadFactor;

export const clamp = (x: number, min: number, max: number): number => {
    if (x < min) return min;
    if (x > max) return max;
    return x;
}

export const format_time = (ms: number): string => {
    const msInt = Math.floor(ms);
    const s = Math.floor(msInt / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);

    const padStart = (x: number, p: number): string => Math.floor(x).toString().padStart(p, '0');

    return `${padStart(h, 2)}:${padStart(m % 60, 2)}:${padStart(s % 60, 2)}.${padStart(ms % 1000, 3)}`;
};
