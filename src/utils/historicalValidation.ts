import { HISTORICAL_REGION_IDS, SNAPSHOT_CATALOG } from '../constants/snapshots';
import type {
  ApprovalReviewer,
  EvidenceArchiveMember,
  HistoricalRegionId,
  HistoricalSnapshotId,
  SnapshotFactualApproval,
  SnapshotManifestEntry,
  SnapshotSourceApproval,
  SnapshotSourceRecord,
} from '../types/composition';
import type { SceneFeature } from '../types/map';
import { isSafeStableCountryId } from './countryIds';
import { normalizeGeoJson } from './geojson';

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_ARCHIVE_MEMBERS = 256;
const MAX_REGIONAL_RECORDS = HISTORICAL_REGION_IDS.length;
const MAX_UNCERTAINTIES = 32;
const MAX_SOURCE_RECORDS = 64;
const MAX_STRING_LENGTH = 2_048;
const MAX_PATH_LENGTH = 240;
const MAX_ASSET_FEATURES = 10_000;
const FORBIDDEN_REVIEWER_PATTERN = /\b(?:executor|implementer|claude|codex)\b/i;
export const HISTORICAL_SNAPSHOT_DATES: Readonly<
  Record<HistoricalSnapshotId, string>
> = {
  '1492': '1492-01-03',
  '1700': '1700-01-01',
  '1815': '1815-12-31',
  '1914': '1914-07-27',
};

const HISTORICAL_IDS = new Set<HistoricalSnapshotId>(['1492', '1700', '1815', '1914']);
const SNAPSHOT_IDS = new Set<string>(SNAPSHOT_CATALOG.map(({ id }) => id));
const HISTORICAL_REGION_ID_SET = new Set<HistoricalRegionId>(HISTORICAL_REGION_IDS);

export type HistoricalValidationResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly errors: ReadonlyArray<string> };

export interface EvidenceArchiveMemberInput {
  readonly path: string;
  readonly bytes: Uint8Array;
}

export interface CanonicalEvidenceInventory {
  readonly sha256: string;
  readonly members: ReadonlyArray<EvidenceArchiveMember>;
}

interface HistoricalFileReference {
  readonly path: string;
  readonly sha256: string;
}

export interface HistoricalRegionalSourceRecord {
  readonly regionId: HistoricalRegionId;
  readonly disposition: 'approved';
  readonly evidencePath: string;
  readonly evidenceSha256: string;
  readonly rightsDisposition: 'approved';
  readonly license: string;
  readonly attribution: string | null;
  readonly retrievedOn: string;
  readonly uncertainties: ReadonlyArray<string>;
}

export type HistoricalSourcePreparation =
  | {
      readonly mode: 'vector-extraction';
      readonly extractionSpecification: HistoricalFileReference;
    }
  | {
      readonly mode: 'manual-trace';
      readonly evidence: HistoricalFileReference;
      readonly procedure: HistoricalFileReference;
      readonly operatorRecord: HistoricalFileReference;
      readonly controlPoints: HistoricalFileReference;
    };

export interface HistoricalSourceReadinessManifest {
  readonly snapshotId: HistoricalSnapshotId;
  readonly asOf: string;
  readonly readinessStatus: 'ready';
  readonly deliveryCounted: true;
  readonly evidenceArchive: HistoricalFileReference & {
    readonly memberInventorySha256: string;
    readonly members: ReadonlyArray<EvidenceArchiveMember>;
  };
  readonly inputGeometry: HistoricalFileReference;
  readonly preparation: HistoricalSourcePreparation;
  readonly regions: ReadonlyArray<HistoricalRegionalSourceRecord>;
}

export type SourceApprovalPreparationContext =
  | {
      readonly mode: 'vector-extraction';
      readonly extractionSpecificationBytes: Uint8Array;
    }
  | {
      readonly mode: 'manual-trace';
      readonly evidenceBytes: Uint8Array;
      readonly procedureBytes: Uint8Array;
      readonly operatorRecordBytes: Uint8Array;
      readonly controlPointBytes: Uint8Array;
    };

export interface SourceApprovalValidationContext {
  readonly sourceManifest: unknown;
  readonly sourceManifestBytes: Uint8Array;
  readonly evidenceArchiveBytes: Uint8Array;
  readonly archiveMembers: ReadonlyArray<EvidenceArchiveMemberInput>;
  readonly inputGeometryBytes: Uint8Array;
  readonly preparation: SourceApprovalPreparationContext;
}

