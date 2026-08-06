import { describe, expect, it } from 'vitest';

import {
  DATA_BASE_PATH,
  DEFAULT_EDITOR_ASSET_URLS,
  normalizeDataBasePath,
  resolveEditorAssetUrls,
} from './editorConfig';

/**
 * Transition-readiness (c): the data asset base path is a parameter living in
 * exactly ONE config home, so a host that mounts `MapEditor` can serve the
 * bundled assets from somewhere else without editing three fetch sites.
 *
 * The gate below is the part that keeps that true. Moving the literals once is
 * a refactor; the fourth one that gets typed next month is the defect.
 */

interface DirectoryEntry {
  readonly name: string;
  isDirectory: () => boolean;
}

interface FileSystemModule {
  readFileSync: (path: URL, encoding: 'utf8') => string;
  readdirSync: (
    path: URL,
    options: { readonly withFileTypes: true },
  ) => DirectoryEntry[];
}

interface NodeProcess {
  getBuiltinModule: (name: 'fs') => FileSystemModule;
}

function fileSystem(): FileSystemModule {
  const nodeProcess = Reflect.get(globalThis, 'process') as
    | NodeProcess
    | undefined;

  if (nodeProcess === undefined) {
    throw new Error('Expected the Vitest Node process.');
  }

  return nodeProcess.getBuiltinModule('fs');
}

const SOURCE_DIRECTORY = new URL('../', import.meta.url);

/**
 * Every non-test source file under `src/`, discovered by walking rather than
 * from a list. A list that has to be edited by hand is a list that will not be,
 * and the file nobody added would be unscanned rather than failing.
 */
function collectSourceFiles(directory: URL, prefix = ''): string[] {
  return fileSystem()
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry): string[] => {
      const relativePath = `${prefix}${entry.name}`;

      if (entry.isDirectory()) {
        return collectSourceFiles(
          new URL(`${entry.name}/`, directory),
          `${relativePath}/`,
        );
      }

      if (!/\.tsx?$/u.test(entry.name) || /\.test\./u.test(entry.name)) {
        return [];
      }

      return [relativePath];
    })
    .sort();
}

const SOURCE_FILES: ReadonlyArray<string> = collectSourceFiles(
  SOURCE_DIRECTORY,
);

interface SourceMatch {
  readonly file: string;
  readonly lineNumber: number;
  readonly text: string;
}

function matchesIn(pattern: RegExp): SourceMatch[] {
  return SOURCE_FILES.flatMap((file): SourceMatch[] => {
    const source = fileSystem().readFileSync(
      new URL(file, SOURCE_DIRECTORY),
      'utf8',
    );

    return source
      .split('\n')
      .map((text, index): SourceMatch => ({
        file,
        lineNumber: index + 1,
        text: text.trim(),
      }))
      .filter((match): boolean => {
        pattern.lastIndex = 0;
        return pattern.test(match.text);
      });
  });
}

