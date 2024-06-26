// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        extends: [
            eslint.configs.recommended,
            ...tseslint.configs.recommended,
        ],
        files: ['src/**/*.ts', 'src/**/*.js'],
        rules: {
            "@typescript-eslint/naming-convention": [
                "error",
                {
                    "selector": "variableLike",
                    "format": ["snake_case", "UPPER_CASE"],
                    "leadingUnderscore": "allowSingleOrDouble"
                }
            ],
            "@typescript-eslint/no-unused-vars": "off",
            "no-constant-condition": "off",
        }
    }
);
