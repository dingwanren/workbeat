import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli/index.ts'],
  format: ['esm'],
  dts: true,
  clean: false, // Disable cleaning to preserve static files
  outDir: 'dist',
  platform: 'node',
  target: 'es2022',
  outExtension: () => ({ js: '.js' }),
  shims: true,
  splitting: false,
  sourcemap: true,
  // After build, make sure the static files are available
  onSuccess: async () => {
    // The static files are built to dist/static via vite and don't need to be copied by tsup
    console.log('Build completed. Static files are in dist/static');
  }
});