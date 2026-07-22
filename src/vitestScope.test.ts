/// <reference types="vite/client" />

import { describe, expect, it } from 'vitest';

import indexHtml from '../index.html?raw';
import { VITEST_EXCLUDE, VITEST_INCLUDE } from '../vitest.config';

const discoveredSourceTests = Object.keys(
  import.meta.glob('./**/*.test.{ts,tsx}'),
);

describe('Vitest project scope', () => {
  it('keeps default discovery limited to source tests outside agent worktrees', () => {
    expect(VITEST_INCLUDE).toEqual(['src/**/*.test.{ts,tsx}']);
    expect(VITEST_EXCLUDE).toContain('.claude/**');
    expect(discoveredSourceTests.length).toBeGreaterThan(0);
    expect(
      discoveredSourceTests.every(
        (filePath) =>
          filePath.startsWith('./') &&
          (filePath.endsWith('.test.ts') || filePath.endsWith('.test.tsx')),
      ),
    ).toBe(true);
  });
});

describe('Application shell assets', () => {
  it('declares the same-origin SVG favicon', () => {
    expect(indexHtml).toContain(
      '<link rel="icon" type="image/svg+xml" href="/favicon.svg" />',
    );
  });
});
