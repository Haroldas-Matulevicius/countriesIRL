import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import process from 'node:process';

const FIXED_DOS_TIME = 0;
const FIXED_DOS_DATE = 33;
const UTF8_FLAG = 0x0800;
const STORE_METHOD = 0;
const LOCAL_FILE_SIGNATURE = 0x04034b50;
const CENTRAL_FILE_SIGNATURE = 0x02014b50;
const END_SIGNATURE = 0x06054b50;
const ZIP_VERSION = 20;
const CRC_POLYNOMIAL = 0xedb88320;
const RESEARCH_HANDOFF_SHA256 =
  'b9c16025eb3722b61815d0520feae128d216a13279d1f1806123d58d3100f804';
const ROMER_JPEG_SHA256 =
  '955293f5b80ee2ca9574574fcb0d3710fc78c3d0bf4f59de5be2e21edb9bdb0b';
const CNIG_RESPONSE_SHA256 =
  '19cf7de8b30423769656b9b4d2fd6831eea7c61853a0d670266ec50023d67f03';
const CLIOPATRIA_ARCHIVE_SHA256 =
  'd01ae3a20d358cc5d54f69d9d725d390767d9c8759ac89ad6f90c58d106f3370';
const CLIOPATRIA_DATA_SHA256 =
  '5df3b5868cfab8f76030853fa2346ed3cd71171ad807b6f72d783ee2dce6839e';
const HARVARD_METADATA_SHA256 =
  '4d9d545a93223b5394cfc026aac95d858701858228121d4b3bb266024e527143';
const REGION_IDS = Object.freeze([
  'poland',
  'lithuania',
  'hungary',
  'balkans',
  'iberia',
  'scandinavia',
]);
const HARVARD_SELECTED_FILES = Object.freeze([
  'a00000021.gdbindexes',
  'a00000021.gdbtable',
  'a00000021.gdbtablx',
  'a00000021.spx',
  'a00000022.gdbindexes',
  'a00000022.gdbtable',
  'a00000022.gdbtablx',
  'a00000022.spx',
  'a00000023.gdbindexes',
  'a00000023.gdbtable',
  'a00000023.gdbtablx',
  'a00000023.spx',
  'a00000024.gdbindexes',
  'a00000024.gdbtable',
  'a00000024.gdbtablx',
  'a00000024.spx',
]);
const CLIOPATRIA_RECORDS = Object.freeze({
  '1492': [6999, 7055, 7513, 7546, 7584, 7602, 7603, 7618, 7629, 7630, 7635],
  '1700': [7055, 8862, 9098, 9236, 9355, 9361, 9390, 9391, 9396, 9397, 9402],
});
const EXPECTED_1700_FEATURE_HASHES = Object.freeze({
  7055: 'b84946b0fc1a72399c4c7a16f9538144c7d48dc18601426bb3ad0d763b2a61e0',
  9355: 'e32a4820c248565a93c0003c79bb9e87968bb382e49f00d79f1df09eea0815d3',
  9361: 'c0de94701c54ab62a481d82cf5f19e08fb164e3913a4e0950f0387b88611b8c4',
  9390: '421bae94ed6a7d54a814f25c1c242ed2fe70c152d2635a7238019999df65db86',
  9391: '8f533edfcbbfc68f67ce1d2246cdf0adb56d38f1a192cb64b8b0e2aca2f0cfb8',
  9396: '88bcd6139c96c3521c0623663a6d4049508c551bfdf1ba0b40122a8624f0b367',
});

