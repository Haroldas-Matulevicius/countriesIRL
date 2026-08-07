import { describe, expect, it } from 'vitest';

/**
 * Assertions 22 and 28 — the vendored animated icon contract (D-28, R-V2).
 *
 * Text-based on purpose. This repo's Vitest runs on the `node` environment with
 * no DOM, so component *behaviour* (does the handle actually drive the
 * animation?) belongs in the Playwright suite. What is provable here is the
 * SHAPE of the contract and the completeness of the vendoring evidence — and
 * both are things that fail silently otherwise: an icon missing its handle
 * still renders, and a file with no provenance line still imports.
 */

interface FileSystemModule {
  readFileSync: (path: URL, encoding: 'utf8') => string;
  readdirSync: (path: URL) => string[];
}

interface NodeProcess {
  getBuiltinModule: (name: 'fs') => FileSystemModule;
}

function fs(): FileSystemModule {
  const nodeProcess = Reflect.get(globalThis, 'process') as
    | NodeProcess
    | undefined;

  if (nodeProcess === undefined) {
    throw new Error('Expected the Vitest Node process.');
  }

  return nodeProcess.getBuiltinModule('fs');
}

const ICONS_DIR = new URL('./', import.meta.url);

function readIconFile(name: string): string {
  return fs().readFileSync(new URL(name, ICONS_DIR), 'utf8');
}

/** Every file in the directory, provenance evidence and this test included. */
const DIRECTORY_FILES = fs().readdirSync(ICONS_DIR).sort();

const ICON_FILES = DIRECTORY_FILES.filter((name): boolean =>
  name.endsWith('.tsx'),
);

/**
 * The glyph inventory `03-UI-SPEC.md` § Vendoring Safety and § Component
 * Contracts 1 name, written out so a glyph silently dropped from the set fails
 * rather than shrinking what the loop below iterates.
 */
const EXPECTED_ICON_FILES: readonly string[] = [
  'CheckIcon.tsx',
  'CrosshairIcon.tsx',
  'DownloadIcon.tsx',
  'DropletIcon.tsx',
  'FolderIcon.tsx',
  'LayersIcon.tsx',
  'ListIcon.tsx',
  'MapIcon.tsx',
  'MinusIcon.tsx',
  'MoonIcon.tsx',
  'PaletteIcon.tsx',
  'PlusIcon.tsx',
  'RedoIcon.tsx',
  'SunIcon.tsx',
  'UndoIcon.tsx',
];

const PROVENANCE = readIconFile('PROVENANCE.md');

