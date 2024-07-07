import { buildSync } from 'esbuild';
import { DIR_PROD_BUILD, DIR_PUBLIC, get_esbuild_config } from './_esbuild-config.mjs';
import fs from 'node:fs';


fs.rmSync(DIR_PROD_BUILD, { recursive: true, force: true });
fs.cpSync(DIR_PUBLIC, DIR_PROD_BUILD, { recursive: true });
buildSync(get_esbuild_config(DIR_PROD_BUILD, true));