function parseArguments(args) {
  const options = { snapshot: null, evidenceRoot: null, researchHandoff: null };
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    const value = args[index + 1];
    if (!['--snapshot', '--evidence-root', '--research-handoff'].includes(flag) || value === undefined) {
      throw new Error(`Unknown or incomplete argument: ${String(flag)}`);
    }
    if (flag === '--snapshot') options.snapshot = value;
    if (flag === '--evidence-root') options.evidenceRoot = resolve(value);
    if (flag === '--research-handoff') options.researchHandoff = resolve(value);
    index += 1;
  }
  if (!['1492', '1700'].includes(options.snapshot)) {
    throw new Error('--snapshot must be 1492 or 1700.');
  }
  if (options.evidenceRoot === null || options.researchHandoff === null) {
    throw new Error('--evidence-root and --research-handoff are required.');
  }
  return options;
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function md5(bytes) {
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

function createLocalHeader(member) {
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

function createCentralHeader(member, localOffset) {
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

function createCanonicalZip(membersInput) {
  const members = [...membersInput].sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  const localParts = [];
  const centralParts = [];
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

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

function jsonBytes(value, pretty = true) {
  return Buffer.from(`${JSON.stringify(value, null, pretty ? 2 : 0)}\n`, 'utf8');
}

function canonicalJsonBytes(value) {
  return Buffer.from(JSON.stringify(canonicalize(value)), 'utf8');
}

function addMember(members, path, bytes) {
  if (members.some((member) => member.path === path)) {
    throw new Error(`Duplicate evidence member: ${path}`);
  }
  members.push({ path, bytes: Buffer.from(bytes) });
}

async function readVerified(path, expectedSha256, label) {
  const bytes = await readFile(path);
  const actual = sha256(bytes);
  if (actual !== expectedSha256) {
    throw new Error(`${label} SHA-256 mismatch: expected ${expectedSha256}, got ${actual}.`);
  }
  return bytes;
}

async function loadCliopatria(evidenceRoot) {
  const sourceDir = join(evidenceRoot, 'countriesirl-02-31');
  const archivePath = join(sourceDir, 'cliopatria.geojson.zip');
  const dataPath = join(sourceDir, 'cliopatria.geojson');
  const licensePath = join(sourceDir, 'cliopatria-LICENSE.md');
  const readmePath = join(sourceDir, 'cliopatria-README.md');
  const archiveBytes = await readVerified(
    archivePath,
    CLIOPATRIA_ARCHIVE_SHA256,
    'Cliopatria archive',
  );
  const dataBytes = await readVerified(dataPath, CLIOPATRIA_DATA_SHA256, 'Cliopatria GeoJSON');
  const data = JSON.parse(dataBytes.toString('utf8'));
  if (!Array.isArray(data.features) || data.features.length !== 13_765) {
    throw new Error('Cliopatria feature collection shape changed.');
  }
  return {
    archiveByteLength: archiveBytes.length,
    dataByteLength: dataBytes.length,
    features: data.features,
    licenseBytes: await readFile(licensePath),
    readmeBytes: await readFile(readmePath),
  };
}

function recordPath(index, feature) {
  const name = feature.properties.Name.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-').replaceAll(/^-|-$/g, '');
  return `source-records/cliopatria-${String(index).padStart(5, '0')}-${name}.geojson`;
}

function addCliopatriaRecords(members, snapshotId, cliopatria) {
  const locks = [];
  for (const index of CLIOPATRIA_RECORDS[snapshotId]) {
    const feature = cliopatria.features[index];
    const bytes = canonicalJsonBytes(feature);
    const hash = sha256(bytes);
    if (
      snapshotId === '1700' &&
      EXPECTED_1700_FEATURE_HASHES[index] !== undefined &&
      EXPECTED_1700_FEATURE_HASHES[index] !== hash
    ) {
      throw new Error(`Cliopatria feature C#${index} canonical hash mismatch.`);
    }
    const path = recordPath(index, feature);
    addMember(members, path, bytes);
    locks.push({
      index,
      path,
      sha256: hash,
      name: feature.properties.Name,
      fromYear: feature.properties.FromYear,
      toYear: feature.properties.ToYear,
      wikidata: feature.properties.Wikidata,
      seshatId: feature.properties.SeshatID,
    });
  }
  return locks;
}

function pendingApprovals() {
  return {
    sourceRights: null,
    factual: null,
    topology: null,
    reviewerSignature: null,
    productionReadiness: null,
  };
}

function dateContract(snapshotId) {
  if (snapshotId === '1492') {
    return {
      displayDate: '1492-01-03',
      displayCalendar: 'julian',
      normalizedAsOf: '1492-01-12',
      normalizedCalendar: 'proleptic-gregorian',
      dayBoundary: 'start-of-day',
      validityInterval: 'half-open',
    };
  }
  return {
    displayDate: '1700-01-01',
    displayCalendar: 'historical-local-calendars',
    normalizedAsOf: '1700-01-01',
    normalizedCalendar: 'product-date-lock',
    dayBoundary: 'start-of-day',
    validityInterval: 'half-open',
  };
}

function reviewRecord(snapshotId, regionId) {
  const shared = {
    snapshotId,
    regionId,
    packetStatus: 'candidate-blocked',
    rightsDisposition: null,
    factualDisposition: null,
    topologyDisposition: null,
    reviewer: null,
    approvals: pendingApprovals(),
  };
  if (snapshotId === '1492') {
    const records = {
      poland: {
        disposition: 'conditional',
        geometryRoute: 'manual-trace-reverse-1494',
        entityIds: ['hist:crown-of-kingdom-of-poland'],
        colorOwnerIds: ['hist:crown-of-kingdom-of-poland'],
        unionContext: 'Jagiellonian personal union only; no merged geometry.',
        sourceFeatureIds: [],
        blockers: [
          'AUTHORITATIVE_SEMKOWICZ_ROMER_SCAN_AND_CATALOG_MISSING',
          'ITEM_SPECIFIC_PRODUCTION_RIGHTS_REVIEW_REQUIRED',
          'REVERSE_1494_FACTUAL_REVIEW_REQUIRED',
          'DE_JURE_EFFECTIVE_CONTROL_POLICY_REQUIRED',
          'LINE_STYLE_LEGIBILITY_REVIEW_REQUIRED',
          'SHARED_CROWN_GDL_ARC_TOPOLOGY_REVIEW_REQUIRED',
          'REVIEW_AT_1080PX_REQUIRED',
        ],
      },
      lithuania: {
        disposition: 'conditional',
        geometryRoute: 'manual-trace-reverse-1494',
        entityIds: ['hist:grand-duchy-of-lithuania'],
        colorOwnerIds: ['hist:grand-duchy-of-lithuania'],
        unionContext: 'Jagiellonian personal union only; no merged geometry.',
        sourceFeatureIds: [],
        reconstructionRule:
          '1494 Lithuanian geometry plus only territory explicitly marked lost in 1494; exclude 1503 and 1522 loss regions.',
        blockers: [
          'AUTHORITATIVE_SEMKOWICZ_ROMER_SCAN_AND_CATALOG_MISSING',
          'ITEM_SPECIFIC_PRODUCTION_RIGHTS_REVIEW_REQUIRED',
          'REVERSE_1494_FACTUAL_REVIEW_REQUIRED',
          'DE_JURE_EFFECTIVE_CONTROL_POLICY_REQUIRED',
          'LINE_STYLE_LEGIBILITY_REVIEW_REQUIRED',
          'SHARED_CROWN_GDL_ARC_TOPOLOGY_REVIEW_REQUIRED',
          'REVIEW_AT_1080PX_REQUIRED',
        ],
      },
      hungary: {
        disposition: 'conditional',
        geometryRoute: 'cliopatria-year-precision-candidate',
        entityIds: ['hist:kingdom-of-hungary'],
        colorOwnerIds: ['hist:kingdom-of-hungary'],
        sourceFeatureIds: ['cliopatria:v0.2.0:feature-index:7603'],
        blockers: ['EXACT_DAY_FACTUAL_REVIEW_REQUIRED', 'TOPOLOGY_REVIEW_REQUIRED'],
      },
      balkans: {
        disposition: 'blocked',
        geometryRoute: 'cliopatria-candidate-selection-only',
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
        blockers: [
          'NON_OVERLAPPING_ALLOWLIST_REQUIRED',
          'BOSNIA_SERBIA_CROATIA_STATUS_REVIEW_REQUIRED',
          'EXACT_DAY_FACTUAL_REVIEW_REQUIRED',
        ],
      },
      iberia: {
        disposition: 'conditional',
        geometryRoute: 'cnig-15094-bounded-manual-correction-candidate',
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
        excludedEntityIds: ['hist:kingdom-of-spain', 'hist:emirate-of-granada'],
        statusRule: 'Granada is incorporated into Castile at the intended snapshot.',
        comparisonSourceFeatureIds: [
          'cliopatria:v0.2.0:feature-index:7602',
          'cliopatria:v0.2.0:feature-index:7513',
          'cliopatria:v0.2.0:feature-index:7635',
        ],
        blockers: [
          'CNIG_PRODUCT_ARCHIVE_BYTES_AND_MEMBER_HASHES_MISSING',
          'CNIG_ITEM_RIGHTS_REVIEW_REQUIRED',
          'NAVARRE_EXACT_GEOMETRY_MISSING',
          'EXACT_DAY_CORRECTIONS_AND_GRANADA_TRANSFER_REVIEW_REQUIRED',
          'DIACHRONIC_THEMATIC_GEOMETRY_NOT_EXACT_DAY_PRODUCTION_DATA',
        ],
      },
      scandinavia: {
        disposition: 'blocked',
        geometryRoute: 'separate-constituent-geometry-required',
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
        excludedEntityIds: ['hist:kalmar-union'],
        unionContext: 'Kalmar Union is context only and cannot own or duplicate geometry.',
        sourceFeatureIds: [],
        rejectedSourceFeatureIds: ['cliopatria:v0.2.0:feature-index:7546'],
        blockers: [
          'SEPARATE_DENMARK_NORWAY_SWEDEN_GEOMETRY_MISSING',
          'EXACT_DAY_KALMAR_STATUS_REVIEW_REQUIRED',
        ],
      },
    };
    return { ...shared, ...records[regionId] };
  }

  const records = {
    poland: {
      disposition: 'conditional',
      geometryRoute: 'cliopatria-shared-commonwealth-record',
      entityIds: ['hist:polish-lithuanian-commonwealth'],
      sourceFeatureIds: ['cliopatria:v0.2.0:feature-index:9397'],
      blockers: ['CROWN_GDL_INTERNAL_BOUNDARY_ABSENT', 'INDEPENDENT_CELL_REVIEW_REQUIRED'],
    },
    lithuania: {
      disposition: 'conditional',
      geometryRoute: 'cliopatria-shared-commonwealth-record',
      entityIds: ['hist:polish-lithuanian-commonwealth'],
      sourceFeatureIds: ['cliopatria:v0.2.0:feature-index:9397'],
      blockers: ['CROWN_GDL_INTERNAL_BOUNDARY_ABSENT', 'INDEPENDENT_CELL_REVIEW_REQUIRED'],
    },
    hungary: {
      disposition: 'blocked',
      geometryRoute: 'cliopatria-parent-status-metadata',
      entityIds: ['hist:habsburg-monarchy', 'hist:ottoman-empire'],
      sourceFeatureIds: [
        'cliopatria:v0.2.0:feature-index:9396',
        'cliopatria:v0.2.0:feature-index:9391',
      ],
      blockers: [
        'KINGDOM_OF_HUNGARY_INTERNAL_GEOMETRY_MISSING',
        'TRANSYLVANIA_INTERNAL_GEOMETRY_MISSING',
        'BANAT_FRONTIER_DEMARCATION_UNFINISHED',
      ],
    },
    balkans: {
      disposition: 'conditional',
      geometryRoute: 'cliopatria-six-record-mosaic',
      entityIds: [
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
      priority: [
        'hist:republic-of-ragusa',
        'hist:principality-of-wallachia',
        'hist:principality-of-moldavia',
        'hist:republic-of-venice',
        'hist:habsburg-monarchy',
        'hist:ottoman-empire',
      ],
      statusRules: [
        'Wallachia, Moldavia, and Ragusa remain separate; tributary relationships are metadata.',
        'Morea remains Venetian in the candidate interpretation.',
        'Harvard/Oxford CC0 layers are comparison evidence, not the candidate geometry.',
      ],
      blockers: [
        'SOURCE_RIGHTS_REVIEW_REQUIRED',
        'EXACT_DAY_KARLOWITZ_FRONTIER_REVIEW_REQUIRED',
        'OVERLAP_AND_SHARED_ARC_TOPOLOGY_REVIEW_REQUIRED',
        'TRIBUTARY_STATUS_REVIEW_REQUIRED',
        'REVIEW_AT_1080PX_REQUIRED',
      ],
    },
    iberia: {
      disposition: 'conditional',
      geometryRoute: 'cliopatria-year-precision-candidate',
      entityIds: ['hist:kingdom-of-spain', 'hist:kingdom-of-portugal'],
      sourceFeatureIds: [
        'cliopatria:v0.2.0:feature-index:9402',
        'cliopatria:v0.2.0:feature-index:8862',
      ],
      blockers: ['GIBRALTAR_OLIVENZA_REVIEW_REQUIRED', 'GEOGRAPHIC_SELECTION_REQUIRED'],
    },
    scandinavia: {
      disposition: 'conditional',
      geometryRoute: 'cliopatria-year-precision-candidate',
      entityIds: ['hist:denmark-norway', 'hist:swedish-empire'],
      sourceFeatureIds: [
        'cliopatria:v0.2.0:feature-index:9098',
        'cliopatria:v0.2.0:feature-index:9236',
      ],
      blockers: ['COAST_ISLAND_TOPOLOGY_REVIEW_REQUIRED', 'EASTERN_COVERAGE_REVIEW_REQUIRED'],
    },
  };
  return { ...shared, ...records[regionId] };
}

function sourceLock(snapshotId, cliopatria, recordLocks) {
  return {
    snapshotId,
    cliopatria: {
      datasetId: 'cliopatria',
      version: 'v0.2.0',
      revision: 'ad28a691b7c07c1fca89d0e0636d324667d2a258',
      downloadUrl:
        'https://raw.githubusercontent.com/Seshat-Global-History-Databank/cliopatria/v0.2.0/cliopatria.geojson.zip',
      archiveSha256: CLIOPATRIA_ARCHIVE_SHA256,
      archiveByteLength: cliopatria.archiveByteLength,
      extractedDataSha256: CLIOPATRIA_DATA_SHA256,
      extractedDataByteLength: cliopatria.dataByteLength,
      fullArchiveCommitted: false,
      fullArchiveExclusionReason:
        'The 44 MB source archive exceeds the historical validator 32 MB file bound; exact selected source records are committed instead and readiness remains blocked.',
      selectedRecords: recordLocks,
      licenseDisposition: null,
      attribution: null,
    },
  };
}

async function createHarvardInventory(dataGdbPath) {
  const names = (await readdir(dataGdbPath)).sort();
  const rows = [];
  for (const name of names) {
    const path = join(dataGdbPath, name);
    const fileStat = await stat(path);
    if (!fileStat.isFile()) continue;
    const bytes = await readFile(path);
    rows.push(`${name}\t${bytes.length}\t${md5(bytes)}\t${sha256(bytes)}`);
  }
  return Buffer.from(`path\tbyteLength\tmd5\tsha256\n${rows.join('\n')}\n`, 'utf8');
}

async function create1492Members(options, cliopatria, recordLocks) {
  const members = [];
  const romerBytes = await readVerified(
    join(options.evidenceRoot, 'romer-1494-1522.jpg'),
    ROMER_JPEG_SHA256,
    'Semkowicz/Romer JPEG',
  );
  const cnigResponseBytes = await readVerified(
    join(options.evidenceRoot, 'cnig-15094.zip'),
    CNIG_RESPONSE_SHA256,
    'CNIG product download response',
  );
  const handoffBytes = await readVerified(
    options.researchHandoff,
    RESEARCH_HANDOFF_SHA256,
    'Historical evidence handoff',
  );
  addMember(members, 'README.txt', Buffer.from(
    '1492 candidate/reviewer evidence packet. BLOCKED: no rights, factual, topology, reviewer, or production approval is present.\n',
    'utf8',
  ));
  addMember(members, 'licenses/cliopatria-v0.2.0-LICENSE.md', cliopatria.licenseBytes);
  addMember(members, 'metadata/cliopatria-v0.2.0-README.md', cliopatria.readmeBytes);
  addMember(members, 'metadata/cnig-15094-download-response.html', cnigResponseBytes);
  addMember(members, 'research/historical-source-evidence-matrix.md', handoffBytes);
  addMember(members, 'sources/semkowicz-romer-1929-current-hosted-scan.jpg', romerBytes);
  for (const lock of recordLocks) {
    const feature = cliopatria.features[lock.index];
    addMember(members, lock.path, canonicalJsonBytes(feature));
  }
  const traceProcedure = {
    version: 1,
    mode: 'manual-trace-candidate-only',
    sourceImageSha256: ROMER_JPEG_SHA256,
    reconstructionRule:
      '1494 Lithuanian geometry plus only territory explicitly marked lost in 1494; exclude territories marked only as losses in 1503 or 1522.',
    sharedArcRule: 'Build the Crown-GDL shared arc once and polygonize both identities from it.',
    requiredLineClasses: [
      'Crown exterior',
      'Crown-GDL shared boundary',
      'GDL exterior as of 1494',
      '1494 loss boundary',
      '1503 loss boundary',
      '1522 loss boundary',
      'fiefs dependencies and administrative lines',
    ],
    operatorRecordSha256: null,
    controlPointsSha256: null,
    tracedGeoJsonSha256: null,
    approvalStatus: 'pending',
  };
  addMember(members, 'specifications/1492-manual-trace-candidate.json', jsonBytes(traceProcedure));
  addMember(members, 'specifications/1492-date-and-identity.json', jsonBytes({
    snapshotId: '1492',
    dateContract: dateContract('1492'),
    polandLithuania: {
      entityIds: ['hist:crown-of-kingdom-of-poland', 'hist:grand-duchy-of-lithuania'],
      separateColorOwners: true,
      jagiellonianPersonalUnionContextOnly: true,
    },
    iberia: {
      entityIds: [
        'hist:crown-of-castile',
        'hist:crown-of-aragon',
        'hist:kingdom-of-portugal',
        'hist:kingdom-of-navarre',
      ],
      granadaDisposition: 'incorporated-into-castile',
      spainSuperEntityAllowed: false,
    },
    scandinavia: {
      entityIds: [
        'hist:kingdom-of-denmark',
        'hist:kingdom-of-norway',
        'hist:kingdom-of-sweden',
      ],
      kalmarUnionContextOnly: true,
    },
  }));
  addMember(members, 'source-locks/1492-source-locks.json', jsonBytes({
    ...sourceLock('1492', cliopatria, recordLocks),
    semkowiczRomer: {
      title: 'Polska i Litwa za Jagiellonów (w. XV)',
      publicationYear: 1929,
      currentHostedScanSha256: ROMER_JPEG_SHA256,
      currentHostedScanByteLength: romerBytes.length,
      currentHostedScanDimensions: [2560, 2195],
      authoritativeCatalogRecord: null,
      authoritativeArchiveScanSha256: null,
      itemSpecificProductionLicense: null,
      suitability: 'conditional-manual-trace-candidate-only',
    },
    cnig15094: {
      productId: 15094,
      title: 'España. Consolidación de los reinos cristianos y su expansión, 1150-1492',
      advertisedFormat: 'Shapefile, PDF, JPG',
      downloadUrl:
        'https://centrodedescargas.cnig.es/CentroDescargas/busquedaRedirigida.do?ruta=PUBLICACION_CNIG_DATOS_VARIOS%2FaneTematico%2FEspana_Consolidacion-de-los-reinos-cristianos-y-su-expansion_1150-1492_mapa_15094_spa.zip',
      capturedResponseSha256: CNIG_RESPONSE_SHA256,
      capturedResponseByteLength: cnigResponseBytes.length,
      capturedResponseMediaType: 'text/html',
      productArchiveSha256: null,
      memberInventorySha256: null,
      productionSuitability: null,
      suitability: 'conditional-evidence-only-with-bounded-manual-corrections',
    },
  }));
  for (const regionId of REGION_IDS) {
    addMember(members, `reviews/1492-${regionId}.json`, jsonBytes(reviewRecord('1492', regionId)));
  }
  return members;
}

async function create1700Members(options, cliopatria, recordLocks) {
  const members = [];
  const handoffBytes = await readVerified(
    options.researchHandoff,
    RESEARCH_HANDOFF_SHA256,
    'Historical evidence handoff',
  );
  const harvardMetadataBytes = await readVerified(
    join(options.evidenceRoot, 'countriesirl-1700-research', 'harvard-gaviqv-metadata.json'),
    HARVARD_METADATA_SHA256,
    'Harvard Dataverse metadata',
  );
  const dataGdbPath = join(
    options.evidenceRoot,
    'mf_dataverse',
    'final_replication_files',
    'data',
    'data.gdb',
  );
  addMember(members, 'README.txt', Buffer.from(
    '1700 candidate/reviewer evidence packet. BLOCKED: comparison evidence is not approval and no production geometry is emitted.\n',
    'utf8',
  ));
  addMember(members, 'licenses/cliopatria-v0.2.0-LICENSE.md', cliopatria.licenseBytes);
  addMember(members, 'metadata/cliopatria-v0.2.0-README.md', cliopatria.readmeBytes);
  addMember(members, 'metadata/harvard-dataverse-gaviqv.json', harvardMetadataBytes);
  addMember(members, 'metadata/harvard-data-gdb-inventory.tsv', await createHarvardInventory(dataGdbPath));
  addMember(members, 'research/historical-source-evidence-matrix.md', handoffBytes);
  for (const fileName of HARVARD_SELECTED_FILES) {
    addMember(
      members,
      `comparison/harvard-data-gdb/${fileName}`,
      await readFile(join(dataGdbPath, fileName)),
    );
  }
  for (const lock of recordLocks) {
    addMember(members, lock.path, canonicalJsonBytes(cliopatria.features[lock.index]));
  }
  addMember(members, 'specifications/1700-six-record-cliopatria-mosaic.json', jsonBytes({
    version: 1,
    snapshotId: '1700',
    dateContract: dateContract('1700'),
    mode: 'candidate-vector-selection-not-production',
    allowlist: [7055, 9361, 9355, 9390, 9396, 9391],
    priority: [7055, 9361, 9355, 9390, 9396, 9391],
    sourceRoles: {
      cliopatria: 'candidate geometry',
      harvardOxford: 'CC0 comparison evidence only',
    },
    caveats: [
      'Harvard Ottoman geometry substantially includes tributary Wallachia, Moldavia, and Ragusa.',
      'Harvard Military Frontier polygons cross parent boundaries and are not inserted into the candidate.',
      'The January 1, 1700 Karlowitz frontier was not fully demarcated in every sector.',
      'Server-generated Harvard bundle ZIP bytes are not assumed stable; the local per-file inventory is authoritative for this packet.',
    ],
    approvals: pendingApprovals(),
  }));
  addMember(members, 'source-locks/1700-source-locks.json', jsonBytes({
    ...sourceLock('1700', cliopatria, recordLocks),
    harvardOxford: {
      doi: '10.7910/DVN/GAVIQV',
      version: '1.0',
      license: 'CC0-1.0',
      metadataSha256: HARVARD_METADATA_SHA256,
      comparisonOnly: true,
      generatedBundleSha256: null,
      generatedBundleByteStable: false,
      selectedPhysicalPayloads: HARVARD_SELECTED_FILES,
      rightsApproval: null,
      factualApproval: null,
      topologyApproval: null,
    },
  }));
  for (const regionId of REGION_IDS) {
    addMember(members, `reviews/1700-${regionId}.json`, jsonBytes(reviewRecord('1700', regionId)));
  }
  return members;
}

function blockedInput(snapshotId, blockers) {
  return jsonBytes({
    type: 'FeatureCollection',
    snapshotId,
    asOf: snapshotId === '1492' ? '1492-01-03' : '1700-01-01',
    dateContract: dateContract(snapshotId),
    readinessStatus: 'blocked',
    candidateGeometryStatus: 'not-generated',
    reason:
      'Candidate and reviewer evidence exists, but exact production geometry and independent approvals are absent.',
    coverageContainersCreatePoliticalEntities: false,
    longitudeDomain: '[-180,180]',
    sourceBoundaryArcsSeparatedFromGeneratedMaskEdges: true,
    generatedMaskEdgesPresent: false,
    replacedModernSourceFeatureIds: [],
    features: [],
    blockers,
  });
}

function manifestFor(snapshotId, archiveBytes, members, inputBytes) {
  const blockers = snapshotId === '1492'
    ? [
        'RIGHTS_REVIEW_REQUIRED',
        'AUTHORITATIVE_SEMKOWICZ_ROMER_SCAN_AND_CATALOG_MISSING',
        'MANUAL_TRACE_OPERATOR_CONTROL_POINTS_AND_GEOMETRY_MISSING',
        'REVERSE_1494_FACTUAL_REVIEW_REQUIRED',
        'CNIG_15094_PRODUCT_ARCHIVE_AND_MEMBER_HASHES_MISSING',
        '1492_SIX_REGION_EXACT_GEOMETRY_INCOMPLETE',
        'TOPOLOGY_AND_1080PX_REVIEW_REQUIRED',
      ]
    : [
        'RIGHTS_REVIEW_REQUIRED',
        'EXACT_DAY_FACTUAL_REVIEW_REQUIRED',
        'KARLOWITZ_FRONTIER_DEMARCATION_INCOMPLETE',
        'CONSTITUENT_AND_TRIBUTARY_POLICY_REVIEW_REQUIRED',
        'TOPOLOGY_AND_1080PX_REVIEW_REQUIRED',
        'SIX_REGION_PRODUCTION_GEOMETRY_NOT_APPROVED',
      ];
  const inventory = [...members]
    .sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0)
    .map((member) => ({ path: member.path, sha256: sha256(member.bytes) }));
  const reviewArtifacts = inventory.filter(({ path }) =>
    path.startsWith('reviews/') ||
    path.startsWith('specifications/') ||
    path.startsWith('source-locks/'),
  );
  const regionReviews = new Map(
    REGION_IDS.map((regionId) => {
      const path = `reviews/${snapshotId}-${regionId}.json`;
      const artifact = inventory.find((candidate) => candidate.path === path);
      if (artifact === undefined) throw new Error(`Missing ${path}.`);
      return [regionId, artifact];
    }),
  );
  return {
    schemaVersion: 3,
    packetKind: 'candidate-reviewer',
    snapshotId,
    asOf: snapshotId === '1492' ? '1492-01-03' : '1700-01-01',
    dateContract: dateContract(snapshotId),
    readinessStatus: 'blocked',
    deliveryCounted: false,
    snapshotPass: false,
    productionReady: false,
    catalogEligible: false,
    blockers,
    approvals: pendingApprovals(),
    evidenceArchive: {
      path: `sources/historical/${snapshotId}.evidence.zip`,
      sha256: sha256(archiveBytes),
      memberInventorySha256: sha256(Buffer.from(`${JSON.stringify(inventory)}\n`, 'utf8')),
      members: inventory,
    },
    inputGeometry: {
      path: `sources/historical/${snapshotId}.input.geojson`,
      sha256: sha256(inputBytes),
      candidateGenerated: false,
    },
    preparation: {
      mode: 'blocked',
      reason:
        'The packet binds candidate evidence for review but lacks approved exact production geometry and every required independent approval.',
      manualTrace: snapshotId === '1492'
        ? {
            evidenceSha256: ROMER_JPEG_SHA256,
            procedureSha256: reviewArtifacts.find(
              ({ path }) => path === 'specifications/1492-manual-trace-candidate.json',
            )?.sha256 ?? null,
            operatorRecordSha256: null,
            controlPointsSha256: null,
            tracedGeoJsonSha256: null,
          }
        : null,
    },
    geometryPolicy: {
      longitudeDomain: '[-180,180]',
      coverageContainersArePoliticalEntities: false,
      sourceBoundaryArcsSeparatedFromGeneratedMaskEdges: true,
      generatedMaskEdgesPolitical: false,
      generatedMaskEdgesSelectable: false,
      generatedMaskEdgesExportVisibleAsPoliticalBorders: false,
    },
    reviewerPacket: {
      status: 'candidate-blocked',
      hashInvalidationRule: 'Changing any listed byte invalidates every future approval.',
      artifacts: reviewArtifacts,
      sourceRightsDecision: null,
      factualDecision: null,
      topologyDecision: null,
      reviewerSignature: null,
      productionReadinessDecision: null,
    },
    regions: REGION_IDS.map((regionId) => {
      const review = reviewRecord(snapshotId, regionId);
      const evidence = regionReviews.get(regionId);
      return {
        regionId,
        coverageContainerId: `coverage:${snapshotId}:${regionId}`,
        coverageContainerCreatesPoliticalEntity: false,
        disposition: review.disposition,
        rightsDisposition: 'review-required',
        license: 'pending independent item-specific source/license review',
        attribution: null,
        retrievedOn: '2026-07-24',
        evidencePath: evidence.path,
        evidenceSha256: evidence.sha256,
        entityIds: review.entityIds,
        colorOwnerIds: review.colorOwnerIds ?? review.entityIds,
        sourceFeatureIds: review.sourceFeatureIds ?? [],
        uncertainties: review.blockers,
        approvals: {
          rights: null,
          factual: null,
          topology: null,
        },
      };
    }),
  };
}

async function run() {
  const options = parseArguments(process.argv.slice(2));
  const cliopatria = await loadCliopatria(options.evidenceRoot);
  const snapshotId = options.snapshot;
  const members = [];
  const recordLocks = addCliopatriaRecords(members, snapshotId, cliopatria);
  const snapshotMembers = snapshotId === '1492'
    ? await create1492Members(options, cliopatria, recordLocks)
    : await create1700Members(options, cliopatria, recordLocks);
  const archiveBytes = createCanonicalZip(snapshotMembers);
  const blockers = snapshotId === '1492'
    ? [
        'RIGHTS_REVIEW_REQUIRED',
        'AUTHORITATIVE_SEMKOWICZ_ROMER_SCAN_AND_CATALOG_MISSING',
        'MANUAL_TRACE_OPERATOR_CONTROL_POINTS_AND_GEOMETRY_MISSING',
        'REVERSE_1494_FACTUAL_REVIEW_REQUIRED',
        'CNIG_15094_PRODUCT_ARCHIVE_AND_MEMBER_HASHES_MISSING',
        '1492_SIX_REGION_EXACT_GEOMETRY_INCOMPLETE',
        'TOPOLOGY_AND_1080PX_REVIEW_REQUIRED',
      ]
    : [
        'RIGHTS_REVIEW_REQUIRED',
        'EXACT_DAY_FACTUAL_REVIEW_REQUIRED',
        'KARLOWITZ_FRONTIER_DEMARCATION_INCOMPLETE',
        'CONSTITUENT_AND_TRIBUTARY_POLICY_REVIEW_REQUIRED',
        'TOPOLOGY_AND_1080PX_REVIEW_REQUIRED',
        'SIX_REGION_PRODUCTION_GEOMETRY_NOT_APPROVED',
      ];
  const inputBytes = blockedInput(snapshotId, blockers);
  const manifest = manifestFor(snapshotId, archiveBytes, snapshotMembers, inputBytes);
  const outputDir = resolve(process.cwd(), 'sources', 'historical');
  await Promise.all([
    writeFile(join(outputDir, `${snapshotId}.evidence.zip`), archiveBytes),
    writeFile(join(outputDir, `${snapshotId}.input.geojson`), inputBytes),
    writeFile(join(outputDir, `${snapshotId}.sources.json`), jsonBytes(manifest)),
  ]);
  globalThis.console.info(
    `${snapshotId} candidate/reviewer packet assembled as BLOCKED (${snapshotMembers.length} members).`,
  );
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unknown assembly error.';
  globalThis.console.error(`Historical packet assembly failed: ${message}`);
  process.exitCode = 1;
});
