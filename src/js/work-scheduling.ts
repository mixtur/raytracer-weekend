export interface TileScheduleItem {
    tile_index: number;
    sample_count: number;
    width: number;
    height: number;
    x: number;
    y: number;
}

const X_TILE_COUNT = 12;
const Y_TILE_COUNT = 12;
export const TILES_COUNT = X_TILE_COUNT * Y_TILE_COUNT;

// result[thread_id][work_index] = tile_schedule_item
export const schedule_tiles = (width: number, height: number, samples_per_pixel: number, thread_count: number): TileScheduleItem[][] => {

    const base_tile_width = Math.floor(width / X_TILE_COUNT);
    const base_tile_height = Math.floor(height / Y_TILE_COUNT);

    const progression = [];
    {
        let samples_left = samples_per_pixel;
        while (samples_left > 0) {
            const current_samples_per_pixel = Math.max(1, Math.floor(samples_left / 2));
            progression.unshift(current_samples_per_pixel)
            samples_left -= current_samples_per_pixel;
        }

        for (let i = 1; i < progression.length; i++) {
            if (progression[i] <= progression[i - 1]) {
                const delta = (progression[i] - progression[i - 1]) + 1;
                progression[i] += delta;
                progression[progression.length - 1] -= delta;
            }
        }
        while (progression.length >= 2 && progression[progression.length - 1] < progression[progression.length - 2]) {
            progression[progression.length - 2] += progression[progression.length - 1];
            progression.length--;
        }
    }

    console.assert(progression.reduce((a, b) => a + b) === samples_per_pixel);

    const tile_grid = [];
    const x_remainder_reset = width - X_TILE_COUNT * base_tile_width;
    let y_remainder = height - Y_TILE_COUNT * base_tile_height;
    let y_base = 0;
    for (let y = 0; y < Y_TILE_COUNT; y++) {
        const tile_height = y_remainder > 0
            ? base_tile_height + 1
            : base_tile_height;
        y_remainder--;
        let x_remainder = x_remainder_reset;
        let x_base = 0;
        for (let x = 0; x < X_TILE_COUNT; x++) {
            const tile_width = x_remainder > 0
                ? base_tile_width + 1
                : base_tile_width;
            x_remainder--;

            tile_grid.push({
                tile_index: x + y * X_TILE_COUNT,
                x: x_base,
                y: y_base,
                tile_width,
                tile_height,
                samples_left: samples_per_pixel
            });

            x_base += tile_width;
        }
        y_base += tile_height;
    }

    const thread_loads = [];
    for (let i = 0; i < thread_count; i++) {
        thread_loads.push(0);
    }


    const result: TileScheduleItem[][] = [];
    for (let i = 0; i < progression.length; i++){
        const suggested_samples = progression[i];
        for (let j = 0; j < tile_grid.length; j++) {
            const tile = tile_grid[j];
            let min_load = thread_loads[0];
            let min_load_thread_id = 0;
            for (let thread_id = 1; thread_id < thread_loads.length; thread_id++){
                const thread_load = thread_loads[thread_id];
                if (thread_load < min_load) {
                    min_load_thread_id = thread_id;
                    min_load = thread_load;
                }
            }

            const samples_to_cast = Math.min(tile.samples_left, suggested_samples);
            const load = samples_to_cast * tile.tile_width * tile.tile_height;
            thread_loads[min_load_thread_id] += load;
            tile.samples_left -= samples_to_cast;
            let thread_work = result[min_load_thread_id];
            if (!thread_work) {
                thread_work = [];
                result[min_load_thread_id] = thread_work;
            }

            thread_work.push({
                tile_index: tile.tile_index,
                width: tile.tile_width,
                height: tile.tile_height,
                x: tile.x,
                y: tile.y,
                sample_count: samples_to_cast
            });
        }
    }

    console.assert(tile_grid.every(tile => tile.samples_left === 0));

    return result;
};
