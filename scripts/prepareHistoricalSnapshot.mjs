import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { isAbsolute, resolve } from 'node:path';
import { inflateRawSync } from 'node:zlib';

const SNAPSHOT_DATES = Object.freeze({
  '1492': '1492-01-03',
  '1700': '1700-01-01',
  '1815': '1815-12-31',
  '1914': '1914-07-27',
});
const REGION_IDS = Object.freeze([
  'poland',
  'lithuania',
  'hungary',
  'balkans',
  'iberia',
  'scandinavia',
]);
const REGION_ID_SET = new Set(REGION_IDS);
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const FORBIDDEN_REVIEWER_PATTERN = /\b(?:executor|implementer|claude|codex)\b/i;
const LOCAL_FILE_SIGNATURE = 0x04034b50;
const CENTRAL_FILE_SIGNATURE = 0x02014b50;
const END_SIGNATURE = 0x06054b50;
const UTF8_FLAG = 0x0800;
const STORE_METHOD = 0;
const DEFLATE_METHOD = 8;
const FIXED_DOS_TIME = 0;
const FIXED_DOS_DATE = 33;
const CRC_POLYNOMIAL = 0xedb88320;
const MAX_FILE_BYTES = 32 * 1024 * 1024;
const MAX_ARCHIVE_MEMBERS = 256;
const MAX_MEMBER_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_MEMBER_BYTES = 64 * 1024 * 1024;
const MAX_FEATURES = 10_000;
const MAX_STRING_LENGTH = 2_048;
const MAX_PATH_LENGTH = 240;

function printHelp() {
  globalThis.console.info(`Usage:
  node scripts/prepareHistoricalSnapshot.mjs --snapshot <id> --sources <path> --validate-sources
  node scripts/prepareHistoricalSnapshot.mjs --snapshot <id> --sources <path> --input <path> --source-approval <path> --validate-source-approval
  node scripts/prepareHistoricalSnapshot.mjs --snapshot <id> --sources <path> --input <path> --source-approval <path> --output <path> --review-output <path> --review-html <path> [--check]
  node scripts/prepareHistoricalSnapshot.mjs ... --approval <path> --check

Modes:
  --validate-sources          Validate local rights, canonical ZIP members, input, and evidence mode.
  --validate-source-approval Validate the durable non-executor source approval against current bytes.
  --check                     Verify candidate/review bytes without writing or using the network.

Approval arguments:
  --source-approval <path>    Required before candidate generation and exact checks.
  --approval <path>           Optional factual approval for promotion checks; binds source approval and review bytes.
`);
}

function parseArguments(args) {
  const options = {
    help: false,
    validateSources: false,
    validateSourceApproval: false,
    check: false,
    snapshot: null,
    sources: null,
    input: null,
    sourceApproval: null,
    output: null,
    reviewOutput: null,
    reviewHtml: null,
    approval: null,
  };
  const valueFlags = new Map([
    ['--snapshot', 'snapshot'],
    ['--sources', 'sources'],
    ['--input', 'input'],
    ['--source-approval', 'sourceApproval'],
    ['--output', 'output'],
    ['--review-output', 'reviewOutput'],
    ['--review-html', 'reviewHtml'],
    ['--approval', 'approval'],
  ]);

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--help' || argument === '-h') {
      options.help = true;
      continue;
    }
    if (argument === '--validate-sources') {
      options.validateSources = true;
      continue;
    }
    if (argument === '--validate-source-approval') {
      options.validateSourceApproval = true;
      continue;
    }
    if (argument === '--check') {
      options.check = true;
      continue;
    }

    const field = valueFlags.get(argument);
    if (field === undefined) {
      throw new Error(`Unknown argument: ${argument}`);
    }
    const value = args[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`${argument} requires a value.`);
    }
    options[field] = value;
    index += 1;
  }
  return options;
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBoundedString(value, maxLength = MAX_STRING_LENGTH) {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= maxLength
  );
}

function isSha256(value) {
  return typeof value === 'string' && SHA256_PATTERN.test(value);
}