export interface FactualApprovalValidationContext {
  readonly sourceApprovalBytes: Uint8Array;
  readonly sourceManifestBytes: Uint8Array;
  readonly inputGeometryBytes: Uint8Array;
  readonly outputOverlayBytes: Uint8Array;
  readonly reviewJsonBytes: Uint8Array;
  readonly reviewHtmlBytes: Uint8Array;
  readonly calculateHash?: (bytes: Uint8Array) => Promise<string>;
}

export interface HistoricalAsset {
  readonly features: ReadonlyArray<SceneFeature>;
  readonly replacedModernSourceFeatureIds: ReadonlySet<string>;
  readonly warnings: ReadonlyArray<string>;
}

export interface SnapshotManifestCatalog {
  readonly version: 1;
  readonly snapshots: ReadonlyArray<SnapshotManifestEntry>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: unknown,
  expectedKeys: ReadonlyArray<string>,
): value is Record<string, unknown> {
  if (!isRecord(value)) {
    return false;
  }
  const actualKeys = Object.keys(value).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();
  return (
    actualKeys.length === sortedExpectedKeys.length &&
    actualKeys.every((key, index) => key === sortedExpectedKeys[index])
  );
}

function isBoundedString(value: unknown, maxLength = MAX_STRING_LENGTH): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= maxLength
  );
}

function isSha256(value: unknown): value is string {
  return typeof value === 'string' && SHA256_PATTERN.test(value);
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE_PATTERN.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

function evidencePathCollisionKey(value: string): string {
  return value.normalize('NFKC').toLowerCase();
}

function normalizeEvidencePath(value: unknown): string | null {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > MAX_PATH_LENGTH ||
    value.includes('\\') ||
    value.includes('\0') ||
    value !== value.normalize('NFC') ||
    value.startsWith('/') ||
    /^[A-Za-z]:/.test(value)
  ) {
    return null;
  }

  const segments = value.split('/');
  if (
    segments.some(
      (segment) => segment.length === 0 || segment === '.' || segment === '..',
    )
  ) {
    return null;
  }

  return segments.join('/');
}

function readUncertainties(value: unknown): ReadonlyArray<string> | null {
  if (!Array.isArray(value) || value.length > MAX_UNCERTAINTIES) {
    return null;
  }

  const uncertainties: string[] = [];
  for (const uncertainty of value) {
    if (!isBoundedString(uncertainty)) {
      return null;
    }
    uncertainties.push(uncertainty);
  }
  return uncertainties;
}

function readFileReference(value: unknown): HistoricalFileReference | null {
  if (!hasExactKeys(value, ['path', 'sha256'])) {
    return null;
  }

  const path = normalizeEvidencePath(value.path);
  if (path === null || !isSha256(value.sha256)) {
    return null;
  }

  return { path, sha256: value.sha256 };
}

function readHistoricalSnapshotId(value: unknown): HistoricalSnapshotId | null {
  return typeof value === 'string' && HISTORICAL_IDS.has(value as HistoricalSnapshotId)
    ? (value as HistoricalSnapshotId)
    : null;
}

function readRegionId(value: unknown): HistoricalRegionId | null {
  return typeof value === 'string' && HISTORICAL_REGION_ID_SET.has(value as HistoricalRegionId)
    ? (value as HistoricalRegionId)
    : null;
}

function readArchiveMembers(value: unknown): ReadonlyArray<EvidenceArchiveMember> | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_ARCHIVE_MEMBERS) {
    return null;
  }

  const members: EvidenceArchiveMember[] = [];
  const collisionKeys = new Set<string>();
  let previousPath = '';
  for (const candidate of value) {
    if (!isRecord(candidate)) {
      return null;
    }
    const path = normalizeEvidencePath(candidate.path);
    const collisionKey = path === null ? null : evidencePathCollisionKey(path);
    if (
      path === null ||
      collisionKey === null ||
      collisionKeys.has(collisionKey) ||
      !isSha256(candidate.sha256) ||
      path <= previousPath
    ) {
      return null;
    }
    collisionKeys.add(collisionKey);
    previousPath = path;
    members.push({ path, sha256: candidate.sha256 });
  }
  return members;
}

function readReviewer(value: unknown): ApprovalReviewer | null {
  if (
    !hasExactKeys(value, [
      'name',
      'role',
      'reviewedOn',
      'isExecutor',
      'isImplementer',
    ])
  ) {
    return null;
  }

  if (
    !isBoundedString(value.name) ||
    !isBoundedString(value.role) ||
    !isIsoDate(value.reviewedOn) ||
    value.isExecutor !== false ||
    value.isImplementer !== false ||
    FORBIDDEN_REVIEWER_PATTERN.test(value.name) ||
    FORBIDDEN_REVIEWER_PATTERN.test(value.role)
  ) {
    return null;
  }

  return {
    name: value.name,
    role: value.role,
    reviewedOn: value.reviewedOn,
    isExecutor: false,
    isImplementer: false,
  };
}

