export const create_debug_helper = (canvas_element: HTMLCanvasElement) => {
    const info = document.createElement('div');
    info.classList.toggle('debug-helper');
    document.body.appendChild(info);

    const state = {
        visible: false,
        x: 0,
        y: 0
    };

    const canvas_rect = {
        x: 0,
        y: 0,
        w: 0,
        h: 0
    };

    const observer = new ResizeObserver((entries) => {
        for (const e of entries) {
            const { x, y, width, height } = canvas_element.getBoundingClientRect()

            canvas_rect.x = x;
            canvas_rect.y = y;
            canvas_rect.w = width;
            canvas_rect.h = height;

            update_canvas_rect_scale_down();
        }
    })

    const object_rect = {
        x: 0,
        y: 0,
        w: canvas_element.width,
        h: canvas_element.height,
    };

    const update_canvas_rect_scale_down = () => {
        const W = canvas_rect.w;
        const H = canvas_rect.h;

        const ow = canvas_element.width;
        const oh = canvas_element.height;

        let w = ow;
        let h = oh;
        if (W < ow || H < oh) {
            // aspect is "wideness"
            const o_aspect = ow / oh;
            const c_aspect = W / H;

            if (c_aspect > o_aspect) {
                w = oh * o_aspect;
            } else {
                h = ow / o_aspect;
            }
        }

        object_rect.x = (W - w) / 2;
        object_rect.y = (H - h) / 2;
        object_rect.w = w;
        object_rect.h = h;
    };

    observer.observe(canvas_element, {box: 'content-box'});

    const update_ui = () => {
        info.classList.toggle('debug-helper--visible', state.visible);
        const u = (state.x - canvas_rect.x - object_rect.x) / object_rect.w;
        const v = (state.y - canvas_rect.y - object_rect.y) / object_rect.h;
        info.innerText = `x: ${u.toFixed(3)}, y: ${v.toFixed(3)}`;

        info.style.left = state.x + 'px';
        info.style.top = state.y + 'px';
        const transform_x = u > 0.5 ? 'calc(-100% - 10px)' : '10px';
        const transform_y = v > 0.5 ? 'calc(-100% - 10px)' : '10px';

        info.style.transform = `translate(${transform_x}, ${transform_y})`
    };

    update_ui();

    document.addEventListener('pointermove', (e) => {
        state.visible = document.elementFromPoint(e.x, e.y) === canvas_element;
        state.x = e.x;
        state.y = e.y;
        update_ui();
    });
}
