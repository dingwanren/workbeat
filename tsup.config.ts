import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  outDir: 'dist',
  platform: 'node',
  target: 'es2022',
  outExtension: () => ({ js: '.js' }),
  shims: true,
  splitting: false,
  sourcemap: true
});