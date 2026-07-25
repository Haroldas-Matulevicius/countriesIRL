import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import {
  link,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, relative, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

import {
  createCanonicalZip,
  createHistoricalCliFixture,
  writeFixtureFactualApproval,
  type HistoricalCliFixture,
  type HistoricalFixtureMode,
} from './fixtures/historicalSnapshot';

const CLI_PATH = fileURLToPath(
  new URL('../../scripts/prepareHistoricalSnapshot.mjs', import.meta.url),
);
const temporaryDirectories: string[] = [];

interface CliResult {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

interface CandidatePacketFixture {
  readonly rootDir: string;
  readonly snapshotId: '1492' | '1700';
  readonly sourcesPath: string;
  readonly archivePath: string;
  readonly inputPath: string;
  members: Array<{ path: string; bytes: Buffer }>;
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function createFixture(mode: HistoricalFixtureMode): Promise<HistoricalCliFixture> {
  const rootDir = await mkdtemp(resolve(tmpdir(), 'countriesirl-history-'));
  temporaryDirectories.push(rootDir);
  return createHistoricalCliFixture(rootDir, mode);
}

function fixturePath(fixture: HistoricalCliFixture, path: string): string {
  return relative(fixture.rootDir, path).replaceAll('\\', '/');
}

async function runCli(
  fixture: HistoricalCliFixture,
  argumentsInput: ReadonlyArray<string>,
): Promise<CliResult> {
  const { spawn } = await import('node:child_process');
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, [CLI_PATH, ...argumentsInput], {
      cwd: fixture.rootDir,
      env: { ...process.env, NO_PROXY: '*', HTTPS_PROXY: '', HTTP_PROXY: '' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const stdoutStream = child.stdout;
    const stderrStream = child.stderr;
    if (stdoutStream === null || stderrStream === null) {
      child.kill();
      rejectPromise(new Error('Historical CLI process did not expose piped output streams.'));
      return;
    }
    stdoutStream.setEncoding('utf8');
    stderrStream.setEncoding('utf8');
    stdoutStream.on('data', (chunk: string): void => {
      stdout += chunk;
    });
    stderrStream.on('data', (chunk: string): void => {
      stderr += chunk;
    });
    child.once('error', rejectPromise);
    child.once('close', (status): void => {
      resolvePromise({ status, stdout, stderr });
    });
  });
}

async function runRepositoryCli(argumentsInput: ReadonlyArray<string>): Promise<CliResult> {
  const { spawn } = await import('node:child_process');
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, [CLI_PATH, ...argumentsInput], {
      cwd: resolve(dirname(CLI_PATH), '..'),
      env: { ...process.env, NO_PROXY: '*', HTTPS_PROXY: '', HTTP_PROXY: '' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const stdoutStream = child.stdout;
    const stderrStream = child.stderr;
    if (stdoutStream === null || stderrStream === null) {
      child.kill();
      rejectPromise(new Error('Historical CLI process did not expose piped output streams.'));
      return;
    }
    stdoutStream.setEncoding('utf8');
    stderrStream.setEncoding('utf8');
    stdoutStream.on('data', (chunk: string): void => {
      stdout += chunk;
    });
    stderrStream.on('data', (chunk: string): void => {
      stderr += chunk;
    });
    child.once('error', rejectPromise);
    child.once('close', (status): void => {
      resolvePromise({ status, stdout, stderr });
    });
  });
}

async function runCliInDirectory(
  cwd: string,
  argumentsInput: ReadonlyArray<string>,
): Promise<CliResult> {
  const { spawn } = await import('node:child_process');
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, [CLI_PATH, ...argumentsInput], {
      cwd,
      env: { ...process.env, NO_PROXY: '*', HTTPS_PROXY: '', HTTP_PROXY: '' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const stdoutStream = child.stdout;
    const stderrStream = child.stderr;
    if (stdoutStream === null || stderrStream === null) {
      child.kill();
      rejectPromise(new Error('Historical CLI process did not expose piped output streams.'));
      return;
    }
    stdoutStream.setEncoding('utf8');
    stderrStream.setEncoding('utf8');
    stdoutStream.on('data', (chunk: string): void => {
      stdout += chunk;
    });
    stderrStream.on('data', (chunk: string): void => {
      stderr += chunk;
    });
    child.once('error', rejectPromise);
    child.once('close', (status): void => {
      resolvePromise({ status, stdout, stderr });
    });
  });
}

function sourceArguments(fixture: HistoricalCliFixture): ReadonlyArray<string> {
  return [
    '--snapshot',
    fixture.snapshotId,
    '--sources',
    fixturePath(fixture, fixture.sourcesPath),
  ];
}

function candidateSourceArguments(
  fixture: CandidatePacketFixture,
): ReadonlyArray<string> {
  return [
    '--snapshot',
    fixture.snapshotId,
    '--sources',
    relative(fixture.rootDir, fixture.sourcesPath).replaceAll('\\', '/'),
    '--validate-sources',
  ];
}

function replaceArgumentValue(
  argumentsInput: ReadonlyArray<string>,
  flag: string,
  value: string,
): ReadonlyArray<string> {
  const result = [...argumentsInput];
  const index = result.indexOf(flag);
  if (index < 0 || index + 1 >= result.length) {
    throw new Error(`Missing CLI fixture flag ${flag}.`);
  }
  result[index + 1] = value;
  return result;
}

function generationArguments(fixture: HistoricalCliFixture): ReadonlyArray<string> {
  return [
    ...sourceArguments(fixture),
    '--input',
    fixturePath(fixture, fixture.inputPath),
    '--source-approval',
    fixturePath(fixture, fixture.sourceApprovalPath),
    '--output',
    fixturePath(fixture, fixture.outputPath),
    '--review-output',
    fixturePath(fixture, fixture.reviewOutputPath),
    '--review-html',
    fixturePath(fixture, fixture.reviewHtmlPath),
  ];
}

async function readJsonRecord(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>;
}

async function writeJsonRecord(path: string, value: Record<string, unknown>): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function jsonBuffer(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function readUint16Le(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readStoredZipMembers(archiveBytes: Buffer): Array<{ path: string; bytes: Buffer }> {
  const members: Array<{ path: string; bytes: Buffer }> = [];
  let cursor = 0;
  while (archiveBytes.readUInt32LE(cursor) === 0x04034b50) {
    const method = readUint16Le(archiveBytes, cursor + 8);
    const compressedSize = archiveBytes.readUInt32LE(cursor + 18);
    const nameLength = readUint16Le(archiveBytes, cursor + 26);
    const extraLength = readUint16Le(archiveBytes, cursor + 28);
    const nameStart = cursor + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const dataEnd = dataStart + compressedSize;
    if (method !== 0 || dataEnd > archiveBytes.length) {
      throw new Error('Candidate packet fixture requires a valid stored canonical ZIP.');
    }
    members.push({
      path: archiveBytes.subarray(nameStart, nameStart + nameLength).toString('utf8'),
      bytes: Buffer.from(archiveBytes.subarray(dataStart, dataEnd)),
    });
    cursor = dataEnd;
  }
  if (archiveBytes.readUInt32LE(cursor) !== 0x02014b50) {
    throw new Error('Candidate packet fixture ZIP central directory is missing.');
  }
  return members;
}

async function refreshCandidatePacket(
  fixture: CandidatePacketFixture,
  manifest: Record<string, unknown>,
): Promise<void> {
  const sortedMembers = [...fixture.members].sort((left, right) =>
    left.path < right.path ? -1 : left.path > right.path ? 1 : 0,
  );
  const archiveBytes = createCanonicalZip(sortedMembers);
  const inventory = sortedMembers.map(({ path, bytes }) => ({ path, sha256: sha256(bytes) }));
  const evidenceArchive = manifest.evidenceArchive as Record<string, unknown>;
  evidenceArchive.path = `sources/historical/${fixture.snapshotId}.evidence.zip`;
  evidenceArchive.sha256 = sha256(archiveBytes);
  evidenceArchive.memberInventorySha256 = sha256(
    Buffer.from(`${JSON.stringify(inventory)}\n`, 'utf8'),
  );
  evidenceArchive.members = inventory;
  const reviewerPacket = manifest.reviewerPacket as Record<string, unknown>;
  reviewerPacket.artifacts = inventory.filter(
    ({ path }) =>
      path.startsWith('reviews/') ||
      path.startsWith('source-locks/') ||
      path.startsWith('specifications/'),
  );
  const regions = manifest.regions as Array<Record<string, unknown>>;
  for (const region of regions) {
    const path = `reviews/${fixture.snapshotId}-${String(region.regionId)}.json`;
    const member = inventory.find((candidate) => candidate.path === path);
    if (member === undefined) throw new Error(`Missing reviewer member ${path}.`);
    region.evidencePath = path;
    region.evidenceSha256 = member.sha256;
  }
  if (fixture.snapshotId === '1492') {
    const preparation = manifest.preparation as Record<string, unknown>;
    const manualTrace = preparation.manualTrace as Record<string, unknown>;
    const evidence = inventory.find(
      ({ path }) => path === 'sources/semkowicz-romer-1929-current-hosted-scan.jpg',
    );
    const procedure = inventory.find(
      ({ path }) => path === 'specifications/1492-manual-trace-candidate.json',
    );
    if (evidence === undefined || procedure === undefined) {
      throw new Error('Missing manual-trace fixture members.');
    }
    manualTrace.evidencePath = evidence.path;
    manualTrace.evidenceSha256 = evidence.sha256;
    manualTrace.procedurePath = procedure.path;
    manualTrace.procedureSha256 = procedure.sha256;
  }
  await Promise.all([
    writeFile(fixture.archivePath, archiveBytes),
    writeJsonRecord(fixture.sourcesPath, manifest),
  ]);
}

async function createCandidatePacketFixture(
  snapshotId: '1492' | '1700',
): Promise<CandidatePacketFixture> {
  const rootDir = await mkdtemp(resolve(tmpdir(), `countriesirl-${snapshotId}-candidate-`));
  temporaryDirectories.push(rootDir);
  const sourceDir = resolve(rootDir, 'sources/historical');
  await mkdir(sourceDir, { recursive: true });
  const repositoryRoot = resolve(dirname(CLI_PATH), '..');
  const manifest = await readJsonRecord(
    resolve(repositoryRoot, `sources/historical/${snapshotId}.sources.json`),
  );
  const [inputBytes, archiveBytes] = await Promise.all([
    readFile(resolve(repositoryRoot, `sources/historical/${snapshotId}.input.geojson`)),
    readFile(resolve(repositoryRoot, `sources/historical/${snapshotId}.evidence.zip`)),
  ]);
  const fixture: CandidatePacketFixture = {
    rootDir,
    snapshotId,
    sourcesPath: resolve(sourceDir, `${snapshotId}.sources.json`),
    archivePath: resolve(sourceDir, `${snapshotId}.evidence.zip`),
    inputPath: resolve(sourceDir, `${snapshotId}.input.geojson`),
    members: [],
  };
  fixture.members = readStoredZipMembers(archiveBytes);
  const inputGeometry = manifest.inputGeometry as Record<string, unknown>;
  inputGeometry.path = `sources/historical/${snapshotId}.input.geojson`;
  inputGeometry.sha256 = sha256(inputBytes);
  await writeFile(fixture.inputPath, inputBytes);
  await refreshCandidatePacket(fixture, manifest);
  return fixture;
}

async function mutateReviewerMember(
  fixture: CandidatePacketFixture,
  regionId: string,
  mutate: (review: Record<string, unknown>) => void,
): Promise<void> {
  const path = `reviews/${fixture.snapshotId}-${regionId}.json`;
  const member = fixture.members.find((candidate) => candidate.path === path);
  if (member === undefined) throw new Error(`Missing reviewer member ${path}.`);
  const review = JSON.parse(member.bytes.toString('utf8')) as Record<string, unknown>;
  mutate(review);
  member.bytes = jsonBuffer(review);
  const manifest = await readJsonRecord(fixture.sourcesPath);
  await refreshCandidatePacket(fixture, manifest);
}

afterEach(async (): Promise<void> => {
  await Promise.all(
    temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  );
});

describe('prepareHistoricalSnapshot CLI', (): void => {
  it('documents all offline evidence and approval modes', async (): Promise<void> => {
    const fixture = await createFixture('vector-extraction');

    const result = await runCli(fixture, ['--help']);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('--validate-sources');
    expect(result.stdout).toContain('--validate-source-approval');
    expect(result.stdout).toContain('--source-approval');
    expect(result.stdout).toContain('--approval');
    expect(result.stdout).toContain('--check');
  });

  it.each(['vector-extraction', 'manual-trace'] as const)(
    'validates a complete offline %s source bundle',
    async (mode): Promise<void> => {
      const fixture = await createFixture(mode);

      const result = await runCli(fixture, [
        ...sourceArguments(fixture),
        '--validate-sources',
      ]);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain(`${mode} source readiness passed`);
      expect(result.stderr).toBe('');
    },
  );

  it('validates blocked packet hashes without treating the snapshot as delivered', async (): Promise<void> => {
    const fixture = await createCandidatePacketFixture('1700');

    const blocked = await runCliInDirectory(
      fixture.rootDir,
      candidateSourceArguments(fixture),
    );

    expect(blocked.status).not.toBe(0);
    expect(blocked.stdout).toContain('BLOCKED packet integrity verified offline');
    expect(blocked.stderr).toContain('source readiness remains blocked');
    expect(blocked.stderr).toContain('RIGHTS_REVIEW_REQUIRED');

    await writeFile(fixture.inputPath, 'changed blocked input\n', 'utf8');
    const drifted = await runCliInDirectory(
      fixture.rootDir,
      candidateSourceArguments(fixture),
    );
    expect(drifted.status).not.toBe(0);
    expect(drifted.stderr).toContain('Input geometry SHA-256 drifted');
  });

  it('fails closed on missing, unknown, or regionally unapproved ready status', async (): Promise<void> => {
    const fixture = await createFixture('vector-extraction');
    const missingStatus = await readJsonRecord(fixture.sourcesPath);
    delete missingStatus.readinessStatus;
    await writeJsonRecord(fixture.sourcesPath, missingStatus);
    const missing = await runCli(fixture, [
      ...sourceArguments(fixture),
      '--validate-sources',
    ]);
    expect(missing.status).not.toBe(0);
    expect(missing.stdout).not.toContain('source readiness passed offline');
    expect(missing.stderr).toContain('readinessStatus');

    const restoredUnknown = await createHistoricalCliFixture(
      fixture.rootDir,
      'vector-extraction',
    );
    const unknownStatus = await readJsonRecord(restoredUnknown.sourcesPath);
    unknownStatus.readinessStatus = 'conditionally-ready';
    await writeJsonRecord(restoredUnknown.sourcesPath, unknownStatus);
    const unknown = await runCli(restoredUnknown, [
      ...sourceArguments(restoredUnknown),
      '--validate-sources',
    ]);
    expect(unknown.status).not.toBe(0);
    expect(unknown.stdout).not.toContain('source readiness passed offline');
    expect(unknown.stderr).toContain('readinessStatus');

    const restoredRegion = await createHistoricalCliFixture(
      fixture.rootDir,
      'vector-extraction',
    );
    const regionStatus = await readJsonRecord(restoredRegion.sourcesPath);
    const regions = regionStatus.regions as Array<Record<string, unknown>>;
    regions[0].disposition = 'conditional';
    await writeJsonRecord(restoredRegion.sourcesPath, regionStatus);
    const unapprovedRegion = await runCli(restoredRegion, [
      ...sourceArguments(restoredRegion),
      '--validate-sources',
    ]);
    expect(unapprovedRegion.status).not.toBe(0);
    expect(unapprovedRegion.stdout).not.toContain('source readiness passed offline');
    expect(unapprovedRegion.stderr).toContain('readiness state');
  });

  it('validates the real 1492 candidate packet without treating evidence as approval', async (): Promise<void> => {
    const result = await runRepositoryCli([
      '--snapshot',
      '1492',
      '--sources',
      'sources/historical/1492.sources.json',
      '--validate-sources',
    ]);
    const manifest = await readJsonRecord(
      resolve(dirname(CLI_PATH), '../sources/historical/1492.sources.json'),
    );
    const regions = manifest.regions as Array<Record<string, unknown>>;
    const byRegion = new Map(regions.map((region) => [region.regionId, region]));

    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain('1492 BLOCKED packet integrity verified offline');
    expect(result.stderr).toContain('AUTHORITATIVE_SEMKOWICZ_ROMER_SCAN_AND_CATALOG_MISSING');
    expect(result.stderr).toContain('CNIG_15094_PRODUCT_ARCHIVE_AND_MEMBER_HASHES_MISSING');
    expect(manifest.snapshotPass).toBe(false);
    expect(manifest.productionReady).toBe(false);
    expect(manifest.catalogEligible).toBe(false);
    expect(manifest.approvals).toEqual({
      sourceRights: null,
      factual: null,
      topology: null,
      reviewerSignature: null,
      productionReadiness: null,
    });
    expect(manifest.dateContract).toEqual({
      displayDate: '1492-01-03',
      displayCalendar: 'julian',
      normalizedAsOf: '1492-01-12',
      normalizedCalendar: 'proleptic-gregorian',
      dayBoundary: 'start-of-day',
      validityInterval: 'half-open',
    });
    expect(byRegion.get('poland')?.entityIds).toEqual(['hist:kingdom-of-poland']);
    expect(byRegion.get('lithuania')?.entityIds).toEqual([
      'hist:grand-duchy-of-lithuania',
    ]);
    expect(byRegion.get('iberia')?.entityIds).toEqual([
      'hist:crown-of-castile',
      'hist:crown-of-aragon',
      'hist:kingdom-of-portugal',
      'hist:kingdom-of-navarre',
    ]);
    expect(byRegion.get('scandinavia')?.entityIds).toEqual([
      'hist:kingdom-of-denmark',
      'hist:kingdom-of-norway',
      'hist:kingdom-of-sweden',
    ]);
    expect(regions.map(({ disposition }) => disposition)).toEqual([
      'blocked',
      'blocked',
      'blocked',
      'blocked',
      'blocked',
      'blocked',
    ]);
  });

  it('validates the real 1700 six-record candidate and Harvard comparison packet', async (): Promise<void> => {
    const result = await runRepositoryCli([
      '--snapshot',
      '1700',
      '--sources',
      'sources/historical/1700.sources.json',
      '--validate-sources',
    ]);
    const manifest = await readJsonRecord(
      resolve(dirname(CLI_PATH), '../sources/historical/1700.sources.json'),
    );
    const regions = manifest.regions as Array<Record<string, unknown>>;
    const byRegion = new Map(regions.map((region) => [region.regionId, region]));
    const evidenceArchive = manifest.evidenceArchive as Record<string, unknown>;
    const members = evidenceArchive.members as Array<Record<string, unknown>>;
    const memberPaths = members.map(({ path }) => path);

    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain('1700 BLOCKED packet integrity verified offline');
    expect(result.stderr).toContain('KARLOWITZ_FRONTIER_DEMARCATION_INCOMPLETE');
    expect(manifest.snapshotPass).toBe(false);
    expect(manifest.productionReady).toBe(false);
    expect(manifest.catalogEligible).toBe(false);
    expect(byRegion.get('hungary')?.disposition).toBe('blocked');
    expect(byRegion.get('balkans')?.disposition).toBe('blocked');
    expect(byRegion.get('balkans')?.sourceFeatureIds).toEqual([
      'cliopatria:v0.2.0:feature-index:7055',
      'cliopatria:v0.2.0:feature-index:9361',
      'cliopatria:v0.2.0:feature-index:9355',
      'cliopatria:v0.2.0:feature-index:9390',
      'cliopatria:v0.2.0:feature-index:9396',
      'cliopatria:v0.2.0:feature-index:9391',
    ]);
    expect(memberPaths).toContain('metadata/harvard-dataverse-gaviqv.json');
    expect(memberPaths).toContain('metadata/harvard-data-gdb-inventory.tsv');
    expect(memberPaths).toContain(
      'specifications/1700-six-record-cliopatria-mosaic.json',
    );
    expect(manifest.dateContract).toEqual({
      displayDate: '1700-01-01',
      displayCalendar: 'product-label-only',
      normalizedAsOf: null,
      normalizedCalendar: null,
      dayBoundary: null,
      validityInterval: 'pending-review',
    });
    expect(regions.map(({ disposition }) => disposition)).toEqual([
      'blocked',
      'blocked',
      'blocked',
      'blocked',
      'blocked',
      'blocked',
    ]);
  });

  it('rejects the verified 1700 Poland manifest identity and approval tamper before success output', async (): Promise<void> => {
    const fixture = await createCandidatePacketFixture('1700');
    const manifest = await readJsonRecord(fixture.sourcesPath);
    const regions = manifest.regions as Array<Record<string, unknown>>;
    const poland = regions.find(({ regionId }) => regionId === 'poland');
    if (poland === undefined) throw new Error('Missing Poland fixture region.');
    poland.entityIds = ['hist:false-poland'];
    poland.colorOwnerIds = ['hist:false-poland'];
    const approvals = poland.approvals as Record<string, unknown>;
    approvals.rights = 'approved';
    await writeJsonRecord(fixture.sourcesPath, manifest);

    const result = await runCliInDirectory(
      fixture.rootDir,
      candidateSourceArguments(fixture),
    );

    expect(result.status).not.toBe(0);
    expect(result.stdout).not.toContain('hashes passed offline');
    expect(result.stderr).toMatch(/rights record|contract/i);
  });

  it('rejects the verified 1492 Iberia color-owner tamper before success output', async (): Promise<void> => {
    const fixture = await createCandidatePacketFixture('1492');
    const manifest = await readJsonRecord(fixture.sourcesPath);
    const regions = manifest.regions as Array<Record<string, unknown>>;
    const iberia = regions.find(({ regionId }) => regionId === 'iberia');
    if (iberia === undefined) throw new Error('Missing Iberia fixture region.');
    iberia.colorOwnerIds = ['hist:kingdom-of-spain'];
    await writeJsonRecord(fixture.sourcesPath, manifest);

    const result = await runCliInDirectory(
      fixture.rootDir,
      candidateSourceArguments(fixture),
    );

    expect(result.status).not.toBe(0);
    expect(result.stdout).not.toContain('hashes passed offline');
    expect(result.stderr).toContain('1492 Iberia');
  });

  it.each([
    [
      'sourceFeatureIds',
      (review: Record<string, unknown>): void => {
        review.sourceFeatureIds = ['cliopatria:v0.2.0:feature-index:9999'];
      },
    ],
    [
      'blockers',
      (review: Record<string, unknown>): void => {
        review.blockers = ['REORDERED_OR_REPLACED_BLOCKER'];
      },
    ],
    [
      'disposition',
      (review: Record<string, unknown>): void => {
        review.disposition = 'conditional';
      },
    ],
    [
      'approval state',
      (review: Record<string, unknown>): void => {
        const approvals = review.approvals as Record<string, unknown>;
        approvals.sourceRights = 'approved';
      },
    ],
  ] as const)(
    'rejects hash-updated reviewer-member %s semantic tamper before success output',
    async (_label, mutate): Promise<void> => {
      const fixture = await createCandidatePacketFixture('1700');
      await mutateReviewerMember(fixture, 'balkans', mutate);

      const result = await runCliInDirectory(
        fixture.rootDir,
        candidateSourceArguments(fixture),
      );

      expect(result.status).not.toBe(0);
      expect(result.stdout).not.toContain('hashes passed offline');
      expect(result.stderr).toContain('Reviewer record semantics drifted');
    },
  );

  it('rejects manual-trace manifest readiness claims before success output', async (): Promise<void> => {
    const fixture = await createCandidatePacketFixture('1492');
    const manifest = await readJsonRecord(fixture.sourcesPath);
    const preparation = manifest.preparation as Record<string, unknown>;
    const manualTrace = preparation.manualTrace as Record<string, unknown>;
    manualTrace.operatorRecordSha256 = 'a'.repeat(64);
    await writeJsonRecord(fixture.sourcesPath, manifest);

    const result = await runCliInDirectory(
      fixture.rootDir,
      candidateSourceArguments(fixture),
    );

    expect(result.status).not.toBe(0);
    expect(result.stdout).not.toContain('hashes passed offline');
    expect(result.stderr).toContain('manual-trace candidate semantics');
  });

  it('rejects hash-updated manual-trace procedure approval tamper before success output', async (): Promise<void> => {
    const fixture = await createCandidatePacketFixture('1492');
    const procedure = fixture.members.find(
      ({ path }) => path === 'specifications/1492-manual-trace-candidate.json',
    );
    if (procedure === undefined) throw new Error('Missing manual-trace procedure fixture.');
    const value = JSON.parse(procedure.bytes.toString('utf8')) as Record<string, unknown>;
    value.approvalStatus = 'approved';
    procedure.bytes = jsonBuffer(value);
    const manifest = await readJsonRecord(fixture.sourcesPath);
    await refreshCandidatePacket(fixture, manifest);

    const result = await runCliInDirectory(
      fixture.rootDir,
      candidateSourceArguments(fixture),
    );

    expect(result.status).not.toBe(0);
    expect(result.stdout).not.toContain('hashes passed offline');
    expect(result.stderr).toContain('Manual-trace procedure semantics');
  });

  it('rejects missing rights and canonical archive-member drift', async (): Promise<void> => {
    const fixture = await createFixture('vector-extraction');
    const manifest = await readJsonRecord(fixture.sourcesPath);
    const regions = manifest.regions as Array<Record<string, unknown>>;
    regions[0].rightsDisposition = 'blocked';
    await writeJsonRecord(fixture.sourcesPath, manifest);

    const missingRights = await runCli(fixture, [
      ...sourceArguments(fixture),
      '--validate-sources',
    ]);
    expect(missingRights.status).not.toBe(0);
    expect(missingRights.stderr).toContain('rights');

    const restored = await createHistoricalCliFixture(fixture.rootDir, 'vector-extraction');
    const changedMemberBytes = Buffer.from('changed Poland evidence\n', 'utf8');
    const inputBytes = await readFile(restored.inputPath);
    const members = [
      ...['balkans', 'hungary', 'iberia', 'lithuania', 'poland', 'scandinavia'].map(
        (regionId) => ({
          path: `evidence/${regionId}.txt`,
          bytes:
            regionId === 'poland'
              ? changedMemberBytes
              : Buffer.from(`${regionId} licensed source evidence\n`, 'utf8'),
        }),
      ),
      { path: 'geometry/1700.input.geojson', bytes: inputBytes },
    ];
    const changedArchive = createCanonicalZip(members);
    await writeFile(restored.archivePath, changedArchive);
    const changedManifest = await readJsonRecord(restored.sourcesPath);
    const evidenceArchive = changedManifest.evidenceArchive as Record<string, unknown>;
    evidenceArchive.sha256 = sha256(changedArchive);
    await writeJsonRecord(restored.sourcesPath, changedManifest);

    const memberDrift = await runCli(restored, [
      ...sourceArguments(restored),
      '--validate-sources',
    ]);
    expect(memberDrift.status).not.toBe(0);
    expect(memberDrift.stderr).toContain('member');
  });

  it('validates durable source approval and rejects self approval or mode mismatch', async (): Promise<void> => {
    const fixture = await createFixture('vector-extraction');
    const valid = await runCli(fixture, [
      ...generationArguments(fixture).slice(0, 8),
      '--validate-source-approval',
    ]);
    expect(valid.status).toBe(0);

    const approval = await readJsonRecord(fixture.sourceApprovalPath);
    approval.reviewer = {
      ...(approval.reviewer as Record<string, unknown>),
      name: 'Claude Executor',
    };
    await writeJsonRecord(fixture.sourceApprovalPath, approval);
    const selfApproved = await runCli(fixture, [
      ...generationArguments(fixture).slice(0, 8),
      '--validate-source-approval',
    ]);
    expect(selfApproved.status).not.toBe(0);
    expect(selfApproved.stderr).toContain('reviewer');

    const restored = await createHistoricalCliFixture(fixture.rootDir, 'vector-extraction');
    const wrongModeApproval = await readJsonRecord(restored.sourceApprovalPath);
    wrongModeApproval.preparation = {
      mode: 'manual-trace',
      evidenceSha256: 'a'.repeat(64),
      procedureSha256: 'b'.repeat(64),
      operatorRecordSha256: 'c'.repeat(64),
      controlPointSha256: 'd'.repeat(64),
    };
    await writeJsonRecord(restored.sourceApprovalPath, wrongModeApproval);
    const wrongMode = await runCli(restored, [
      ...generationArguments(restored).slice(0, 8),
      '--validate-source-approval',
    ]);
    expect(wrongMode.status).not.toBe(0);
    expect(wrongMode.stderr).toContain('mode');
  });

  it('fails before output work when source approval is absent or stale', async (): Promise<void> => {
    const fixture = await createFixture('vector-extraction');
    const missingApprovalArguments = generationArguments(fixture).filter(
      (argument, index, values) =>
        argument !== '--source-approval' && values[index - 1] !== '--source-approval',
    );
    const missing = await runCli(fixture, missingApprovalArguments);

    expect(missing.status).not.toBe(0);
    expect(missing.stderr).toContain('--source-approval');
    expect(await fileExists(fixture.outputPath)).toBe(false);

    await writeFile(fixture.inputPath, 'changed input bytes\n', 'utf8');
    const stale = await runCli(fixture, generationArguments(fixture));
    expect(stale.status).not.toBe(0);
    expect(stale.stderr).toMatch(/input/i);
    expect(await fileExists(fixture.outputPath)).toBe(false);
  });

  it('rejects every generation alias before source, evidence, approval, or output mutation', async (): Promise<void> => {
    const fixture = await createFixture('vector-extraction');
    await mkdir(resolve(fixture.rootDir, 'evidence'), { recursive: true });
    const protectedPaths = [
      fixture.sourcesPath,
      fixture.archivePath,
      fixture.inputPath,
      fixture.sourceApprovalPath,
    ];
    const protectedHashes = await Promise.all(
      protectedPaths.map((path) => readFile(path).then(sha256)),
    );
    const cases: ReadonlyArray<{
      readonly flag: string;
      readonly value: string;
      readonly label: string;
    }> = [
      { flag: '--output', value: fixturePath(fixture, fixture.sourcesPath), label: 'source manifest' },
      { flag: '--output', value: fixturePath(fixture, fixture.archivePath), label: 'evidence ZIP' },
      { flag: '--output', value: fixturePath(fixture, fixture.inputPath), label: 'input' },
      { flag: '--output', value: fixturePath(fixture, fixture.sourceApprovalPath), label: 'approval' },
      { flag: '--output', value: fixturePath(fixture, fixture.reviewOutputPath), label: 'review' },
      { flag: '--review-output', value: fixturePath(fixture, fixture.reviewHtmlPath), label: 'output' },
      { flag: '--output', value: 'evidence/poland.txt', label: 'packet member' },
    ];

    for (const aliasCase of cases) {
      const result = await runCli(
        fixture,
        replaceArgumentValue(
          generationArguments(fixture),
          aliasCase.flag,
          aliasCase.value,
        ),
      );
      expect(result.status, aliasCase.label).not.toBe(0);
      expect(result.stdout, aliasCase.label).not.toContain('candidate generated');
      expect(result.stderr, aliasCase.label).toMatch(/alias/i);
      expect(
        await Promise.all(protectedPaths.map((path) => readFile(path).then(sha256))),
        aliasCase.label,
      ).toEqual(protectedHashes);
    }
    expect(await fileExists(fixture.outputPath)).toBe(false);
    expect(await fileExists(fixture.reviewOutputPath)).toBe(false);
    expect(await fileExists(fixture.reviewHtmlPath)).toBe(false);
  });

  it('rejects hard-link and junction aliases before generation', async (): Promise<void> => {
    const fixture = await createFixture('vector-extraction');
    const hardLinkPath = resolve(dirname(fixture.outputPath), 'source-hard-link.json');
    await link(fixture.sourcesPath, hardLinkPath);
    const hardLinkResult = await runCli(
      fixture,
      replaceArgumentValue(
        generationArguments(fixture),
        '--output',
        fixturePath(fixture, hardLinkPath),
      ),
    );
    expect(hardLinkResult.status).not.toBe(0);
    expect(hardLinkResult.stderr).toContain('identityKey');

    const junctionPath = resolve(fixture.rootDir, 'review-junction');
    await symlink(dirname(fixture.outputPath), junctionPath, 'junction');
    const junctionOutputPath = resolve(junctionPath, 'junction-output.geojson');
    const junctionResult = await runCli(
      fixture,
      replaceArgumentValue(
        generationArguments(fixture),
        '--output',
        fixturePath(fixture, junctionOutputPath),
      ),
    );
    expect(junctionResult.status).not.toBe(0);
    expect(junctionResult.stderr).toMatch(/symbolic-link|junction/i);
    expect(await fileExists(fixture.outputPath)).toBe(false);
  });

  it('leaves all existing outputs unchanged when generation preflight fails', async (): Promise<void> => {
    const fixture = await createFixture('vector-extraction');
    const sentinelBytes = [
      Buffer.from('existing candidate\n', 'utf8'),
      Buffer.from('existing review JSON\n', 'utf8'),
      Buffer.from('existing review HTML\n', 'utf8'),
    ];
    await Promise.all([
      writeFile(fixture.outputPath, sentinelBytes[0]),
      writeFile(fixture.reviewOutputPath, sentinelBytes[1]),
      writeFile(fixture.reviewHtmlPath, sentinelBytes[2]),
    ]);
    const invalidReviewPath = resolve(
      fixture.rootDir,
      'missing-parent',
      'review.html',
    );

    const result = await runCli(
      fixture,
      replaceArgumentValue(
        generationArguments(fixture),
        '--review-html',
        fixturePath(fixture, invalidReviewPath),
      ),
    );

    expect(result.status).not.toBe(0);
    expect(await Promise.all([
      readFile(fixture.outputPath),
      readFile(fixture.reviewOutputPath),
      readFile(fixture.reviewHtmlPath),
    ])).toEqual(sentinelBytes);
  });

  it('enforces exact candidate packet fields and blocked-input blocker binding', async (): Promise<void> => {
    const candidateGeneratedFixture = await createCandidatePacketFixture('1700');
    const candidateGeneratedManifest = await readJsonRecord(
      candidateGeneratedFixture.sourcesPath,
    );
    const inputGeometry = candidateGeneratedManifest.inputGeometry as Record<string, unknown>;
    inputGeometry.candidateGenerated = true;
    await writeJsonRecord(
      candidateGeneratedFixture.sourcesPath,
      candidateGeneratedManifest,
    );
    const candidateGenerated = await runCliInDirectory(
      candidateGeneratedFixture.rootDir,
      candidateSourceArguments(candidateGeneratedFixture),
    );
    expect(candidateGenerated.status).not.toBe(0);
    expect(candidateGenerated.stderr).toContain('candidateGenerated exactly false');

    const hashRuleFixture = await createCandidatePacketFixture('1700');
    const hashRuleManifest = await readJsonRecord(hashRuleFixture.sourcesPath);
    const reviewerPacket = hashRuleManifest.reviewerPacket as Record<string, unknown>;
    reviewerPacket.hashInvalidationRule = 'Approvals probably remain valid.';
    await writeJsonRecord(hashRuleFixture.sourcesPath, hashRuleManifest);
    const hashRule = await runCliInDirectory(
      hashRuleFixture.rootDir,
      candidateSourceArguments(hashRuleFixture),
    );
    expect(hashRule.status).not.toBe(0);
    expect(hashRule.stderr).toContain('hash-bound, blocked, and unapproved');

    const blockerFixture = await createCandidatePacketFixture('1700');
    const blockerManifest = await readJsonRecord(blockerFixture.sourcesPath);
    const blockedInput = await readJsonRecord(blockerFixture.inputPath);
    const inputBlockers = blockedInput.blockers as string[];
    blockedInput.blockers = [...inputBlockers].reverse();
    await writeJsonRecord(blockerFixture.inputPath, blockedInput);
    const blockerInputGeometry = blockerManifest.inputGeometry as Record<string, unknown>;
    blockerInputGeometry.sha256 = sha256(await readFile(blockerFixture.inputPath));
    await writeJsonRecord(blockerFixture.sourcesPath, blockerManifest);
    const blockerResult = await runCliInDirectory(
      blockerFixture.rootDir,
      candidateSourceArguments(blockerFixture),
    );
    expect(blockerResult.status).not.toBe(0);
    expect(blockerResult.stderr).toContain('blocker list');

    const extraFieldFixture = await createCandidatePacketFixture('1700');
    const extraFieldManifest = await readJsonRecord(extraFieldFixture.sourcesPath);
    extraFieldManifest.contradictoryApproval = true;
    await writeJsonRecord(extraFieldFixture.sourcesPath, extraFieldManifest);
    const extraField = await runCliInDirectory(
      extraFieldFixture.rootDir,
      candidateSourceArguments(extraFieldFixture),
    );
    expect(extraField.status).not.toBe(0);
    expect(extraField.stderr).toContain('hash-bound, blocked, and unapproved');
  });

  it('authenticates each selected Harvard payload against the fixed inventory digest', async (): Promise<void> => {
    const fixture = await createCandidatePacketFixture('1700');
    const selected = fixture.members.find(
      ({ path }) => path === 'comparison/harvard-data-gdb/a00000021.gdbtable',
    );
    if (selected === undefined) throw new Error('Missing selected Harvard payload fixture.');
    selected.bytes = Buffer.from('hash-updated but inventory-unauthenticated payload', 'utf8');
    const manifest = await readJsonRecord(fixture.sourcesPath);
    await refreshCandidatePacket(fixture, manifest);

    const result = await runCliInDirectory(
      fixture.rootDir,
      candidateSourceArguments(fixture),
    );

    expect(result.status).not.toBe(0);
    expect(result.stdout).not.toContain('integrity verified offline');
    expect(result.stderr).toContain('Harvard selected payload digest drifted');
  });

  it('rejects contradictory extra fields in source and factual approvals', async (): Promise<void> => {
    const fixture = await createFixture('manual-trace');
    const sourceApproval = await readJsonRecord(fixture.sourceApprovalPath);
    sourceApproval.candidateGenerated = true;
    await writeJsonRecord(fixture.sourceApprovalPath, sourceApproval);
    const sourceResult = await runCli(fixture, generationArguments(fixture));
    expect(sourceResult.status).not.toBe(0);
    expect(sourceResult.stderr).toContain('Source approval snapshot ID or schema is invalid');
    expect(await fileExists(fixture.outputPath)).toBe(false);

    const restored = await createHistoricalCliFixture(
      fixture.rootDir,
      'manual-trace',
    );
    expect((await runCli(restored, generationArguments(restored))).status).toBe(0);
    await writeFixtureFactualApproval(restored);
    const factualApproval = await readJsonRecord(restored.factualApprovalPath);
    factualApproval.sourceRightsDecision = 'approved';
    await writeJsonRecord(restored.factualApprovalPath, factualApproval);
    const factualResult = await runCli(restored, [
      ...generationArguments(restored),
      '--approval',
      fixturePath(restored, restored.factualApprovalPath),
      '--check',
    ]);
    expect(factualResult.status).not.toBe(0);
    expect(factualResult.stderr).toContain('Factual approval snapshot ID or schema is invalid');
  });

  it.each(['vector-extraction', 'manual-trace'] as const)(
    'generates deterministic candidate and review bytes for %s',
    async (mode): Promise<void> => {
      const fixture = await createFixture(mode);

      const generated = await runCli(fixture, generationArguments(fixture));
      expect(generated.status).toBe(0);
      expect(generated.stdout).toContain(`${fixture.snapshotId} candidate generated`);
      expect(await fileExists(fixture.outputPath)).toBe(true);
      expect(await fileExists(fixture.reviewOutputPath)).toBe(true);
      expect(await fileExists(fixture.reviewHtmlPath)).toBe(true);

      const firstHashes = await Promise.all([
        readFile(fixture.outputPath).then(sha256),
        readFile(fixture.reviewOutputPath).then(sha256),
        readFile(fixture.reviewHtmlPath).then(sha256),
      ]);
      const regenerated = await runCli(fixture, generationArguments(fixture));
      const secondHashes = await Promise.all([
        readFile(fixture.outputPath).then(sha256),
        readFile(fixture.reviewOutputPath).then(sha256),
        readFile(fixture.reviewHtmlPath).then(sha256),
      ]);
      expect(regenerated.status).toBe(0);
      expect(secondHashes).toEqual(firstHashes);
    },
  );

  it('checks all current bytes offline without mutation and detects output/review/approval drift', async (): Promise<void> => {
    const fixture = await createFixture('manual-trace');
    expect((await runCli(fixture, generationArguments(fixture))).status).toBe(0);
    await writeFixtureFactualApproval(fixture);
    const checkArguments = [
      ...generationArguments(fixture),
      '--approval',
      fixturePath(fixture, fixture.factualApprovalPath),
      '--check',
    ];
    const trackedPaths = [
      fixture.sourcesPath,
      fixture.inputPath,
      fixture.sourceApprovalPath,
      fixture.outputPath,
      fixture.reviewOutputPath,
      fixture.reviewHtmlPath,
      fixture.factualApprovalPath,
    ];
    const before = await Promise.all(trackedPaths.map((path) => readFile(path).then(sha256)));

    const valid = await runCli(fixture, checkArguments);
    const after = await Promise.all(trackedPaths.map((path) => readFile(path).then(sha256)));
    expect(valid.status, valid.stderr).toBe(0);
    expect(valid.stdout).toContain('exact offline check passed');
    expect(after).toEqual(before);

    await writeFile(fixture.outputPath, 'stale output\n', 'utf8');
    const staleOutput = await runCli(fixture, checkArguments);
    expect(staleOutput.status).not.toBe(0);
    expect(staleOutput.stderr).toContain('output');

    expect((await runCli(fixture, generationArguments(fixture))).status).toBe(0);
    await writeFixtureFactualApproval(fixture);
    await writeFile(fixture.reviewHtmlPath, '<html>changed review</html>\n', 'utf8');
    const staleReview = await runCli(fixture, checkArguments);
    expect(staleReview.status).not.toBe(0);
    expect(staleReview.stderr).toContain('review');

    expect((await runCli(fixture, generationArguments(fixture))).status).toBe(0);
    await writeFixtureFactualApproval(fixture);
    const sourceApproval = await readJsonRecord(fixture.sourceApprovalPath);
    sourceApproval.reviewer = {
      ...(sourceApproval.reviewer as Record<string, unknown>),
      role: 'Changed independent reviewer role',
    };
    await writeJsonRecord(fixture.sourceApprovalPath, sourceApproval);
    const staleApproval = await runCli(fixture, checkArguments);
    expect(staleApproval.status).not.toBe(0);
    expect(staleApproval.stderr).toContain('source approval');
  });

  it('keeps the production snapshot catalog Modern-only', async (): Promise<void> => {
    const catalogPath = resolve(dirname(CLI_PATH), '../public/data/snapshots/index.json');
    const catalog = JSON.parse(await readFile(catalogPath, 'utf8')) as {
      readonly snapshots: ReadonlyArray<{ readonly id: string }>;
    };

    expect(catalog.snapshots.map(({ id }) => id)).toEqual(['modern']);
  });
});
