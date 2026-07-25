import { SNAPSHOT_CATALOG } from '../constants/snapshots';
import type {
  HistoricalRegionId,
  SnapshotId,
  SnapshotManifestEntry,
} from '../types/composition';
import type { BoundaryMode } from '../types/map';
import { isProductionSelectableSnapshot } from './historicalValidation';

export interface PeriodOption {
  readonly id: SnapshotId;
  readonly label: string;
}

export const PERIOD_COPY = {
  previewLabel: '1080 × 1080 composition preview',
  periodLabel: 'Map period',
  resetView: 'Reset View',
  retryPeriod: 'Try Period Again',
  worldLoading: 'Loading world map…',
  modernStatus: 'Modern borders worldwide.',
  fatalHeading: "We couldn't load the world map",
  fatalBody:
    'Refresh the page to try the bundled map data again. Your saved maps will stay in this browser.',
  fatalAction: 'Reload Map',
  viewReset: 'Map view reset.',
} as const;

const REGION_LABELS: Readonly<Record<HistoricalRegionId, string>> = {
  poland: 'Poland',
  lithuania: 'Lithuania',
  hungary: 'Hungary',
  balkans: 'the Balkans',
  iberia: 'Iberia',
  scandinavia: 'Scandinavia',
};

// The live catalog decides *which* periods exist; these constants decide what
// the creator reads. Manifest text is data crossing a trust boundary, so it
// never reaches the selector directly (T-02-40).
const APPROVED_PERIOD_LABELS: ReadonlyMap<SnapshotId, string> = new Map(
  SNAPSHOT_CATALOG.map((entry): [SnapshotId, string] => [
    entry.id,
    entry.label,
  ]),
);
const APPROVED_PERIOD_ORDER: ReadonlyMap<SnapshotId, number> = new Map(
  SNAPSHOT_CATALOG.map((entry, index): [SnapshotId, number] => [
    entry.id,
    index,
  ]),
);

export const MODERN_PERIOD_OPTION: PeriodOption = {
  id: 'modern',
  label: APPROVED_PERIOD_LABELS.get('modern') ?? 'Modern — current borders',
};

function getPeriodOrder(option: PeriodOption): number {
  return APPROVED_PERIOD_ORDER.get(option.id) ?? Number.MAX_SAFE_INTEGER;
}

/**
 * Catalog-driven, never hardcoded to a single entry: an approved snapshot added
 * to the live manifest surfaces here with no component change, and an entry that
 * has not cleared source/licence/historical review is omitted entirely rather
 * than shown as a disabled teaser (UI-SPEC section 9).
 */
export function resolvePeriodOptions(
  entries: ReadonlyArray<SnapshotManifestEntry>,
): ReadonlyArray<PeriodOption> {
  const seenIds = new Set<SnapshotId>();
  const options: PeriodOption[] = [];

  entries.forEach((entry): void => {
    const label = APPROVED_PERIOD_LABELS.get(entry.id);
    if (
      label === undefined ||
      seenIds.has(entry.id) ||
      !isProductionSelectableSnapshot(entry)
    ) {
      return;
    }
    seenIds.add(entry.id);
    options.push({ id: entry.id, label });
  });

  if (!seenIds.has(MODERN_PERIOD_OPTION.id)) {
    options.push(MODERN_PERIOD_OPTION);
  }

  return options.sort(
    (first, second): number => getPeriodOrder(first) - getPeriodOrder(second),
  );
}

export function getPeriodLabel(
  options: ReadonlyArray<PeriodOption>,
  snapshotId: SnapshotId,
): string {
  return (
    options.find((option): boolean => option.id === snapshotId)?.label ??
    APPROVED_PERIOD_LABELS.get(snapshotId) ??
    MODERN_PERIOD_OPTION.label
  );
}

export function getMapAccessibleLabel(periodLabel: string): string {
  return `Interactive world map, ${periodLabel}`;
}

export function getPeriodLoadingMessage(periodLabel: string): string {
  return `Loading ${periodLabel} borders…`;
}

export function getPeriodFailureMessage(periodLabel: string): string {
  return `We couldn't load ${periodLabel}. The previous map period is still shown. Try again.`;
}

export function getShowingPeriodMessage(periodLabel: string): string {
  return `Showing ${periodLabel}.`;
}

/**
 * Every announcement the period control can produce, built from approved copy
 * so the toast allowlist stays fail-closed on manifest-supplied text.
 */
export const APPROVED_PERIOD_ANNOUNCEMENTS: ReadonlyArray<string> = [
  PERIOD_COPY.viewReset,
  ...SNAPSHOT_CATALOG.map((entry): string =>
    getShowingPeriodMessage(entry.label),
  ),
];

export function getHistoricalCoverageStatus(
  coverageRegions: ReadonlyArray<HistoricalRegionId>,
): string {
  const coverageList = coverageRegions
    .map((regionId): string => REGION_LABELS[regionId])
    .join(', ');
  return `Historical borders: ${coverageList}. Modern borders remain elsewhere.`;
}

/**
 * The tooltip is capped at 360px, so the boundary line names the period by its
 * snapshot identity rather than repeating the full selector label.
 */
export function getBoundaryLine(
  boundaryMode: BoundaryMode,
  snapshotId: SnapshotId,
): string {
  if (snapshotId === 'modern' || boundaryMode === 'modern') {
    return 'Modern boundary';
  }

  return boundaryMode === 'historical'
    ? `Historical boundary · ${snapshotId}`
    : `Modern fallback · ${snapshotId} composition`;
}