function hasExactRegionKeys(value: Record<string, unknown>): boolean {
  const keys = Object.keys(value).sort();
  return (
    keys.length === MAX_REGIONAL_RECORDS &&
    keys.every((key, index) => key === [...HISTORICAL_REGION_IDS].sort()[index])
  );
}

function readSourceRegionalDecisions(
  value: unknown,
): SnapshotSourceApproval['regionalDecisions'] | null {
  if (!isRecord(value) || !hasExactRegionKeys(value)) {
    return null;
  }

  const entries: Array<[HistoricalRegionId, SnapshotSourceApproval['regionalDecisions'][HistoricalRegionId]]> = [];
  for (const regionId of HISTORICAL_REGION_IDS) {
    const candidate = value[regionId];
    if (
      !hasExactKeys(candidate, [
        'regionId',
        'disposition',
        'rightsDisposition',
        'attribution',
        'uncertainties',
      ])
    ) {
      return null;
    }
    const uncertainties = readUncertainties(candidate.uncertainties);
    if (
      candidate.regionId !== regionId ||
      candidate.disposition !== 'approved' ||
      !isBoundedString(candidate.rightsDisposition) ||
      /\b(?:blocked|denied|unapproved)\b/i.test(candidate.rightsDisposition) ||
      !(
        candidate.attribution === null ||
        isBoundedString(candidate.attribution)
      ) ||
      uncertainties === null
    ) {
      return null;
    }
    entries.push([
      regionId,
      {
        regionId,
        disposition: 'approved',
        rightsDisposition: candidate.rightsDisposition,
        attribution: candidate.attribution,
        uncertainties,
      },
    ]);
  }

  return Object.fromEntries(entries) as SnapshotSourceApproval['regionalDecisions'];
}

function readFactualRegionalDecisions(
  value: unknown,
): SnapshotFactualApproval['regionalDecisions'] | null {
  if (!isRecord(value) || !hasExactRegionKeys(value)) {
    return null;
  }

  const entries: Array<[HistoricalRegionId, SnapshotFactualApproval['regionalDecisions'][HistoricalRegionId]]> = [];
  for (const regionId of HISTORICAL_REGION_IDS) {
    const candidate = value[regionId];
    if (
      !hasExactKeys(candidate, [
        'regionId',
        'disposition',
        'uncertainties',
      ])
    ) {
      return null;
    }
    const uncertainties = readUncertainties(candidate.uncertainties);
    if (
      candidate.regionId !== regionId ||
      candidate.disposition !== 'approved' ||
      uncertainties === null
    ) {
      return null;
    }
    entries.push([
      regionId,
      { regionId, disposition: 'approved', uncertainties },
    ]);
  }

  return Object.fromEntries(entries) as SnapshotFactualApproval['regionalDecisions'];
}

function memberInventoriesMatch(
  first: ReadonlyArray<EvidenceArchiveMember>,
  second: ReadonlyArray<EvidenceArchiveMember>,
): boolean {
  return (
    first.length === second.length &&
    first.every(
      (member, index) =>
        member.path === second[index]?.path &&
        member.sha256 === second[index]?.sha256,
    )
  );
}

function fail<T>(...errors: ReadonlyArray<string>): HistoricalValidationResult<T> {
  return { ok: false, errors };
}

export async function calculateSha256(bytes: Uint8Array): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    Uint8Array.from(bytes).buffer,
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

export async function createCanonicalMemberInventory(
  input: ReadonlyArray<EvidenceArchiveMemberInput>,
): Promise<HistoricalValidationResult<CanonicalEvidenceInventory>> {
  if (input.length === 0 || input.length > MAX_ARCHIVE_MEMBERS) {
    return fail('archive-member-count');
  }

  const members: EvidenceArchiveMember[] = [];
  const collisionKeys = new Set<string>();
  let previousPath = '';
  for (const member of input) {
    const path = normalizeEvidencePath(member.path);
    if (path === null || !(member.bytes instanceof Uint8Array)) {
      return fail('invalid-archive-member');
    }
    const collisionKey = evidencePathCollisionKey(path);
    if (path <= previousPath || collisionKeys.has(collisionKey)) {
      return fail('noncanonical-or-colliding-archive-member');
    }
    collisionKeys.add(collisionKey);
    previousPath = path;
    members.push({ path, sha256: await calculateSha256(member.bytes) });
  }

  const canonicalBytes = new TextEncoder().encode(`${JSON.stringify(members)}\n`);
  return {
    ok: true,
    value: {
      sha256: await calculateSha256(canonicalBytes),
      members,
    },
  };
}

