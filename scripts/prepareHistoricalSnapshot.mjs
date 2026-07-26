import { Buffer } from 'node:buffer';
import { createHash, randomUUID } from 'node:crypto';
import {
  lstat,
  open,
  readFile,
  realpath,
  rename,
  stat,
  unlink,
} from 'node:fs/promises';
import process from 'node:process';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { inflateRawSync } from 'node:zlib';

const SNAPSHOT_DATES = Object.freeze({
  '1492': '1492-01-03',
  '1700': '1700-01-01',
  '1815': '1815-12-31',
  '1914': '1914-07-27',
});
const CANDIDATE_PACKET_DATE_CONTRACTS = Object.freeze({
  '1492': Object.freeze({
    displayDate: '1492-01-03',
    displayCalendar: 'julian',
    normalizedAsOf: '1492-01-12',
    normalizedCalendar: 'proleptic-gregorian',
    dayBoundary: 'start-of-day',
    validityInterval: 'half-open',
  }),
  '1700': Object.freeze({
    displayDate: '1700-01-01',
    displayCalendar: 'product-label-only',
    normalizedAsOf: null,
    normalizedCalendar: null,
    dayBoundary: null,
    validityInterval: 'pending-review',
  }),
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
const CANDIDATE_PACKET_SNAPSHOT_IDS = new Set(['1492', '1700']);
const EXPECTED_CLIOPATRIA_RECORDS = Object.freeze({
  '1492': Object.freeze([
    [6999, 'source-records/cliopatria-06999-principality-of-wallachia.geojson', 'b95de46813c4da365bda4df30433933e2d5b5fa71d46da6d94bf1c07288bd119', 'Principality of Wallachia', 1422, 1528, 'Q171393', 'ro_wallachia_principality_2'],
    [7055, 'source-records/cliopatria-07055-republic-of-ragusa.geojson', 'b84946b0fc1a72399c4c7a16f9538144c7d48dc18601426bb3ad0d763b2a61e0', 'Republic of Ragusa', 1429, 1771, 'Q208169', ''],
    [7513, 'source-records/cliopatria-07513-crown-of-aragon.geojson', '6bf2e42e4711bdd1abe2ff2213b7831653c61dc197450125532fe84c3316bb86', 'Crown of Aragon', 1482, 1496, 'Q204920', 'es_aragon_crown'],
    [7546, 'source-records/cliopatria-07546-kalmar-union.geojson', 'b26ccdf784ad1e4d2511b86cd4c989fe30b29098d917b3a96ab45e66710bb072', 'Kalmar Union', 1482, 1501, 'Q62623', 'sv_kalmar_union'],
    [7584, 'source-records/cliopatria-07584-principality-of-moldavia.geojson', '6ec099918b51167f0405af3af2263239ce9b548730044a9a4b8b95de5c8cefe5', 'Principality of Moldavia', 1487, 1506, 'Q10957559', 'md_moldavia_principality_1'],
    [7602, 'source-records/cliopatria-07602-crown-of-castile.geojson', '2167497938700daf9a2f05320703b4c386b4cfd8b76967ff98760b286a69a5f5', 'Crown of Castile', 1492, 1496, 'Q217196', 'es_castile_crown'],
    [7603, 'source-records/cliopatria-07603-kingdom-of-hungary.geojson', 'f10b1909ad41cac35935461c6ac9875b905f2a9a9199c763a539bf5b903c1c7f', 'Kingdom of Hungary', 1492, 1520, 'Q171150', 'hu_later_dyn'],
    [7618, 'source-records/cliopatria-07618-house-of-jagiellon.geojson', '34f8697ef911be2d713c111e2c6fbddcb8ce68bc45750fa0ca2c0a0eb90e0a64', 'House of Jagiellon', 1492, 1496, 'Q194355', 'pl_jagiellonian_dyn'],
    [7629, 'source-records/cliopatria-07629-ottoman-empire.geojson', '36ea35349f7f6b7c2ad9238230d37e20fe465fce02d71c99f6ea04773db34dbf', 'Ottoman Empire', 1492, 1501, 'Q12560', 'tr_ottoman_emp_1'],
    [7630, 'source-records/cliopatria-07630-republic-of-venice.geojson', '543a603edecea9069211e4a97d10f711a096cf8a1b631a1cea848c1ff847d6ea', 'Republic of Venice', 1492, 1501, 'Q4948', 'it_venetian_rep_3'],
    [7635, 'source-records/cliopatria-07635-kingdom-of-portugal.geojson', '857d8f75038f6f3b62167b7e16976e86b6749b038a7b4eeb44ec269b5ddb48a6', 'Kingdom of Portugal', 1492, 1496, 'Q45670', 'pt_portugal_k'],
  ]),
  '1700': Object.freeze([
    [7055, 'source-records/cliopatria-07055-republic-of-ragusa.geojson', 'b84946b0fc1a72399c4c7a16f9538144c7d48dc18601426bb3ad0d763b2a61e0', 'Republic of Ragusa', 1429, 1771, 'Q208169', ''],
    [8862, 'source-records/cliopatria-08862-kingdom-of-portugal.geojson', '488a637d9d2be213a63ba3cd42e696cba2191ec85a06f9f084118fb944802cef', 'Kingdom of Portugal', 1640, 1705, 'Q45670', 'pt_portuguese_emp_2'],
    [9098, 'source-records/cliopatria-09098-denmark-norway.geojson', '6d3b67d7069314c8cebae907bea8e55892cb630f1c53c10ea56dc60aa7622d3d', 'Denmark-Norway', 1670, 1708, 'Q62651', 'dk_denmark_norway'],
    [9236, 'source-records/cliopatria-09236-swedish-empire.geojson', '165000dc87401e796a24fc3aed483a48875c66cae9c1090130115efadd619608', 'Swedish Empire', 1683, 1701, 'Q215443', 'sv_swedish_emp'],
    [9355, 'source-records/cliopatria-09355-principality-of-moldavia.geojson', 'e32a4820c248565a93c0003c79bb9e87968bb382e49f00d79f1df09eea0815d3', 'Principality of Moldavia', 1696, 1712, 'Q10957559', 'md_moldavia_principality_2'],
    [9361, 'source-records/cliopatria-09361-principality-of-wallachia.geojson', 'c0de94701c54ab62a481d82cf5f19e08fb164e3913a4e0950f0387b88611b8c4', 'Principality of Wallachia', 1696, 1717, 'Q171393', 'ro_wallachia_principality_2'],
    [9390, 'source-records/cliopatria-09390-republic-of-venice.geojson', '421bae94ed6a7d54a814f25c1c242ed2fe70c152d2635a7238019999df65db86', 'Republic of Venice', 1700, 1708, 'Q4948', 'it_venetian_rep_4'],
    [9391, 'source-records/cliopatria-09391-ottoman-empire.geojson', '8f533edfcbbfc68f67ce1d2246cdf0adb56d38f1a192cb64b8b0e2aca2f0cfb8', 'Ottoman Empire', 1700, 1705, 'Q12560', 'tr_ottoman_emp_3'],
    [9396, 'source-records/cliopatria-09396-habsburg-monarchy.geojson', '88bcd6139c96c3521c0623663a6d4049508c551bfdf1ba0b40122a8624f0b367', 'Habsburg Monarchy', 1700, 1701, 'Q66504140', 'at_habsburg_2'],
    [9397, 'source-records/cliopatria-09397-polish-lithuanian-commonwealth.geojson', '37b2dcb583874fa6f0b65d4496b4929d12d6bc6535043c0e16e2597e8278dfce', 'Polish-Lithuanian Commonwealth', 1700, 1701, 'Q172107', 'pl_poland_lithuania_commonwealth'],
    [9402, 'source-records/cliopatria-09402-kingdom-of-spain.geojson', '0e0e148c245e0e882a4e90843f22dac3a07caac9e632bca0585a9781c2c2c308', 'Kingdom of Spain', 1700, 1701, 'Q29', 'es_spanish_emp_1'],
  ]),
});
const HARVARD_SELECTED_FILES = Object.freeze([
  'a00000021.gdbindexes', 'a00000021.gdbtable', 'a00000021.gdbtablx', 'a00000021.spx',
  'a00000022.gdbindexes', 'a00000022.gdbtable', 'a00000022.gdbtablx', 'a00000022.spx',
  'a00000023.gdbindexes', 'a00000023.gdbtable', 'a00000023.gdbtablx', 'a00000023.spx',
  'a00000024.gdbindexes', 'a00000024.gdbtable', 'a00000024.gdbtablx', 'a00000024.spx',
]);
const TRACE_RECONSTRUCTION_RULE = '1494 Lithuanian geometry plus only territory explicitly marked lost in 1494; exclude territories marked only as losses in 1503 or 1522.';
const TRACE_SHARED_ARC_RULE = 'Build the Crown-GDL shared arc once and polygonize both identities from it.';
const REVIEWER_HASH_INVALIDATION_RULE =
  'Changing any listed byte invalidates every future approval.';
const TRACE_LINE_CLASSES = Object.freeze([
  'Crown exterior', 'Crown-GDL shared boundary', 'GDL exterior as of 1494',
  '1494 loss boundary', '1503 loss boundary', '1522 loss boundary',
  'fiefs dependencies and administrative lines',
]);
const MOSAIC_1700_ALLOWLIST = Object.freeze([7055, 9361, 9355, 9390, 9396, 9391]);
const MOSAIC_1700_CAVEATS = Object.freeze([
  'Harvard Ottoman geometry substantially includes tributary Wallachia, Moldavia, and Ragusa.',
  'Harvard Military Frontier polygons cross parent boundaries and are not inserted into the candidate.',
  'The January 1, 1700 Karlowitz frontier was not fully demarcated in every sector.',
  'Server-generated Harvard bundle ZIP bytes are not assumed stable; the local per-file inventory is authoritative for this packet.',
]);
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const MD5_PATTERN = /^[0-9a-f]{32}$/;
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
const CLIOPATRIA_LICENSE_SHA256 =
  '62ca7e92dee4ebe402372d5e64f87845de445a6c0e5d76fddb68b3e33739d1a6';
const CLIOPATRIA_README_SHA256 =
  '25a2723e607dd03b01cfa0c9e0ecc83ea3e4c227198bd77faee04c3646be46b8';

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

function hasExactKeys(value, expectedKeys) {
  if (!isRecord(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  return arraysMatch(actual, expected);
}

function canonicalizeJson(value) {
  if (Array.isArray(value)) return value.map(canonicalizeJson);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalizeJson(value[key])]),
  );
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

function pathCollisionKey(value) {
  return value.normalize('NFKC').toLowerCase();
}

function normalizeLocalPath(value) {
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

function calculateMd5(bytes) {
  return createHash('md5').update(bytes).digest('hex');
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

function readHashReference(value, label, expectedKeys = ['path', 'sha256']) {
  if (!hasExactKeys(value, expectedKeys)) {
    throw new Error(`${label} must use the exact expected schema.`);
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
  const collisionKeys = new Set();
  let previousPath = '';
  for (const candidate of value) {
    if (!isRecord(candidate)) {
      throw new Error(`${label} contains an invalid member.`);
    }
    const path = normalizeLocalPath(candidate.path);
    const collisionKey = path === null ? null : pathCollisionKey(path);
    if (
      path === null ||
      collisionKey === null ||
      collisionKeys.has(collisionKey) ||
      !isSha256(candidate.sha256) ||
      path <= previousPath
    ) {
      throw new Error(`${label} member paths must be normalized, collision-free, unique, and sorted.`);
    }
    collisionKeys.add(collisionKey);
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

function readBlockers(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 32) {
    throw new Error('Blocked source manifest must contain explicit blockers.');
  }
  const blockers = [];
  const seen = new Set();
  for (const item of value) {
    if (!isBoundedString(item) || seen.has(item)) {
      throw new Error('Blocked source manifest contains an invalid or duplicate blocker.');
    }
    seen.add(item);
    blockers.push(item);
  }
  return blockers;
}

function hasOnlyNullApprovalFields(value) {
  if (!isRecord(value)) {
    return false;
  }
  const expectedFields = [
    'factual',
    'productionReadiness',
    'reviewerSignature',
    'sourceRights',
    'topology',
  ];
  const fields = Object.keys(value).sort();
  return (
    fields.length === expectedFields.length &&
    fields.every((field, index) => field === expectedFields[index] && value[field] === null)
  );
}

function arraysMatch(left, right) {
  return (
    Array.isArray(left) &&
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function readStringArray(value, label, allowEmpty = true) {
  if (!Array.isArray(value) || value.length > 64 || (!allowEmpty && value.length === 0)) {
    throw new Error(`${label} must be a bounded ordered string array.`);
  }
  const result = [];
  const seen = new Set();
  for (const item of value) {
    if (!isBoundedString(item) || seen.has(item)) {
      throw new Error(`${label} contains an invalid or duplicate value.`);
    }
    seen.add(item);
    result.push(item);
  }
  return result;
}

function hasOnlyNullRegionalApprovals(value) {
  if (!isRecord(value)) {
    return false;
  }
  const expectedFields = ['factual', 'rights', 'topology'];
  const fields = Object.keys(value).sort();
  return (
    fields.length === expectedFields.length &&
    fields.every((field, index) => field === expectedFields[index] && value[field] === null)
  );
}

function assertRegionContract(region, expected, label) {
  if (
    !isRecord(region) ||
    region.disposition !== 'blocked' ||
    !arraysMatch(region.entityIds, expected.entityIds) ||
    !arraysMatch(region.colorOwnerIds, expected.colorOwnerIds) ||
    !arraysMatch(region.sourceFeatureIds, expected.sourceFeatureIds)
  ) {
    throw new Error(`${label} identity, color-owner, source, or disposition contract drifted.`);
  }
}

function validateCandidateIdentityContract(value, snapshotId) {
  const regionsById = new Map(value.regions.map((region) => [region.regionId, region]));
  if (value.regions.some((region) => region.disposition !== 'blocked')) {
    throw new Error('Candidate packet with zero approvals must keep all six regions blocked.');
  }
  if (snapshotId === '1492') {
    assertRegionContract(
      regionsById.get('poland'),
      {
        entityIds: ['hist:kingdom-of-poland'],
        colorOwnerIds: ['hist:kingdom-of-poland'],
        sourceFeatureIds: [],
      },
      '1492 Poland',
    );
    assertRegionContract(
      regionsById.get('lithuania'),
      {
        entityIds: ['hist:grand-duchy-of-lithuania'],
        colorOwnerIds: ['hist:grand-duchy-of-lithuania'],
        sourceFeatureIds: [],
      },
      '1492 Lithuania',
    );
    assertRegionContract(
      regionsById.get('hungary'),
      {
        entityIds: ['hist:kingdom-of-hungary'],
        colorOwnerIds: ['hist:kingdom-of-hungary'],
        sourceFeatureIds: ['cliopatria:v0.2.0:feature-index:7603'],
      },
      '1492 Hungary',
    );
    assertRegionContract(
      regionsById.get('balkans'),
      {
        entityIds: [
          'hist:ottoman-empire',
          'hist:republic-of-venice',
          'hist:republic-of-ragusa',
          'hist:principality-of-wallachia',
          'hist:principality-of-moldavia',
        ],
        colorOwnerIds: [
          'hist:ottoman-empire',
          'hist:republic-of-venice',
          'hist:republic-of-ragusa',
          'hist:principality-of-wallachia',
          'hist:principality-of-moldavia',
        ],
        sourceFeatureIds: [
          'cliopatria:v0.2.0:feature-index:7629',
          'cliopatria:v0.2.0:feature-index:7630',
          'cliopatria:v0.2.0:feature-index:7055',
          'cliopatria:v0.2.0:feature-index:6999',
          'cliopatria:v0.2.0:feature-index:7584',
        ],
      },
      '1492 Balkans',
    );
    assertRegionContract(
      regionsById.get('iberia'),
      {
        entityIds: [
          'hist:crown-of-castile',
          'hist:crown-of-aragon',
          'hist:kingdom-of-portugal',
          'hist:kingdom-of-navarre',
        ],
        colorOwnerIds: [
          'hist:crown-of-castile',
          'hist:crown-of-aragon',
          'hist:kingdom-of-portugal',
          'hist:kingdom-of-navarre',
        ],
        sourceFeatureIds: [],
      },
      '1492 Iberia',
    );
    assertRegionContract(
      regionsById.get('scandinavia'),
      {
        entityIds: [
          'hist:kingdom-of-denmark',
          'hist:kingdom-of-norway',
          'hist:kingdom-of-sweden',
        ],
        colorOwnerIds: [
          'hist:kingdom-of-denmark',
          'hist:kingdom-of-norway',
          'hist:kingdom-of-sweden',
        ],
        sourceFeatureIds: [],
      },
      '1492 Scandinavia',
    );
  }
  if (snapshotId === '1700') {
    const commonwealth = {
      entityIds: ['hist:polish-lithuanian-commonwealth'],
      colorOwnerIds: ['hist:polish-lithuanian-commonwealth'],
      sourceFeatureIds: ['cliopatria:v0.2.0:feature-index:9397'],
    };
    assertRegionContract(regionsById.get('poland'), commonwealth, '1700 Poland');
    assertRegionContract(regionsById.get('lithuania'), commonwealth, '1700 Lithuania');
    assertRegionContract(
      regionsById.get('hungary'),
      {
        entityIds: ['hist:habsburg-monarchy', 'hist:ottoman-empire'],
        colorOwnerIds: ['hist:habsburg-monarchy', 'hist:ottoman-empire'],
        sourceFeatureIds: [
          'cliopatria:v0.2.0:feature-index:9396',
          'cliopatria:v0.2.0:feature-index:9391',
        ],
      },
      '1700 Hungary',
    );
    assertRegionContract(
      regionsById.get('iberia'),
      {
        entityIds: ['hist:kingdom-of-spain', 'hist:kingdom-of-portugal'],
        colorOwnerIds: ['hist:kingdom-of-spain', 'hist:kingdom-of-portugal'],
        sourceFeatureIds: [
          'cliopatria:v0.2.0:feature-index:9402',
          'cliopatria:v0.2.0:feature-index:8862',
        ],
      },
      '1700 Iberia',
    );
    assertRegionContract(
      regionsById.get('balkans'),
      {
        entityIds: [
          'hist:republic-of-ragusa',
          'hist:principality-of-wallachia',
          'hist:principality-of-moldavia',
          'hist:republic-of-venice',
          'hist:habsburg-monarchy',
          'hist:ottoman-empire',
        ],
        colorOwnerIds: [
          'hist:republic-of-ragusa',
          'hist:principality-of-wallachia',
          'hist:principality-of-moldavia',
          'hist:republic-of-venice',
          'hist:habsburg-monarchy',
          'hist:ottoman-empire',
        ],
        sourceFeatureIds: [
          'cliopatria:v0.2.0:feature-index:7055',
          'cliopatria:v0.2.0:feature-index:9361',
          'cliopatria:v0.2.0:feature-index:9355',
          'cliopatria:v0.2.0:feature-index:9390',
          'cliopatria:v0.2.0:feature-index:9396',
          'cliopatria:v0.2.0:feature-index:9391',
        ],
      },
      '1700 Balkans',
    );
    assertRegionContract(
      regionsById.get('scandinavia'),
      {
        entityIds: ['hist:denmark-norway', 'hist:swedish-empire'],
        colorOwnerIds: ['hist:denmark-norway', 'hist:swedish-empire'],
        sourceFeatureIds: [
          'cliopatria:v0.2.0:feature-index:9098',
          'cliopatria:v0.2.0:feature-index:9236',
        ],
      },
      '1700 Scandinavia',
    );
  }
}

function readCandidateManualTrace(value, snapshotId) {
  if (!hasExactKeys(value.preparation, ['mode', 'reason', 'manualTrace'])) {
    throw new Error('Candidate preparation schema drifted.');
  }
  const manualTrace = value.preparation.manualTrace;
  if (snapshotId === '1700') {
    if (manualTrace !== null) {
      throw new Error('1700 candidate packet must not claim a manual trace.');
    }
    return null;
  }
  if (
    !hasExactKeys(manualTrace, [
      'evidencePath', 'evidenceSha256', 'procedurePath', 'procedureSha256',
      'operatorRecordSha256', 'controlPointsSha256', 'tracedGeoJsonSha256',
    ]) ||
    manualTrace.evidencePath !== 'sources/semkowicz-romer-1929-current-hosted-scan.jpg' ||
    !isSha256(manualTrace.evidenceSha256) ||
    manualTrace.procedurePath !== 'specifications/1492-manual-trace-candidate.json' ||
    !isSha256(manualTrace.procedureSha256) ||
    manualTrace.operatorRecordSha256 !== null ||
    manualTrace.controlPointsSha256 !== null ||
    manualTrace.tracedGeoJsonSha256 !== null ||
    !value.blockers.includes('MANUAL_TRACE_OPERATOR_CONTROL_POINTS_AND_GEOMETRY_MISSING')
  ) {
    throw new Error('1492 manual-trace candidate semantics are incomplete or overclaim readiness.');
  }
  return {
    evidencePath: manualTrace.evidencePath,
    evidenceSha256: manualTrace.evidenceSha256,
    procedurePath: manualTrace.procedurePath,
    procedureSha256: manualTrace.procedureSha256,
  };
}

function readCandidateReviewerPacket(value, snapshotId, isBlocked) {
  if (value.schemaVersion !== 3 && value.packetKind === undefined) {
    return null;
  }
  const expectedDateContract = CANDIDATE_PACKET_DATE_CONTRACTS[snapshotId];
  if (
    !hasExactKeys(value, [
      'schemaVersion', 'packetKind', 'snapshotId', 'asOf', 'dateContract',
      'readinessStatus', 'deliveryCounted', 'snapshotPass', 'productionReady',
      'catalogEligible', 'blockers', 'approvals', 'evidenceArchive', 'inputGeometry',
      'preparation', 'geometryPolicy', 'reviewerPacket', 'regions',
    ]) ||
    value.schemaVersion !== 3 ||
    value.packetKind !== 'candidate-reviewer' ||
    !isBlocked ||
    value.snapshotPass !== false ||
    value.productionReady !== false ||
    value.catalogEligible !== false ||
    expectedDateContract === undefined ||
    !hasExactKeys(value.dateContract, Object.keys(expectedDateContract)) ||
    Object.entries(expectedDateContract).some(
      ([field, expected]) => value.dateContract[field] !== expected,
    ) ||
    !hasOnlyNullApprovalFields(value.approvals) ||
    !hasExactKeys(value.geometryPolicy, [
      'longitudeDomain', 'coverageContainersArePoliticalEntities',
      'sourceBoundaryArcsSeparatedFromGeneratedMaskEdges',
      'generatedMaskEdgesPolitical', 'generatedMaskEdgesSelectable',
      'generatedMaskEdgesExportVisibleAsPoliticalBorders',
    ]) ||
    value.geometryPolicy.longitudeDomain !== '[-180,180]' ||
    value.geometryPolicy.coverageContainersArePoliticalEntities !== false ||
    value.geometryPolicy.sourceBoundaryArcsSeparatedFromGeneratedMaskEdges !== true ||
    value.geometryPolicy.generatedMaskEdgesPolitical !== false ||
    value.geometryPolicy.generatedMaskEdgesSelectable !== false ||
    value.geometryPolicy.generatedMaskEdgesExportVisibleAsPoliticalBorders !== false ||
    !hasExactKeys(value.reviewerPacket, [
      'status', 'hashInvalidationRule', 'artifacts', 'sourceRightsDecision',
      'factualDecision', 'topologyDecision', 'reviewerSignature',
      'productionReadinessDecision',
    ]) ||
    value.reviewerPacket.status !== 'candidate-blocked' ||
    value.reviewerPacket.hashInvalidationRule !== REVIEWER_HASH_INVALIDATION_RULE ||
    value.reviewerPacket.sourceRightsDecision !== null ||
    value.reviewerPacket.factualDecision !== null ||
    value.reviewerPacket.topologyDecision !== null ||
    value.reviewerPacket.reviewerSignature !== null ||
    value.reviewerPacket.productionReadinessDecision !== null ||
    (snapshotId === '1700' &&
      !value.blockers.includes('TEMPORAL_SEMANTICS_REVIEW_REQUIRED'))
  ) {
    throw new Error('Candidate reviewer packet must remain hash-bound, blocked, and unapproved.');
  }
  const artifacts = readMemberInventory(
    value.reviewerPacket.artifacts,
    'Candidate reviewer packet artifacts',
  );
  validateCandidateIdentityContract(value, snapshotId);
  const manualTrace = readCandidateManualTrace(value, snapshotId);
  return { dateContract: expectedDateContract, artifacts, manualTrace };
}

function readReviewer(value, label) {
  if (
    !hasExactKeys(value, [
      'name', 'role', 'reviewedOn', 'isExecutor', 'isImplementer',
    ]) ||
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
    const expectedDecisionKeys = kind === 'source'
      ? ['regionId', 'disposition', 'rightsDisposition', 'attribution', 'uncertainties']
      : ['regionId', 'disposition', 'uncertainties'];
    if (
      !hasExactKeys(decision, expectedDecisionKeys) ||
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
  if (!hasExactKeys(value.evidenceArchive, [
    'path', 'sha256', 'memberInventorySha256', 'members',
  ])) {
    throw new Error('Source manifest evidence archive is invalid.');
  }
  const evidenceArchive = {
    ...readHashReference(
      value.evidenceArchive,
      'Evidence archive',
      ['path', 'sha256', 'memberInventorySha256', 'members'],
    ),
    memberInventorySha256: value.evidenceArchive.memberInventorySha256,
    members: readMemberInventory(value.evidenceArchive.members, 'Evidence archive'),
  };
  if (!isSha256(evidenceArchive.memberInventorySha256)) {
    throw new Error('Evidence archive member inventory SHA-256 is invalid.');
  }
  if (!isRecord(value.preparation)) {
    throw new Error('Source manifest preparation mode is invalid.');
  }
  if (value.readinessStatus !== 'blocked' && value.readinessStatus !== 'ready') {
    throw new Error('Source manifest readinessStatus must be explicitly blocked or ready.');
  }
  const isBlocked = value.readinessStatus === 'blocked';
  const requiresCandidatePacket =
    isBlocked && CANDIDATE_PACKET_SNAPSHOT_IDS.has(snapshotId);
  const isSchema2Blocked =
    isBlocked && value.schemaVersion === 2 && value.packetKind === undefined;
  if (
    requiresCandidatePacket &&
    (value.schemaVersion !== 3 || value.packetKind !== 'candidate-reviewer')
  ) {
    throw new Error('1492 and 1700 blocked packets require the exact candidate schema markers.');
  }
  if (!requiresCandidatePacket && isBlocked && !isSchema2Blocked) {
    throw new Error('1815 and 1914 blocked packets require the exact schemaVersion 2 marker.');
  }
  if (!requiresCandidatePacket && isBlocked) {
    const expectedKeys = isSchema2Blocked
      ? [
          'schemaVersion', 'snapshotId', 'asOf', 'calendarBasis', 'readinessStatus',
          'deliveryCounted', 'blockers', 'source', 'evidenceArchive', 'inputGeometry',
          'preparation', 'geometryPolicy', 'regions', 'sourceRecordManifests',
        ]
      : [
          'snapshotId', 'asOf', 'readinessStatus', 'deliveryCounted', 'blockers',
          'evidenceArchive', 'inputGeometry', 'preparation', 'regions',
        ];
    if (!hasExactKeys(value, expectedKeys)) {
      throw new Error('Blocked source manifest schema marker or fields are contradictory.');
    }
  }
  if (
    !isBlocked &&
    !hasExactKeys(value, [
      'snapshotId', 'asOf', 'readinessStatus', 'deliveryCounted', 'evidenceArchive',
      'inputGeometry', 'preparation', 'regions',
    ])
  ) {
    throw new Error('Ready source manifest contains contradictory or extra fields.');
  }
  if (!isBlocked && value.deliveryCounted !== true) {
    throw new Error('Ready source manifest must be explicitly counted as delivered.');
  }
  const inputGeometryKeys = isBlocked
    ? ['path', 'sha256', 'candidateGenerated']
    : ['path', 'sha256'];
  const inputGeometry = readHashReference(
    value.inputGeometry,
    'Input geometry',
    inputGeometryKeys,
  );
  if (isBlocked && value.inputGeometry.candidateGenerated !== false) {
    throw new Error('Blocked inputGeometry must declare candidateGenerated exactly false.');
  }

  let blockers = [];
  let preparation;
  if (isBlocked) {
    const expectedPreparationKeys = requiresCandidatePacket
      ? ['mode', 'reason', 'manualTrace']
      : isSchema2Blocked
        ? ['mode', 'vectorExtractionSpecification', 'manualTrace', 'reason']
        : ['mode', 'reason'];
    if (
      value.deliveryCounted !== false ||
      !hasExactKeys(value.preparation, expectedPreparationKeys) ||
      value.preparation.mode !== 'blocked' ||
      !isBoundedString(value.preparation.reason) ||
      (isSchema2Blocked &&
        (value.preparation.vectorExtractionSpecification !== null ||
          value.preparation.manualTrace !== null))
    ) {
      throw new Error('Blocked source manifest must be non-delivered with an exact blocked preparation schema.');
    }
    blockers = readBlockers(value.blockers);
    preparation = {
      mode: 'blocked',
      reason: value.preparation.reason,
    };
  } else if (
    hasExactKeys(value.preparation, ['mode', 'extractionSpecification']) &&
    value.preparation.mode === 'vector-extraction'
  ) {
    preparation = {
      mode: 'vector-extraction',
      extractionSpecification: readHashReference(
        value.preparation.extractionSpecification,
        'Extraction specification',
      ),
    };
  } else if (
    hasExactKeys(value.preparation, [
      'mode', 'evidence', 'procedure', 'operatorRecord', 'controlPoints',
    ]) &&
    value.preparation.mode === 'manual-trace'
  ) {
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
    throw new Error('Source manifest preparation mode must use one exact vector, manual, or blocked schema.');
  }

  if (!Array.isArray(value.regions) || value.regions.length !== REGION_IDS.length) {
    throw new Error('Source manifest must contain six separate regional rights records.');
  }
  const regions = [];
  const seenRegions = new Set();
  const isCandidatePacket = requiresCandidatePacket;
  let blockedRegionCount = 0;
  for (const region of value.regions) {
    if (!isRecord(region) || !REGION_ID_SET.has(region.regionId) || seenRegions.has(region.regionId)) {
      throw new Error('Source manifest contains a missing, merged, duplicate, or invalid region.');
    }
    seenRegions.add(region.regionId);
    const evidencePath = normalizeLocalPath(region.evidencePath);
    const uncertainties = readUncertainties(region.uncertainties, `source ${region.regionId}`);
    const entityIds = isCandidatePacket
      ? readStringArray(region.entityIds, `source ${region.regionId} entity IDs`, false)
      : [];
    const colorOwnerIds = isCandidatePacket
      ? readStringArray(
          region.colorOwnerIds,
          `source ${region.regionId} color-owner IDs`,
          false,
        )
      : [];
    const sourceFeatureIds = isCandidatePacket
      ? readStringArray(
          region.sourceFeatureIds,
          `source ${region.regionId} source-feature IDs`,
        )
      : [];
    const hasExpectedRights = isBlocked
      ? region.rightsDisposition === 'review-required'
      : region.rightsDisposition === 'approved';
    const hasExpectedDisposition = isBlocked
      ? isCandidatePacket
        ? region.disposition === 'blocked'
        : region.disposition === 'blocked' || region.disposition === 'conditional'
      : region.disposition === 'approved';
    if (
      (isCandidatePacket &&
        !hasExactKeys(region, [
          'regionId', 'coverageContainerId', 'coverageContainerCreatesPoliticalEntity',
          'disposition', 'rightsDisposition', 'license', 'attribution', 'retrievedOn',
          'evidencePath', 'evidenceSha256', 'entityIds', 'colorOwnerIds',
          'sourceFeatureIds', 'uncertainties', 'approvals',
        ])) ||
      (!isCandidatePacket &&
        !isSchema2Blocked &&
        !hasExactKeys(region, [
          'regionId', 'disposition', 'evidencePath', 'evidenceSha256',
          'rightsDisposition', 'license', 'attribution', 'retrievedOn',
          'uncertainties',
        ])) ||
      evidencePath === null ||
      (isCandidatePacket && evidencePath !== `reviews/${snapshotId}-${region.regionId}.json`) ||
      (isCandidatePacket &&
        (region.coverageContainerId !== `coverage:${snapshotId}:${region.regionId}` ||
          region.coverageContainerCreatesPoliticalEntity !== false)) ||
      !isSha256(region.evidenceSha256) ||
      !hasExpectedRights ||
      !hasExpectedDisposition ||
      !isBoundedString(region.license) ||
      !(region.attribution === null || isBoundedString(region.attribution)) ||
      !isIsoDate(region.retrievedOn) ||
      uncertainties === null ||
      (isCandidatePacket && !hasOnlyNullRegionalApprovals(region.approvals))
    ) {
      throw new Error(`Source rights record for ${region.regionId} is not complete for its readiness state.`);
    }
    if (region.disposition === 'blocked') {
      blockedRegionCount += 1;
    }
    regions.push({
      ...region,
      evidencePath,
      uncertainties,
      entityIds,
      colorOwnerIds,
      sourceFeatureIds,
    });
  }
  if (REGION_IDS.some((regionId) => !seenRegions.has(regionId))) {
    throw new Error('Source manifest is missing one of the six required regions.');
  }
  if (isBlocked && blockedRegionCount === 0) {
    throw new Error('Blocked source manifest must identify at least one blocked region.');
  }
  const reviewerPacket = readCandidateReviewerPacket(value, snapshotId, isBlocked);

  return {
    snapshotId,
    asOf: expectedDate,
    readinessStatus: isBlocked ? 'blocked' : 'ready',
    blockers,
    evidenceArchive,
    inputGeometry,
    preparation,
    regions,
    reviewerPacket,
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
  const collisionKeys = new Set();
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
    const collisionKey = normalizedPath === null ? null : pathCollisionKey(normalizedPath);
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
      collisionKey === null ||
      collisionKeys.has(collisionKey) ||
      path <= previousPath ||
      uncompressedSize > MAX_MEMBER_BYTES
    ) {
      throw new Error('Evidence archive member metadata, path, encryption, compression, or order is not canonical.');
    }
    collisionKeys.add(collisionKey);
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

function validateReviewerSupplementalSemantics(review, snapshotId, regionId) {
  const commonKeys = [
    'snapshotId', 'regionId', 'packetStatus', 'rightsDisposition',
    'factualDisposition', 'topologyDisposition', 'reviewer', 'approvals',
    'disposition', 'geometryRoute', 'entityIds', 'colorOwnerIds',
    'sourceFeatureIds', 'blockers',
  ];
  const allowedExtras = {
    '1492:poland': ['unionContext'],
    '1492:lithuania': ['unionContext', 'reconstructionRule'],
    '1492:hungary': [],
    '1492:balkans': [],
    '1492:iberia': ['excludedEntityIds', 'statusRule', 'comparisonSourceFeatureIds'],
    '1492:scandinavia': ['excludedEntityIds', 'unionContext', 'rejectedSourceFeatureIds'],
    '1700:poland': [],
    '1700:lithuania': [],
    '1700:hungary': [],
    '1700:balkans': ['priority', 'statusRules'],
    '1700:iberia': [],
    '1700:scandinavia': [],
  }[`${snapshotId}:${regionId}`];
  if (
    allowedExtras === undefined ||
    !hasExactKeys(review, [...commonKeys, ...allowedExtras])
  ) {
    throw new Error(`Reviewer record schema drifted for ${snapshotId} ${regionId}.`);
  }
  if (
    snapshotId === '1492' &&
    (regionId === 'poland' || regionId === 'lithuania') &&
    review.unionContext !== 'Jagiellonian personal union only; no merged geometry.'
  ) {
    throw new Error(`Reviewer union semantics drifted for ${snapshotId} ${regionId}.`);
  }
  if (
    snapshotId === '1492' &&
    regionId === 'lithuania' &&
    review.reconstructionRule !== TRACE_RECONSTRUCTION_RULE
  ) {
    throw new Error('1492 Lithuania reconstruction semantics drifted.');
  }
  if (
    snapshotId === '1492' &&
    regionId === 'iberia' &&
    (!arraysMatch(review.excludedEntityIds, ['hist:kingdom-of-spain', 'hist:emirate-of-granada']) ||
      review.statusRule !== 'Granada is incorporated into Castile at the intended snapshot.' ||
      !arraysMatch(review.comparisonSourceFeatureIds, [
        'cliopatria:v0.2.0:feature-index:7602',
        'cliopatria:v0.2.0:feature-index:7513',
        'cliopatria:v0.2.0:feature-index:7635',
      ]))
  ) {
    throw new Error('1492 Iberia supplemental semantics drifted.');
  }
  if (
    snapshotId === '1492' &&
    regionId === 'scandinavia' &&
    (!arraysMatch(review.excludedEntityIds, ['hist:kalmar-union']) ||
      review.unionContext !== 'Kalmar Union is context only and cannot own or duplicate geometry.' ||
      !arraysMatch(review.rejectedSourceFeatureIds, [
        'cliopatria:v0.2.0:feature-index:7546',
      ]))
  ) {
    throw new Error('1492 Scandinavia supplemental semantics drifted.');
  }
  if (
    snapshotId === '1700' &&
    regionId === 'balkans' &&
    (!arraysMatch(review.priority, review.entityIds) ||
      !arraysMatch(review.statusRules, [
        'Wallachia, Moldavia, and Ragusa remain separate; tributary relationships are metadata.',
        'Morea remains Venetian in the candidate interpretation.',
        'Harvard/Oxford CC0 layers are comparison evidence, not the candidate geometry.',
      ]))
  ) {
    throw new Error('1700 Balkans priority or status semantics drifted.');
  }
}

function validateReviewerRegionRecord(member, manifestRegion, snapshotId) {
  const review = parseJson(member.bytes, `Reviewer record ${manifestRegion.regionId}`);
  if (
    !isRecord(review) ||
    review.snapshotId !== snapshotId ||
    review.regionId !== manifestRegion.regionId ||
    review.packetStatus !== 'candidate-blocked' ||
    review.disposition !== manifestRegion.disposition ||
    review.rightsDisposition !== null ||
    review.factualDisposition !== null ||
    review.topologyDisposition !== null ||
    review.reviewer !== null ||
    !hasOnlyNullApprovalFields(review.approvals) ||
    !arraysMatch(review.entityIds, manifestRegion.entityIds) ||
    !arraysMatch(review.colorOwnerIds, manifestRegion.colorOwnerIds) ||
    !arraysMatch(review.sourceFeatureIds, manifestRegion.sourceFeatureIds) ||
    !arraysMatch(review.blockers, manifestRegion.uncertainties)
  ) {
    throw new Error(
      `Reviewer record semantics drifted from manifest region ${manifestRegion.regionId}.`,
    );
  }
  validateReviewerSupplementalSemantics(review, snapshotId, manifestRegion.regionId);
}

function validateCandidateManualTraceMembers(manifest, membersByPath) {
  const manualTrace = manifest.reviewerPacket?.manualTrace;
  if (manualTrace === null || manualTrace === undefined) {
    return;
  }
  const evidenceMember = membersByPath.get(manualTrace.evidencePath);
  const procedureMember = membersByPath.get(manualTrace.procedurePath);
  if (
    evidenceMember === undefined ||
    evidenceMember.sha256 !== manualTrace.evidenceSha256 ||
    procedureMember === undefined ||
    procedureMember.sha256 !== manualTrace.procedureSha256
  ) {
    throw new Error('Manual-trace evidence or procedure member drifted.');
  }
  const procedure = parseJson(procedureMember.bytes, 'Manual-trace procedure');
  if (
    !hasExactKeys(procedure, [
      'version', 'mode', 'sourceImageSha256', 'reconstructionRule',
      'sharedArcRule', 'requiredLineClasses', 'operatorRecordSha256',
      'controlPointsSha256', 'tracedGeoJsonSha256', 'approvalStatus',
    ]) ||
    procedure.version !== 1 ||
    procedure.mode !== 'manual-trace-candidate-only' ||
    procedure.sourceImageSha256 !== manualTrace.evidenceSha256 ||
    procedure.reconstructionRule !== TRACE_RECONSTRUCTION_RULE ||
    procedure.sharedArcRule !== TRACE_SHARED_ARC_RULE ||
    !arraysMatch(procedure.requiredLineClasses, TRACE_LINE_CLASSES) ||
    procedure.operatorRecordSha256 !== null ||
    procedure.controlPointsSha256 !== null ||
    procedure.tracedGeoJsonSha256 !== null ||
    procedure.approvalStatus !== 'pending'
  ) {
    throw new Error('Manual-trace procedure semantics overclaim readiness or drifted.');
  }
}

function expectedCandidateMemberPaths(snapshotId) {
  const paths = [
    'README.txt',
    'licenses/cliopatria-v0.2.0-LICENSE.md',
    'metadata/cliopatria-v0.2.0-README.md',
    'research/historical-source-evidence-matrix.md',
    `source-locks/${snapshotId}-source-locks.json`,
    ...REGION_IDS.map((regionId) => `reviews/${snapshotId}-${regionId}.json`),
    ...EXPECTED_CLIOPATRIA_RECORDS[snapshotId].map(([, path]) => path),
  ];
  if (snapshotId === '1492') {
    paths.push(
      'metadata/cnig-15094-download-response.html',
      'sources/semkowicz-romer-1929-current-hosted-scan.jpg',
      'specifications/1492-date-and-identity.json',
      'specifications/1492-manual-trace-candidate.json',
    );
  } else {
    paths.push(
      'metadata/harvard-data-gdb-inventory.tsv',
      'metadata/harvard-dataverse-gaviqv.json',
      'specifications/1700-six-record-cliopatria-mosaic.json',
      ...HARVARD_SELECTED_FILES.map((name) => `comparison/harvard-data-gdb/${name}`),
    );
  }
  return paths.sort();
}

function expectedReviewerArtifactPaths(snapshotId) {
  return [
    ...REGION_IDS.map((regionId) => `reviews/${snapshotId}-${regionId}.json`),
    `source-locks/${snapshotId}-source-locks.json`,
    ...(snapshotId === '1492'
      ? [
          'specifications/1492-date-and-identity.json',
          'specifications/1492-manual-trace-candidate.json',
        ]
      : ['specifications/1700-six-record-cliopatria-mosaic.json']),
  ].sort();
}

function requireJsonMember(membersByPath, path) {
  const member = membersByPath.get(path);
  if (member === undefined) {
    throw new Error(`Required candidate JSON member is missing: ${path}.`);
  }
  return { member, value: parseJson(member.bytes, path) };
}

function validateCliopatriaSourceRecord(member, expected) {
  const [index, path, expectedSha, name, fromYear, toYear, wikidata, seshatId] = expected;
  if (member.path !== path || member.sha256 !== expectedSha) {
    throw new Error(`Cliopatria source record lock drifted for C#${index}.`);
  }
  const feature = parseJson(member.bytes, path);
  const canonicalBytes = Buffer.from(JSON.stringify(canonicalizeJson(feature)), 'utf8');
  if (
    !canonicalBytes.equals(member.bytes) ||
    !hasExactKeys(feature, ['type', 'properties', 'geometry']) ||
    feature.type !== 'Feature' ||
    !hasExactKeys(feature.properties, [
      'Name', 'FromYear', 'ToYear', 'Area', 'Type', 'Wikipedia', 'Wikidata',
      'SeshatID', 'Components', 'MemberOf',
    ]) ||
    feature.properties.Name !== name ||
    feature.properties.FromYear !== fromYear ||
    feature.properties.ToYear !== toYear ||
    feature.properties.Wikidata !== wikidata ||
    feature.properties.SeshatID !== seshatId ||
    feature.properties.Type !== 'POLITY' ||
    typeof feature.properties.Area !== 'number' ||
    !Number.isFinite(feature.properties.Area) ||
    !isBoundedString(feature.properties.Wikipedia) ||
    typeof feature.properties.Components !== 'string' ||
    typeof feature.properties.MemberOf !== 'string' ||
    !hasExactKeys(feature.geometry, ['type', 'coordinates']) ||
    !(
      (feature.geometry.type === 'Polygon' &&
        isPolygonCoordinates(feature.geometry.coordinates)) ||
      (feature.geometry.type === 'MultiPolygon' &&
        isMultiPolygonCoordinates(feature.geometry.coordinates))
    )
  ) {
    throw new Error(`Cliopatria source record semantics drifted for C#${index}.`);
  }
}

function validateCliopatriaSourceLock(lock, snapshotId, membersByPath) {
  if (
    !hasExactKeys(lock, [
      'datasetId', 'version', 'revision', 'downloadUrl', 'archiveSha256',
      'archiveByteLength', 'extractedDataSha256', 'extractedDataByteLength',
      'fullArchiveCommitted', 'fullArchiveExclusionReason', 'selectedRecords',
      'licenseDisposition', 'attribution',
    ]) ||
    lock.datasetId !== 'cliopatria' ||
    lock.version !== 'v0.2.0' ||
    lock.revision !== 'ad28a691b7c07c1fca89d0e0636d324667d2a258' ||
    lock.downloadUrl !== 'https://raw.githubusercontent.com/Seshat-Global-History-Databank/cliopatria/v0.2.0/cliopatria.geojson.zip' ||
    lock.archiveSha256 !== 'd01ae3a20d358cc5d54f69d9d725d390767d9c8759ac89ad6f90c58d106f3370' ||
    lock.archiveByteLength !== 44231317 ||
    lock.extractedDataSha256 !== '5df3b5868cfab8f76030853fa2346ed3cd71171ad807b6f72d783ee2dce6839e' ||
    lock.extractedDataByteLength !== 165608072 ||
    lock.fullArchiveCommitted !== false ||
    !isBoundedString(lock.fullArchiveExclusionReason) ||
    lock.licenseDisposition !== null ||
    lock.attribution !== null ||
    !Array.isArray(lock.selectedRecords) ||
    lock.selectedRecords.length !== EXPECTED_CLIOPATRIA_RECORDS[snapshotId].length
  ) {
    throw new Error('Cliopatria source-lock schema or immutable dataset identity drifted.');
  }
  const licenseMember = membersByPath.get('licenses/cliopatria-v0.2.0-LICENSE.md');
  const readmeMember = membersByPath.get('metadata/cliopatria-v0.2.0-README.md');
  if (
    licenseMember?.sha256 !== CLIOPATRIA_LICENSE_SHA256 ||
    readmeMember?.sha256 !== CLIOPATRIA_README_SHA256
  ) {
    throw new Error('Pinned Cliopatria license or README bytes drifted.');
  }
  EXPECTED_CLIOPATRIA_RECORDS[snapshotId].forEach((expected, recordIndex) => {
    const selected = lock.selectedRecords[recordIndex];
    const [index, path, expectedSha, name, fromYear, toYear, wikidata, seshatId] = expected;
    if (
      !hasExactKeys(selected, [
        'index', 'path', 'sha256', 'name', 'fromYear', 'toYear', 'wikidata',
        'seshatId',
      ]) ||
      selected.index !== index ||
      selected.path !== path ||
      selected.sha256 !== expectedSha ||
      selected.name !== name ||
      selected.fromYear !== fromYear ||
      selected.toYear !== toYear ||
      selected.wikidata !== wikidata ||
      selected.seshatId !== seshatId
    ) {
      throw new Error(`Cliopatria selected-record lock drifted for C#${index}.`);
    }
    const member = membersByPath.get(path);
    if (member === undefined) {
      throw new Error(`Cliopatria source record member is missing for C#${index}.`);
    }
    validateCliopatriaSourceRecord(member, expected);
  });
}

function validate1492Specifications(membersByPath, dateContract) {
  const identity = requireJsonMember(
    membersByPath,
    'specifications/1492-date-and-identity.json',
  ).value;
  if (
    !hasExactKeys(identity, [
      'snapshotId', 'dateContract', 'polandLithuania', 'iberia', 'scandinavia',
    ]) ||
    identity.snapshotId !== '1492' ||
    JSON.stringify(identity.dateContract) !== JSON.stringify(dateContract) ||
    !hasExactKeys(identity.polandLithuania, [
      'entityIds', 'separateColorOwners', 'jagiellonianPersonalUnionContextOnly',
    ]) ||
    !arraysMatch(identity.polandLithuania.entityIds, [
      'hist:kingdom-of-poland', 'hist:grand-duchy-of-lithuania',
    ]) ||
    identity.polandLithuania.separateColorOwners !== true ||
    identity.polandLithuania.jagiellonianPersonalUnionContextOnly !== true ||
    !hasExactKeys(identity.iberia, [
      'entityIds', 'granadaDisposition', 'spainSuperEntityAllowed',
    ]) ||
    !arraysMatch(identity.iberia.entityIds, [
      'hist:crown-of-castile', 'hist:crown-of-aragon',
      'hist:kingdom-of-portugal', 'hist:kingdom-of-navarre',
    ]) ||
    identity.iberia.granadaDisposition !== 'incorporated-into-castile' ||
    identity.iberia.spainSuperEntityAllowed !== false ||
    !hasExactKeys(identity.scandinavia, ['entityIds', 'kalmarUnionContextOnly']) ||
    !arraysMatch(identity.scandinavia.entityIds, [
      'hist:kingdom-of-denmark', 'hist:kingdom-of-norway',
      'hist:kingdom-of-sweden',
    ]) ||
    identity.scandinavia.kalmarUnionContextOnly !== true
  ) {
    throw new Error('1492 temporal or identity specification semantics drifted.');
  }
}

function validate1700Specification(membersByPath, dateContract) {
  const specification = requireJsonMember(
    membersByPath,
    'specifications/1700-six-record-cliopatria-mosaic.json',
  ).value;
  if (
    !hasExactKeys(specification, [
      'version', 'snapshotId', 'dateContract', 'mode', 'allowlist', 'priority',
      'sourceRoles', 'caveats', 'approvals',
    ]) ||
    specification.version !== 1 ||
    specification.snapshotId !== '1700' ||
    JSON.stringify(specification.dateContract) !== JSON.stringify(dateContract) ||
    specification.mode !== 'candidate-vector-selection-not-production' ||
    !arraysMatch(specification.allowlist, MOSAIC_1700_ALLOWLIST) ||
    !arraysMatch(specification.priority, MOSAIC_1700_ALLOWLIST) ||
    !hasExactKeys(specification.sourceRoles, ['cliopatria', 'harvardOxford']) ||
    specification.sourceRoles.cliopatria !== 'candidate geometry' ||
    specification.sourceRoles.harvardOxford !== 'CC0 comparison evidence only' ||
    !arraysMatch(specification.caveats, MOSAIC_1700_CAVEATS) ||
    !hasOnlyNullApprovalFields(specification.approvals)
  ) {
    throw new Error('1700 candidate allowlist, priority, caveat, or temporal semantics drifted.');
  }
}

function parseHarvardInventory(member) {
  if (member === undefined) {
    throw new Error('Harvard FileGDB inventory member is missing.');
  }
  const text = member.bytes.toString('utf8');
  if (!text.endsWith('\n')) {
    throw new Error('Harvard FileGDB inventory is not canonically newline-terminated.');
  }
  const lines = text.slice(0, -1).split('\n');
  if (
    lines.shift() !== 'dataFileId\tpath\tbyteLength\tmd5\tsha256' ||
    lines.length !== 247
  ) {
    throw new Error('Harvard FileGDB inventory header or file count drifted.');
  }
  const rows = new Map();
  const dataFileIds = new Set();
  let previousPath = '';
  let totalBytes = 0;
  for (const line of lines) {
    const fields = line.split('\t');
    if (fields.length !== 5) {
      throw new Error('Harvard FileGDB inventory row schema drifted.');
    }
    const [dataFileIdText, path, byteLengthText, md5, sha256] = fields;
    const dataFileId = Number(dataFileIdText);
    const byteLength = Number(byteLengthText);
    if (
      !Number.isSafeInteger(dataFileId) ||
      dataFileId <= 0 ||
      dataFileIds.has(dataFileId) ||
      normalizeLocalPath(path) !== path ||
      path.includes('/') ||
      path <= previousPath ||
      rows.has(path) ||
      !Number.isSafeInteger(byteLength) ||
      byteLength < 0 ||
      !MD5_PATTERN.test(md5) ||
      !isSha256(sha256)
    ) {
      throw new Error(`Harvard FileGDB inventory row is invalid for ${path}.`);
    }
    dataFileIds.add(dataFileId);
    rows.set(path, { dataFileId, byteLength, md5, sha256 });
    previousPath = path;
    totalBytes += byteLength;
  }
  if (totalBytes !== 27_186_561) {
    throw new Error('Harvard FileGDB inventory total byte count drifted.');
  }
  return { rows, totalBytes };
}

function validateHarvardSelectedPayloads(membersByPath) {
  const inventoryMember = membersByPath.get('metadata/harvard-data-gdb-inventory.tsv');
  const inventory = parseHarvardInventory(inventoryMember);
  for (const name of HARVARD_SELECTED_FILES) {
    const record = inventory.rows.get(name);
    const member = membersByPath.get(`comparison/harvard-data-gdb/${name}`);
    if (
      record === undefined ||
      member === undefined ||
      member.bytes.length !== record.byteLength ||
      member.sha256 !== record.sha256 ||
      calculateMd5(member.bytes) !== record.md5
    ) {
      throw new Error(`Harvard selected payload digest drifted for ${name}.`);
    }
  }
  return inventory;
}

function validateSourceLockMember(membersByPath, snapshotId) {
  const { value: lock } = requireJsonMember(
    membersByPath,
    `source-locks/${snapshotId}-source-locks.json`,
  );
  const expectedTopKeys = snapshotId === '1492'
    ? ['snapshotId', 'cliopatria', 'semkowiczRomer', 'cnig15094']
    : ['snapshotId', 'cliopatria', 'harvardOxford'];
  if (!hasExactKeys(lock, expectedTopKeys) || lock.snapshotId !== snapshotId) {
    throw new Error(`${snapshotId} source-lock top-level schema drifted.`);
  }
  validateCliopatriaSourceLock(lock.cliopatria, snapshotId, membersByPath);
  if (snapshotId === '1492') {
    if (
      !hasExactKeys(lock.semkowiczRomer, [
        'title', 'publicationYear', 'currentHostedScanSha256',
        'currentHostedScanByteLength', 'currentHostedScanDimensions',
        'authoritativeCatalogRecord', 'authoritativeArchiveScanSha256',
        'itemSpecificProductionLicense', 'suitability',
      ]) ||
      lock.semkowiczRomer.title !== 'Polska i Litwa za Jagiellonów (w. XV)' ||
      lock.semkowiczRomer.publicationYear !== 1929 ||
      lock.semkowiczRomer.currentHostedScanSha256 !== '955293f5b80ee2ca9574574fcb0d3710fc78c3d0bf4f59de5be2e21edb9bdb0b' ||
      membersByPath.get('sources/semkowicz-romer-1929-current-hosted-scan.jpg')?.sha256 !==
        '955293f5b80ee2ca9574574fcb0d3710fc78c3d0bf4f59de5be2e21edb9bdb0b' ||
      lock.semkowiczRomer.currentHostedScanByteLength !== 1689543 ||
      !arraysMatch(lock.semkowiczRomer.currentHostedScanDimensions, [2560, 2195]) ||
      lock.semkowiczRomer.authoritativeCatalogRecord !== null ||
      lock.semkowiczRomer.authoritativeArchiveScanSha256 !== null ||
      lock.semkowiczRomer.itemSpecificProductionLicense !== null ||
      lock.semkowiczRomer.suitability !== 'conditional-manual-trace-candidate-only' ||
      !hasExactKeys(lock.cnig15094, [
        'productId', 'title', 'advertisedFormat', 'downloadUrl',
        'capturedResponseSha256', 'capturedResponseByteLength',
        'capturedResponseMediaType', 'productArchiveSha256',
        'memberInventorySha256', 'productionSuitability', 'suitability',
      ]) ||
      lock.cnig15094.productId !== 15094 ||
      lock.cnig15094.capturedResponseSha256 !== '19cf7de8b30423769656b9b4d2fd6831eea7c61853a0d670266ec50023d67f03' ||
      membersByPath.get('metadata/cnig-15094-download-response.html')?.sha256 !==
        '19cf7de8b30423769656b9b4d2fd6831eea7c61853a0d670266ec50023d67f03' ||
      lock.cnig15094.capturedResponseByteLength !== 68775 ||
      lock.cnig15094.capturedResponseMediaType !== 'text/html' ||
      lock.cnig15094.productArchiveSha256 !== null ||
      lock.cnig15094.memberInventorySha256 !== null ||
      lock.cnig15094.productionSuitability !== null
    ) {
      throw new Error('1492 source-lock provenance or pending-rights semantics drifted.');
    }
  } else {
    const inventory = validateHarvardSelectedPayloads(membersByPath);
    if (
      !hasExactKeys(lock.harvardOxford, [
        'doi', 'version', 'license', 'metadataSha256', 'comparisonOnly',
        'payloadAuthenticatedToDataverseMetadata', 'authenticatedFileCount',
        'authenticatedTotalBytes', 'authenticatedInventorySha256',
        'generatedBundleSha256', 'generatedBundleByteStable',
        'selectedPhysicalPayloads', 'rightsApproval', 'factualApproval',
        'topologyApproval',
      ]) ||
      lock.harvardOxford.doi !== '10.7910/DVN/GAVIQV' ||
      lock.harvardOxford.version !== '1.0' ||
      lock.harvardOxford.license !== 'CC0-1.0' ||
      lock.harvardOxford.metadataSha256 !== '4d9d545a93223b5394cfc026aac95d858701858228121d4b3bb266024e527143' ||
      membersByPath.get('metadata/harvard-dataverse-gaviqv.json')?.sha256 !==
        '4d9d545a93223b5394cfc026aac95d858701858228121d4b3bb266024e527143' ||
      membersByPath.get('metadata/harvard-data-gdb-inventory.tsv')?.sha256 !==
        'b348fbc52a2089dfe9e5f0568754d6a2ee56899f101711cd1cf917aae550fa3a' ||
      lock.harvardOxford.comparisonOnly !== true ||
      lock.harvardOxford.payloadAuthenticatedToDataverseMetadata !== true ||
      lock.harvardOxford.authenticatedFileCount !== inventory.rows.size ||
      lock.harvardOxford.authenticatedTotalBytes !== inventory.totalBytes ||
      lock.harvardOxford.authenticatedInventorySha256 !==
        'b348fbc52a2089dfe9e5f0568754d6a2ee56899f101711cd1cf917aae550fa3a' ||
      lock.harvardOxford.generatedBundleSha256 !== null ||
      lock.harvardOxford.generatedBundleByteStable !== false ||
      !arraysMatch(lock.harvardOxford.selectedPhysicalPayloads, HARVARD_SELECTED_FILES) ||
      lock.harvardOxford.rightsApproval !== null ||
      lock.harvardOxford.factualApproval !== null ||
      lock.harvardOxford.topologyApproval !== null
    ) {
      throw new Error('1700 Harvard comparison provenance or approval semantics drifted.');
    }
  }
}

function validateCandidateArchiveSemantics(manifest, archive, membersByPath, snapshotId) {
  if (!arraysMatch(archive.inventory.map(({ path }) => path), expectedCandidateMemberPaths(snapshotId))) {
    throw new Error(`${snapshotId} candidate archive artifact set drifted.`);
  }
  if (
    !arraysMatch(
      manifest.reviewerPacket.artifacts.map(({ path }) => path),
      expectedReviewerArtifactPaths(snapshotId),
    )
  ) {
    throw new Error(`${snapshotId} reviewer artifact set drifted.`);
  }
  validateSourceLockMember(membersByPath, snapshotId);
  if (snapshotId === '1492') {
    validate1492Specifications(membersByPath, manifest.reviewerPacket.dateContract);
  } else {
    validate1700Specification(membersByPath, manifest.reviewerPacket.dateContract);
  }
}

async function validateSourceReadiness(options) {
  const snapshotId = requireSnapshot(options);
  const sourcesPath = requirePathOption(options, 'sources', '--sources');
  const sourceManifestBytes = await readBoundedFile(sourcesPath, 'Source manifest');
  const manifest = readSourceManifest(
    parseJson(sourceManifestBytes, 'Source manifest'),
    snapshotId,
  );

  const archivePath = resolveManifestPath(manifest.evidenceArchive.path);
  const archiveBytes = await readBoundedFile(
    archivePath,
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
  if (manifest.reviewerPacket !== null) {
    const artifactsByPath = new Map(
      manifest.reviewerPacket.artifacts.map((artifact) => [artifact.path, artifact]),
    );
    for (const artifact of manifest.reviewerPacket.artifacts) {
      const member = membersByPath.get(artifact.path);
      if (member === undefined || member.sha256 !== artifact.sha256) {
        throw new Error(`Candidate reviewer artifact drifted for ${artifact.path}.`);
      }
    }
    for (const region of manifest.regions) {
      const member = membersByPath.get(region.evidencePath);
      const artifact = artifactsByPath.get(region.evidencePath);
      if (
        member === undefined ||
        artifact === undefined ||
        artifact.sha256 !== member.sha256
      ) {
        throw new Error(`Reviewer record is not fully packet-bound for ${region.regionId}.`);
      }
      validateReviewerRegionRecord(member, region, snapshotId);
    }
    validateCandidateManualTraceMembers(manifest, membersByPath);
    validateCandidateArchiveSemantics(manifest, archive, membersByPath, snapshotId);
  }

  const inputPath =
    options.input === null
      ? resolveManifestPath(manifest.inputGeometry.path)
      : resolveArgumentPath(options.input);
  const inputBytes = await readBoundedFile(inputPath, 'Input geometry');
  if (calculateSha256(inputBytes) !== manifest.inputGeometry.sha256) {
    throw new Error('Input geometry SHA-256 drifted.');
  }
  if (manifest.preparation.mode === 'blocked') {
    const blockedInput = parseJson(inputBytes, 'Blocked candidate input');
    const expectedKeys = manifest.reviewerPacket === null
      ? [
          'type', 'snapshotId', 'asOf', 'readinessStatus', 'candidateGeometryStatus',
          'reason', 'coverageContainersCreatePoliticalEntities', 'longitudeDomain',
          'sourceBoundaryArcsSeparatedFromGeneratedMaskEdges',
          'generatedMaskEdgesPresent', 'replacedModernSourceFeatureIds', 'features',
          'blockers',
        ]
      : [
          'type', 'snapshotId', 'asOf', 'dateContract', 'readinessStatus',
          'candidateGeometryStatus', 'reason',
          'coverageContainersCreatePoliticalEntities', 'longitudeDomain',
          'sourceBoundaryArcsSeparatedFromGeneratedMaskEdges',
          'generatedMaskEdgesPresent', 'replacedModernSourceFeatureIds', 'features',
          'blockers',
        ];
    const inputBlockers = isRecord(blockedInput)
      ? readBlockers(blockedInput.blockers)
      : [];
    const candidateDateMismatch =
      manifest.reviewerPacket !== null &&
      (!isRecord(blockedInput) ||
        !isRecord(blockedInput.dateContract) ||
        !hasExactKeys(
          blockedInput.dateContract,
          Object.keys(manifest.reviewerPacket.dateContract),
        ) ||
        Object.entries(manifest.reviewerPacket.dateContract).some(
          ([field, expected]) => blockedInput.dateContract[field] !== expected,
        ));
    if (
      !hasExactKeys(blockedInput, expectedKeys) ||
      blockedInput.type !== 'FeatureCollection' ||
      blockedInput.snapshotId !== snapshotId ||
      blockedInput.asOf !== SNAPSHOT_DATES[snapshotId] ||
      blockedInput.readinessStatus !== 'blocked' ||
      blockedInput.candidateGeometryStatus !== 'not-generated' ||
      !isBoundedString(blockedInput.reason) ||
      blockedInput.coverageContainersCreatePoliticalEntities !== false ||
      blockedInput.longitudeDomain !== '[-180,180]' ||
      blockedInput.sourceBoundaryArcsSeparatedFromGeneratedMaskEdges !== true ||
      blockedInput.generatedMaskEdgesPresent !== false ||
      !Array.isArray(blockedInput.replacedModernSourceFeatureIds) ||
      blockedInput.replacedModernSourceFeatureIds.length !== 0 ||
      !Array.isArray(blockedInput.features) ||
      blockedInput.features.length !== 0 ||
      !arraysMatch(inputBlockers, manifest.blockers) ||
      candidateDateMismatch
    ) {
      throw new Error('Blocked input schema, blocker list, or non-promotable state drifted.');
    }
  }

  let preparation;
  if (manifest.preparation.mode === 'blocked') {
    preparation = {
      mode: 'blocked',
      reason: manifest.preparation.reason,
    };
  } else if (manifest.preparation.mode === 'vector-extraction') {
    const specificationMember = membersByPath.get(
      manifest.preparation.extractionSpecification.path,
    );
    if (
      specificationMember === undefined ||
      specificationMember.sha256 !== manifest.preparation.extractionSpecification.sha256
    ) {
      throw new Error('Vector extraction specification is not bound to a canonical archive member.');
    }
    const specificationBytes = specificationMember.bytes;
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
    const references = [
      ['Manual trace evidence', manifest.preparation.evidence],
      ['Manual trace procedure', manifest.preparation.procedure],
      ['Manual trace operator record', manifest.preparation.operatorRecord],
      ['Manual trace control points', manifest.preparation.controlPoints],
    ];
    const preparationMembers = references.map(([label, reference]) => {
      const member = membersByPath.get(reference.path);
      if (member === undefined || member.sha256 !== reference.sha256) {
        throw new Error(`${label} is not bound to a canonical archive member.`);
      }
      return member.bytes;
    });
    preparation = {
      mode: 'manual-trace',
      evidenceBytes: preparationMembers[0],
      procedureBytes: preparationMembers[1],
      operatorRecordBytes: preparationMembers[2],
      controlPointBytes: preparationMembers[3],
    };
  }

  return {
    snapshotId,
    sourcesPath,
    sourceManifestBytes,
    manifest,
    archivePath,
    archiveBytes,
    archive,
    inputPath,
    inputBytes,
    preparation,
  };
}

function readSourceApproval(value, snapshotId) {
  if (
    !hasExactKeys(value, [
      'snapshotId', 'reviewer', 'regionalDecisions', 'sourceManifestSha256',
      'evidenceArchiveSha256', 'memberInventorySha256', 'memberInventory',
      'inputGeometrySha256', 'preparation',
    ]) ||
    value.snapshotId !== snapshotId
  ) {
    throw new Error('Source approval snapshot ID or schema is invalid.');
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
    hasExactKeys(value.preparation, ['mode', 'extractionSpecificationSha256']) &&
    value.preparation.mode === 'vector-extraction' &&
    isSha256(value.preparation.extractionSpecificationSha256)
  ) {
    preparation = {
      mode: 'vector-extraction',
      extractionSpecificationSha256:
        value.preparation.extractionSpecificationSha256,
    };
  } else if (
    hasExactKeys(value.preparation, [
      'mode', 'evidenceSha256', 'procedureSha256', 'operatorRecordSha256',
      'controlPointSha256',
    ]) &&
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
  if (readiness.preparation.mode === 'blocked') {
    throw new Error(
      `${readiness.snapshotId} blocked source packet cannot receive source approval or generate a candidate.`,
    );
  }
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

function filesystemPathKey(path) {
  return resolve(path).normalize('NFKC').toLowerCase();
}

async function lstatIfPresent(path) {
  try {
    return await lstat(path);
  } catch (error) {
    if (isRecord(error) && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function inspectFilesystemPath(path, label, mustExist) {
  const absolutePath = resolve(path);
  const lexicalKey = filesystemPathKey(absolutePath);
  const missingSegments = [];
  let cursor = absolutePath;
  let entry = await lstatIfPresent(cursor);
  while (entry === null) {
    const parent = dirname(cursor);
    if (parent === cursor) {
      throw new Error(`${label} has no existing filesystem ancestor.`);
    }
    missingSegments.unshift(basename(cursor));
    cursor = parent;
    entry = await lstatIfPresent(cursor);
  }
  if (mustExist && missingSegments.length > 0) {
    throw new Error(`${label} does not exist.`);
  }

  let component = cursor;
  while (true) {
    const componentEntry = await lstat(component);
    if (componentEntry.isSymbolicLink()) {
      throw new Error(`${label} uses a symbolic-link or junction alias.`);
    }
    const parent = dirname(component);
    if (parent === component) break;
    component = parent;
  }

  if (missingSegments.length === 0 && !entry.isFile()) {
    throw new Error(`${label} must identify a regular file.`);
  }
  if (
    missingSegments.length > 0 &&
    (missingSegments.length > 1 || !entry.isDirectory())
  ) {
    throw new Error(`${label} parent directory must already exist.`);
  }
  const canonicalBase = await realpath(cursor);
  const canonicalPath = join(canonicalBase, ...missingSegments);
  // bigint: true is required, not cosmetic. The NTFS file ID is
  // (sequenceNumber << 48) | mftRecordNumber; as a JS Number it loses low bits past
  // 2^53, so two distinct files can round to the same dev:ino and be reported as a
  // false hard-link alias. Temp-dir churn recycles MFT records, which made this fail
  // in bursts and then go quiet. Measured 191/800 collisions as Number, 0/800 as BigInt.
  const fileIdentity = missingSegments.length === 0
    ? await stat(absolutePath, { bigint: true })
    : null;
  return {
    path: absolutePath,
    lexicalKey,
    canonicalKey: filesystemPathKey(canonicalPath),
    identityKey: fileIdentity === null
      ? null
      : `${String(fileIdentity.dev)}:${String(fileIdentity.ino)}`,
  };
}

function assertNoPathKeyCollisions(entries, field) {
  const seen = new Map();
  for (const entry of entries) {
    const key = entry[field];
    if (key === null) continue;
    const prior = seen.get(key);
    if (prior !== undefined) {
      throw new Error(`${entry.label} aliases ${prior} by ${field}.`);
    }
    seen.set(key, entry.label);
  }
}

async function assertGenerationPathIsolation(bundle, paths, options) {
  const factualApprovalPath = options.approval === null
    ? null
    : resolveArgumentPath(options.approval);
  const fileEntries = [
    ['Source manifest', bundle.sourcesPath, true],
    ['Evidence ZIP', bundle.archivePath, true],
    ['Input geometry', bundle.inputPath, true],
    ['Source approval', bundle.sourceApprovalPath, true],
    ...(factualApprovalPath === null
      ? []
      : [['Factual approval', factualApprovalPath, true]]),
    ['Candidate output', paths.outputPath, options.check],
    ['Review JSON', paths.reviewOutputPath, options.check],
    ['Review HTML', paths.reviewHtmlPath, options.check],
  ];
  const inspected = [];
  for (const [label, path, mustExist] of fileEntries) {
    inspected.push({
      label,
      ...(await inspectFilesystemPath(path, label, mustExist)),
    });
  }
  assertNoPathKeyCollisions(inspected, 'lexicalKey');
  assertNoPathKeyCollisions(inspected, 'canonicalKey');
  assertNoPathKeyCollisions(inspected, 'identityKey');

  const outputLexicalKeys = new Set(
    inspected
      .filter(({ label }) =>
        label === 'Candidate output' || label === 'Review JSON' || label === 'Review HTML')
      .map(({ lexicalKey }) => lexicalKey),
  );
  for (const member of bundle.archive.inventory) {
    const packetMemberKey = filesystemPathKey(resolveManifestPath(member.path));
    if (outputLexicalKeys.has(packetMemberKey)) {
      throw new Error(`Output path aliases evidence packet member ${member.path}.`);
    }
  }
}

async function pathsIdentifySameFile(leftPath, rightPath) {
  const [left, right] = await Promise.all([
    inspectFilesystemPath(leftPath, 'Requested input geometry', true),
    inspectFilesystemPath(rightPath, 'Manifest-bound input geometry', true),
  ]);
  return (
    left.lexicalKey === right.lexicalKey &&
    left.canonicalKey === right.canonicalKey
  );
}

function readCandidatePaths(options) {
  return {
    inputPath: requirePathOption(options, 'input', '--input'),
    outputPath: requirePathOption(options, 'output', '--output'),
    reviewOutputPath: requirePathOption(options, 'reviewOutput', '--review-output'),
    reviewHtmlPath: requirePathOption(options, 'reviewHtml', '--review-html'),
    sourceApprovalPath: requirePathOption(
      options,
      'sourceApproval',
      '--source-approval',
    ),
  };
}

function readFactualApproval(value, snapshotId) {
  if (
    !hasExactKeys(value, [
      'snapshotId', 'reviewer', 'regionalDecisions', 'sourceApprovalSha256',
      'sourceManifestSha256', 'inputGeometrySha256', 'outputOverlaySha256',
      'reviewJsonSha256', 'reviewHtmlSha256',
    ]) ||
    value.snapshotId !== snapshotId
  ) {
    throw new Error('Factual approval snapshot ID or schema is invalid.');
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

async function unlinkIfPresent(path) {
  try {
    await unlink(path);
  } catch (error) {
    if (!isRecord(error) || error.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function writeAtomicTransaction(outputs) {
  const transactionId = randomUUID();
  let committed = false;
  const records = outputs.map(({ path, bytes, label }) => ({
    path,
    bytes,
    label,
    temporaryPath: join(
      dirname(path),
      `.${basename(path)}.${transactionId}.temporary`,
    ),
    backupPath: join(
      dirname(path),
      `.${basename(path)}.${transactionId}.backup`,
    ),
    backupCreated: false,
    installed: false,
  }));

  try {
    for (const record of records) {
      const parent = await stat(dirname(record.path));
      if (!parent.isDirectory()) {
        throw new Error(`${record.label} parent is not a directory.`);
      }
      const handle = await open(record.temporaryPath, 'wx');
      try {
        await handle.writeFile(record.bytes);
        await handle.sync();
      } finally {
        await handle.close();
      }
    }

    for (const record of records) {
      const current = await lstatIfPresent(record.path);
      if (current !== null) {
        if (!current.isFile() || current.isSymbolicLink()) {
          throw new Error(`${record.label} target is not a regular non-symlink file.`);
        }
        await rename(record.path, record.backupPath);
        record.backupCreated = true;
      }
    }

    for (const record of records) {
      await rename(record.temporaryPath, record.path);
      record.installed = true;
    }
    committed = true;

    for (const record of records) {
      if (record.backupCreated) {
        await unlink(record.backupPath);
        record.backupCreated = false;
      }
    }
  } catch (error) {
    if (committed) {
      throw error;
    }
    const rollbackErrors = [];
    for (const record of [...records].reverse()) {
      try {
        if (record.installed) {
          await unlinkIfPresent(record.path);
          record.installed = false;
        }
        if (record.backupCreated) {
          await rename(record.backupPath, record.path);
          record.backupCreated = false;
        }
        await unlinkIfPresent(record.temporaryPath);
        await unlinkIfPresent(record.backupPath);
      } catch (rollbackError) {
        rollbackErrors.push(
          rollbackError instanceof Error
            ? rollbackError.message
            : String(rollbackError),
        );
      }
    }
    if (rollbackErrors.length > 0) {
      throw new Error(
        `Historical output transaction failed and rollback was incomplete: ${rollbackErrors.join('; ')}`,
        { cause: error },
      );
    }
    throw error;
  }
}

async function generateOrCheck(options) {
  if (options.approval !== null && !options.check) {
    throw new Error('--approval is only valid with --check for factual promotion verification.');
  }
  const paths = readCandidatePaths(options);
  const bundle = await validateSourceApprovalBundle(options);
  if (!(await pathsIdentifySameFile(bundle.inputPath, paths.inputPath))) {
    throw new Error('--input must identify the exact input geometry bound by the source manifest.');
  }
  await assertGenerationPathIsolation(bundle, paths, options);
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

  await writeAtomicTransaction([
    {
      path: paths.outputPath,
      bytes: expected.outputBytes,
      label: 'Candidate output',
    },
    {
      path: paths.reviewOutputPath,
      bytes: expected.reviewJsonBytes,
      label: 'Review JSON',
    },
    {
      path: paths.reviewHtmlPath,
      bytes: expected.reviewHtmlBytes,
      label: 'Review HTML',
    },
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
    if (bundle.preparation.mode === 'blocked') {
      globalThis.console.info(
        `${bundle.snapshotId} BLOCKED packet integrity verified offline; readiness and approval remain absent.`,
      );
      throw new Error(
        `${bundle.snapshotId} source readiness remains blocked: ${bundle.manifest.blockers.join(', ')}.`,
      );
    }
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
