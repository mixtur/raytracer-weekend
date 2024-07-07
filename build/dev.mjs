import * as fs from 'node:fs';
import * as path from 'node:path';
import { createServer } from 'node:http';
import { context } from 'esbuild';
import { createPrepareFile, DEFAULT_MIME_TYPE, MIME_TYPES } from './static-files.mjs';
import { DIR_PUBLIC, DIR_DEV_BUILD, get_esbuild_config } from './_esbuild-config.mjs';

async function start() {
    const esbuildContext = await context(get_esbuild_config(DIR_DEV_BUILD, false));

    const prepareFile = createPrepareFile(
        [DIR_PUBLIC, DIR_DEV_BUILD],
        path.join(DIR_DEV_BUILD, '404.html')
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

    fs.rmSync(DIR_DEV_BUILD, { recursive: true, force: true });
    fs.mkdirSync(DIR_DEV_BUILD, { recursive: true });
    console.log(`Started HTTP server on http://${HOST}:${PORT}`);
    await esbuildContext.watch();
    console.log(`Started esbuild`);
}


start().catch(e => {
    console.log(e);
    process.exit(1);
});
