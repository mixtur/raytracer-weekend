export enum GLDataType {
    BYTE                            = 0x1400,
    UNSIGNED_BYTE                   = 0x1401,
    SHORT                           = 0x1402,
    UNSIGNED_SHORT                  = 0x1403,
    INT                             = 0x1404,
    UNSIGNED_INT                    = 0x1405,
    FLOAT                           = 0x1406,
    HALF_FLOAT                      = 0x140B,
    UNSIGNED_SHORT_4_4_4_4          = 0x8033,
    UNSIGNED_SHORT_5_5_5_1          = 0x8034,
    UNSIGNED_SHORT_5_6_5            = 0x8363,
    UNSIGNED_INT_2_10_10_10_REV     = 0x8368,
    UNSIGNED_INT_10F_11F_11F_REV    = 0x8C3B,
    UNSIGNED_INT_5_9_9_9_REV        = 0x8C3E,
    UNSIGNED_INT_24_8               = 0x84FA,
    FLOAT_32_UNSIGNED_INT_24_8_REV  = 0x8DAD
}

export enum GLVertexBufferTarget {
    ARRAY_BUFFER                = 0x8892,
    ELEMENT_ARRAY_BUFFER        = 0x8893,
    COPY_READ_BUFFER            = 0x8F36,
    COPY_WRITE_BUFFER           = 0x8F37,
    TRANSFORM_FEEDBACK_BUFFER   = 0x8C8E,
    UNIFORM_BUFFER              = 0x8A11,
    PIXEL_PACK_BUFFER           = 0x88EB,
    PIXEL_UNPACK_BUFFER         = 0x88EC
}

export enum GLTextureFilter {
    NEAREST                 = 0x2600,
    LINEAR                  = 0x2601,
    NEAREST_MIPMAP_NEAREST  = 0x2700,
    LINEAR_MIPMAP_NEAREST   = 0x2701,
    NEAREST_MIPMAP_LINEAR   = 0x2702,
    LINEAR_MIPMAP_LINEAR    = 0x2703
}

export enum GLWrappingMode {
    REPEAT          = 0x2901,
    CLAMP_TO_EDGE   = 0x812F,
    MIRRORED_REPEAT = 0x8370
}

export enum GLPrimitiveMode {
    POINTS          = 0x000,
    LINES           = 0x0001,
    LINE_LOOP       = 0x0002,
    LINE_STRIP      = 0x0003,
    TRIANGLES       = 0x0004,
    TRIANGLE_STRIP  = 0x0005,
    TRIANGLE_FAN    = 0x0006
}
