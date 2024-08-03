import { Scene } from './scene';

export const scenes: [string, string, () => Promise<Scene>][] = [
    ['Two spheres',               'book1', () => import('../scenes/two_spheres').then(({create}) => create())],
    ['Book 1. Final scene',       'book1', () => import('../scenes/book-1-final-scene').then(({create}) => create())],
    ['Earth texture',             'book2', () => import('../scenes/earth').then(({create}) => create())],
    ['Simple light',              'book2', () => import('../scenes/simple_light').then(({create}) => create())],
    ['Book 2. Final scene',       'book2', () => import('../scenes/book-2-final-scene').then(({create}) => create())],
    ['Cornell box',               'book3', () => import('../scenes/cornell_box').then(({create}) => create())],
    ['Cornel box with smoke',     'book3', () => import('../scenes/cornell_box_with_smoke').then(({create}) => create())],
    ['simple.gltf',               'gltf',  () => import('../scenes/simple_gltf').then(({create}) => create())],
    ['DamagedHelmet.gltf',        'gltf',  () => import('../scenes/damaged_helmet_gltf').then(({create}) => create())],
    ['TextureTransformTest.gltf', 'gltf',  () => import('../scenes/texture_transform_test').then(({create}) => create())],
    ['[WIP] ABeautifulGame.gltf', 'gltf',  () => import('../scenes/a_beautiful_game').then(({create}) => create())],
];
