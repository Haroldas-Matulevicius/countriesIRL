#!/usr/bin/env node
/**
 * Phase 2 exact-commit verification gate.
 *
 * Proves an exact commit from a FRESH DETACHED CLEAN WORKTREE created outside the
 * repository, so no dirty or untracked file in the current workspace can influence the
 * result. Mirrors the accepted Phase 1 exact-commit evidence pattern.
 *
 * Contract:
 *   - Never copies files from the current workspace into the gate worktree.
 *   - Refuses to run when the requested SHA is ambiguous or does not exist.
 *   - Creates a unique temp root OUTSIDE the repository.
 *   - Runs fresh `npm ci` inside the worktree before any gate.
 *   - Removes and prunes the worktree in the outermost `finally`, on every path.
 *     Never runs a broad `git clean`.
 *
 * Usage:
 *   node scripts/verifyPhase2ExactCommit.mjs --sha <sha> --evidence <path.json>
 *   node scripts/verifyPhase2ExactCommit.mjs --help
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const HELP = `
Phase 2 exact-commit verification gate

  --sha <sha>          Exact commit to verify. Must be unambiguous and existing.
  --evidence <path>    Where to write the evidence JSON (relative to repo root).
  --keep-worktree      Diagnostic only. Skips cleanup; never use for real evidence.
  --help               Show this message.

Exits 0 only when every gate passes. Any failure writes no PASS evidence.
`.trim();

function parseArgs(argv) {
  const args = { sha: null, evidence: null, keepWorktree: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--help' || token === '-h') {
      args.help = true;
    } else if (token === '--sha') {
      args.sha = argv[i + 1] ?? null;
      i += 1;
    } else if (token === '--evidence') {
      args.evidence = argv[i + 1] ?? null;
      i += 1;
    } else if (token === '--keep-worktree') {
      args.keepWorktree = true;
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  return args;
}

/**
 * Locates npm's JavaScript entry point so it can be spawned via `process.execPath`.
 *
 * `shell: true` is deliberately avoided: it concatenates rather than escapes argv,
 * which Node flags as a security hazard (DEP0190). But on Windows `npm` is a `.cmd`
 * shim, and Node >= 22 refuses to execute `.cmd` without a shell (EINVAL). Running
 * `node <npm-cli.js>` satisfies both constraints.
 */
function resolveNpmCli() {
  const fromEnv = process.env.npm_execpath;
  if (fromEnv && fromEnv.endsWith('.js') && existsSync(fromEnv)) {
    return fromEnv;
  }
  const candidate = join(
    dirname(process.execPath),
    'node_modules',
    'npm',
    'bin',
    'npm-cli.js',
  );
  if (existsSync(candidate)) {
    return candidate;
  }
  // Linux/macOS layout: <prefix>/bin/node -> <prefix>/lib/node_modules/npm
  const unixCandidate = join(
    dirname(dirname(process.execPath)),
    'lib',
    'node_modules',
    'npm',
    'bin',
    'npm-cli.js',
  );
  return existsSync(unixCandidate) ? unixCandidate : null;
}

const NPM_CLI = resolveNpmCli();

/**
 * Rewrites an `npm ...` invocation into `node <npm-cli.js> ...` when the CLI entry
 * point is resolvable, leaving every other command untouched.
 */
function resolveInvocation(command, args) {
  if (command === 'npm' && NPM_CLI !== null) {
    return { file: process.execPath, argv: [NPM_CLI, ...args] };
  }
  return { file: command, argv: args };
}

function run(command, args, options = {}) {
  const { file, argv } = resolveInvocation(command, args);
  const result = spawnSync(file, argv, {
    encoding: 'utf8',
    shell: false,
    maxBuffer: 64 * 1024 * 1024,
    ...options,
  });
  return {
    command: [command, ...args].join(' '),
    status: result.status ?? -1,
    stdout: (result.stdout ?? '').trim(),
    stderr: (result.stderr ?? '').trim(),
  };
}

function mustRun(command, args, options = {}) {
  const result = run(command, args, options);
  if (result.status !== 0) {
    throw new Error(
      `Command failed (${result.status}): ${result.command}\n${result.stderr || result.stdout}`,
    );
  }
  return result;
}

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

/**
 * Gate chain executed inside the detached clean worktree.
 * `expectFailure` marks commands that MUST exit nonzero — the blocked historical
 * packets. A blocked packet exiting 0 would mean the fail-closed gate was bypassed.
 */
