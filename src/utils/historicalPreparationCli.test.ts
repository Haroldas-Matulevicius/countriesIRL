import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
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

function sourceArguments(fixture: HistoricalCliFixture): ReadonlyArray<string> {
  return [
    '--snapshot',
    fixture.snapshotId,
    '--sources',
    fixturePath(fixture, fixture.sourcesPath),
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
