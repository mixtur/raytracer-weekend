import { scenes } from '../scenes/index';

const render_links = (id: string, tag: string) => {
    const book1_scenes = document.getElementById(id) as HTMLUListElement;

    book1_scenes.innerHTML = scenes
        .map(([name, tag_name], i) => {
            if (tag_name === tag) {
                return `<li><a href="renderer.html?scene=${i}">${name}</a></li>`;
            }
            return null;
        })
        .filter(str => str !== null)
        .join('');

}

render_links('book1_scenes', 'book1');
render_links('book2_scenes', 'book2');
render_links('book3_scenes', 'book3');
render_links('gltf_scenes', 'gltf');
