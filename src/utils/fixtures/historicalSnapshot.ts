import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { HISTORICAL_REGION_IDS } from '../../constants/snapshots';

const FIXED_DOS_TIME = 0;
const FIXED_DOS_DATE = 33;
const UTF8_FLAG = 0x0800;
const STORE_METHOD = 0;
const LOCAL_FILE_SIGNATURE = 0x04034b50;
const CENTRAL_FILE_SIGNATURE = 0x02014b50;
const END_SIGNATURE = 0x06054b50;
const ZIP_VERSION = 20;
const CRC_POLYNOMIAL = 0xedb88320;
const SNAPSHOT_ID = '1700';
const SNAPSHOT_AS_OF = '1700-01-01';

export type HistoricalFixtureMode = 'vector-extraction' | 'manual-trace';

export interface HistoricalCliFixture {
  readonly rootDir: string;
  readonly snapshotId: typeof SNAPSHOT_ID;
  readonly asOf: typeof SNAPSHOT_AS_OF;
  readonly mode: HistoricalFixtureMode;
  readonly sourcesPath: string;
  readonly inputPath: string;
  readonly archivePath: string;
  readonly sourceApprovalPath: string;
  readonly outputPath: string;
  readonly reviewOutputPath: string;
  readonly reviewHtmlPath: string;
  readonly factualApprovalPath: string;
}

