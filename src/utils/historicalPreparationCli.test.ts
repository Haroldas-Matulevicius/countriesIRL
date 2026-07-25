import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
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

function reviewerRecordFromRegion(
  snapshotId: '1492' | '1700',
  region: Record<string, unknown>,
): Record<string, unknown> {
  return {
    snapshotId,
    regionId: region.regionId,
    packetStatus: 'candidate-blocked',
    rightsDisposition: null,
    factualDisposition: null,
    topologyDisposition: null,
    reviewer: null,
    approvals: {
      sourceRights: null,
      factual: null,
      topology: null,
      reviewerSignature: null,
      productionReadiness: null,
    },
    disposition: region.disposition,
    entityIds: region.entityIds,
    colorOwnerIds: region.colorOwnerIds,
    sourceFeatureIds: region.sourceFeatureIds,
    blockers: region.uncertainties,
  };
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
    ({ path }) => path.startsWith('reviews/') || path.startsWith('specifications/'),
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
  const inputBytes = await readFile(
    resolve(repositoryRoot, `sources/historical/${snapshotId}.input.geojson`),
  );
  const fixture: CandidatePacketFixture = {
    rootDir,
    snapshotId,
    sourcesPath: resolve(sourceDir, `${snapshotId}.sources.json`),
    archivePath: resolve(sourceDir, `${snapshotId}.evidence.zip`),
    inputPath: resolve(sourceDir, `${snapshotId}.input.geojson`),
    members: [],
  };
  const regions = manifest.regions as Array<Record<string, unknown>>;
  fixture.members = regions.map((region) => ({
    path: `reviews/${snapshotId}-${String(region.regionId)}.json`,
    bytes: jsonBuffer(reviewerRecordFromRegion(snapshotId, region)),
  }));
  if (snapshotId === '1492') {
    const evidenceBytes = Buffer.from('fixture Semkowicz-Romer image bytes', 'utf8');
    fixture.members.push({
      path: 'sources/semkowicz-romer-1929-current-hosted-scan.jpg',
      bytes: evidenceBytes,
    });
    fixture.members.push({
      path: 'specifications/1492-manual-trace-candidate.json',
      bytes: jsonBuffer({
        version: 1,
        mode: 'manual-trace-candidate-only',
        sourceImageSha256: sha256(evidenceBytes),
        operatorRecordSha256: null,
        controlPointsSha256: null,
        tracedGeoJsonSha256: null,
        approvalStatus: 'pending',
      }),
    });
  }
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
    const fixture = await createFixture('vector-extraction');
    const manifest = await readJsonRecord(fixture.sourcesPath);
    manifest.readinessStatus = 'blocked';
    manifest.deliveryCounted = false;
    manifest.blockers = [
      'RIGHTS_REVIEW_REQUIRED',
      'SOURCE_GEOMETRY_MISSING',
    ];
    manifest.preparation = {
      mode: 'blocked',
      reason: 'Independent rights and factual review remain incomplete.',
    };
    const regions = manifest.regions as Array<Record<string, unknown>>;
    regions.forEach((region, index): void => {
      region.disposition = index === 0 ? 'blocked' : 'conditional';
      region.rightsDisposition = 'review-required';
      region.attribution = null;
    });
    await writeJsonRecord(fixture.sourcesPath, manifest);

    const blocked = await runCli(fixture, [
      ...sourceArguments(fixture),
      '--validate-sources',
    ]);

    expect(blocked.status).not.toBe(0);
    expect(blocked.stdout).toContain('blocked source packet hashes passed offline');
    expect(blocked.stderr).toContain('source readiness remains blocked');
    expect(blocked.stderr).toContain('RIGHTS_REVIEW_REQUIRED');
    expect(await fileExists(fixture.outputPath)).toBe(false);

    await writeFile(fixture.inputPath, 'changed blocked input\n', 'utf8');
    const drifted = await runCli(fixture, [
      ...sourceArguments(fixture),
      '--validate-sources',
    ]);
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
    expect(result.stdout).toContain('1492 blocked source packet hashes passed offline');
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
    expect(result.stdout).toContain('1700 blocked source packet hashes passed offline');
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
    expect(valid.status).toBe(0);
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