export function validateSourceReadinessManifest(
  input: unknown,
): HistoricalValidationResult<HistoricalSourceReadinessManifest> {
  if (
    !hasExactKeys(input, [
      'snapshotId',
      'asOf',
      'readinessStatus',
      'deliveryCounted',
      'evidenceArchive',
      'inputGeometry',
      'preparation',
      'regions',
    ])
  ) {
    return fail('invalid-source-manifest');
  }

  const snapshotId = readHistoricalSnapshotId(input.snapshotId);
  const inputGeometry = readFileReference(input.inputGeometry);
  if (
    snapshotId === null ||
    input.asOf !== HISTORICAL_SNAPSHOT_DATES[snapshotId] ||
    input.readinessStatus !== 'ready' ||
    input.deliveryCounted !== true ||
    inputGeometry === null ||
    !isRecord(input.evidenceArchive)
  ) {
    return fail('invalid-source-manifest');
  }

  const archivePath = normalizeEvidencePath(input.evidenceArchive.path);
  const members = readArchiveMembers(input.evidenceArchive.members);
  if (
    !hasExactKeys(input.evidenceArchive, [
      'path',
      'sha256',
      'memberInventorySha256',
      'members',
    ]) ||
    archivePath === null ||
    !isSha256(input.evidenceArchive.sha256) ||
    !isSha256(input.evidenceArchive.memberInventorySha256) ||
    members === null
  ) {
    return fail('invalid-evidence-archive');
  }

  if (!isRecord(input.preparation) || typeof input.preparation.mode !== 'string') {
    return fail('invalid-preparation-mode');
  }

  let preparation: HistoricalSourcePreparation;
  if (
    hasExactKeys(input.preparation, ['mode', 'extractionSpecification']) &&
    input.preparation.mode === 'vector-extraction'
  ) {
    const extractionSpecification = readFileReference(
      input.preparation.extractionSpecification,
    );
    if (extractionSpecification === null) {
      return fail('invalid-vector-extraction');
    }
    preparation = { mode: 'vector-extraction', extractionSpecification };
  } else if (
    hasExactKeys(input.preparation, [
      'mode',
      'evidence',
      'procedure',
      'operatorRecord',
      'controlPoints',
    ]) &&
    input.preparation.mode === 'manual-trace'
  ) {
    const evidence = readFileReference(input.preparation.evidence);
    const procedure = readFileReference(input.preparation.procedure);
    const operatorRecord = readFileReference(input.preparation.operatorRecord);
    const controlPoints = readFileReference(input.preparation.controlPoints);
    if (
      evidence === null ||
      procedure === null ||
      operatorRecord === null ||
      controlPoints === null
    ) {
      return fail('invalid-manual-trace');
    }
    preparation = {
      mode: 'manual-trace',
      evidence,
      procedure,
      operatorRecord,
      controlPoints,
    };
  } else {
    return fail('invalid-preparation-mode');
  }

  if (
    !Array.isArray(input.regions) ||
    input.regions.length !== MAX_REGIONAL_RECORDS
  ) {
    return fail('invalid-regional-source-records');
  }

  const regions: HistoricalRegionalSourceRecord[] = [];
  const seenRegions = new Set<HistoricalRegionId>();
  for (const candidate of input.regions) {
    if (
      !hasExactKeys(candidate, [
        'regionId',
        'disposition',
        'evidencePath',
        'evidenceSha256',
        'rightsDisposition',
        'license',
        'attribution',
        'retrievedOn',
        'uncertainties',
      ])
    ) {
      return fail('invalid-regional-source-record');
    }
    const regionId = readRegionId(candidate.regionId);
    const evidencePath = normalizeEvidencePath(candidate.evidencePath);
    const uncertainties = readUncertainties(candidate.uncertainties);
    if (
      regionId === null ||
      seenRegions.has(regionId) ||
      evidencePath === null ||
      !isSha256(candidate.evidenceSha256) ||
      candidate.disposition !== 'approved' ||
      candidate.rightsDisposition !== 'approved' ||
      !isBoundedString(candidate.license) ||
      !(candidate.attribution === null || isBoundedString(candidate.attribution)) ||
      !isIsoDate(candidate.retrievedOn) ||
      uncertainties === null
    ) {
      return fail('invalid-regional-source-record');
    }
    seenRegions.add(regionId);
    regions.push({
      regionId,
      disposition: 'approved',
      evidencePath,
      evidenceSha256: candidate.evidenceSha256,
      rightsDisposition: 'approved',
      license: candidate.license,
      attribution: candidate.attribution,
      retrievedOn: candidate.retrievedOn,
      uncertainties,
    });
  }

  if (HISTORICAL_REGION_IDS.some((regionId) => !seenRegions.has(regionId))) {
    return fail('missing-regional-source-record');
  }

  return {
    ok: true,
    value: {
      snapshotId,
      asOf: HISTORICAL_SNAPSHOT_DATES[snapshotId],
      readinessStatus: 'ready',
      deliveryCounted: true,
      evidenceArchive: {
        path: archivePath,
        sha256: input.evidenceArchive.sha256,
        memberInventorySha256: input.evidenceArchive.memberInventorySha256,
        members,
      },
      inputGeometry,
      preparation,
      regions,
    },
  };
}

