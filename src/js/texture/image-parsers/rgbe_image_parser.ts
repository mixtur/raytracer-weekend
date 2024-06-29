import { mat3, mul_mat3_vec3_r } from '../../math/mat3.gen';
import { mul_vec3_s_r, set_vec3, Vec3, vec3_dirty } from '../../math/vec3.gen';
import { HDRPixelsData } from './types';

export interface RGBEImporterOptions {
    bytes: Uint8Array;
    luminance: number;
}

export class BufferStream {
    private _buffer: Uint8Array;
    private _position: number;

    constructor(buffer: Uint8Array) {
        this._buffer = buffer;
        this._position = 0;
    }

    read(count: number): Uint8Array {
        const position = this._position;
        this._position += count;

        return this._buffer.subarray(position, position + count);
    }

    get position(): number {
        return this._position;
    }
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function convertXYZ2xyY(XYZ: Vec3, xyY: Vec3): void {
    const denominator = 1.0 / (XYZ[0] + XYZ[1] + XYZ[2]);

    set_vec3(xyY,
        XYZ[0] * denominator,
        XYZ[1] * denominator,
        XYZ[1]
    );

    if (!xyY.every(Number.isFinite)) {
        set_vec3(xyY, 0, 0, 0);
    }
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function convertxyY2XYZ(xyY: Vec3, XYZ: Vec3): void {
    set_vec3(XYZ,
        xyY[0] * xyY[2] / xyY[1],
        xyY[2],
        (1.0 - xyY[0] - xyY[1]) * xyY[2] / xyY[1]
    );

    if (!XYZ.every(Number.isFinite)) {
        set_vec3(XYZ, 0, 0, 0);
    }
}

export const RGB2XYZ = mat3(
    0.4124564, 0.2126729, 0.0193339,
    0.3575761, 0.7151522, 0.1191920,
    0.1804375, 0.0721750, 0.9503041
);

export const XYZ2RGB = mat3(
    3.2404542, -0.9692660, 0.0556434,
    -1.5371385, 1.8760108, -0.2040259,
    -0.4985314, 0.0415560, 1.0572252
);

// eslint-disable-next-line @typescript-eslint/naming-convention
const colorXYZ = vec3_dirty();
// eslint-disable-next-line @typescript-eslint/naming-convention
const XYZColor = vec3_dirty();
// eslint-disable-next-line @typescript-eslint/naming-convention
const xyYColor = vec3_dirty();

export const parse_rgbe = (options: RGBEImporterOptions) => {
    const { bytes, luminance } = options;
    let max_env_luminance = 0;
    let _luminance_scale = 0;

    const _rgbe2rgb = (rgbe: number[] | Uint8Array, rgba: Float32Array) => {
            const scale = Math.pow(2, rgbe[3] - 128) / 256;

            set_vec3(colorXYZ, rgbe[0], rgbe[1], rgbe[2]);
            mul_vec3_s_r(colorXYZ, colorXYZ, scale);
            mul_mat3_vec3_r(colorXYZ, RGB2XYZ, colorXYZ)

            max_env_luminance = Math.max(max_env_luminance, colorXYZ[1]);

            rgba.set(colorXYZ);

            return rgba;
        };

    const _scale_luminance = (pixels_number: number, buffer_f32: Float32Array): void => {
            for (let i = 0; i < pixels_number; ++i) {
                const rgba32f = buffer_f32.subarray(i * 4, i * 4 + 4);

                set_vec3(XYZColor, rgba32f[0], rgba32f[1], rgba32f[2]);

                convertXYZ2xyY(XYZColor, xyYColor);

                xyYColor[2] *= _luminance_scale;

                convertxyY2XYZ(xyYColor, XYZColor);

                mul_mat3_vec3_r(XYZColor, XYZ2RGB, XYZColor);
                rgba32f.set(XYZColor);
            }
        };

    function _parse(luminance: number, buffer: Uint8Array): HDRPixelsData {
        const { width, height, end } = _read_header(buffer);

        const buffer_f32 = new Float32Array(width * height * 4);

        const sub_buffer = buffer.subarray(end);

        _read_pixels_rle(sub_buffer, buffer_f32, width, height);

        _luminance_scale = luminance / max_env_luminance;

        _scale_luminance(width * height, buffer_f32);

        return {
            pixels: new Float64Array(buffer_f32),
            width,
            height
        };
    }

    interface RGBEHeader {
        valid: number;
        string: string;
        comments: string;
        programType: 'RGBE';
        format: string;
        gamma: number;
        exposure: number;
        width: number;
        height: number;
        end: number;
    }

    function _read_header(buffer: Uint8Array): RGBEHeader {
        const VALID_MAGIC_TOKEN = 0x01;
        const VALID_FORMAT = 0x02;
        const VALID_DIMENSIONS = 0x04;
        const RGBE_VALID = VALID_MAGIC_TOKEN | VALID_FORMAT | VALID_DIMENSIONS;

        const comment_re = /^#(.+)/mg;
        const gamma_re = /^\s*GAMMA\s*=\s*(\d+(\.\d+)?)\s*$/m;
        const exposure_re = /^\s*EXPOSURE\s*=\s*(\d+(\.\d+)?)\s*$/m;
        const format_re = /^\s*FORMAT=(\S+)\s*$/m;
        const dimensions_re = /^\s*-Y\s+(\d+)\s+\+X\s+(\d+)\s*$/m;

        const string = String.fromCharCode(...buffer.subarray(0, 256));
        const header: RGBEHeader = {
            valid: 0,
            string,
            comments: '',
            programType: 'RGBE',
            format: '',
            gamma: 1,
            exposure: 1,
            width: 0,
            height: 0,
            end: string.lastIndexOf('\n') + 1
        };

        const comments = header.string.match(comment_re);

        if (comments !== null && comments.includes('#?RADIANCE')) {
            header.valid |= VALID_MAGIC_TOKEN;
        }

        const gamma = header.string.match(gamma_re);
        if (gamma !== null) { header.gamma = parseFloat(gamma[1]); }

        const exposure = header.string.match(exposure_re);
        if (exposure !== null) { header.exposure = parseFloat(exposure[1]); }

        const format = header.string.match(format_re);

        if (format !== null) {
            header.format = format[1];
            header.valid |= VALID_FORMAT;
        }

        const dimensions = header.string.match(dimensions_re);

        if (dimensions !== null) {
            header.width = parseInt(dimensions[2], 10);
            header.height = parseInt(dimensions[1], 10);

            header.valid |= VALID_DIMENSIONS;
        }

        if (header.valid !== RGBE_VALID) {
            throw new Error(`RGBEImporter read error ${header.valid}`);
        }

        return header;
    }

    function _read_pixels_rle(buffer: Uint8Array, data: Float32Array, width: number, height: number): void {
        const scanline_width = width;

        const stream = new BufferStream(buffer);

        const read_flat = scanline_width < 8 || scanline_width > 0x7fff;
        const file_rle = buffer[0] !== 2 || buffer[1] !== 2 || (buffer[2] & 0x80) !== 0;

        if (read_flat || file_rle) {
            _read_pixels(stream, data, width * height);
            return;
            // throw new Error('RGBEImporter: only RLE layout supported');
        }

        const scanline_buffer = new Uint8Array(scanline_width * 4);

        const rgbe_buffer = [0, 0, 0, 0];
        const rgba_buffer = new Float32Array([0, 0, 0, 1]);

        let scanline_number = height;
        let offset = width * height;

        while (scanline_number > 0 && stream.position < buffer.byteLength) {
            if (stream.position + 4 > buffer.byteLength) {
                throw new Error('RGBEImporter: out of buffer array');
            }

            const rgbe = stream.read(4);

            if (scanline_width !== (rgbe[2] << 8 | rgbe[3])) {
                throw new Error(`RGBEImporter: wrong scanline width: ${scanline_width}`);
            }

            let begin = 0;

            for (let i = 0; i < 4; ++i) {
                const end = (i + 1) * scanline_width;

                while (begin < end) {
                    const buf = stream.read(2);

                    const is_encoded_run = buf[0] > 128;  // Whether run of the same value or not.
                    let count = buf[0] - 128 * Number(is_encoded_run);

                    if (count === 0 || count > end - begin) {
                        throw new Error('RGBEImporter: bad scanline data');
                    }

                    if (is_encoded_run) {
                        scanline_buffer.fill(buf[1], begin, begin + count);
                    } else {
                        scanline_buffer.fill(buf[1], begin, ++begin);

                        if (--count > 0) { scanline_buffer.set(stream.read(count), begin); }
                    }

                    begin += count;
                }
            }

            for (let i = scanline_width - 1; i >= 0; --i) {
                rgbe_buffer[0] = scanline_buffer[i + 0 * scanline_width];
                rgbe_buffer[1] = scanline_buffer[i + 1 * scanline_width];
                rgbe_buffer[2] = scanline_buffer[i + 2 * scanline_width];
                rgbe_buffer[3] = scanline_buffer[i + 3 * scanline_width];

                data.set(_rgbe2rgb(rgbe_buffer, rgba_buffer), --offset * 4);
            }

            --scanline_number;
        }
    }

    function _read_pixels(stream: BufferStream, data: Float32Array, pixels_number: number): void {
        const rgba = new Float32Array([0, 0, 0, 1]);

        for (let i = 0; i < pixels_number; ++i) {
            const rgbe = stream.read(4);

            data.set(_rgbe2rgb(rgbe, rgba), i * 4);
        }
    }

    return _parse(luminance, bytes);
};

export const load_rgbe = async (luminance: number, url: string): Promise<HDRPixelsData> => {
    const response = await fetch(url);
    return parse_rgbe({
        bytes: new Uint8Array(await response.arrayBuffer()),
        luminance
    })
}

