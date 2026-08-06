import { useEffect, useMemo, useState } from 'react';

import { useEditorConfig } from '../providers/EditorConfigProvider';
import type { SnapshotManifestEntry } from '../types/composition';
import { validateSnapshotManifest } from '../utils/historicalValidation';
import {
  MODERN_PERIOD_OPTION,
  resolvePeriodOptions,
  type PeriodOption,
} from '../utils/periods';
import type { SnapshotFetch } from '../utils/snapshotScene';

const MODERN_ONLY_OPTIONS: ReadonlyArray<PeriodOption> = [
  MODERN_PERIOD_OPTION,
];
const NO_ENTRIES: ReadonlyArray<SnapshotManifestEntry> = [];

export interface SnapshotCatalog {
  readonly options: ReadonlyArray<PeriodOption>;
  readonly entries: ReadonlyArray<SnapshotManifestEntry>;
}

function defaultCatalogFetch(
  input: RequestInfo | URL,
  init: { readonly signal: AbortSignal },
): Promise<Response> {
  return globalThis.fetch(input, init);
}

async function loadCatalogEntries(
  fetcher: SnapshotFetch,
  manifestUrl: string,
  signal: AbortSignal,
): Promise<ReadonlyArray<SnapshotManifestEntry>> {
  const response = await fetcher(manifestUrl, { signal });
  if (!response.ok) {
    throw new Error('The snapshot catalog could not be read.');
  }

  const result = validateSnapshotManifest((await response.json()) as unknown);
  if (!result.ok) {
    throw new Error('The snapshot catalog is not valid.');
  }

  return result.value.snapshots;
}

/**
 * Reads the live catalog once. A catalog that cannot be read leaves the
 * selector on Modern only rather than inventing periods the app cannot render.
 */
export function useSnapshotCatalog(
  fetcher: SnapshotFetch = defaultCatalogFetch,
): SnapshotCatalog {
  const { assetUrls } = useEditorConfig();
  const [entries, setEntries] =
    useState<ReadonlyArray<SnapshotManifestEntry>>(NO_ENTRIES);

  useEffect((): (() => void) => {
    const controller = new AbortController();

    void loadCatalogEntries(
      fetcher,
      assetUrls.snapshotManifestUrl,
      controller.signal,
    )
      .then((loadedEntries): void => {
        if (!controller.signal.aborted) {
          setEntries(loadedEntries);
        }
      })
      .catch((error: unknown): void => {
        if (!controller.signal.aborted) {
          globalThis.console.error(
            'CountriesIRL could not read the period catalog.',
            error,
          );
        }
      });

    return (): void => controller.abort();
  }, [assetUrls, fetcher]);

  return useMemo<SnapshotCatalog>(
    (): SnapshotCatalog => ({
      options:
        entries.length === 0
          ? MODERN_ONLY_OPTIONS
          : resolvePeriodOptions(entries),
      entries,
    }),
    [entries],
  );
}
