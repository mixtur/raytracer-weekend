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
  for (const base_file_path of pathFallbackChain) {
    const url_path = new URL(url, 'http://dummy').pathname;
    const file_path = url.endsWith("/")
    ? path.join(base_file_path, url_path, 'index.html')
    : path.join(base_file_path, url_path);

    preparation = await prepareSingleFile(base_file_path, file_path);

    if (preparation.found) {
      return preparation;
    }
  }
  return preparation;
};