function readSourceApproval(input: unknown): HistoricalValidationResult<SnapshotSourceApproval> {
  if (
    !hasExactKeys(input, [
      'snapshotId',
      'reviewer',
      'regionalDecisions',
      'sourceManifestSha256',
      'evidenceArchiveSha256',
      'memberInventorySha256',
      'memberInventory',
      'inputGeometrySha256',
      'preparation',
    ])
  ) {
    return fail('invalid-source-approval');
  }

  const snapshotId = readHistoricalSnapshotId(input.snapshotId);
  const reviewer = readReviewer(input.reviewer);
  const regionalDecisions = readSourceRegionalDecisions(input.regionalDecisions);
  const memberInventory = readArchiveMembers(input.memberInventory);
  if (
    snapshotId === null ||
    reviewer === null ||
    regionalDecisions === null ||
    memberInventory === null ||
    !isSha256(input.sourceManifestSha256) ||
    !isSha256(input.evidenceArchiveSha256) ||
    !isSha256(input.memberInventorySha256) ||
    !isSha256(input.inputGeometrySha256) ||
    !isRecord(input.preparation)
  ) {
    return fail('invalid-source-approval');
  }

  let preparation: SnapshotSourceApproval['preparation'];
  if (
    hasExactKeys(input.preparation, [
      'mode',
      'extractionSpecificationSha256',
    ]) &&
    input.preparation.mode === 'vector-extraction' &&
    isSha256(input.preparation.extractionSpecificationSha256)
  ) {
    preparation = {
      mode: 'vector-extraction',
      extractionSpecificationSha256:
        input.preparation.extractionSpecificationSha256,
    };
  } else if (
    hasExactKeys(input.preparation, [
      'mode',
      'evidenceSha256',
      'procedureSha256',
      'operatorRecordSha256',
      'controlPointSha256',
    ]) &&
    input.preparation.mode === 'manual-trace' &&
    isSha256(input.preparation.evidenceSha256) &&
    isSha256(input.preparation.procedureSha256) &&
    isSha256(input.preparation.operatorRecordSha256) &&
    isSha256(input.preparation.controlPointSha256)
  ) {
    preparation = {
      mode: 'manual-trace',
      evidenceSha256: input.preparation.evidenceSha256,
      procedureSha256: input.preparation.procedureSha256,
      operatorRecordSha256: input.preparation.operatorRecordSha256,
      controlPointSha256: input.preparation.controlPointSha256,
    };
  } else {
    return fail('invalid-source-approval-preparation');
  }

  return {
    ok: true,
    value: {
      snapshotId,
      reviewer,
      regionalDecisions,
      sourceManifestSha256: input.sourceManifestSha256,
      evidenceArchiveSha256: input.evidenceArchiveSha256,
      memberInventorySha256: input.memberInventorySha256,
      memberInventory,
      inputGeometrySha256: input.inputGeometrySha256,
      preparation,
    },
  };
}