const GATES = [
  { id: 'lint', command: 'npm', args: ['run', 'lint'] },
  { id: 'test', command: 'npm', args: ['test'] },
  { id: 'typecheck', command: 'npm', args: ['exec', 'tsc', '--', '-b', '--pretty', 'false'] },
  { id: 'data:world:check', command: 'npm', args: ['run', 'data:world:check'] },
  {
    id: 'history:1492:blocked',
    command: 'node',
    args: [
      'scripts/prepareHistoricalSnapshot.mjs',
      '--snapshot', '1492',
      '--sources', 'sources/historical/1492.sources.json',
      '--validate-sources',
    ],
    expectFailure: true,
    note: 'BLOCKED packet must fail closed. Exit 0 would mean the gate was bypassed.',
  },
  {
    id: 'history:1700:blocked',
    command: 'node',
    args: [
      'scripts/prepareHistoricalSnapshot.mjs',
      '--snapshot', '1700',
      '--sources', 'sources/historical/1700.sources.json',
      '--validate-sources',
    ],
    expectFailure: true,
    note: 'BLOCKED packet must fail closed. Exit 0 would mean the gate was bypassed.',
  },
  { id: 'build', command: 'npm', args: ['run', 'build'] },
  { id: 'e2e:chrome', command: 'npm', args: ['run', 'test:e2e', '--', '--project=chrome'] },
  { id: 'e2e:msedge', command: 'npm', args: ['run', 'test:e2e', '--', '--project=msedge'] },
];

/**
 * Verifies the production catalog is exactly Modern and that no unapproved historical
 * asset, source approval, or factual approval exists at the verified SHA.
 * Under the 2026-07-25 descope this replaces the four approval-aware promotion checks.
 */
function verifyCatalogState(worktree) {
  const catalogPath = join(worktree, 'public/data/snapshots/index.json');
  if (!existsSync(catalogPath)) {
    throw new Error('Production catalog is missing at the verified SHA.');
  }
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
  if (!Array.isArray(catalog.snapshots) || catalog.snapshots.length !== 1) {
    throw new Error(
      `Catalog must contain exactly one entry under the descope; found ${catalog.snapshots?.length}.`,
    );
  }
  const [entry] = catalog.snapshots;
  if (entry.id !== 'modern') {
    throw new Error(`Catalog entry must be "modern"; found "${entry.id}".`);
  }

  const assetPath = join(worktree, 'public', entry.assetPath);
  if (!existsSync(assetPath)) {
    throw new Error(`Catalog asset missing: ${entry.assetPath}`);
  }
  const actual = sha256File(assetPath);
  if (actual !== entry.sha256) {
    throw new Error(
      `Catalog hash mismatch for ${entry.assetPath}: recorded ${entry.sha256}, actual ${actual}.`,
    );
  }

  const forbidden = [];
  for (const id of ['1492', '1700', '1815', '1914']) {
    for (const candidate of [
      `public/data/snapshots/${id}.geojson`,
      `sources/historical/${id}.source-approval.json`,
      `data/historical-reviewed/${id}.approval.json`,
      `data/historical-reviewed/${id}.geojson`,
    ]) {
      if (existsSync(join(worktree, candidate))) {
        forbidden.push(candidate);
      }
    }
  }
  if (forbidden.length > 0) {
    throw new Error(
      `Unapproved historical artifacts present at the verified SHA: ${forbidden.join(', ')}`,
    );
  }

  return {
    catalogEntryCount: 1,
    modernAssetPath: entry.assetPath,
    modernAssetSha256: actual,
    historicalSnapshotsPromoted: 0,
    unapprovedHistoricalArtifacts: [],
  };
}

