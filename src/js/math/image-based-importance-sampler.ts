import { PixelsData } from '../texture/image-parsers/types';
import { PDF, pdf_types } from './pdf';
import { convert_XYZ_to_xyY, RGB_TO_XYZ } from '../texture/image-parsers/rgbe_image_parser';
import { mul_mat3_vec3_r } from './mat3.gen';
import { set_vec3, unit_vec3, Vec3, vec3, vec3_dirty } from './vec3.gen';


// eslint-disable-next-line @typescript-eslint/naming-convention
const XYZcolor = vec3_dirty();
// eslint-disable-next-line @typescript-eslint/naming-convention
const xyYColor = vec3_dirty();
const tmp_color = vec3_dirty();

export interface IImageBasedImportanceSampler extends PDF {
    type: 'image_based',
    pdf: number[];
    cdf: number[];
    width: number;
    height: number;
}

export const create_image_based_importance_sampler = (pixels_data: PixelsData): IImageBasedImportanceSampler => {
    const {pixels, width, height} = pixels_data;
    let acc = 0;
    const pdf = [];
    const cdf = [];

    for (let y = 0; y < height; y++) {
        const angle_range_lo = y * Math.PI / height;
        const angle_range_hi = (y + 1) * Math.PI / height;
        const col_weight = Math.cos(angle_range_lo) - Math.cos(angle_range_hi);
        for (let x = 0; x < width; x++) {
            const i = x + y * width;

            set_vec3(tmp_color, pixels[i * 4], pixels[i * 4 + 1], pixels[i * 4 + 2]);
            mul_mat3_vec3_r(XYZcolor, RGB_TO_XYZ, tmp_color);
            convert_XYZ_to_xyY(XYZcolor, xyYColor);

            const pixel_weight = xyYColor[2];

            acc += pixel_weight * col_weight;
            pdf[i] = pixel_weight;
            cdf[i] = acc;
        }
    }

    const pdf_normalization = acc * 2 * Math.PI / width;
    for (let i = 0; i < width * height; i++) {
        pdf[i] /= pdf_normalization;
        cdf[i] /= acc;
    }

    return {
        type: 'image_based',
        pdf,
        cdf,
        width,
        height
    };
};

const _generate_pixel_index = (pdf: IImageBasedImportanceSampler): number => {
    const rand = Math.random();
    const {cdf} = pdf;
    let l = 0, r = cdf.length;
    while (r - l > 3) {
        const m = (l + r) >> 1;
        if (rand < cdf[m]) {
            r = m;
        } else {
            l = m;
        }
    }

    for (let i = l; i <= r; i++) {
        if (cdf[i] < rand && rand <= cdf[i + 1]) {
            return i + 1;
        }
    }
    return l;
};

pdf_types.image_based = {
    generate(pdf): Vec3 {
        const image_pdf = pdf as IImageBasedImportanceSampler;
        const pixel_index = _generate_pixel_index(image_pdf);
        const x = pixel_index % image_pdf.width;
        const y = Math.floor(pixel_index / image_pdf.width);

        const theta_range_hi = (1 - y / image_pdf.height) * Math.PI;
        const theta_range_lo = (1 - (y + 1) / image_pdf.height) * Math.PI;

        const phi_range_size = Math.PI * 2 / image_pdf.width;
        const phi_range_lo = (x / image_pdf.width * 2 - 1) * Math.PI;

        const cos_theta_range_lo = Math.cos(theta_range_hi);
        const cos_theta_range_hi = Math.cos(theta_range_lo);
        const cos_theta_range_size = cos_theta_range_hi - cos_theta_range_lo;

        const r1 = Math.random();
        const r2 = Math.random();

        const cos_theta = cos_theta_range_lo + r1 * cos_theta_range_size;
        // const cos_theta = Math.cos((1 - y / (this.height - 1)) * Math.PI);
        const sin_theta = Math.sqrt(1 - cos_theta ** 2);
        const phi = phi_range_lo + r2 * phi_range_size;
        // const phi = (2 * x / (this.width - 1) - 1) * Math.PI;
        const cos_phi = Math.cos(phi);
        const sin_phi = Math.sin(phi);

        return vec3(
            sin_theta * cos_phi,
            cos_theta,
            sin_theta * sin_phi,
        );
    },

    value(pdf, direction: Vec3): number {
        const image_pdf = pdf as IImageBasedImportanceSampler;
        const dir = unit_vec3(direction);
        const phi = Math.atan2(dir[2], dir[0]);
        const theta = Math.acos(dir[1]);

        const u = Math.floor((phi / Math.PI + 1) / 2 * image_pdf.width);
        const v = Math.floor((1 - theta / Math.PI) * image_pdf.height);

        const i = v * image_pdf.width + u;

        return image_pdf.pdf[i];
    }
};
