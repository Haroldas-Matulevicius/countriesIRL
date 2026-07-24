import type {
  HistoricalRegionId,
  SnapshotId,
  SnapshotReviewStatus,
} from '../types/composition';

export const SNAPSHOT_MANIFEST_URL = '/data/snapshots/index.json';
export const MODERN_SNAPSHOT_ID: SnapshotId = 'modern';

export const SNAPSHOT_CATALOG = [
  { id: MODERN_SNAPSHOT_ID, label: 'Modern — current borders' },
  { id: '1492', label: '1492 — Early modern Europe' },
  { id: '1700', label: '1700 — Post-Westphalia Europe' },
  { id: '1815', label: '1815 — Congress of Vienna' },
  { id: '1914', label: '1914 — Before World War I' },
] as const satisfies ReadonlyArray<{
  readonly id: SnapshotId;
  readonly label: string;
}>;

export const MAX_SNAPSHOT_MANIFEST_ENTRIES = SNAPSHOT_CATALOG.length;
export const MAX_SNAPSHOT_CACHE_ENTRIES = SNAPSHOT_CATALOG.length;

export const ALLOWED_SNAPSHOT_REVIEW_STATUSES = [
  'draft',
  'source-reviewed',
  'historian-reviewed',
] as const satisfies ReadonlyArray<SnapshotReviewStatus>;

export const HISTORICAL_REGION_IDS = [
  'poland',
  'lithuania',
  'hungary',
  'balkans',
  'iberia',
  'scandinavia',
] as const satisfies ReadonlyArray<HistoricalRegionId>;