/** A `/data/…` string literal, in any of the three quote styles. */
const DATA_PATH_LITERAL = /['"`]\/data\//u;

/** The one file allowed to hold the base path. */
const DATA_PATH_HOME = 'config/editorConfig.ts';

/**
 * The closed exemption set. Two safety predicates, cited by file, by the
 * predicate's own source text, and by the line each occupied when the
 * exemption was written.
 *
 * They are keyed on the TEXT rather than on the line number. A line number
 * drifts the moment anything above it changes, and a gate that is red on
 * arrival gets loosened rather than obeyed - this repository has already lost
 * one that way. The line numbers are carried for a reader; the text is what the
 * assertion matches, and it is a stricter key, not a looser one.
 */
const DATA_PATH_EXEMPTIONS = [
  {
    file: 'utils/historicalValidation.ts',
    citedLine: 1098,
    text: "!input.assetPath.startsWith('/data/') ||",
    reason:
      'a safety predicate on a MANIFEST-DECLARED asset path, not a fetch URL. ' +
      'Parameterising it alongside the fetch paths would let a host-configured ' +
      'base path widen what counts as an acceptable asset path - a loosening ' +
      'of the approval chain dressed up as a refactor.',
  },
  {
    file: 'utils/historicalValidation.ts',
    citedLine: 1190,
    text: "entry.assetPath.startsWith('/data/snapshots/')",
    reason:
      'the approval half of the same predicate pair: it is what makes an ' +
      'approved snapshot entry point inside the reviewed asset tree. Same ' +
      'reason, same refusal to parameterise.',
  },
] as const;

describe('the data asset base path has one home', (): void => {
  it('derives every asset URL from the base path', (): void => {
    expect(DATA_BASE_PATH).toBe('/data/');
    expect(DEFAULT_EDITOR_ASSET_URLS).toStrictEqual({
      worldManifestUrl: '/data/world-manifest.json',
      worldDataUrl: '/data/world-modern.geojson',
      snapshotManifestUrl: '/data/snapshots/index.json',
    });

    // A host base path, with and without its trailing separator, so the two
    // spellings cannot silently produce different URLs.
    expect(normalizeDataBasePath('/assets/world')).toBe('/assets/world/');
    expect(resolveEditorAssetUrls('/assets/world')).toStrictEqual(
      resolveEditorAssetUrls('/assets/world/'),
    );
    expect(resolveEditorAssetUrls('/assets/world').worldDataUrl).toBe(
      '/assets/world/world-modern.geojson',
    );
  });

  it('holds the base path literal exactly once, in the config home', (): void => {
    const homeMatches = matchesIn(DATA_PATH_LITERAL).filter(
      (match): boolean => match.file === DATA_PATH_HOME,
    );

    expect(
      homeMatches.map((match): string => match.text),
      'the home holds ONE literal - the base path. A second one here is the ' +
        'scattering starting again inside the file that exists to stop it.',
    ).toStrictEqual(["export const DATA_BASE_PATH = '/data/';"]);
  });

  it('leaves no other production /data/ literal outside the two exempt predicates', (): void => {
    const unexplained = matchesIn(DATA_PATH_LITERAL).filter(
      (match): boolean =>
        match.file !== DATA_PATH_HOME &&
        !DATA_PATH_EXEMPTIONS.some(
          (exemption): boolean =>
            exemption.file === match.file && exemption.text === match.text,
        ),
    );

    expect(
      unexplained.map(
        (match): string => `${match.file}:${match.lineNumber} ${match.text}`,
      ),
      'a production /data/ literal outside the config home. The base path is ' +
        'a parameter; a literal here is a fetch site a host cannot move.',
    ).toStrictEqual([]);
  });

  it('keeps the exemption set closed, with no stale entry', (): void => {
    const matches = matchesIn(DATA_PATH_LITERAL);

    DATA_PATH_EXEMPTIONS.forEach((exemption): void => {
      const hits = matches.filter(
        (match): boolean =>
          match.file === exemption.file && match.text === exemption.text,
      );

      // Both directions. An exemption whose subject has moved on is a standing
      // licence for the next literal that happens to look like it.
      expect(
        hits.map((hit): number => hit.lineNumber),
        `the exemption for ${exemption.file} (cited at line ` +
          `${exemption.citedLine}) matches ${hits.length} lines, not one. ` +
          exemption.reason,
      ).toHaveLength(1);
    });

    expect(DATA_PATH_EXEMPTIONS).toHaveLength(2);
  });
});

/**
 * Transition-readiness (b). Persistence is an ADAPTER, reached through
 * `MapEditor`'s props boundary, and exactly one production file under `src/`
 * knows what it is backed by.
 *
 * The rule is not aesthetic. `storage.ts` checks the bounded V2 limits -
 * `MAX_STORAGE_SERIALIZED_LENGTH`, `MAX_STORAGE_JSON_DEPTH`,
 * `MAX_STORAGE_JSON_NODES` - BEFORE it parses, and returns typed
 * `storage-unavailable` / `quota-exceeded` reasons instead of throwing. A raw
 * write somewhere else gets none of that, and it is a write a host cannot
 * redirect.
 *
 * Test injection sites and the browser-context `page.evaluate` sites under
 * `tests/e2e/` are deliberately out of scope: they are test setup, not app
 * code, and widening this gate to chase them is how it stops being a gate.
 */
const STORAGE_SITE = 'utils/storage.ts';

describe('browser storage has exactly one production site (transition-readiness b)', (): void => {
  it('is reached from src/utils/storage.ts and nowhere else', (): void => {
    const files = [
      ...new Set(
        matchesIn(/\blocalStorage\b|\bsessionStorage\b/u).map(
          (match): string => match.file,
        ),
      ),
    ].sort();

    expect(
      files,
      'browser storage is an implementation detail of the adapter. A second ' +
        'production file here is a write that skips the bounded V2 limits and ' +
        'that a host cannot substitute.',
    ).toStrictEqual([STORAGE_SITE]);
  });

  it('keeps the bounded V2 limits on the file that owns the storage site', (): void => {
    const source = fileSystem().readFileSync(
      new URL(STORAGE_SITE, SOURCE_DIRECTORY),
      'utf8',
    );

    [
      'MAX_STORAGE_SERIALIZED_LENGTH',
      'MAX_STORAGE_JSON_DEPTH',
      'MAX_STORAGE_JSON_NODES',
    ].forEach((limit): void => {
      expect(source, `${limit} is what makes the one site a safe one.`).toContain(
        limit,
      );
    });
  });
});

/**
 * Transition-readiness (e). A theme class written to the host page's root
 * element is a second writer of the theme that no control inside the editor can
 * override, and no host can either. The class goes on the editor mount root.
 */
describe('the editor writes no class above its own mount root', (): void => {
  it('touches the host page root element nowhere under src/', (): void => {
    const matches = matchesIn(/documentElement/u);

    expect(
      matches.map(
        (match): string => `${match.file}:${match.lineNumber} ${match.text}`,
      ),
      'the .dark class lands on the editor mount root only. Above it, a host ' +
        'cannot override the theme it is supposed to own.',
    ).toStrictEqual([]);
  });
});
