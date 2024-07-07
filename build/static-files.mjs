import * as fs from "node:fs";
import * as path from "node:path";

export const DEFAULT_MIME_TYPE = "application/octet-stream";

export const MIME_TYPES = {
  html: "text/html; charset=UTF-8",
  js: "application/javascript",
  css: "text/css",
  png: "image/png",
  jpg: "image/jpg",
  gif: "image/gif",
  ico: "image/x-icon",
  svg: "image/svg+xml",
  gltf: "application/json"
};

export const prepareSingleFile = async (basePath, filePath) => {
  const pathTraversal = !filePath.startsWith(basePath);
  const exists = await fs.promises.access(filePath).then(() => true, () => false);
  const found = !pathTraversal && exists;
  const ext = path.extname(filePath).substring(1).toLowerCase();
  return {
    found,
    ext,
    stream: found ? fs.createReadStream(filePath) : null
  };
};

export const createPrepareFile = (pathFallbackChain) => async (url) => {
  let preparation = null;
  for (const basePath of pathFallbackChain) {
    const filePath = url.endsWith("/")
    ? path.join(basePath, url, 'index.html')
    : path.join(basePath, url);

    preparation = await prepareSingleFile(basePath, filePath);

    if (preparation.found) {
      return preparation;
    }
  }
  return preparation;
};
