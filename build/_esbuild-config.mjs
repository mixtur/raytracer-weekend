import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

export const project_path = x => path.join(__dirname, '..', x);
export const DIR_PUBLIC = project_path('src/public');
export const DIR_DEV_BUILD = project_path('dev-build');
export const DIR_PROD_BUILD = project_path('prod-build');


export const get_esbuild_config = (outdir, prod) => {
    const dev = !prod;

    return ({
        entryPoints: {
            index: project_path('src/js/index.ts'),
            render_worker: project_path('src/js/render_worker.ts'),
        },
        bundle: true,
        sourcemap: dev,
        minify: prod,
        outdir,
        format: 'esm',
        splitting: true,
        loader: {
            '.jpg': 'file'
        }
    });
};
