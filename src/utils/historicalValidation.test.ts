import { describe, expect, it, vi } from 'vitest';

import { HISTORICAL_REGION_IDS } from '../constants/snapshots';
import type { HistoricalRegionId } from '../types/composition';
import {
  calculateSha256,
  createCanonicalMemberInventory,
  HISTORICAL_SNAPSHOT_DATES,
  isProductionSelectableSnapshot,
  validateFactualApproval,
  validateHistoricalAsset,
  validateSourceApproval,
  validateSourceReadinessManifest,
  type EvidenceArchiveMemberInput,
  type HistoricalSourcePreparation,
  type HistoricalSourceReadinessManifest,
  type SourceApprovalValidationContext,
} from './historicalValidation';

const encoder = new TextEncoder();
const HASH_PATTERN = /^[0-9a-f]{64}$/;
const TEST_RING = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
  [0, 0],
];

interface ValidationFixture {
  readonly manifest: HistoricalSourceReadinessManifest;
  readonly manifestBytes: Uint8Array;
  readonly archiveBytes: Uint8Array;
  readonly members: ReadonlyArray<EvidenceArchiveMemberInput>;
  readonly inputBytes: Uint8Array;
  readonly sourceApproval: Record<string, unknown>;
  readonly sourceApprovalBytes: Uint8Array;
  readonly sourceContext: SourceApprovalValidationContext;
  readonly outputBytes: Uint8Array;
  readonly reviewJsonBytes: Uint8Array;
  readonly reviewHtmlBytes: Uint8Array;
  readonly factualApproval: Record<string, unknown>;
}

function cloneRecord(value: Record<string, unknown>): Record<string, unknown> {
  return structuredClone(value);
}

function getRegionalRecords(
  value: Record<string, unknown>,
): Record<string, Record<string, unknown>> {
  return value.regionalDecisions as Record<string, Record<string, unknown>>;
}