const PROVENANCE_LINE =
  /^- `(?<file>[^`]+)` — read in full — (?<flags>.+?) — (?<date>\d{4}-\d{2}-\d{2})$/u;

const UPSTREAM_LINE =
  /^- `(?<file>[^`]+)` — not vendored; read in full — (?<flags>.+?) — (?<date>\d{4}-\d{2}-\d{2})$/u;

/**
 * The three rows `03-UI-SPEC.md` § Vendoring Safety left as
 * *"PENDING — not reviewed this session; no claim is made about them."*
 * They live in the sibling repo, not here, so they are recorded in their own
 * section and are deliberately NOT part of the two-way file-set equality below.
 */
const PREVIOUSLY_PENDING_UPSTREAM: readonly string[] = [
  'message-square-more.tsx',
  'sparkles.tsx',
  'square-pen.tsx',
];

function sectionBetween(marker: string): string[] {
  const begin = PROVENANCE.indexOf(`<!-- provenance:${marker}:begin -->`);
  const end = PROVENANCE.indexOf(`<!-- provenance:${marker}:end -->`);
  if (begin < 0 || end < 0 || end < begin) {
    throw new Error(`PROVENANCE.md is missing the "${marker}" section.`);
  }
  return PROVENANCE.slice(begin, end)
    .split('\n')
    .map((line): string => line.trim())
    .filter((line): boolean => line.startsWith('- `'));
}

/** Tailwind-shaped sizing tokens. Copying one produces an unstyled element (P-5). */
const TAILWIND_SIZING = /\b(?:h|w|size|min-h|min-w|max-h|max-w)-(?:\d|\[)/u;

describe('vendored icon contract (assertion 22)', () => {
  it('vendors exactly the glyph inventory the UI-SPEC names', () => {
    expect([...ICON_FILES].sort()).toEqual([...EXPECTED_ICON_FILES].sort());
    // 14 through Phase 3; `04-01` vendors `DropletIcon` for the `map-style`
    // rail row (D4-07). A literal, so a glyph silently dropped fails here
    // rather than shrinking what the loop above iterates.
    expect(ICON_FILES).toHaveLength(15);
  });

  it.each(EXPECTED_ICON_FILES)(
    '%s exports a forwardRef component and a structurally identical handle',
    (fileName) => {
      const source = readIconFile(fileName);
      const base = fileName.replace(/\.tsx$/u, '');

      // The component, named for its file (repo naming rule) and forwardRef'd.
      expect(source).toContain(
        `export const ${base} = forwardRef<${base}Handle, ${base}Props>`,
      );

      // The handle, and its members must be EXACTLY the two the row drives.
      const handleBlock = new RegExp(
        `export interface ${base}Handle \\{(?<members>[^}]*)\\}`,
        'u',
      ).exec(source);
      expect(
        handleBlock?.groups,
        `${fileName} declares no ${base}Handle interface.`,
      ).toBeDefined();

      const members = [
        ...(handleBlock?.groups?.members ?? '').matchAll(
          /^\s*(?<name>\w+)\s*:/gmu,
        ),
      ].map((match): string => match.groups?.name ?? '');
      expect(members.sort()).toEqual(['startAnimation', 'stopAnimation']);

      // The handle has to be wired, not just declared.
      expect(source).toContain('useImperativeHandle(ref');
      expect(source).toContain("controls.start('animate')");
      expect(source).toContain("controls.start('normal')");

      // Sizing is the `size` prop, feeding the svg's own width/height.
      expect(source).toMatch(/size\?: number;/u);
      expect(source).toMatch(/size = 20/u);
      expect(source).toContain('height={size}');
      expect(source).toContain('width={size}');

      // The 2->1.5 local patch, and the marker that says it is a patch.
      expect(source).toContain('strokeWidth={1.5}');
      expect(source).toContain(
        'vendored from lucide-animated; strokeWidth patched 2→1.5',
      );
    },
  );

  it('sizes no icon through a Tailwind-shaped class token', () => {
    ICON_FILES.forEach((fileName): void => {
      const offending = readIconFile(fileName)
        .split('\n')
        .filter((line): boolean => TAILWIND_SIZING.test(line));
      expect(
        offending,
        `${fileName} carries a Tailwind-shaped sizing token. This repo has no ` +
          'Tailwind, so it renders unstyled while looking wired up (P-5).',
      ).toEqual([]);
    });
  });
});

describe('vendored icon provenance (assertion 28 / R-V2)', () => {
  it('records evidence and files as a TWO-WAY equal set', () => {
    const recorded = sectionBetween('in-repo').map((line): string => {
      const match = PROVENANCE_LINE.exec(line);
      expect(
        match?.groups,
        `PROVENANCE.md line is not in the dated evidence shape: ${line}`,
      ).toBeDefined();
      return match?.groups?.file ?? '';
    });

    // Two-way, not a subset in either direction. A file with no line fails; a
    // line with no file fails. That is what stops the evidence set and the file
    // set drifting apart — a subset check in either direction would let one of
    // the two grow silently.
    expect([...recorded].sort()).toEqual(DIRECTORY_FILES);
    expect(recorded).toHaveLength(DIRECTORY_FILES.length);
    expect(new Set(recorded).size).toBe(recorded.length);
  });

  it('dates every in-repo evidence line and states what was scanned for', () => {
    sectionBetween('in-repo').forEach((line): void => {
      const match = PROVENANCE_LINE.exec(line);
      expect(match?.groups?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
      expect((match?.groups?.flags ?? '').length).toBeGreaterThan(0);
    });

    // The verdict is only evidence if the scan is named beside it.
    [
      'fetch(',
      'XMLHttpRequest',
      'navigator.sendBeacon',
      'process.env',
      'eval(',
      'Function(',
    ].forEach((pattern): void => {
      expect(PROVENANCE).toContain(pattern);
    });
  });

  it('closes the three previously PENDING upstream rows with a dated disposition', () => {
    const upstream = sectionBetween('upstream').map((line): string => {
      const match = UPSTREAM_LINE.exec(line);
      expect(
        match?.groups,
        `Upstream disposition is not in the dated evidence shape: ${line}`,
      ).toBeDefined();
      expect(match?.groups?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
      return match?.groups?.file ?? '';
    });

    expect([...upstream].sort()).toEqual([...PREVIOUSLY_PENDING_UPSTREAM].sort());
  });

  it('contains no runtime-network or dynamic-execution construct', () => {
    const forbidden = [
      'fetch(',
      'XMLHttpRequest',
      'navigator.sendBeacon',
      'process.env',
      'eval(',
      'new Function(',
      'import(',
    ];

    DIRECTORY_FILES.filter(
      (name): boolean => name.endsWith('.tsx') || name.endsWith('.ts'),
    ).forEach((fileName): void => {
      if (fileName === 'iconContract.test.ts') {
        return;
      }
      const source = readIconFile(fileName);
      forbidden.forEach((pattern): void => {
        expect(
          source.includes(pattern),
          `${fileName} contains "${pattern}".`,
        ).toBe(false);
      });
    });
  });
});
