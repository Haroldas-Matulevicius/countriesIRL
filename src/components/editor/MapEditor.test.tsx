import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { StorageAdapter } from '../../utils/storage';
import { MapEditor } from './MapEditor';

/**
 * `MapEditor` is the one component a host mounts, so its props boundary is the
 * whole of the transition-readiness claim. Two halves are checked here:
 *
 * 1. a TEXT scan of the file - it exports exactly one component and one
 *    exported props interface, and it makes no host global reference at all;
 * 2. a STRUCTURAL render - mounting it produces exactly one root element, so a
 *    host places one node and gets the whole editor.
 *
 * The text scan is deliberately a plain search with no parser between the rule
 * and the file, which means it sees comments too. `MapEditor.tsx` says so and
 * describes host chrome without spelling the globals; a gate that goes red on
 * prose gets loosened instead of obeyed.
 */

interface FileSystemModule {
  readFileSync: (path: URL, encoding: 'utf8') => string;
}

interface NodeProcess {
  getBuiltinModule: (name: 'fs') => FileSystemModule;
}

function readEditorSource(): string {
  const nodeProcess = Reflect.get(globalThis, 'process') as
    | NodeProcess
    | undefined;

  if (nodeProcess === undefined) {
    throw new Error('Expected the Vitest Node process.');
  }

  return nodeProcess
    .getBuiltinModule('fs')
    .readFileSync(new URL('./MapEditor.tsx', import.meta.url), 'utf8');
}

/**
 * The closed set of host global references `MapEditor.tsx` is allowed to make.
 *
 * It is EMPTY, and that is the contract rather than an accident of the current
 * code: the mount root is the editor's whole world, so there is nothing outside
 * it for this file to reach for. Adding an entry is a change to the boundary,
 * not a test fix - the reason the seam is worth anything is that a future host
 * can mount the editor without the editor having opinions about the page.
 */
const ALLOWED_HOST_GLOBAL_REFERENCES: ReadonlyArray<string> = [];

const HOST_GLOBAL_PATTERN = /\b(?:document|window|globalThis|self)\s*\./gu;

const PROBE_STORAGE: StorageAdapter = {
  list: () => ({ ok: true, value: [], warnings: [] }),
  listSummaries: () => ({ ok: true, value: [], warnings: [] }),
  save: () => ({ ok: false, reason: 'storage-unavailable' }),
  load: ((): never => {
    throw new Error('The boundary probe never loads.');
  }) as unknown as StorageAdapter['load'],
  delete: () => ({ ok: false, reason: 'storage-unavailable' }),
  getOnboardingDismissed: () => ({ ok: true, value: true, warnings: [] }),
  dismissOnboarding: () => ({ ok: true, value: true, warnings: [] }),
};

function stubHostEnvironment(): void {
  vi.stubGlobal('window', {
    matchMedia: vi.fn(() => ({
      matches: true,
      media: '(min-width: 1200px)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(() => true),
    })),
  });
}

afterEach((): void => {
  vi.unstubAllGlobals();
});