async function createFixture(
  mode: 'vector-extraction' | 'manual-trace' = 'vector-extraction',
): Promise<ValidationFixture> {
  const archiveBytes = encoder.encode('canonical evidence archive');
  const inputBytes = encoder.encode('canonical input geometry');
  const extractionBytes = encoder.encode('mapshaper input.geojson -clean -o output.geojson');
  const evidenceBytes = encoder.encode('licensed atlas evidence');
  const procedureBytes = encoder.encode('manual tracing procedure v1');
  const operatorBytes = encoder.encode('operator record');
  const controlPointBytes = encoder.encode('control points');
  const members = [
    { path: 'evidence/atlas.txt', bytes: evidenceBytes },
    { path: 'evidence/notes.txt', bytes: encoder.encode('cross-check notes') },
  ] as const;
  const inventoryResult = await createCanonicalMemberInventory(members);
  if (!inventoryResult.ok) {
    throw new Error(inventoryResult.errors.join(', '));
  }

  const preparation: HistoricalSourcePreparation =
    mode === 'vector-extraction'
      ? {
          mode,
          extractionSpecification: {
            path: 'sources/historical/1700.extraction.txt',
            sha256: await calculateSha256(extractionBytes),
          },
        }
      : {
          mode,
          evidence: {
            path: 'sources/historical/1700.trace-evidence.bin',
            sha256: await calculateSha256(evidenceBytes),
          },
          procedure: {
            path: 'sources/historical/1700.trace-procedure.txt',
            sha256: await calculateSha256(procedureBytes),
          },
          operatorRecord: {
            path: 'sources/historical/1700.trace-operator.json',
            sha256: await calculateSha256(operatorBytes),
          },
          controlPoints: {
            path: 'sources/historical/1700.control-points.json',
            sha256: await calculateSha256(controlPointBytes),
          },
        };

  const manifest: HistoricalSourceReadinessManifest = {
    snapshotId: '1700',
    asOf: '1700-01-01',
    readinessStatus: 'ready',
    deliveryCounted: true,
    evidenceArchive: {
      path: 'sources/historical/1700.evidence.zip',
      sha256: await calculateSha256(archiveBytes),
      memberInventorySha256: inventoryResult.value.sha256,
      members: inventoryResult.value.members,
    },
    inputGeometry: {
      path: 'sources/historical/1700.input.geojson',
      sha256: await calculateSha256(inputBytes),
    },
    preparation,
    regions: HISTORICAL_REGION_IDS.map((regionId): HistoricalSourceReadinessManifest['regions'][number] => ({
      regionId,
      disposition: 'approved',
      evidencePath: `evidence/${regionId}.txt`,
      evidenceSha256: inventoryResult.value.members[0].sha256,
      rightsDisposition: 'approved',
      license: 'CC0-1.0',
      attribution: null,
      retrievedOn: '2026-07-24',
      uncertainties: [],
    })),
  };
  const manifestBytes = encoder.encode(JSON.stringify(manifest));

  const sourceApproval: Record<string, unknown> = {
    snapshotId: '1700',
    reviewer: {
      name: 'Alex Historian',
      role: 'Rights and provenance reviewer',
      reviewedOn: '2026-07-24',
      isExecutor: false,
      isImplementer: false,
    },
    regionalDecisions: Object.fromEntries(
      HISTORICAL_REGION_IDS.map((regionId) => [
        regionId,
        {
          regionId,
          disposition: 'approved',
          rightsDisposition: 'approved for redistribution',
          attribution: null,
          uncertainties: [],
        },
      ]),
    ),
    sourceManifestSha256: await calculateSha256(manifestBytes),
    evidenceArchiveSha256: manifest.evidenceArchive.sha256,
    memberInventorySha256: manifest.evidenceArchive.memberInventorySha256,
    memberInventory: manifest.evidenceArchive.members,
    inputGeometrySha256: manifest.inputGeometry.sha256,
    preparation:
      preparation.mode === 'vector-extraction'
        ? {
            mode: preparation.mode,
            extractionSpecificationSha256: preparation.extractionSpecification.sha256,
          }
        : {
            mode: preparation.mode,
            evidenceSha256: preparation.evidence.sha256,
            procedureSha256: preparation.procedure.sha256,
            operatorRecordSha256: preparation.operatorRecord.sha256,
            controlPointSha256: preparation.controlPoints.sha256,
          },
  };
  const sourceApprovalBytes = encoder.encode(JSON.stringify(sourceApproval));
  const outputBytes = encoder.encode('reviewed overlay bytes');
  const reviewJsonBytes = encoder.encode('review JSON bytes');
  const reviewHtmlBytes = encoder.encode('<html>review atlas</html>');
  const factualApproval: Record<string, unknown> = {
    snapshotId: '1700',
    reviewer: {
      name: 'Dr. Morgan Reviewer',
      role: 'Qualified historical geography reviewer',
      reviewedOn: '2026-07-24',
      isExecutor: false,
      isImplementer: false,
    },
    regionalDecisions: Object.fromEntries(
      HISTORICAL_REGION_IDS.map((regionId) => [
        regionId,
        {
          regionId,
          disposition: 'approved',
          uncertainties: [],
        },
      ]),
    ),
    sourceApprovalSha256: await calculateSha256(sourceApprovalBytes),
    sourceManifestSha256: await calculateSha256(manifestBytes),
    inputGeometrySha256: await calculateSha256(inputBytes),
    outputOverlaySha256: await calculateSha256(outputBytes),
    reviewJsonSha256: await calculateSha256(reviewJsonBytes),
    reviewHtmlSha256: await calculateSha256(reviewHtmlBytes),
  };

  return {
    manifest,
    manifestBytes,
    archiveBytes,
    members,
    inputBytes,
    sourceApproval,
    sourceApprovalBytes,
    sourceContext: {
      sourceManifest: manifest,
      sourceManifestBytes: manifestBytes,
      evidenceArchiveBytes: archiveBytes,
      archiveMembers: members,
      inputGeometryBytes: inputBytes,
      preparation:
        mode === 'vector-extraction'
          ? { mode, extractionSpecificationBytes: extractionBytes }
          : {
              mode,
              evidenceBytes,
              procedureBytes,
              operatorRecordBytes: operatorBytes,
              controlPointBytes,
            },
    },
    outputBytes,
    reviewJsonBytes,
    reviewHtmlBytes,
    factualApproval,
  };
}

