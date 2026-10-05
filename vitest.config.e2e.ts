import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['test/e2e/**/*.e2e-spec.ts'],
    setupFiles: ['./test/setup/load-test-env.ts'],
    globalSetup: ['./test/setup/test-database.ts'],
    fileParallelism: false,
  },
});