export async function validateSourceApproval(
  input: unknown,
  context: SourceApprovalValidationContext,
): Promise<HistoricalValidationResult<SnapshotSourceApproval>> {
  const manifestResult = validateSourceReadinessManifest(context.sourceManifest);
  if (!manifestResult.ok) {
    return manifestResult;
  }
  const approvalResult = readSourceApproval(input);
  if (!approvalResult.ok) {
    return approvalResult;
  }

  const manifest = manifestResult.value;
  const approval = approvalResult.value;
  if (approval.snapshotId !== manifest.snapshotId) {
    return fail('source-approval-snapshot-mismatch');
  }

  const sourceManifestSha256 = await calculateSha256(context.sourceManifestBytes);
  if (approval.sourceManifestSha256 !== sourceManifestSha256) {
    return fail('source-manifest-drift');
  }

  const evidenceArchiveSha256 = await calculateSha256(context.evidenceArchiveBytes);
  if (
    evidenceArchiveSha256 !== manifest.evidenceArchive.sha256 ||
    evidenceArchiveSha256 !== approval.evidenceArchiveSha256
  ) {
    return fail('evidence-archive-drift');
  }

  const inventoryResult = await createCanonicalMemberInventory(context.archiveMembers);
  if (!inventoryResult.ok) {
    return inventoryResult;
  }
  if (
    inventoryResult.value.sha256 !== manifest.evidenceArchive.memberInventorySha256 ||
    inventoryResult.value.sha256 !== approval.memberInventorySha256 ||
    !memberInventoriesMatch(inventoryResult.value.members, manifest.evidenceArchive.members) ||
    !memberInventoriesMatch(inventoryResult.value.members, approval.memberInventory)
  ) {
    return fail('evidence-member-drift');
  }

  const inputGeometrySha256 = await calculateSha256(context.inputGeometryBytes);
  if (
    inputGeometrySha256 !== manifest.inputGeometry.sha256 ||
    inputGeometrySha256 !== approval.inputGeometrySha256
  ) {
    return fail('input-geometry-drift');
  }

  if (
    manifest.preparation.mode !== context.preparation.mode ||
    approval.preparation.mode !== context.preparation.mode
  ) {
    return fail('preparation-mode-mismatch');
  }

  if (
    context.preparation.mode === 'vector-extraction' &&
    manifest.preparation.mode === 'vector-extraction' &&
    approval.preparation.mode === 'vector-extraction'
  ) {
    const hash = await calculateSha256(
      context.preparation.extractionSpecificationBytes,
    );
    if (
      hash !== manifest.preparation.extractionSpecification.sha256 ||
      hash !== approval.preparation.extractionSpecificationSha256
    ) {
      return fail('vector-extraction-drift');
    }
  } else if (
    context.preparation.mode === 'manual-trace' &&
    manifest.preparation.mode === 'manual-trace' &&
    approval.preparation.mode === 'manual-trace'
  ) {
    const [evidenceSha256, procedureSha256, operatorRecordSha256, controlPointSha256] =
      await Promise.all([
        calculateSha256(context.preparation.evidenceBytes),
        calculateSha256(context.preparation.procedureBytes),
        calculateSha256(context.preparation.operatorRecordBytes),
        calculateSha256(context.preparation.controlPointBytes),
      ]);
    if (
      evidenceSha256 !== manifest.preparation.evidence.sha256 ||
      evidenceSha256 !== approval.preparation.evidenceSha256 ||
      procedureSha256 !== manifest.preparation.procedure.sha256 ||
      procedureSha256 !== approval.preparation.procedureSha256 ||
      operatorRecordSha256 !== manifest.preparation.operatorRecord.sha256 ||
      operatorRecordSha256 !== approval.preparation.operatorRecordSha256 ||
      controlPointSha256 !== manifest.preparation.controlPoints.sha256 ||
      controlPointSha256 !== approval.preparation.controlPointSha256
    ) {
      return fail('manual-trace-drift');
    }
  } else {
    return fail('preparation-mode-mismatch');
  }

  return approvalResult;
}

function readFactualApproval(input: unknown): HistoricalValidationResult<SnapshotFactualApproval> {
  if (
    !hasExactKeys(input, [
      'snapshotId',
      'reviewer',
      'regionalDecisions',
      'sourceApprovalSha256',
      'sourceManifestSha256',
      'inputGeometrySha256',
      'outputOverlaySha256',
      'reviewJsonSha256',
      'reviewHtmlSha256',
    ])
  ) {
    return fail('invalid-factual-approval');
  }

  const snapshotId = readHistoricalSnapshotId(input.snapshotId);
  const reviewer = readReviewer(input.reviewer);
  const regionalDecisions = readFactualRegionalDecisions(input.regionalDecisions);
  if (
    snapshotId === null ||
    reviewer === null ||
    regionalDecisions === null ||
    !isSha256(input.sourceApprovalSha256) ||
    !isSha256(input.sourceManifestSha256) ||
    !isSha256(input.inputGeometrySha256) ||
    !isSha256(input.outputOverlaySha256) ||
    !isSha256(input.reviewJsonSha256) ||
    !isSha256(input.reviewHtmlSha256)
  ) {
    return fail('invalid-factual-approval');
  }

  return {
    ok: true,
    value: {
      snapshotId,
      reviewer,
      regionalDecisions,
      sourceApprovalSha256: input.sourceApprovalSha256,
      sourceManifestSha256: input.sourceManifestSha256,
      inputGeometrySha256: input.inputGeometrySha256,
      outputOverlaySha256: input.outputOverlaySha256,
      reviewJsonSha256: input.reviewJsonSha256,
      reviewHtmlSha256: input.reviewHtmlSha256,
    },
  };
}