describe('historical source readiness', (): void => {
  it('uses the adjudicated exact dates for every curated snapshot', (): void => {
    expect(HISTORICAL_SNAPSHOT_DATES).toEqual({
      '1492': '1492-01-03',
      '1700': '1700-01-01',
      '1815': '1815-12-31',
      '1914': '1914-07-27',
    });
  });

  it('accepts exactly six separate rights-approved regional records', async (): Promise<void> => {
    const fixture = await createFixture();

    const result = validateSourceReadinessManifest(fixture.manifest);

    expect(result).toEqual({ ok: true, value: fixture.manifest });
    expect(fixture.manifest.regions.map(({ regionId }) => regionId)).toEqual(
      HISTORICAL_REGION_IDS,
    );
  });

  it('fails closed on omitted, unknown, or regionally unapproved readiness', async (): Promise<void> => {
    const fixture = await createFixture();
    const missing = structuredClone(fixture.manifest) as unknown as Record<string, unknown>;
    delete missing.readinessStatus;
    const unknown = structuredClone(fixture.manifest) as unknown as Record<string, unknown>;
    unknown.readinessStatus = 'conditionally-ready';
    const conditionalRegion = structuredClone(fixture.manifest) as unknown as Record<
      string,
      unknown
    >;
    const regions = conditionalRegion.regions as Array<Record<string, unknown>>;
    regions[0].disposition = 'conditional';

    expect(validateSourceReadinessManifest(missing).ok).toBe(false);
    expect(validateSourceReadinessManifest(unknown).ok).toBe(false);
    expect(validateSourceReadinessManifest(conditionalRegion).ok).toBe(false);
  });

  it('rejects contradictory extra fields at every readiness boundary', async (): Promise<void> => {
    const fixture = await createFixture();
    const manifestExtra = structuredClone(fixture.manifest) as unknown as Record<
      string,
      unknown
    >;
    manifestExtra.blockers = [];
    const archiveExtra = structuredClone(fixture.manifest) as unknown as Record<
      string,
      unknown
    >;
    (archiveExtra.evidenceArchive as Record<string, unknown>).candidateGenerated = false;
    const preparationExtra = structuredClone(fixture.manifest) as unknown as Record<
      string,
      unknown
    >;
    (preparationExtra.preparation as Record<string, unknown>).approvalStatus = 'pending';
    const regionExtra = structuredClone(fixture.manifest) as unknown as Record<
      string,
      unknown
    >;
    (regionExtra.regions as Array<Record<string, unknown>>)[0].mergedWith = 'lithuania';

    expect(validateSourceReadinessManifest(manifestExtra).ok).toBe(false);
    expect(validateSourceReadinessManifest(archiveExtra).ok).toBe(false);
    expect(validateSourceReadinessManifest(preparationExtra).ok).toBe(false);
    expect(validateSourceReadinessManifest(regionExtra).ok).toBe(false);
  });

  it('rejects missing rights, a missing region, and merged Poland/Lithuania coverage', async (): Promise<void> => {
    const fixture = await createFixture();
    const missingRights = structuredClone(fixture.manifest) as unknown as Record<
      string,
      unknown
    >;
    const missingRightsRegions = missingRights.regions as Array<Record<string, unknown>>;
    missingRightsRegions[0].rightsDisposition = 'blocked';
    const missingRegion = structuredClone(fixture.manifest) as unknown as Record<
      string,
      unknown
    >;
    missingRegion.regions = (
      missingRegion.regions as Array<Record<string, unknown>>
    ).filter(({ regionId }) => regionId !== 'scandinavia');
    const mergedRegion = structuredClone(fixture.manifest) as unknown as Record<string, unknown>;
    const regions = mergedRegion.regions as Array<Record<string, unknown>>;
    regions[0].regionId = 'poland-lithuania';

    expect(validateSourceReadinessManifest(missingRights).ok).toBe(false);
    expect(validateSourceReadinessManifest(missingRegion).ok).toBe(false);
    expect(validateSourceReadinessManifest(mergedRegion).ok).toBe(false);
  });

  it('rejects noncanonical, duplicate, traversal, and changed archive members', async (): Promise<void> => {
    const fixture = await createFixture();
    const unsorted = [...fixture.members].reverse();
    const duplicate = [...fixture.members, fixture.members[0]];
    const traversal = [{ path: '../secret.txt', bytes: encoder.encode('secret') }];
    const changed = fixture.members.map((member, index) =>
      index === 0 ? { ...member, bytes: encoder.encode('changed') } : member,
    );

    expect((await createCanonicalMemberInventory(unsorted)).ok).toBe(false);
    expect((await createCanonicalMemberInventory(duplicate)).ok).toBe(false);
    expect((await createCanonicalMemberInventory(traversal)).ok).toBe(false);

    const changedResult = await createCanonicalMemberInventory(changed);
    expect(changedResult.ok).toBe(true);
    if (changedResult.ok) {
      expect(changedResult.value.sha256).not.toBe(
        fixture.manifest.evidenceArchive.memberInventorySha256,
      );
    }
  });
});

