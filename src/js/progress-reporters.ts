import { format_time } from './utils';

export interface ProgressReporter {
    report(thread_id: number, thread_progress: number, rays_casted_increment: number, total_rays_to_cast: number, time_passed: number): void
    report_thread_done(thread_id: number): void;
    report_done(total_rays: number, total_time_ms: number): void;
}


export class ConsoleProgressReporter implements ProgressReporter {
    expected_report_call_count: number;
    done_rays: number = 0;
    constructor(image_height: number, thread_count: number) {
        this.expected_report_call_count = image_height * thread_count;
    }

    report(thread_id: number, thread_progress: number, rays_casted_increment: number, total_rays_to_cast: number, time_passed: number): void {
        this.done_rays += rays_casted_increment;
        if (Math.random() < 100 / this.expected_report_call_count) {
            const overall_progress = this.done_rays / total_rays_to_cast;
            console.log(`[${format_time(time_passed)} / ${format_time(time_passed / overall_progress)}]: casted ${(overall_progress * 100).toFixed(2).padStart(5)}% of all rays`);
        }
    }

    report_thread_done(thread_id: number): void {
        console.log(`Thread #${thread_id} - done`);
    }

    report_done(total_rays: number, total_time_ms: number) {
        console.log(`Done! Casted ${total_rays} in ${format_time(total_time_ms)}ms at ${total_rays / total_time_ms * 1000} rays per second`);
    }
}

export class MultipleReporters implements ProgressReporter {
    reporters: ProgressReporter[];
    constructor(reporters: ProgressReporter[]) {
        this.reporters = reporters;
    }
    report(thread_id: number, thread_progress: number, rays_casted_increment: number, total_rays_to_cast: number, time_passed: number) {
        for (const reporter of this.reporters) {
            reporter.report(thread_id, thread_progress, rays_casted_increment, total_rays_to_cast, time_passed);
        }
    }
    report_thread_done(thread_id: number) {
        for (const reporter of this.reporters) {
            reporter.report_thread_done(thread_id);
        }
    }
    report_done(total_rays: number, total_time_ms: number) {
        for (const reporter of this.reporters) {
            reporter.report_done(total_rays, total_time_ms);
        }
    }
}

export class ProgressBar implements ProgressReporter {
    per_thread_progress: Float64Array;
    thread_count: number;
    per_thread_ctx: CanvasRenderingContext2D;
    canvas_width = 840;

    constructor(container: HTMLElement, thread_count: number) {
        const progress_reporter_div = document.createElement('div');
        container.appendChild(progress_reporter_div);

        progress_reporter_div.insertAdjacentHTML('afterbegin',
            [
                '<div class="progress-reporter__label-per-thread">Progress per thread</div>',
                `<canvas class="progress-reporter__canvas_per_thread"></canvas>`
            ].join('')
        );

        progress_reporter_div.className = 'progress-bar';

        const create_ctx = (selector: string): CanvasRenderingContext2D => {
            const canvas = progress_reporter_div.querySelector(selector) as HTMLCanvasElement;
            canvas.width = this.canvas_width;
            canvas.height = thread_count;
            canvas.style.width = '100%';
            canvas.style.height = `${thread_count}px`;
            const ctx = canvas.getContext('2d');
            if (ctx === null) { throw new Error('Progress reporter cannot acquire canvas 2d context'); }
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fff';
            return ctx;
        };

        this.per_thread_ctx = create_ctx('canvas.progress-reporter__canvas_per_thread');
        this.per_thread_progress = new Float64Array(thread_count);
        this.thread_count = thread_count;
    }

    report(thread_id: number, thread_progress: number, total_rays_to_cast: number, time_passed: number): void {
        // this.per_line_progress[line_id]++;
        // this.per_line_ctx.fillRect(line_id, this.thread_count - this.per_line_progress[line_id], 1, 1);

        const span_start = this.per_thread_progress[thread_id];
        const span_end = thread_progress * this.canvas_width;
        this.per_thread_progress[thread_id] = span_end;
        this.per_thread_ctx.fillRect(Math.floor(span_start), thread_id, Math.ceil(span_end - span_start), 1);
    }

    report_thread_done(thread_id: number): void {}

    report_done(total_rays: number, total_time_ms: number) {}
}

export class ProgressText implements ProgressReporter {
    rays_report_el: HTMLDivElement;
    speed_report_el: HTMLDivElement;
    time_report_el: HTMLDivElement;
    state_report_el: HTMLDivElement;

    rays_casted = 0;

    format_report_rays(n: number): string {
        return `Rays traced so far: ${n}`;
    }

    format_report_speed(n: number): string {
        return `Rays traced per second: ${Math.round(n * 1000)}`;
    }

    format_report_time(so_far: number, estimated_total: number): string {
        return `Time: ${format_time(so_far)} / ${format_time(estimated_total)}`;
    }

    format_report_state(name: string): string {
        return `State: ${name}`;
    }

    constructor(container: HTMLElement) {
        const progress_reporter_div = document.createElement('div');
        container.appendChild(progress_reporter_div);

        progress_reporter_div.insertAdjacentHTML('afterbegin',
            [
                `<div class="progress-reporter__stat progress-reporter__stat--rays">${this.format_report_rays(0)}</div>`,
                `<div class="progress-reporter__stat progress-reporter__stat--speed">${this.format_report_speed(0)}</div>`,
                `<div class="progress-reporter__stat progress-reporter__stat--time">${this.format_report_time(0, 0)}</div>`,
                `<div class="progress-reporter__stat progress-reporter__stat--state">${this.format_report_state('Rendering')}</div>`
            ].join('')
        );

        progress_reporter_div.className = 'progress-reporter';

        this.rays_report_el = progress_reporter_div.querySelector('.progress-reporter__stat--rays') as HTMLDivElement;
        this.speed_report_el = progress_reporter_div.querySelector('.progress-reporter__stat--speed') as HTMLDivElement;
        this.time_report_el = progress_reporter_div.querySelector('.progress-reporter__stat--time') as HTMLDivElement;
        this.state_report_el = progress_reporter_div.querySelector('.progress-reporter__stat--state') as HTMLDivElement;
    }

    prev_update_time = 0;
    report(thread_id: number, thread_progress: number, rays_casted_increment: number, total_rays_to_cast: number, time_passed: number): void {
        this.rays_casted += rays_casted_increment;

        if (time_passed - this.prev_update_time > 300) {
            this.prev_update_time = time_passed;
            const estimated_total_time = time_passed / this.rays_casted * total_rays_to_cast;
            this.time_report_el.innerText = this.format_report_time(time_passed, estimated_total_time);
            this.rays_report_el.innerText = this.format_report_rays(this.rays_casted);
            this.speed_report_el.innerText = this.format_report_speed(this.rays_casted / time_passed);
        }
    }

    report_thread_done(thread_id: number): void {}

    report_done(total_rays: number, total_time_ms: number) {
        this.speed_report_el.innerText = this.format_report_speed(total_rays / total_time_ms);
        this.time_report_el.innerText = this.format_report_time(total_time_ms, total_time_ms);
        this.rays_report_el.innerText = this.format_report_rays(this.rays_casted);
        this.state_report_el.innerText = this.format_report_state('Done');
    }
}