export async function validateFactualApproval(
  input: unknown,
  context: FactualApprovalValidationContext,
): Promise<HistoricalValidationResult<SnapshotFactualApproval>> {
  const approvalResult = readFactualApproval(input);
  if (!approvalResult.ok) {
    return approvalResult;
  }
  const approval = approvalResult.value;
  const hash = context.calculateHash ?? calculateSha256;

  if (
    (await hash(context.sourceApprovalBytes)) !== approval.sourceApprovalSha256
  ) {
    return fail('source-approval-drift');
  }

  const currentHashes = await Promise.all([
    hash(context.sourceManifestBytes),
    hash(context.inputGeometryBytes),
    hash(context.outputOverlayBytes),
    hash(context.reviewJsonBytes),
    hash(context.reviewHtmlBytes),
  ]);
  const expectedHashes = [
    approval.sourceManifestSha256,
    approval.inputGeometrySha256,
    approval.outputOverlaySha256,
    approval.reviewJsonSha256,
    approval.reviewHtmlSha256,
  ];
  if (currentHashes.some((current, index) => current !== expectedHashes[index])) {
    return fail('factual-approval-byte-drift');
  }

  return approvalResult;
}

function readSceneFeature(candidate: unknown): SceneFeature | null {
  if (!isRecord(candidate)) {
    return null;
  }
  const normalized = normalizeGeoJson({
    type: 'FeatureCollection',
    features: [candidate],
  });
  if (!normalized.ok || normalized.features.length !== 1) {
    return null;
  }

  const feature = normalized.features[0];
  if (
    !isBoundedString(candidate.sourceFeatureId) ||
    !isBoundedString(candidate.entityId) ||
    !isBoundedString(candidate.provenanceId) ||
    !isSafeStableCountryId(candidate.entityId)
  ) {
    return null;
  }

  const base = {
    ...feature,
    sourceFeatureId: candidate.sourceFeatureId,
    entityId: candidate.entityId,
    boundaryMode: 'historical' as const,
    provenanceId: candidate.provenanceId,
  };
  if (
    candidate.isSelectable === true &&
    candidate.interactionMode === 'historical-entity' &&
    candidate.colorOwnerId === candidate.entityId
  ) {
    return {
      ...base,
      isSelectable: true,
      interactionMode: 'historical-entity',
      colorOwnerId: candidate.entityId,
    };
  }
  if (
    candidate.isSelectable === false &&
    candidate.interactionMode === 'inherited-dependency' &&
    isBoundedString(candidate.colorOwnerId) &&
    isSafeStableCountryId(candidate.colorOwnerId)
  ) {
    return {
      ...base,
      isSelectable: false,
      interactionMode: 'inherited-dependency',
      colorOwnerId: candidate.colorOwnerId,
    };
  }
  if (
    candidate.isSelectable === false &&
    (candidate.interactionMode === 'neutral' ||
      candidate.interactionMode === 'disputed') &&
    candidate.colorOwnerId === null
  ) {
    return {
      ...base,
      isSelectable: false,
      interactionMode: candidate.interactionMode,
      colorOwnerId: null,
    };
  }
  return null;
}

export function validateHistoricalAsset(
  input: unknown,
): HistoricalValidationResult<HistoricalAsset> {
  if (
    !isRecord(input) ||
    input.type !== 'FeatureCollection' ||
    !Array.isArray(input.features) ||
    input.features.length === 0 ||
    input.features.length > MAX_ASSET_FEATURES ||
    !Array.isArray(input.replacedModernSourceFeatureIds)
  ) {
    return fail('invalid-historical-asset');
  }

  const replacedModernSourceFeatureIds = new Set<string>();
  for (const sourceFeatureId of input.replacedModernSourceFeatureIds) {
    if (!isBoundedString(sourceFeatureId)) {
      return fail('invalid-replaced-modern-id');
    }
    replacedModernSourceFeatureIds.add(sourceFeatureId);
  }

  const features: SceneFeature[] = [];
  const warnings: string[] = [];
  const featureIds = new Set<string>();
  const sourceFeatureIds = new Set<string>();
  const selectableEntityIds = new Set<string>();
  input.features.forEach((candidate, featureIndex): void => {
    const feature = readSceneFeature(candidate);
    if (
      feature === null ||
      featureIds.has(feature.id) ||
      sourceFeatureIds.has(feature.sourceFeatureId) ||
      (feature.isSelectable && selectableEntityIds.has(feature.entityId))
    ) {
      const warning = `Historical feature ${featureIndex} is malformed and was skipped.`;
      warnings.push(warning);
      globalThis.console.warn(warning);
      return;
    }
    featureIds.add(feature.id);
    sourceFeatureIds.add(feature.sourceFeatureId);
    if (feature.isSelectable) {
      selectableEntityIds.add(feature.entityId);
    }
    features.push(feature);
  });

  if (features.length === 0) {
    return fail('no-valid-historical-features');
  }

  return {
    ok: true,
    value: { features, replacedModernSourceFeatureIds, warnings },
  };
}