describe('durable source approval', (): void => {
  it.each(['Executor One', 'Claude Reviewer', 'Codex Agent'])(
    'rejects self-approval identity %s',
    async (name): Promise<void> => {
      const fixture = await createFixture();
      const approval = cloneRecord(fixture.sourceApproval);
      approval.reviewer = {
        ...(approval.reviewer as Record<string, unknown>),
        name,
      };

      expect((await validateSourceApproval(approval, fixture.sourceContext)).ok).toBe(false);
    },
  );

  it('rejects explicit executor or implementer status and missing regional decisions', async (): Promise<void> => {
    const fixture = await createFixture();
    const executorApproval = cloneRecord(fixture.sourceApproval);
    executorApproval.reviewer = {
      ...(executorApproval.reviewer as Record<string, unknown>),
      isExecutor: true,
    };
    const missingRegion = cloneRecord(fixture.sourceApproval);
    delete getRegionalRecords(missingRegion).lithuania;

    expect((await validateSourceApproval(executorApproval, fixture.sourceContext)).ok).toBe(false);
    expect((await validateSourceApproval(missingRegion, fixture.sourceContext)).ok).toBe(false);
  });

  it('invalidates changed manifest, archive, member, and input bytes', async (): Promise<void> => {
    const fixture = await createFixture();
    const cases: ReadonlyArray<SourceApprovalValidationContext> = [
      { ...fixture.sourceContext, sourceManifestBytes: encoder.encode('changed manifest') },
      { ...fixture.sourceContext, evidenceArchiveBytes: encoder.encode('changed archive') },
      {
        ...fixture.sourceContext,
        archiveMembers: fixture.members.map((member, index) =>
          index === 0 ? { ...member, bytes: encoder.encode('changed member') } : member,
        ),
      },
      { ...fixture.sourceContext, inputGeometryBytes: encoder.encode('changed input') },
    ];

    for (const context of cases) {
      expect((await validateSourceApproval(fixture.sourceApproval, context)).ok).toBe(false);
    }
  });

  it('rejects vector/manual mode mismatch and missing manual trace evidence hashes', async (): Promise<void> => {
    const vectorFixture = await createFixture('vector-extraction');
    const manualFixture = await createFixture('manual-trace');
    const wrongMode = cloneRecord(vectorFixture.sourceApproval);
    wrongMode.preparation = cloneRecord(manualFixture.sourceApproval).preparation;
    const missingManualHash = cloneRecord(manualFixture.sourceApproval);
    const preparation = missingManualHash.preparation as Record<string, unknown>;
    delete preparation.controlPointSha256;

    expect((await validateSourceApproval(wrongMode, vectorFixture.sourceContext)).ok).toBe(false);
    expect(
      (await validateSourceApproval(missingManualHash, manualFixture.sourceContext)).ok,
    ).toBe(false);
    expect(
      (await validateSourceApproval(manualFixture.sourceApproval, manualFixture.sourceContext)).ok,
    ).toBe(true);
  });

  it('rejects contradictory extra source-approval fields', async (): Promise<void> => {
    const fixture = await createFixture('vector-extraction');
    const approval = cloneRecord(fixture.sourceApproval);
    approval.candidateGenerated = true;
    const reviewerExtra = cloneRecord(fixture.sourceApproval);
    reviewerExtra.reviewer = {
      ...(reviewerExtra.reviewer as Record<string, unknown>),
      approvalStatus: 'approved',
    };
    const decisionExtra = cloneRecord(fixture.sourceApproval);
    getRegionalRecords(decisionExtra).poland.mergedWith = 'lithuania';

    expect((await validateSourceApproval(approval, fixture.sourceContext)).ok).toBe(false);
    expect((await validateSourceApproval(reviewerExtra, fixture.sourceContext)).ok).toBe(false);
    expect((await validateSourceApproval(decisionExtra, fixture.sourceContext)).ok).toBe(false);
  });

  it('accepts a valid vector source bundle with canonical current bytes', async (): Promise<void> => {
    const fixture = await createFixture('vector-extraction');

    const result = await validateSourceApproval(
      fixture.sourceApproval,
      fixture.sourceContext,
    );

    expect(result.ok).toBe(true);
  });
});