function isIsoDate(value) {
  if (typeof value !== 'string' || !ISO_DATE_PATTERN.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function normalizeLocalPath(value) {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > MAX_PATH_LENGTH ||
    value.includes('\\') ||
    value.includes('\0') ||
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

function resolveArgumentPath(value) {
  return isAbsolute(value) ? value : resolve(process.cwd(), value);
}

function resolveManifestPath(value) {
  const normalized = normalizeLocalPath(value);
  if (normalized === null) {
    throw new Error(`Historical evidence path is not a normalized local path: ${String(value)}`);
  }
  return resolve(process.cwd(), normalized);
}

function calculateSha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (CRC_POLYNOMIAL & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function readBoundedFile(path, label) {
  const bytes = await readFile(path);
  if (bytes.length > MAX_FILE_BYTES) {
    throw new Error(`${label} exceeds the ${MAX_FILE_BYTES}-byte limit.`);
  }
  return bytes;
}

function parseJson(bytes, label) {
  try {
    return JSON.parse(bytes.toString('utf8'));
  } catch {
    throw new Error(`${label} is not valid JSON.`);
  }
}

function requireSnapshot(options) {
  if (options.snapshot === null || SNAPSHOT_DATES[options.snapshot] === undefined) {
    throw new Error('--snapshot must be one of 1492, 1700, 1815, or 1914.');
  }
  return options.snapshot;
}

function requirePathOption(options, field, flag) {
  const value = options[field];
  if (value === null) {
    throw new Error(`${flag} is required.`);
  }
  return resolveArgumentPath(value);
}

function readHashReference(value, label) {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }
  const path = normalizeLocalPath(value.path);
  if (path === null || !isSha256(value.sha256)) {
    throw new Error(`${label} must contain a normalized path and SHA-256.`);
  }
  return { path, sha256: value.sha256 };
}

function readMemberInventory(value, label) {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_ARCHIVE_MEMBERS) {
    throw new Error(`${label} has an invalid member count.`);
  }
  const members = [];
  let previousPath = '';
  for (const candidate of value) {
    if (!isRecord(candidate)) {
      throw new Error(`${label} contains an invalid member.`);
    }
    const path = normalizeLocalPath(candidate.path);
    if (path === null || !isSha256(candidate.sha256) || path <= previousPath) {
      throw new Error(`${label} member paths must be normalized, unique, and sorted.`);
    }
    previousPath = path;
    members.push({ path, sha256: candidate.sha256 });
  }
  return members;
}

function readUncertainties(value, label) {
  if (!Array.isArray(value) || value.length > 32) {
    throw new Error(`${label} uncertainties are invalid.`);
  }
  for (const item of value) {
    if (!isBoundedString(item)) {
      throw new Error(`${label} contains an invalid uncertainty.`);
    }
  }
  return [...value];
}

function readReviewer(value, label) {
  if (
    !isRecord(value) ||
    !isBoundedString(value.name) ||
    !isBoundedString(value.role) ||
    !isIsoDate(value.reviewedOn) ||
    value.isExecutor !== false ||
    value.isImplementer !== false ||
    FORBIDDEN_REVIEWER_PATTERN.test(value.name) ||
    FORBIDDEN_REVIEWER_PATTERN.test(value.role)
  ) {
    throw new Error(`${label} reviewer must be named, dated, independent, and non-executor.`);
  }
  return value;
}

function readExactRegionalDecisions(value, kind) {
  if (!isRecord(value)) {
    throw new Error(`${kind} approval regional decisions are invalid.`);
  }
  const keys = Object.keys(value).sort();
  const expectedKeys = [...REGION_IDS].sort();
  if (
    keys.length !== expectedKeys.length ||
    keys.some((key, index) => key !== expectedKeys[index])
  ) {
    throw new Error(`${kind} approval must contain six separate regional decisions.`);
  }

  for (const regionId of REGION_IDS) {
    const decision = value[regionId];
    if (
      !isRecord(decision) ||
      decision.regionId !== regionId ||
      decision.disposition !== 'approved'
    ) {
      throw new Error(`${kind} approval region ${regionId} is not independently approved.`);
    }
    readUncertainties(decision.uncertainties, `${kind} ${regionId}`);
    if (kind === 'source') {
      if (
        !isBoundedString(decision.rightsDisposition) ||
        /\b(?:blocked|denied|unapproved)\b/i.test(decision.rightsDisposition) ||
        !(decision.attribution === null || isBoundedString(decision.attribution))
      ) {
        throw new Error(`source approval region ${regionId} has invalid rights evidence.`);
      }
    }
  }
  return value;
}

function readSourceManifest(value, snapshotId) {
  if (!isRecord(value) || value.snapshotId !== snapshotId) {
    throw new Error('Source manifest snapshot ID does not match --snapshot.');
  }
  const expectedDate = SNAPSHOT_DATES[snapshotId];
  if (value.asOf !== expectedDate) {
    throw new Error(`Source manifest asOf must be exactly ${expectedDate}.`);
  }
  if (!isRecord(value.evidenceArchive)) {
    throw new Error('Source manifest evidence archive is invalid.');
  }
  const evidenceArchive = {
    ...readHashReference(value.evidenceArchive, 'Evidence archive'),
    memberInventorySha256: value.evidenceArchive.memberInventorySha256,
    members: readMemberInventory(value.evidenceArchive.members, 'Evidence archive'),
  };
  if (!isSha256(evidenceArchive.memberInventorySha256)) {
    throw new Error('Evidence archive member inventory SHA-256 is invalid.');
  }
  const inputGeometry = readHashReference(value.inputGeometry, 'Input geometry');

  if (!isRecord(value.preparation)) {
    throw new Error('Source manifest preparation mode is invalid.');
  }
  let preparation;
  if (value.preparation.mode === 'vector-extraction') {
    preparation = {
      mode: 'vector-extraction',
      extractionSpecification: readHashReference(
        value.preparation.extractionSpecification,
        'Extraction specification',
      ),
    };
  } else if (value.preparation.mode === 'manual-trace') {
    preparation = {
      mode: 'manual-trace',
      evidence: readHashReference(value.preparation.evidence, 'Manual trace evidence'),
      procedure: readHashReference(value.preparation.procedure, 'Manual trace procedure'),
      operatorRecord: readHashReference(
        value.preparation.operatorRecord,
        'Manual trace operator record',
      ),
      controlPoints: readHashReference(
        value.preparation.controlPoints,
        'Manual trace control points',
      ),
    };
  } else {
    throw new Error('Source manifest preparation mode must be vector-extraction or manual-trace.');
  }

  if (!Array.isArray(value.regions) || value.regions.length !== REGION_IDS.length) {
    throw new Error('Source manifest must contain six separate regional rights records.');
  }
  const regions = [];
  const seenRegions = new Set();
  for (const region of value.regions) {
    if (!isRecord(region) || !REGION_ID_SET.has(region.regionId) || seenRegions.has(region.regionId)) {
      throw new Error('Source manifest contains a missing, merged, duplicate, or invalid region.');
    }
    seenRegions.add(region.regionId);
    const evidencePath = normalizeLocalPath(region.evidencePath);
    if (
      evidencePath === null ||
      !isSha256(region.evidenceSha256) ||
      region.rightsDisposition !== 'approved' ||
      !isBoundedString(region.license) ||
      !(region.attribution === null || isBoundedString(region.attribution)) ||
      !isIsoDate(region.retrievedOn)
    ) {
      throw new Error(`Source rights record for ${region.regionId} is not approved and complete.`);
    }
    readUncertainties(region.uncertainties, `source ${region.regionId}`);
    regions.push({ ...region, evidencePath });
  }
  if (REGION_IDS.some((regionId) => !seenRegions.has(regionId))) {
    throw new Error('Source manifest is missing one of the six required regions.');
  }

  return {
    snapshotId,
    asOf: expectedDate,
    evidenceArchive,
    inputGeometry,
    preparation,
    regions,
  };
}

function parseCanonicalZip(archiveBytes) {
  if (archiveBytes.length < 22 || archiveBytes.readUInt32LE(archiveBytes.length - 22) !== END_SIGNATURE) {
    throw new Error('Evidence archive has no canonical ZIP end record.');
  }
  const endOffset = archiveBytes.length - 22;
  const diskNumber = archiveBytes.readUInt16LE(endOffset + 4);
  const centralDisk = archiveBytes.readUInt16LE(endOffset + 6);
  const diskEntries = archiveBytes.readUInt16LE(endOffset + 8);
  const totalEntries = archiveBytes.readUInt16LE(endOffset + 10);
  const centralSize = archiveBytes.readUInt32LE(endOffset + 12);
  const centralOffset = archiveBytes.readUInt32LE(endOffset + 16);
  const commentLength = archiveBytes.readUInt16LE(endOffset + 20);
  if (
    diskNumber !== 0 ||
    centralDisk !== 0 ||
    diskEntries !== totalEntries ||
    totalEntries === 0 ||
    totalEntries > MAX_ARCHIVE_MEMBERS ||
    commentLength !== 0 ||
    centralOffset + centralSize !== endOffset
  ) {
    throw new Error('Evidence archive ZIP metadata is not canonical.');
  }

  const centralEntries = [];
  let cursor = centralOffset;
  let previousPath = '';
  for (let index = 0; index < totalEntries; index += 1) {
    if (cursor + 46 > endOffset || archiveBytes.readUInt32LE(cursor) !== CENTRAL_FILE_SIGNATURE) {
      throw new Error('Evidence archive central directory is invalid.');
    }
    const flags = archiveBytes.readUInt16LE(cursor + 8);
    const method = archiveBytes.readUInt16LE(cursor + 10);
    const modifiedTime = archiveBytes.readUInt16LE(cursor + 12);
    const modifiedDate = archiveBytes.readUInt16LE(cursor + 14);
    const crc = archiveBytes.readUInt32LE(cursor + 16);
    const compressedSize = archiveBytes.readUInt32LE(cursor + 20);
    const uncompressedSize = archiveBytes.readUInt32LE(cursor + 24);
    const nameLength = archiveBytes.readUInt16LE(cursor + 28);
    const extraLength = archiveBytes.readUInt16LE(cursor + 30);
    const fileCommentLength = archiveBytes.readUInt16LE(cursor + 32);
    const diskStart = archiveBytes.readUInt16LE(cursor + 34);
    const internalAttributes = archiveBytes.readUInt16LE(cursor + 36);
    const externalAttributes = archiveBytes.readUInt32LE(cursor + 38);
    const localOffset = archiveBytes.readUInt32LE(cursor + 42);
    const nextCursor = cursor + 46 + nameLength + extraLength + fileCommentLength;
    if (nextCursor > endOffset) {
      throw new Error('Evidence archive central directory is truncated.');
    }
    const path = archiveBytes.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8');
    const normalizedPath = normalizeLocalPath(path);
    if (
      flags !== UTF8_FLAG ||
      (method !== STORE_METHOD && method !== DEFLATE_METHOD) ||
      modifiedTime !== FIXED_DOS_TIME ||
      modifiedDate !== FIXED_DOS_DATE ||
      extraLength !== 0 ||
      fileCommentLength !== 0 ||
      diskStart !== 0 ||
      internalAttributes !== 0 ||
      externalAttributes !== 0 ||
      normalizedPath === null ||
      normalizedPath !== path ||
      path <= previousPath ||
      uncompressedSize > MAX_MEMBER_BYTES
    ) {
      throw new Error('Evidence archive member metadata, path, encryption, compression, or order is not canonical.');
    }
    previousPath = path;
    centralEntries.push({
      path,
      flags,
      method,
      modifiedTime,
      modifiedDate,
      crc,
      compressedSize,
      uncompressedSize,
      localOffset,
    });
    cursor = nextCursor;
  }
  if (cursor !== endOffset) {
    throw new Error('Evidence archive central directory has trailing bytes.');
  }

  const members = [];
  let expectedLocalOffset = 0;
  let totalUncompressedBytes = 0;
  for (const entry of centralEntries) {
    if (
      entry.localOffset !== expectedLocalOffset ||
      entry.localOffset + 30 > centralOffset ||
      archiveBytes.readUInt32LE(entry.localOffset) !== LOCAL_FILE_SIGNATURE
    ) {
      throw new Error('Evidence archive local member order is not canonical.');
    }
    const localFlags = archiveBytes.readUInt16LE(entry.localOffset + 6);
    const localMethod = archiveBytes.readUInt16LE(entry.localOffset + 8);
    const localTime = archiveBytes.readUInt16LE(entry.localOffset + 10);
    const localDate = archiveBytes.readUInt16LE(entry.localOffset + 12);
    const localCrc = archiveBytes.readUInt32LE(entry.localOffset + 14);
    const localCompressedSize = archiveBytes.readUInt32LE(entry.localOffset + 18);
    const localUncompressedSize = archiveBytes.readUInt32LE(entry.localOffset + 22);
    const nameLength = archiveBytes.readUInt16LE(entry.localOffset + 26);
    const extraLength = archiveBytes.readUInt16LE(entry.localOffset + 28);
    const nameStart = entry.localOffset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const dataEnd = dataStart + entry.compressedSize;
    const localPath = archiveBytes.subarray(nameStart, nameStart + nameLength).toString('utf8');
    if (
      localFlags !== entry.flags ||
      localMethod !== entry.method ||
      localTime !== entry.modifiedTime ||
      localDate !== entry.modifiedDate ||
      localCrc !== entry.crc ||
      localCompressedSize !== entry.compressedSize ||
      localUncompressedSize !== entry.uncompressedSize ||
      extraLength !== 0 ||
      localPath !== entry.path ||
      dataEnd > centralOffset
    ) {
      throw new Error(`Evidence archive local metadata drifted for member ${entry.path}.`);
    }
    const compressedBytes = archiveBytes.subarray(dataStart, dataEnd);
    const bytes =
      entry.method === STORE_METHOD
        ? Buffer.from(compressedBytes)
        : inflateRawSync(compressedBytes, { maxOutputLength: MAX_MEMBER_BYTES });
    totalUncompressedBytes += bytes.length;
    if (
      bytes.length !== entry.uncompressedSize ||
      totalUncompressedBytes > MAX_TOTAL_MEMBER_BYTES ||
      crc32(bytes) !== entry.crc
    ) {
      throw new Error(`Evidence archive member ${entry.path} failed size or CRC validation.`);
    }
    members.push({ path: entry.path, bytes, sha256: calculateSha256(bytes) });
    expectedLocalOffset = dataEnd;
  }
  if (expectedLocalOffset !== centralOffset) {
    throw new Error('Evidence archive contains noncanonical gaps before the central directory.');
  }

  const inventory = members.map(({ path, sha256 }) => ({ path, sha256 }));
  const inventorySha256 = calculateSha256(
    Buffer.from(`${JSON.stringify(inventory)}\n`, 'utf8'),
  );
  return { members, inventory, inventorySha256 };
}

function inventoriesMatch(left, right) {
  return (
    left.length === right.length &&
    left.every(
      (member, index) =>
        member.path === right[index]?.path && member.sha256 === right[index]?.sha256,
    )
  );
}

async function validateHashReference(reference, label) {
  const bytes = await readBoundedFile(resolveManifestPath(reference.path), label);
  const hash = calculateSha256(bytes);
  if (hash !== reference.sha256) {
    throw new Error(`${label} SHA-256 drifted.`);
  }
  return bytes;
}

function parseExtractionSpecification(bytes) {
  const specification = parseJson(bytes, 'Extraction specification');
  if (
    !isRecord(specification) ||
    specification.version !== 1 ||
    specification.operation !== 'copy-archive-member'
  ) {
    throw new Error('Vector extraction specification is not supported.');
  }
  const memberPath = normalizeLocalPath(specification.memberPath);
  if (memberPath === null) {
    throw new Error('Vector extraction specification member path is invalid.');
  }
  return { memberPath };
}

async function validateSourceReadiness(options) {
  const snapshotId = requireSnapshot(options);
  const sourcesPath = requirePathOption(options, 'sources', '--sources');
  const sourceManifestBytes = await readBoundedFile(sourcesPath, 'Source manifest');
  const manifest = readSourceManifest(
    parseJson(sourceManifestBytes, 'Source manifest'),
    snapshotId,
  );

  const archiveBytes = await readBoundedFile(
    resolveManifestPath(manifest.evidenceArchive.path),
    'Evidence archive',
  );
  if (calculateSha256(archiveBytes) !== manifest.evidenceArchive.sha256) {
    throw new Error('Evidence archive SHA-256 drifted.');
  }
  const archive = parseCanonicalZip(archiveBytes);
  if (
    archive.inventorySha256 !== manifest.evidenceArchive.memberInventorySha256 ||
    !inventoriesMatch(archive.inventory, manifest.evidenceArchive.members)
  ) {
    throw new Error('Evidence archive member inventory drifted.');
  }
  const membersByPath = new Map(archive.members.map((member) => [member.path, member]));
  for (const region of manifest.regions) {
    const member = membersByPath.get(region.evidencePath);
    if (member === undefined || member.sha256 !== region.evidenceSha256) {
      throw new Error(`Source evidence member drifted for region ${region.regionId}.`);
    }
  }

  const inputPath =
    options.input === null
      ? resolveManifestPath(manifest.inputGeometry.path)
      : resolveArgumentPath(options.input);
  const inputBytes = await readBoundedFile(inputPath, 'Input geometry');
  if (calculateSha256(inputBytes) !== manifest.inputGeometry.sha256) {
    throw new Error('Input geometry SHA-256 drifted.');
  }

  let preparation;
  if (manifest.preparation.mode === 'vector-extraction') {
    const specificationBytes = await validateHashReference(
      manifest.preparation.extractionSpecification,
      'Extraction specification',
    );
    const specification = parseExtractionSpecification(specificationBytes);
    const extractedMember = membersByPath.get(specification.memberPath);
    if (extractedMember === undefined || !extractedMember.bytes.equals(inputBytes)) {
      throw new Error('Vector extraction replay does not reproduce the current input geometry.');
    }
    preparation = {
      mode: 'vector-extraction',
      specificationBytes,
      extractedInputBytes: extractedMember.bytes,
    };
  } else {
    const [evidenceBytes, procedureBytes, operatorRecordBytes, controlPointBytes] =
      await Promise.all([
        validateHashReference(manifest.preparation.evidence, 'Manual trace evidence'),
        validateHashReference(manifest.preparation.procedure, 'Manual trace procedure'),
        validateHashReference(
          manifest.preparation.operatorRecord,
          'Manual trace operator record',
        ),
        validateHashReference(
          manifest.preparation.controlPoints,
          'Manual trace control points',
        ),
      ]);
    preparation = {
      mode: 'manual-trace',
      evidenceBytes,
      procedureBytes,
      operatorRecordBytes,
      controlPointBytes,
    };
  }

  return {
    snapshotId,
    sourcesPath,
    sourceManifestBytes,
    manifest,
    archiveBytes,
    archive,
    inputPath,
    inputBytes,
    preparation,
  };
}

function readSourceApproval(value, snapshotId) {
  if (!isRecord(value) || value.snapshotId !== snapshotId) {
    throw new Error('Source approval snapshot ID is invalid.');
  }
  readReviewer(value.reviewer, 'Source approval');
  readExactRegionalDecisions(value.regionalDecisions, 'source');
  if (
    !isSha256(value.sourceManifestSha256) ||
    !isSha256(value.evidenceArchiveSha256) ||
    !isSha256(value.memberInventorySha256) ||
    !isSha256(value.inputGeometrySha256)
  ) {
    throw new Error('Source approval hash fields are invalid.');
  }
  const memberInventory = readMemberInventory(
    value.memberInventory,
    'Source approval member inventory',
  );
  if (!isRecord(value.preparation)) {
    throw new Error('Source approval preparation mode is invalid.');
  }
  let preparation;
  if (
    value.preparation.mode === 'vector-extraction' &&
    isSha256(value.preparation.extractionSpecificationSha256)
  ) {
    preparation = {
      mode: 'vector-extraction',
      extractionSpecificationSha256:
        value.preparation.extractionSpecificationSha256,
    };
  } else if (
    value.preparation.mode === 'manual-trace' &&
    isSha256(value.preparation.evidenceSha256) &&
    isSha256(value.preparation.procedureSha256) &&
    isSha256(value.preparation.operatorRecordSha256) &&
    isSha256(value.preparation.controlPointSha256)
  ) {
    preparation = {
      mode: 'manual-trace',
      evidenceSha256: value.preparation.evidenceSha256,
      procedureSha256: value.preparation.procedureSha256,
      operatorRecordSha256: value.preparation.operatorRecordSha256,
      controlPointSha256: value.preparation.controlPointSha256,
    };
  } else {
    throw new Error('Source approval mode-specific hashes are invalid.');
  }
  return { ...value, memberInventory, preparation };
}

async function validateSourceApprovalBundle(options) {
  if (options.sourceApproval === null) {
    throw new Error('--source-approval is required before candidate generation or checks.');
  }
  const readiness = await validateSourceReadiness(options);
  const sourceApprovalPath = resolveArgumentPath(options.sourceApproval);
  const sourceApprovalBytes = await readBoundedFile(
    sourceApprovalPath,
    'Source approval',
  );
  const approval = readSourceApproval(
    parseJson(sourceApprovalBytes, 'Source approval'),
    readiness.snapshotId,
  );
  if (
    approval.sourceManifestSha256 !== calculateSha256(readiness.sourceManifestBytes)
  ) {
    throw new Error('Source approval does not bind the current source manifest.');
  }
  if (approval.evidenceArchiveSha256 !== calculateSha256(readiness.archiveBytes)) {
    throw new Error('Source approval does not bind the current evidence archive.');
  }
  if (
    approval.memberInventorySha256 !== readiness.archive.inventorySha256 ||
    !inventoriesMatch(approval.memberInventory, readiness.archive.inventory)
  ) {
    throw new Error('Source approval does not bind every current archive member.');
  }
  if (approval.inputGeometrySha256 !== calculateSha256(readiness.inputBytes)) {
    throw new Error('Source approval does not bind the current input geometry.');
  }
  if (
    approval.preparation.mode !== readiness.manifest.preparation.mode ||
    approval.preparation.mode !== readiness.preparation.mode
  ) {
    throw new Error('Source approval mode does not match the source manifest mode.');
  }
  if (
    readiness.preparation.mode === 'vector-extraction' &&
    approval.preparation.mode === 'vector-extraction'
  ) {
    const hash = calculateSha256(readiness.preparation.specificationBytes);
    if (
      hash !== readiness.manifest.preparation.extractionSpecification.sha256 ||
      hash !== approval.preparation.extractionSpecificationSha256
    ) {
      throw new Error('Source approval vector extraction specification drifted.');
    }
  } else if (
    readiness.preparation.mode === 'manual-trace' &&
    approval.preparation.mode === 'manual-trace'
  ) {
    const hashes = {
      evidenceSha256: calculateSha256(readiness.preparation.evidenceBytes),
      procedureSha256: calculateSha256(readiness.preparation.procedureBytes),
      operatorRecordSha256: calculateSha256(
        readiness.preparation.operatorRecordBytes,
      ),
      controlPointSha256: calculateSha256(
        readiness.preparation.controlPointBytes,
      ),
    };
    const manifestPreparation = readiness.manifest.preparation;
    if (
      hashes.evidenceSha256 !== manifestPreparation.evidence.sha256 ||
      hashes.evidenceSha256 !== approval.preparation.evidenceSha256 ||
      hashes.procedureSha256 !== manifestPreparation.procedure.sha256 ||
      hashes.procedureSha256 !== approval.preparation.procedureSha256 ||
      hashes.operatorRecordSha256 !== manifestPreparation.operatorRecord.sha256 ||
      hashes.operatorRecordSha256 !== approval.preparation.operatorRecordSha256 ||
      hashes.controlPointSha256 !== manifestPreparation.controlPoints.sha256 ||
      hashes.controlPointSha256 !== approval.preparation.controlPointSha256
    ) {
      throw new Error('Source approval manual trace evidence, procedure, operator, or control points drifted.');
    }
  } else {
    throw new Error('Source approval mode does not match current preparation evidence.');
  }

  return {
    ...readiness,
    sourceApprovalPath,
    sourceApprovalBytes,
    sourceApproval: approval,
  };
}

function isPosition(value) {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    value.every((coordinate) => typeof coordinate === 'number' && Number.isFinite(coordinate)) &&
    value[0] >= -180 &&
    value[0] <= 180 &&
    value[1] >= -90 &&
    value[1] <= 90
  );
}

function positionsMatch(first, last) {
  return first.length === last.length && first.every((value, index) => value === last[index]);
}

function isRing(value) {
  return (
    Array.isArray(value) &&
    value.length >= 4 &&
    value.every(isPosition) &&
    positionsMatch(value[0], value[value.length - 1])
  );
}

function isPolygonCoordinates(value) {
  return Array.isArray(value) && value.length > 0 && value.every(isRing);
}

function isMultiPolygonCoordinates(value) {
  return Array.isArray(value) && value.length > 0 && value.every(isPolygonCoordinates);
}

function normalizeHistoricalFeature(candidate, index) {
  if (
    !isRecord(candidate) ||
    candidate.type !== 'Feature' ||
    !isBoundedString(candidate.id) ||
    !isRecord(candidate.properties) ||
    !isBoundedString(candidate.properties.name) ||
    !isRecord(candidate.geometry) ||
    !isBoundedString(candidate.sourceFeatureId) ||
    !isBoundedString(candidate.entityId) ||
    !isBoundedString(candidate.provenanceId)
  ) {
    globalThis.console.warn(`Historical feature ${index} missing id or properties.name; skipping.`);
    return null;
  }
  const geometryValid =
    (candidate.geometry.type === 'Polygon' &&
      isPolygonCoordinates(candidate.geometry.coordinates)) ||
    (candidate.geometry.type === 'MultiPolygon' &&
      isMultiPolygonCoordinates(candidate.geometry.coordinates));
  if (!geometryValid) {
    globalThis.console.warn(`Historical feature ${index} has invalid geometry; skipping.`);
    return null;
  }

  const selectable =
    candidate.isSelectable === true &&
    candidate.interactionMode === 'historical-entity' &&
    candidate.colorOwnerId === candidate.entityId;
  const inherited =
    candidate.isSelectable === false &&
    candidate.interactionMode === 'inherited-dependency' &&
    isBoundedString(candidate.colorOwnerId);
  const neutral =
    candidate.isSelectable === false &&
    (candidate.interactionMode === 'neutral' || candidate.interactionMode === 'disputed') &&
    candidate.colorOwnerId === null;
  if (!selectable && !inherited && !neutral) {
    globalThis.console.warn(`Historical feature ${index} has inconsistent interaction metadata; skipping.`);
    return null;
  }

  return {
    type: 'Feature',
    id: candidate.id,
    properties: { name: candidate.properties.name.trim() },
    geometry: {
      type: candidate.geometry.type,
      coordinates: candidate.geometry.coordinates,
    },
    sourceFeatureId: candidate.sourceFeatureId,
    entityId: candidate.entityId,
    colorOwnerId: candidate.colorOwnerId,
    isSelectable: candidate.isSelectable,
    interactionMode: candidate.interactionMode,
    provenanceId: candidate.provenanceId,
  };
}

function createCanonicalCandidate(inputBytes, snapshotId) {
  const input = parseJson(inputBytes, 'Input geometry');
  if (
    !isRecord(input) ||
    input.type !== 'FeatureCollection' ||
    input.snapshotId !== snapshotId ||
    input.asOf !== SNAPSHOT_DATES[snapshotId] ||
    !Array.isArray(input.features) ||
    input.features.length === 0 ||
    input.features.length > MAX_FEATURES ||
    !Array.isArray(input.replacedModernSourceFeatureIds)
  ) {
    throw new Error('Input geometry is not a bounded historical FeatureCollection for the exact snapshot date.');
  }
  const replacedModernSourceFeatureIds = [];
  const replacedIds = new Set();
  for (const value of input.replacedModernSourceFeatureIds) {
    if (!isBoundedString(value) || replacedIds.has(value)) {
      throw new Error('Input geometry replaced-modern IDs are invalid or duplicated.');
    }
    replacedIds.add(value);
    replacedModernSourceFeatureIds.push(value);
  }
  replacedModernSourceFeatureIds.sort();

  const features = [];
  const sourceFeatureIds = new Set();
  input.features.forEach((candidate, index) => {
    const feature = normalizeHistoricalFeature(candidate, index);
    if (feature === null) {
      return;
    }
    if (sourceFeatureIds.has(feature.sourceFeatureId)) {
      globalThis.console.warn(`Historical feature ${index} duplicates a sourceFeatureId; skipping.`);
      return;
    }
    sourceFeatureIds.add(feature.sourceFeatureId);
    features.push(feature);
  });
  if (features.length === 0) {
    throw new Error('Input geometry contains no valid historical features.');
  }
  features.sort((left, right) => left.sourceFeatureId.localeCompare(right.sourceFeatureId));
  return Buffer.from(
    `${JSON.stringify({
      type: 'FeatureCollection',
      snapshotId,
      asOf: SNAPSHOT_DATES[snapshotId],
      replacedModernSourceFeatureIds,
      features,
    })}\n`,
    'utf8',
  );
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function createCandidateArtifacts(bundle) {
  const sourceInputBytes =
    bundle.preparation.mode === 'vector-extraction'
      ? bundle.preparation.extractedInputBytes
      : bundle.inputBytes;
  const outputBytes = createCanonicalCandidate(sourceInputBytes, bundle.snapshotId);
  const output = parseJson(outputBytes, 'Generated output');
  const reviewValue = {
    snapshotId: bundle.snapshotId,
    asOf: SNAPSHOT_DATES[bundle.snapshotId],
    preparationMode: bundle.preparation.mode,
    coverageRegions: [...REGION_IDS],
    sourceManifestSha256: calculateSha256(bundle.sourceManifestBytes),
    sourceApprovalSha256: calculateSha256(bundle.sourceApprovalBytes),
    inputGeometrySha256: calculateSha256(bundle.inputBytes),
    outputOverlaySha256: calculateSha256(outputBytes),
    featureCount: output.features.length,
    replacedModernSourceFeatureIds: output.replacedModernSourceFeatureIds,
  };
  const reviewJsonBytes = Buffer.from(`${JSON.stringify(reviewValue, null, 2)}\n`, 'utf8');
  const reviewHtmlBytes = Buffer.from(
    `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(
      bundle.snapshotId,
    )} historical review</title></head><body><main><h1>${escapeHtml(
      bundle.snapshotId,
    )} historical candidate</h1><p>As of ${escapeHtml(
      SNAPSHOT_DATES[bundle.snapshotId],
    )}</p><p>Mode: ${escapeHtml(bundle.preparation.mode)}</p><p>Features: ${escapeHtml(
      output.features.length,
    )}</p><p>Output SHA-256: ${escapeHtml(
      reviewValue.outputOverlaySha256,
    )}</p></main></body></html>\n`,
    'utf8',
  );
  return { outputBytes, reviewJsonBytes, reviewHtmlBytes };
}

function assertDistinctPaths(paths) {
  const normalized = paths.map((path) => resolve(path).toLowerCase());
  if (new Set(normalized).size !== normalized.length) {
    throw new Error('Input, output, review JSON, review HTML, and approval paths must be distinct.');
  }
}

async function readCandidatePaths(options) {
  const inputPath = requirePathOption(options, 'input', '--input');
  const outputPath = requirePathOption(options, 'output', '--output');
  const reviewOutputPath = requirePathOption(options, 'reviewOutput', '--review-output');
  const reviewHtmlPath = requirePathOption(options, 'reviewHtml', '--review-html');
  const sourceApprovalPath = requirePathOption(
    options,
    'sourceApproval',
    '--source-approval',
  );
  assertDistinctPaths([
    inputPath,
    outputPath,
    reviewOutputPath,
    reviewHtmlPath,
    sourceApprovalPath,
  ]);
  return { inputPath, outputPath, reviewOutputPath, reviewHtmlPath };
}

function readFactualApproval(value, snapshotId) {
  if (!isRecord(value) || value.snapshotId !== snapshotId) {
    throw new Error('Factual approval snapshot ID is invalid.');
  }
  readReviewer(value.reviewer, 'Factual approval');
  readExactRegionalDecisions(value.regionalDecisions, 'factual');
  for (const field of [
    'sourceApprovalSha256',
    'sourceManifestSha256',
    'inputGeometrySha256',
    'outputOverlaySha256',
    'reviewJsonSha256',
    'reviewHtmlSha256',
  ]) {
    if (!isSha256(value[field])) {
      throw new Error(`Factual approval ${field} is invalid.`);
    }
  }
  return value;
}

async function validateFactualApproval(options, bundle, currentBytes) {
  if (options.approval === null) {
    return;
  }
  const approvalPath = resolveArgumentPath(options.approval);
  const approvalBytes = await readBoundedFile(approvalPath, 'Factual approval');
  const approval = readFactualApproval(
    parseJson(approvalBytes, 'Factual approval'),
    bundle.snapshotId,
  );
  if (
    approval.sourceApprovalSha256 !== calculateSha256(bundle.sourceApprovalBytes)
  ) {
    throw new Error('Factual approval source approval SHA-256 drifted.');
  }
  const comparisons = [
    [approval.sourceManifestSha256, bundle.sourceManifestBytes, 'source manifest'],
    [approval.inputGeometrySha256, bundle.inputBytes, 'input geometry'],
    [approval.outputOverlaySha256, currentBytes.outputBytes, 'output overlay'],
    [approval.reviewJsonSha256, currentBytes.reviewJsonBytes, 'review JSON'],
    [approval.reviewHtmlSha256, currentBytes.reviewHtmlBytes, 'review HTML'],
  ];
  for (const [expected, bytes, label] of comparisons) {
    if (expected !== calculateSha256(bytes)) {
      throw new Error(`Factual approval ${label} SHA-256 drifted.`);
    }
  }
}

async function generateOrCheck(options) {
  if (options.approval !== null && !options.check) {
    throw new Error('--approval is only valid with --check for factual promotion verification.');
  }
  await readCandidatePaths(options);
  const bundle = await validateSourceApprovalBundle(options);
  const paths = await readCandidatePaths(options);
  if (resolve(bundle.inputPath).toLowerCase() !== resolve(paths.inputPath).toLowerCase()) {
    throw new Error('--input must identify the exact input geometry bound by the source manifest.');
  }
  const expected = createCandidateArtifacts(bundle);

  if (options.check) {
    const [outputBytes, reviewJsonBytes, reviewHtmlBytes] = await Promise.all([
      readBoundedFile(paths.outputPath, 'Candidate output'),
      readBoundedFile(paths.reviewOutputPath, 'Review JSON'),
      readBoundedFile(paths.reviewHtmlPath, 'Review HTML'),
    ]);
    await validateFactualApproval(options, bundle, {
      outputBytes,
      reviewJsonBytes,
      reviewHtmlBytes,
    });
    if (!outputBytes.equals(expected.outputBytes)) {
      throw new Error('Candidate output differs from deterministic current output.');
    }
    if (!reviewJsonBytes.equals(expected.reviewJsonBytes)) {
      throw new Error('Review JSON differs from deterministic current review.');
    }
    if (!reviewHtmlBytes.equals(expected.reviewHtmlBytes)) {
      throw new Error('Review HTML differs from deterministic current review.');
    }
    globalThis.console.info(`${bundle.snapshotId} exact offline check passed.`);
    return;
  }

  await Promise.all([
    writeFile(paths.outputPath, expected.outputBytes),
    writeFile(paths.reviewOutputPath, expected.reviewJsonBytes),
    writeFile(paths.reviewHtmlPath, expected.reviewHtmlBytes),
  ]);
  globalThis.console.info(`${bundle.snapshotId} candidate generated from approved ${bundle.preparation.mode} evidence.`);
}

async function run() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  const selectedModes = [
    options.validateSources,
    options.validateSourceApproval,
    options.check,
  ].filter(Boolean).length;
  if (selectedModes > 1) {
    throw new Error('Choose only one of --validate-sources, --validate-source-approval, or --check.');
  }

  if (options.validateSources) {
    const bundle = await validateSourceReadiness(options);
    globalThis.console.info(
      `${bundle.snapshotId} ${bundle.preparation.mode} source readiness passed offline.`,
    );
    return;
  }
  if (options.validateSourceApproval) {
    const bundle = await validateSourceApprovalBundle(options);
    globalThis.console.info(
      `${bundle.snapshotId} durable source approval passed for ${bundle.preparation.mode}.`,
    );
    return;
  }
  await generateOrCheck(options);
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unknown historical preparation error.';
  globalThis.console.error(`Historical snapshot preparation failed: ${message}`);
  process.exitCode = 1;
});
