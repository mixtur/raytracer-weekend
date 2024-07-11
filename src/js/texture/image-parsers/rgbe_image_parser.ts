import { columns_to_mat3_r, Mat3, mat3, mat3_dirty, mul_mat3_vec3_r } from '../../math/mat3.gen';
import { mul_vec3_s_r, set_vec3, vec3, Vec3, vec3_dirty } from '../../math/vec3.gen';
import { PixelsData } from './types';

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

export interface RGBEHeader {
    string: string;
    comments: string[];
    xy_transform: Mat3;//todo: Mat2
    color_corr: Vec3;
    pixel_aspect: number;
    gamma: number;
    format: string;
    exposure: number;
    width: number;
    height: number;
    end: number;
}

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
                const base_index = i * 4;
                set_vec3(XYZColor, buffer_f32[base_index], buffer_f32[base_index + 1], buffer_f32[base_index + 2]);

                convertXYZ2xyY(XYZColor, xyYColor);

                xyYColor[2] *= _luminance_scale;

                convertxyY2XYZ(xyYColor, XYZColor);

                mul_mat3_vec3_r(XYZColor, XYZ2RGB, XYZColor);
                buffer_f32.set(XYZColor, base_index);
            }
        };

    function _parse(luminance: number, buffer: Uint8Array): [PixelsData, RGBEHeader] {
        const header = _read_header(buffer);

        //todo: xyz
        //todo: primaries
        //todo: exposure
        const { width, height, end } = header;

        const array_buffer = new SharedArrayBuffer(width * height * 4 * Float32Array.BYTES_PER_ELEMENT);
        const buffer_f32 = new Float32Array(array_buffer);

        const sub_buffer = buffer.subarray(end);

        _read_pixels_rle(sub_buffer, buffer_f32, width, height);

        _luminance_scale = luminance / max_env_luminance;

        _scale_luminance(width * height, buffer_f32);

        return [
            {
                pixels: buffer_f32,
                width,
                height,
                normalization: 1
            },
            header
        ];
    }

    function _read_header(buffer: Uint8Array): RGBEHeader {
        const NO_MAGIC_COMMENT = 0x01;
        const NO_FORMAT = 0x02;
        const NO_DIMENSIONS = 0x04;
        let FLAGS = NO_MAGIC_COMMENT | NO_FORMAT | NO_DIMENSIONS;

        const header: RGBEHeader = {
            string: '',
            comments: [],
            xy_transform: mat3_dirty(),
            color_corr: vec3(1, 1, 1),
            gamma: 1,
            pixel_aspect: 1,
            format: '',
            exposure: 1,// should divide by resulting floats by this number
            width: 0,
            height: 0,
            end: 0
        };

        let line_start = 0;
        for(let i = 0; i < buffer.length; i++) {
            if (buffer[i] === 10) {
                const line = String.fromCharCode(...buffer.subarray(line_start, i)).trim();
                line_start = i + 1;
                if (line === '') break;

                if (line.startsWith('#')) {
                    // comment
                    if (line.startsWith('#?RADIANCE')) {
                        FLAGS &= ~NO_MAGIC_COMMENT;
                    } else {
                        header.comments.push(line.slice(1));
                    }
                } else {
                    const [name, value] = line.split('=');
                    let color_corr_components;
                    switch (name.toUpperCase()) {
                        case 'FORMAT':
                            if (header.format !== '') {
                                throw new Error(`There must be exactly one FORMAT in HDR file, got at least ${JSON.stringify(header.format)} and ${JSON.stringify(value)}`);
                            } else if (value !== '32-bit_rle_rgbe' && value !== '32-bit_rle_xyze') {
                                throw new Error(`Invalid format. Expected "32-bit_rle_rgbe" or "32-bit_rle_xyze", got ${value}`)
                            } else {
                                header.format = value;
                                FLAGS &= ~NO_FORMAT;
                            }
                            break;
                        case 'EXPOSURE':
                            header.exposure *= parseFloat(value);
                            break;
                        case 'COLORCORR':
                            color_corr_components = value.split(/\s+/g).map(x => parseFloat(x.trim()));
                            header.color_corr[0] *= color_corr_components[0] ?? 1;
                            header.color_corr[1] *= color_corr_components[1] ?? 1;
                            header.color_corr[2] *= color_corr_components[2] ?? 1;
                            break;
                        case 'PIXASPECT':
                            header.pixel_aspect *= parseFloat(value);
                            break;
                        case 'GAMMA':
                            header.gamma *= parseFloat(value);
                            break;
                        case 'PRIMARIES':
                            // note: in Cannon_Exterior.hdr primaries make no sense (0 0 0 0 0 0)
                            //       need to validate before applying.
                            console.warn(`Primaries header is not supported`);
                            break;
                        default:
                            console.warn(`Unknown parameter ${name} in RGBE header`);
                    }
                }
            }
        }

        for(let i = line_start; i < buffer.length; i++) {
            if (buffer[i] === 10) {
                const dimension_line = String.fromCharCode(...buffer.subarray(line_start, i)).trim();
                line_start = i + 1;

                const [a, b, c, d] = dimension_line.split(/\s+/).map(x => x.trim());
                let M;
                let N;
                if (a === '-Y' || a === '+Y') {
                    N = parseInt(b);
                    M = parseInt(d);
                } else {
                    N = parseInt(d);
                    M = parseInt(b);
                }

                const mapping_column = (desc: string): Vec3 => {
                    switch (desc.toUpperCase()) {
                        case '+X': return vec3( 1,  0, 0);
                        case '-X': return vec3(-1,  0, 0);
                        case '+Y': return vec3( 0,  1, 0);
                        case '-Y': return vec3( 0, -1, 0);
                        default:
                            throw new Error(`Invalid dimension format ${JSON.stringify(dimension_line)}`);
                    }
                };

                columns_to_mat3_r(
                    header.xy_transform,
                    mapping_column(c),
                    mapping_column(a),
                    vec3(0, 0, 1)
                );


                header.width = M;
                header.height = N;
                FLAGS &= ~NO_DIMENSIONS;

                break;
            }
        }


        header.string = String.fromCharCode(...buffer.subarray(0, line_start));
        header.end = line_start;

        if (FLAGS & NO_DIMENSIONS) {
            throw new Error(`Dimensions not found`);
        }
        if (FLAGS & NO_FORMAT) {
            throw new Error(`Format not found`);
        }
        if (FLAGS & NO_MAGIC_COMMENT) {
            throw new Error(`No magic comment`);
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

export const load_rgbe = async (luminance: number, url: string): Promise<[PixelsData, RGBEHeader]> => {
    const response = await fetch(url);
    return parse_rgbe({
        bytes: new Uint8Array(await response.arrayBuffer()),
        luminance
    })
}
