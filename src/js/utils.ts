const degRadFactor = Math.PI / 180;

export const degrees_to_radians = (deg: number): number => deg * degRadFactor;

export const clamp = (x: number, min: number, max: number): number => {
    if (x < min) return min;
    if (x > max) return max;
    return x;
}

export const format_time = (ms: number): string => {
    const s = ms / 1000;
    const m = s / 60;
    const h = m / 60;

    const padStart = (x: number, f: number, p: number): string => x.toFixed(f).padStart(p, '0');

    return `${padStart(h, 0, 2)}:${padStart(m % 60, 0, 2)}:${padStart(s % 60, 0, 2)}.${padStart(ms % 1000, 0, 3)}`;

};