describe('MapEditor props boundary (transition-readiness a)', (): void => {
  it('exports exactly one component and one exported props interface', (): void => {
    const source = readEditorSource();

    const exportedValues = [
      ...source.matchAll(/^export (?:function|const|class) (\w+)/gmu),
    ].map((match): string => match[1] ?? '');
    const exportedComponents = exportedValues.filter((name): boolean =>
      /^\p{Lu}/u.test(name),
    );

    expect(
      exportedComponents,
      'a host mounts ONE component. A second exported component is a second ' +
        'thing to mount, and the boundary stops being a boundary.',
    ).toStrictEqual(['MapEditor']);

    expect(
      source,
      'the props interface has to be exported, or a host cannot type the ' +
        'thing it is passing across the boundary.',
    ).toContain('export interface MapEditorProps {');
  });

  it('makes no host global reference outside the closed allowed set', (): void => {
    const source = readEditorSource();
    const found = [...source.matchAll(HOST_GLOBAL_PATTERN)].map(
      (match): string => match[0].replaceAll(/\s+/gu, ''),
    );

    expect(
      [...new Set(found)].sort(),
      'the editor never reaches outside its own mount point for chrome. A ' +
        'host global here is the editor assuming it owns the page it is ' +
        'mounted into, which is the one assumption that makes embedding a ' +
        'rewrite instead of a mount.',
    ).toStrictEqual([...ALLOWED_HOST_GLOBAL_REFERENCES].sort());
  });

  it('declares the three things a host has to supply, and nothing about auth', (): void => {
    const source = readEditorSource();
    const propsBlock =
      /export interface MapEditorProps \{(?<body>[\S\s]*?)\n\}/u.exec(source)
        ?.groups?.body ?? '';

    expect(propsBlock).toContain('dataBasePath?: string;');
    expect(propsBlock).toContain('storage?: StorageAdapter;');
    expect(propsBlock).toContain('initialThemeMode?: EditorThemeMode;');

    // Embedding ends the localhost-only constraint this project runs under and
    // needs a new explicit owner decision. It is not a prop, and a prop named
    // like one is how it arrives without one.
    ['token', 'apiKey', 'auth', 'entitlement', 'baseUrl', 'endpoint'].forEach(
      (forbidden): void => {
        expect(
          propsBlock.includes(`${forbidden}?:`) ||
            propsBlock.includes(`${forbidden}:`),
          `"${forbidden}" is not something this editor may accept.`,
        ).toBe(false);
      },
    );
  });
});

describe('MapEditor mount root', (): void => {
  it('renders exactly one root element', (): void => {
    stubHostEnvironment();

    const markup = renderToStaticMarkup(<MapEditor storage={PROBE_STORAGE} />);

    // Counted from the markup rather than asserted as a substring: "starts
    // with a div" is satisfied by two sibling divs just as well as by one.
    // The counter is checked against a two-root string in the same breath, so
    // "1" is a measurement rather than a value the helper can only return.
    expect(rootElementCount('<div><b>x</b></div><span/>')).toBe(2);
    expect(markup.startsWith('<div class="map-editor"')).toBe(true);
    expect(rootElementCount(markup)).toBe(1);
  });

  it('writes the theme class on the mount root, from the prop', (): void => {
    stubHostEnvironment();

    const light = renderToStaticMarkup(<MapEditor storage={PROBE_STORAGE} />);
    const dark = renderToStaticMarkup(
      <MapEditor storage={PROBE_STORAGE} initialThemeMode="dark" />,
    );

    expect(light.startsWith('<div class="map-editor"')).toBe(true);
    expect(dark.startsWith('<div class="map-editor dark"')).toBe(true);
  });

  it('reaches persistence through the adapter it was handed', (): void => {
    stubHostEnvironment();
    const calls: string[] = [];
    const countingStorage: StorageAdapter = {
      ...PROBE_STORAGE,
      getOnboardingDismissed: () => {
        calls.push('getOnboardingDismissed');
        return { ok: true, value: true, warnings: [] };
      },
    };

    renderToStaticMarkup(<MapEditor storage={countingStorage} />);

    expect(
      calls,
      'the editor read persistence from somewhere other than the adapter it ' +
        'was given, so a host cannot substitute one.',
    ).toContain('getOnboardingDismissed');
  });
});

/**
 * The number of top-level elements in a markup string.
 *
 * A depth walk rather than a prefix check: the claim is that the host places
 * ONE node, and only counting siblings at depth zero can fail on two.
 */
function rootElementCount(markup: string): number {
  const tagPattern = /<(?<closing>\/)?(?<name>[a-zA-Z][\w-]*)(?<rest>[^>]*)>/gu;
  let depth = 0;
  let roots = 0;

  for (const match of markup.matchAll(tagPattern)) {
    const isClosing = match.groups?.closing === '/';
    const isSelfClosing = (match.groups?.rest ?? '').trimEnd().endsWith('/');

    if (isClosing) {
      depth -= 1;
      continue;
    }

    if (depth === 0) {
      roots += 1;
    }

    if (!isSelfClosing) {
      depth += 1;
    }
  }

  return roots;
}
