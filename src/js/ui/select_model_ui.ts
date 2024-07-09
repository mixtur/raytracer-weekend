import { Scene } from '../scenes/scene';

export const select_model_ui = async (container: HTMLDivElement): Promise<Scene> => {

    const scenes: [string, () => Promise<Scene>][] = [
        ['Two spheres', async () => {
            const {two_spheres} = await import('../scenes/two_spheres');
            return two_spheres;
        }],
        ['Earth texture', async () => {
            const {create_earth_scene} = await import('../scenes/earth');
            return await create_earth_scene();
        }],
        ['Book 1. Final scene', async () => {
            const {book1_final_scene} = await import('../scenes/book-1-final-scene');
            return book1_final_scene();
        }],
        ['Simple light', async () => {
            const {simple_light} = await import('../scenes/simple_light');
            return simple_light;
        }],
        ['Cornell box', async () => {
            const {cornell_box} = await import('../scenes/cornell_box');
            return cornell_box;
        }],
        ['Cornel box with smoke', async () => {
            const {cornell_box_with_smoke} = await import('../scenes/cornell_box_with_smoke');
            return cornell_box_with_smoke;
        }],
        ['Book 2. Final scene', async () => {
            const {book2_final_scene} = await import('../scenes/book-2-final-scene');
            return await book2_final_scene();
        }],
        ['simple.gltf', async () => {
            const {load_simple_gltf} = await import('../scenes/simple_gltf');
            return await load_simple_gltf();
        }],
        ['DamagedHelmet.gltf', async () => {
            const {load_damaged_helmet_gltf} = await import('../scenes/damaged_helmet_gltf');
            return await load_damaged_helmet_gltf();
        }]
    ];

    try {
        const ui = document.createElement('div');
        ui.innerHTML = [
            '<div class="select-model-ui">',
            scenes.map(([name], i) => {
                return `<button id="selection_${i}">${name}</button>`;
            }).join('\n'),
            '</div>',
        ].join('\n');

        container.appendChild(ui);

        const select = document.getElementById('select-model-ui__select') as HTMLSelectElement;
        const load_button = document.getElementById('select-model-ui__load-button') as HTMLButtonElement;


        const model_index = await new Promise<number>((resolve) => {
            for (let i = 0; i < scenes.length; i++) {
                const btn = document.getElementById(`selection_${i}`) as HTMLButtonElement;
                btn.onclick = () => resolve(i);
            }
        });

        container.removeChild(ui);

        const model_loader = scenes[model_index][1];

        if (model_loader === undefined) {
            throw new Error(`Unknown scene ${select.value}`);
        }

        return model_loader();
    }
    catch {
        alert('Failed to load model, reloading the page...');
        window.location.reload();
    }
}