interface ZipMember {
  readonly path: string;
  readonly bytes: Buffer;
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (CRC_POLYNOMIAL & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createLocalHeader(member: ZipMember): Buffer {
  const name = Buffer.from(member.path, 'utf8');
  const header = Buffer.alloc(30);
  header.writeUInt32LE(LOCAL_FILE_SIGNATURE, 0);
  header.writeUInt16LE(ZIP_VERSION, 4);
  header.writeUInt16LE(UTF8_FLAG, 6);
  header.writeUInt16LE(STORE_METHOD, 8);
  header.writeUInt16LE(FIXED_DOS_TIME, 10);
  header.writeUInt16LE(FIXED_DOS_DATE, 12);
  header.writeUInt32LE(crc32(member.bytes), 14);
  header.writeUInt32LE(member.bytes.length, 18);
  header.writeUInt32LE(member.bytes.length, 22);
  header.writeUInt16LE(name.length, 26);
  header.writeUInt16LE(0, 28);
  return Buffer.concat([header, name, member.bytes]);
}

function createCentralHeader(member: ZipMember, localOffset: number): Buffer {
  const name = Buffer.from(member.path, 'utf8');
  const header = Buffer.alloc(46);
  header.writeUInt32LE(CENTRAL_FILE_SIGNATURE, 0);
  header.writeUInt16LE(ZIP_VERSION, 4);
  header.writeUInt16LE(ZIP_VERSION, 6);
  header.writeUInt16LE(UTF8_FLAG, 8);
  header.writeUInt16LE(STORE_METHOD, 10);
  header.writeUInt16LE(FIXED_DOS_TIME, 12);
  header.writeUInt16LE(FIXED_DOS_DATE, 14);
  header.writeUInt32LE(crc32(member.bytes), 16);
  header.writeUInt32LE(member.bytes.length, 20);
  header.writeUInt32LE(member.bytes.length, 24);
  header.writeUInt16LE(name.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(localOffset, 42);
  return Buffer.concat([header, name]);
}

export function createCanonicalZip(membersInput: ReadonlyArray<ZipMember>): Buffer {
  const members = [...membersInput].sort((left, right) =>
    left.path.localeCompare(right.path),
  );
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let localOffset = 0;

  for (const member of members) {
    const localPart = createLocalHeader(member);
    localParts.push(localPart);
    centralParts.push(createCentralHeader(member, localOffset));
    localOffset += localPart.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(END_SIGNATURE, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(members.length, 8);
  end.writeUInt16LE(members.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(localOffset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

function createHistoricalInput(): Buffer {
  const value = {
    type: 'FeatureCollection',
    snapshotId: SNAPSHOT_ID,
    asOf: SNAPSHOT_AS_OF,
    replacedModernSourceFeatureIds: ['modern-POL'],
    features: [
      {
        type: 'Feature',
        id: 'historical-polish-commonwealth',
        properties: { name: 'Polish–Lithuanian Commonwealth' },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [18, 49],
              [25, 49],
              [25, 55],
              [18, 55],
              [18, 49],
            ],
          ],
        },
        sourceFeatureId: 'historical-polish-commonwealth',
        entityId: 'HIST-PLC',
        colorOwnerId: 'HIST-PLC',
        isSelectable: true,
        interactionMode: 'historical-entity',
        provenanceId: '1700-polish-commonwealth',
      },
    ],
  };
  return Buffer.from(`${JSON.stringify(value)}\n`, 'utf8');
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export async function createHistoricalCliFixture(
  rootDir: string,
  mode: HistoricalFixtureMode,
): Promise<HistoricalCliFixture> {
  const sourceDir = join(rootDir, 'sources', 'historical');
  const reviewedDir = join(rootDir, 'data', 'historical-reviewed');
  await mkdir(sourceDir, { recursive: true });
  await mkdir(reviewedDir, { recursive: true });

  const inputBytes = createHistoricalInput();
  const regionMembers = HISTORICAL_REGION_IDS.map((regionId) => ({
    path: `evidence/${regionId}.txt`,
    bytes: Buffer.from(`${regionId} licensed source evidence\n`, 'utf8'),
  }));
  const zipMembers = [
    ...regionMembers,
    { path: 'geometry/1700.input.geojson', bytes: inputBytes },
  ].sort((left, right) => left.path.localeCompare(right.path));
  const archiveBytes = createCanonicalZip(zipMembers);
  const memberInventory = zipMembers.map((member) => ({
    path: member.path,
    sha256: sha256(member.bytes),
  }));
  const memberInventorySha256 = sha256(
    Buffer.from(`${JSON.stringify(memberInventory)}\n`, 'utf8'),
  );

  const sourcesPath = join(sourceDir, '1700.sources.json');
  const inputPath = join(sourceDir, '1700.input.geojson');
  const archivePath = join(sourceDir, '1700.evidence.zip');
  const sourceApprovalPath = join(sourceDir, '1700.source-approval.json');
  const outputPath = join(reviewedDir, '1700.geojson');
  const reviewOutputPath = join(reviewedDir, '1700.review.json');
  const reviewHtmlPath = join(reviewedDir, '1700.review.html');
  const factualApprovalPath = join(reviewedDir, '1700.approval.json');
  await writeFile(inputPath, inputBytes);
  await writeFile(archivePath, archiveBytes);

  const preparation =
    mode === 'vector-extraction'
      ? await createVectorPreparation(sourceDir)
      : await createManualPreparation(sourceDir);
  const manifest = {
    snapshotId: SNAPSHOT_ID,
    asOf: SNAPSHOT_AS_OF,
    evidenceArchive: {
      path: 'sources/historical/1700.evidence.zip',
      sha256: sha256(archiveBytes),
      memberInventorySha256,
      members: memberInventory,
    },
    inputGeometry: {
      path: 'sources/historical/1700.input.geojson',
      sha256: sha256(inputBytes),
    },
    preparation,
    regions: HISTORICAL_REGION_IDS.map((regionId) => {
      const evidence = regionMembers.find((member) => member.path === `evidence/${regionId}.txt`);
      if (evidence === undefined) {
        throw new Error(`Missing fixture evidence for ${regionId}.`);
      }
      return {
        regionId,
        evidencePath: evidence.path,
        evidenceSha256: sha256(evidence.bytes),
        rightsDisposition: 'approved',
        license: 'CC0-1.0',
        attribution: null,
        retrievedOn: '2026-07-24',
        uncertainties: [],
      };
    }),
  };
  await writeJson(sourcesPath, manifest);
  const manifestBytes = await readFile(sourcesPath);

  const sourceApproval = {
    snapshotId: SNAPSHOT_ID,
    reviewer: {
      name: 'Alex Rights Reviewer',
      role: 'Independent source and license reviewer',
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
    sourceManifestSha256: sha256(manifestBytes),
    evidenceArchiveSha256: sha256(archiveBytes),
    memberInventorySha256,
    memberInventory,
    inputGeometrySha256: sha256(inputBytes),
    preparation:
      mode === 'vector-extraction'
        ? {
            mode,
            extractionSpecificationSha256: preparation.extractionSpecification.sha256,
          }
        : {
            mode,
            evidenceSha256: preparation.evidence.sha256,
            procedureSha256: preparation.procedure.sha256,
            operatorRecordSha256: preparation.operatorRecord.sha256,
            controlPointSha256: preparation.controlPoints.sha256,
          },
  };
  await writeJson(sourceApprovalPath, sourceApproval);

  return {
    rootDir,
    snapshotId: SNAPSHOT_ID,
    asOf: SNAPSHOT_AS_OF,
    mode,
    sourcesPath,
    inputPath,
    archivePath,
    sourceApprovalPath,
    outputPath,
    reviewOutputPath,
    reviewHtmlPath,
    factualApprovalPath,
  };
}

async function createVectorPreparation(sourceDir: string): Promise<{
  readonly mode: 'vector-extraction';
  readonly extractionSpecification: { readonly path: string; readonly sha256: string };
}> {
  const path = join(sourceDir, '1700.extraction.json');
  const bytes = Buffer.from(
    `${JSON.stringify({ version: 1, operation: 'copy-archive-member', memberPath: 'geometry/1700.input.geojson' })}\n`,
    'utf8',
  );
  await writeFile(path, bytes);
  return {
    mode: 'vector-extraction',
    extractionSpecification: {
      path: 'sources/historical/1700.extraction.json',
      sha256: sha256(bytes),
    },
  };
}

async function createManualPreparation(sourceDir: string): Promise<{
  readonly mode: 'manual-trace';
  readonly evidence: { readonly path: string; readonly sha256: string };
  readonly procedure: { readonly path: string; readonly sha256: string };
  readonly operatorRecord: { readonly path: string; readonly sha256: string };
  readonly controlPoints: { readonly path: string; readonly sha256: string };
}> {
  const records = {
    evidence: ['1700.trace-evidence.txt', 'licensed atlas trace evidence\n'],
    procedure: ['1700.trace-procedure.txt', 'manual trace procedure version 1\n'],
    operatorRecord: ['1700.trace-operator.json', '{"operator":"Independent Tracer"}\n'],
    controlPoints: ['1700.control-points.json', '{"points":[[18,49],[25,55]]}\n'],
  } as const;
  const result: Record<string, { path: string; sha256: string }> = {};
  for (const [key, [fileName, content]] of Object.entries(records)) {
    const bytes = Buffer.from(content, 'utf8');
    await writeFile(join(sourceDir, fileName), bytes);
    result[key] = {
      path: `sources/historical/${fileName}`,
      sha256: sha256(bytes),
    };
  }
  return {
    mode: 'manual-trace',
    evidence: result.evidence,
    procedure: result.procedure,
    operatorRecord: result.operatorRecord,
    controlPoints: result.controlPoints,
  };
}

export async function writeFixtureFactualApproval(
  fixture: HistoricalCliFixture,
): Promise<void> {
  const [sourceApprovalBytes, manifestBytes, inputBytes, outputBytes, reviewJsonBytes, reviewHtmlBytes] =
    await Promise.all([
      readFile(fixture.sourceApprovalPath),
      readFile(fixture.sourcesPath),
      readFile(fixture.inputPath),
      readFile(fixture.outputPath),
      readFile(fixture.reviewOutputPath),
      readFile(fixture.reviewHtmlPath),
    ]);
  await writeJson(fixture.factualApprovalPath, {
    snapshotId: fixture.snapshotId,
    reviewer: {
      name: 'Dr. Morgan Historian',
      role: 'Qualified historical geography reviewer',
      reviewedOn: '2026-07-24',
      isExecutor: false,
      isImplementer: false,
    },
    regionalDecisions: Object.fromEntries(
      HISTORICAL_REGION_IDS.map((regionId) => [
        regionId,
        { regionId, disposition: 'approved', uncertainties: [] },
      ]),
    ),
    sourceApprovalSha256: sha256(sourceApprovalBytes),
    sourceManifestSha256: sha256(manifestBytes),
    inputGeometrySha256: sha256(inputBytes),
    outputOverlaySha256: sha256(outputBytes),
    reviewJsonSha256: sha256(reviewJsonBytes),
    reviewHtmlSha256: sha256(reviewHtmlBytes),
  });
}
