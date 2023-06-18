import * as url from 'node:url';
import * as path from 'node:path';
import { createServer } from 'node:http';
import { context } from 'esbuild';
import { createPrepareFile, DEFAULT_MIME_TYPE, MIME_TYPES } from './static-files.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const project_path = x => path.join(__dirname, '..', x);

const DIR_PUBLIC = project_path('src/public');
const DIR_DEVBUILD = project_path('dev-build');

async function start() {
    const esbuildContext = await context({
        entryPoints: [
            project_path('src/js/index.ts')
        ],
        bundle: true,
        sourcemap: true,
        outdir: DIR_DEVBUILD,
        loader: {
            '.jpg': 'file'
        }
    });
    
    
    const prepareFile = createPrepareFile(
        [DIR_PUBLIC, DIR_DEVBUILD],
        path.join(DIR_DEVBUILD, '404.html')
    );
    
    const httpServer = createServer(async (req, res) => {
        let file = await prepareFile(req.url);
        const statusCode = file.found ? 200 : 404;
        const mimeType = MIME_TYPES[file.ext] ?? DEFAULT_MIME_TYPE;
        res.writeHead(statusCode, { "Content-Type": mimeType });
        if (file.found) {
            file.stream.pipe(res);
        } else {
            res.end('not found');
        }
        console.log(`${req.method} ${req.url} ${statusCode}`);
    });
    
    const HOST = '0.0.0.0';
    const PORT = 8080;

    await new Promise((resolve, reject) => {
        httpServer.listen(PORT, HOST, (e) => {
            if (e) {
                console.log('FAILED TO CREATE HTTP SERVER');
                return reject(e);
            } else {
                resolve();
            }
        });
    });

    console.log(`STARTED AN HTTP SERVER ON http://${HOST}:${PORT}`);    
    await esbuildContext.watch();
    console.log(`STARTED ESBUILD`);
}


start().catch(e => {
    console.log(e);
    process.exit(1);
});
