import { defineConfig } from 'vitest/config';

export const VITEST_INCLUDE = ['src/**/*.test.{ts,tsx}'];
export const VITEST_EXCLUDE = ['.claude/**'];

export default defineConfig({
  test: {
    environment: 'node',
    include: VITEST_INCLUDE,
    exclude: VITEST_EXCLUDE,
    watch: false,
  },
});