function collectPacketHashes(worktree) {
  const packets = {};
  for (const id of ['1492', '1700', '1815', '1914']) {
    const manifest = join(worktree, `sources/historical/${id}.sources.json`);
    const archive = join(worktree, `sources/historical/${id}.evidence.zip`);
    packets[id] = {
      sourceManifestSha256: existsSync(manifest) ? sha256File(manifest) : null,
      evidenceArchiveSha256: existsSync(archive) ? sha256File(archive) : null,
      readiness: 'BLOCKED',
      deliveryCounted: false,
    };
  }
  return packets;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(`${HELP}\n`);
    return 0;
  }
  if (!args.sha || !args.evidence) {
    process.stderr.write(`${HELP}\n`);
    throw new Error('Both --sha and --evidence are required.');
  }

  const repoRoot = mustRun('git', ['rev-parse', '--show-toplevel']).stdout;

  // Refuse ambiguity: the SHA must resolve to exactly one existing commit.
  const resolved = run('git', ['rev-parse', '--verify', `${args.sha}^{commit}`], {
    cwd: repoRoot,
  });
  if (resolved.status !== 0) {
    throw new Error(`SHA does not resolve to a commit: ${args.sha}`);
  }
  const verifiedSha = resolved.stdout;
  if (!/^[0-9a-f]{40}$/.test(verifiedSha)) {
    throw new Error(`Refusing ambiguous SHA resolution: "${verifiedSha}"`);
  }

  const startedAt = new Date().toISOString();
  const tempRoot = mkdtempSync(join(tmpdir(), 'countriesirl-phase2-gate-'));
  const worktree = join(tempRoot, 'worktree');
  let worktreeAdded = false;
  const gateResults = [];
  let status = 'FAIL';
  let failureReason = null;
  let catalogState = null;
  let historicalPackets = null;

  try {
    mustRun('git', ['worktree', 'add', '--detach', worktree, verifiedSha], {
      cwd: repoRoot,
    });
    worktreeAdded = true;

    // The worktree must be pristine — nothing from the dirty workspace may leak in.
    const dirty = mustRun('git', ['status', '--porcelain'], { cwd: worktree }).stdout;
    if (dirty !== '') {
      throw new Error(`Gate worktree is not clean:\n${dirty}`);
    }

    catalogState = verifyCatalogState(worktree);
    // Collected here, inside the try, because cleanup removes the worktree.
    historicalPackets = collectPacketHashes(worktree);

    const npmCi = run('npm', ['ci'], { cwd: worktree });
    gateResults.push({
      id: 'npm ci',
      command: npmCi.command,
      status: npmCi.status,
      passed: npmCi.status === 0,
    });
    if (npmCi.status !== 0) {
      throw new Error(`npm ci failed:\n${npmCi.stderr || npmCi.stdout}`);
    }

    for (const gate of GATES) {
      const result = run(gate.command, gate.args, { cwd: worktree });
      const passed = gate.expectFailure
        ? result.status !== 0
        : result.status === 0;
      gateResults.push({
        id: gate.id,
        command: result.command,
        status: result.status,
        expectFailure: gate.expectFailure ?? false,
        passed,
        note: gate.note,
        tail: (result.stdout || result.stderr).split('\n').slice(-12).join('\n'),
      });
      if (!passed) {
        throw new Error(
          `Gate "${gate.id}" failed (exit ${result.status}).\n${result.stderr || result.stdout}`,
        );
      }
    }

    status = 'PASS';
  } catch (error) {
    failureReason = error instanceof Error ? error.message : String(error);
  } finally {
    // Outermost cleanup. Runs on every path. Never a broad clean.
    if (worktreeAdded && !args.keepWorktree) {
      run('git', ['worktree', 'remove', '--force', worktree], { cwd: repoRoot });
      run('git', ['worktree', 'prune'], { cwd: repoRoot });
    }
    if (!args.keepWorktree) {
      try {
        rmSync(tempRoot, { recursive: true, force: true });
      } catch {
        // Best effort — the worktree itself is already removed and pruned.
      }
    }
  }

  const evidence = {
    schema: 'countriesirl.phase2.exact-commit.v1',
    status,
    verifiedSha,
    startedAt,
    finishedAt: new Date().toISOString(),
    failureReason,
    descope: {
      applied: true,
      decision: '.planning/phases/02-region-variants-advanced-features-1-5-2-weeks/02-DESCOPE-DECISION.md',
      note:
        'Historical snapshots deferred. The four approval-aware promotion checks are ' +
        'replaced by Modern-only catalog verification plus blocked-packet fail-closed ' +
        'assertions. Zero historical snapshots are claimed delivered.',
    },
    environment: {
      node: process.version,
      npm: run('npm', ['--version']).stdout,
      platform: process.platform,
      arch: process.arch,
    },
    catalog: catalogState,
    historicalPackets,
    gates: gateResults,
    cleanup: {
      worktreeRemoved: worktreeAdded && !args.keepWorktree,
      worktreePruned: worktreeAdded && !args.keepWorktree,
      broadCleanUsed: false,
    },
  };

  const evidencePath = resolve(repoRoot, args.evidence);
  await mkdir(dirname(evidencePath), { recursive: true });
  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');

  if (status !== 'PASS') {
    process.stderr.write(`GATE FAILED: ${failureReason}\n`);
    return 1;
  }
  process.stdout.write(
    `GATE PASSED for ${verifiedSha}\nEvidence: ${args.evidence}\n`,
  );
  return 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