describe('durable factual approval', (): void => {
  it('binds the exact source-approval JSON before candidate and review hashes', async (): Promise<void> => {
    const fixture = await createFixture();
    const hashSpy = vi.fn(calculateSha256);

    const result = await validateFactualApproval(fixture.factualApproval, {
      sourceApprovalBytes: encoder.encode('changed source approval'),
      sourceManifestBytes: fixture.manifestBytes,
      inputGeometryBytes: fixture.inputBytes,
      outputOverlayBytes: fixture.outputBytes,
      reviewJsonBytes: fixture.reviewJsonBytes,
      reviewHtmlBytes: fixture.reviewHtmlBytes,
      calculateHash: hashSpy,
    });

    expect(result.ok).toBe(false);
    expect(hashSpy).toHaveBeenCalledTimes(1);
  });

  it('rejects stale input, output, review JSON, and review HTML bytes', async (): Promise<void> => {
    const fixture = await createFixture();
    const baseContext = {
      sourceApprovalBytes: fixture.sourceApprovalBytes,
      sourceManifestBytes: fixture.manifestBytes,
      inputGeometryBytes: fixture.inputBytes,
      outputOverlayBytes: fixture.outputBytes,
      reviewJsonBytes: fixture.reviewJsonBytes,
      reviewHtmlBytes: fixture.reviewHtmlBytes,
    };
    const cases = [
      { ...baseContext, inputGeometryBytes: encoder.encode('stale input') },
      { ...baseContext, outputOverlayBytes: encoder.encode('stale output') },
      { ...baseContext, reviewJsonBytes: encoder.encode('stale review JSON') },
      { ...baseContext, reviewHtmlBytes: encoder.encode('stale review HTML') },
    ];

    for (const context of cases) {
      expect((await validateFactualApproval(fixture.factualApproval, context)).ok).toBe(false);
    }
  });

  it('rejects blocked regional decisions and qualified-reviewer self approval', async (): Promise<void> => {
    const fixture = await createFixture();
    const blocked = cloneRecord(fixture.factualApproval);
    getRegionalRecords(blocked).iberia.disposition = 'blocked';
    const selfApproved = cloneRecord(fixture.factualApproval);
    selfApproved.reviewer = {
      ...(selfApproved.reviewer as Record<string, unknown>),
      role: 'Implementer and historical reviewer',
    };
    const context = {
      sourceApprovalBytes: fixture.sourceApprovalBytes,
      sourceManifestBytes: fixture.manifestBytes,
      inputGeometryBytes: fixture.inputBytes,
      outputOverlayBytes: fixture.outputBytes,
      reviewJsonBytes: fixture.reviewJsonBytes,
      reviewHtmlBytes: fixture.reviewHtmlBytes,
    };

    expect((await validateFactualApproval(blocked, context)).ok).toBe(false);
    expect((await validateFactualApproval(selfApproved, context)).ok).toBe(false);
  });

  it('rejects contradictory extra factual-approval fields', async (): Promise<void> => {
    const fixture = await createFixture();
    const approval = cloneRecord(fixture.factualApproval);
    approval.sourceRightsDecision = 'approved';
    const reviewerExtra = cloneRecord(fixture.factualApproval);
    reviewerExtra.reviewer = {
      ...(reviewerExtra.reviewer as Record<string, unknown>),
      approvalStatus: 'approved',
    };
    const decisionExtra = cloneRecord(fixture.factualApproval);
    getRegionalRecords(decisionExtra).scandinavia.rightsDisposition = 'approved';
    const context = {
      sourceApprovalBytes: fixture.sourceApprovalBytes,
      sourceManifestBytes: fixture.manifestBytes,
      inputGeometryBytes: fixture.inputBytes,
      outputOverlayBytes: fixture.outputBytes,
      reviewJsonBytes: fixture.reviewJsonBytes,
      reviewHtmlBytes: fixture.reviewHtmlBytes,
    };

    expect((await validateFactualApproval(approval, context)).ok).toBe(false);
    expect((await validateFactualApproval(reviewerExtra, context)).ok).toBe(false);
    expect((await validateFactualApproval(decisionExtra, context)).ok).toBe(false);
  });

  it('accepts a fully current source and factual approval bundle', async (): Promise<void> => {
    const fixture = await createFixture();

    const result = await validateFactualApproval(fixture.factualApproval, {
      sourceApprovalBytes: fixture.sourceApprovalBytes,
      sourceManifestBytes: fixture.manifestBytes,
      inputGeometryBytes: fixture.inputBytes,
      outputOverlayBytes: fixture.outputBytes,
      reviewJsonBytes: fixture.reviewJsonBytes,
      reviewHtmlBytes: fixture.reviewHtmlBytes,
    });

    expect(result.ok).toBe(true);
  });
});