function readSourceRecord(input: unknown): SnapshotSourceRecord | null {
  if (!isRecord(input)) {
    return null;
  }
  if (
    !isBoundedString(input.url) ||
    !isBoundedString(input.license) ||
    !isIsoDate(input.accessedOn) ||
    !(input.attribution === null || isBoundedString(input.attribution))
  ) {
    return null;
  }

  try {
    const url = new URL(input.url);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return null;
    }
  } catch {
    return null;
  }

  return {
    url: input.url,
    license: input.license,
    accessedOn: input.accessedOn,
    attribution: input.attribution,
  };
}

function readSnapshotEntry(input: unknown): SnapshotManifestEntry | null {
  if (!isRecord(input) || typeof input.id !== 'string' || !SNAPSHOT_IDS.has(input.id)) {
    return null;
  }
  if (
    !isBoundedString(input.label) ||
    !isBoundedString(input.asOf) ||
    (input.id !== 'modern' &&
      input.asOf !== HISTORICAL_SNAPSHOT_DATES[input.id as HistoricalSnapshotId]) ||
    !isBoundedString(input.assetPath) ||
    !input.assetPath.startsWith('/data/') ||
    !isSha256(input.sha256) ||
    !Array.isArray(input.coverageRegions) ||
    !Array.isArray(input.sourceRecords) ||
    input.sourceRecords.length > MAX_SOURCE_RECORDS ||
    !isBoundedString(input.fallbackLabel) ||
    !['draft', 'source-reviewed', 'historian-reviewed'].includes(
      typeof input.reviewStatus === 'string' ? input.reviewStatus : '',
    )
  ) {
    return null;
  }

  const coverageRegions: HistoricalRegionId[] = [];
  const seenRegions = new Set<HistoricalRegionId>();
  for (const value of input.coverageRegions) {
    const regionId = readRegionId(value);
    if (regionId === null || seenRegions.has(regionId)) {
      return null;
    }
    seenRegions.add(regionId);
    coverageRegions.push(regionId);
  }

  const sourceRecords: SnapshotSourceRecord[] = [];
  for (const sourceRecordInput of input.sourceRecords) {
    const sourceRecord = readSourceRecord(sourceRecordInput);
    if (sourceRecord === null) {
      return null;
    }
    sourceRecords.push(sourceRecord);
  }

  return {
    id: input.id as SnapshotManifestEntry['id'],
    label: input.label,
    asOf: input.asOf,
    assetPath: input.assetPath,
    sha256: input.sha256,
    coverageRegions,
    sourceRecords,
    reviewStatus: input.reviewStatus as SnapshotManifestEntry['reviewStatus'],
    fallbackLabel: input.fallbackLabel,
  };
}

export function validateSnapshotManifest(
  input: unknown,
): HistoricalValidationResult<SnapshotManifestCatalog> {
  if (
    !isRecord(input) ||
    input.version !== 1 ||
    !Array.isArray(input.snapshots) ||
    input.snapshots.length === 0 ||
    input.snapshots.length > SNAPSHOT_CATALOG.length
  ) {
    return fail('invalid-snapshot-manifest');
  }

  const snapshots: SnapshotManifestEntry[] = [];
  const seenIds = new Set<string>();
  for (const candidate of input.snapshots) {
    const entry = readSnapshotEntry(candidate);
    if (entry === null || seenIds.has(entry.id)) {
      return fail('invalid-snapshot-entry');
    }
    seenIds.add(entry.id);
    snapshots.push(entry);
  }
  if (!seenIds.has('modern')) {
    return fail('missing-modern-snapshot');
  }

  return { ok: true, value: { version: 1, snapshots } };
}

export function isProductionSelectableSnapshot(input: unknown): boolean {
  const entry = readSnapshotEntry(input);
  if (entry === null) {
    return false;
  }
  if (entry.id === 'modern') {
    return true;
  }

  return (
    entry.reviewStatus === 'historian-reviewed' &&
    entry.sourceRecords.length > 0 &&
    entry.coverageRegions.length === MAX_REGIONAL_RECORDS &&
    HISTORICAL_REGION_IDS.every((regionId) =>
      entry.coverageRegions.includes(regionId),
    ) &&
    entry.assetPath.startsWith('/data/snapshots/')
  );
}
