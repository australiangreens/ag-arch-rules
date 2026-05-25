import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts', 'src/config.ts'],
    format: ['esm'],
    dts: true,
    outDir: 'dist',
  },
  {
    entry: { 'bin/init': 'src/bin/init.ts' },
    format: ['esm'],
    dts: false,
    outDir: 'dist',
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
]);