describe('historical assets and production selection', (): void => {
  it('skips malformed features with warnings instead of crashing', (): void => {
    const warn = vi.spyOn(globalThis.console, 'warn').mockImplementation(() => undefined);
    const result = validateHistoricalAsset({
      type: 'FeatureCollection',
      replacedModernSourceFeatureIds: ['modern-POL'],
      features: [
        {
          type: 'Feature',
          id: 'historical-polish-commonwealth',
          properties: { name: 'Polish–Lithuanian Commonwealth' },
          geometry: { type: 'Polygon', coordinates: [TEST_RING] },
          sourceFeatureId: 'historical-polish-commonwealth',
          entityId: 'HIST-PLC',
          colorOwnerId: 'HIST-PLC',
          isSelectable: true,
          interactionMode: 'historical-entity',
          provenanceId: '1700-polish-commonwealth',
        },
        {
          type: 'Feature',
          id: '',
          properties: { name: '' },
          geometry: null,
        },
      ],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.features).toHaveLength(1);
      expect(result.value.warnings).toHaveLength(1);
      expect(result.value.replacedModernSourceFeatureIds).toEqual(
        new Set(['modern-POL']),
      );
    }
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it.each([
    ['draft', false],
    ['source-reviewed', false],
    ['historian-reviewed', true],
  ] as const)(
    'requires fully approved status before historical selection: %s',
    (reviewStatus, expected): void => {
      const entry = {
        id: '1700',
        label: '1700 — Post-Westphalia Europe',
        asOf: '1700-01-01',
        assetPath: '/data/snapshots/1700.geojson',
        sha256: 'a'.repeat(64),
        coverageRegions: [...HISTORICAL_REGION_IDS],
        sourceRecords: [
          {
            url: 'https://example.test/source',
            license: 'CC0-1.0',
            accessedOn: '2026-07-24',
            attribution: null,
          },
        ],
        reviewStatus,
        fallbackLabel: 'Modern borders elsewhere',
      };

      expect(isProductionSelectableSnapshot(entry)).toBe(expected);
    },
  );

  it('rejects historian-reviewed entries missing one of the six regions', (): void => {
    const coverageRegions = HISTORICAL_REGION_IDS.filter(
      (regionId): regionId is HistoricalRegionId => regionId !== 'lithuania',
    );

    expect(
      isProductionSelectableSnapshot({
        id: '1700',
        label: '1700 — Post-Westphalia Europe',
        asOf: '1700-01-01',
        assetPath: '/data/snapshots/1700.geojson',
        sha256: 'a'.repeat(64),
        coverageRegions,
        sourceRecords: [],
        reviewStatus: 'historian-reviewed',
        fallbackLabel: 'Modern borders elsewhere',
      }),
    ).toBe(false);
  });

  it('produces SHA-256 values in canonical lowercase hexadecimal', async (): Promise<void> => {
    expect(await calculateSha256(encoder.encode('historical'))).toMatch(HASH_PATTERN);
  });
});
