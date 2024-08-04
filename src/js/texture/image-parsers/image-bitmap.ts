import { PixelsData } from './types';

type ImageBitmapReader = (bmp: ImageBitmap) => PixelsData;

const get_gl_reader = (): ImageBitmapReader | null => {
    const canvas = new OffscreenCanvas(1, 1);
    const gl = canvas.getContext('webgl2');
    if (gl === null) {
        return null;
    }

    return (bmp: ImageBitmap): PixelsData => {
        gl.activeTexture(gl.TEXTURE0);
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, bmp.width, bmp.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, bmp);
        const fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (status !== gl.FRAMEBUFFER_COMPLETE) {
            throw new Error(`failed to construct framebuffer for reading image bitmap`);
        }
        gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
        const pixels = new Uint8Array(new SharedArrayBuffer(bmp.width * bmp.height * 4));
        gl.readPixels(0, 0, bmp.width, bmp.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        gl.deleteFramebuffer(fb);
        gl.deleteTexture(tex);

        return {
            width: bmp.width,
            height: bmp.height,
            pixels,
            normalization: 1 / 255
        };
    }
};

const get_2d_reader = (): ImageBitmapReader | null => {
    const tmp_canvas = new OffscreenCanvas(1, 1);
    const ctx = tmp_canvas.getContext('2d');
    if (ctx === null) {
        return null;
    }
    return (image_bitmap: ImageBitmap): PixelsData => {
        tmp_canvas.width = image_bitmap.width;
        tmp_canvas.height = image_bitmap.height;
        ctx.drawImage(image_bitmap, 0, 0);
        const image_data = ctx.getImageData(0, 0, tmp_canvas.width, tmp_canvas.height);

        const pixels = new Uint8Array(new SharedArrayBuffer(image_data.data.buffer.byteLength));
        pixels.set(image_data.data);

        return {
            width: image_data.width,
            height: image_data.height,
            pixels,
            normalization: 1 / 255
        };
    };
}

let reader: ImageBitmapReader | null = null;
const get_reader = () => {
    if (reader === null) {
        reader = get_gl_reader() ?? get_2d_reader();
    }
    if (reader === null) {
        throw new Error(`Failed to acquire image reader`);
    }

    return reader;
}

export const load_dom_image = async (url: string): Promise<PixelsData> => {
    const read_bitmap = get_reader();
    const response = await fetch(url);
    const image_bitmap = await createImageBitmap(await response.blob(), {
        premultiplyAlpha: 'none',
        colorSpaceConversion: 'none'
    });

    return read_bitmap(image_bitmap);
}
