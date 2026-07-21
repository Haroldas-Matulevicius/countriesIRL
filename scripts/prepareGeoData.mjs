import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const NATURAL_EARTH_VERSION = '5.1.1';
const DEFAULT_SOURCE_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.1/geojson/ne_10m_admin_0_countries.geojson';
const EXPECTED_SOURCE_SHA256 =
  '239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255';
const OUTPUT_PATH = fileURLToPath(
  new URL('../public/data/europe-modern.geojson', import.meta.url),
);
const TRANSREGIONAL_ADMIN_NAMES = new Set([
  'Armenia',
  'Azerbaijan',
  'Cyprus',
  'Georgia',
  'Kazakhstan',
  'Turkey',
]);
const ID_FIELDS = ['ADM0_A3', 'GU_A3', 'ISO_A3', 'SOV_A3'];
const NAME_FIELDS = ['NAME_LONG', 'ADMIN', 'NAME'];
const SENTINEL_IDS = new Set([
  '',
  '-99',
  '99',
  'N/A',
  'NA',
  'NULL',
  'UNKNOWN',
  'UNRESOLVED',
]);

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPosition(value) {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    value.every(
      (coordinate) =>
        typeof coordinate === 'number' && Number.isFinite(coordinate),
    )
  );
}

function positionsMatch(first, last) {
  return (
    first.length === last.length &&
    first.every((coordinate, index) => coordinate === last[index])
  );
}

function isLinearRing(value) {
  if (!Array.isArray(value) || value.length < 4 || !value.every(isPosition)) {
    return false;
  }

  return positionsMatch(value[0], value[value.length - 1]);
}

function isPolygonCoordinates(value) {
  return Array.isArray(value) && value.length > 0 && value.every(isLinearRing);
}

function isMultiPolygonCoordinates(value) {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(isPolygonCoordinates)
  );
}

function parseArguments(args) {
  let check = false;
  let source = DEFAULT_SOURCE_URL;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--check') {
      check = true;
      continue;
    }

    if (argument === '--source') {
      const sourceArgument = args[index + 1];
      if (!sourceArgument) {
        throw new Error('--source requires a URL or local file path.');
      }
      source = sourceArgument;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  return { check, source };
}

async function readSource(source) {
  if (source.startsWith('https://') || source.startsWith('http://')) {
    const response = await globalThis.fetch(source);
    if (!response.ok) {
      throw new Error(`Natural Earth download failed with HTTP ${response.status}.`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  return readFile(resolve(process.cwd(), source));
}

function verifySource(sourceBytes) {
  const sourceHash = createHash('sha256').update(sourceBytes).digest('hex');
  if (sourceHash !== EXPECTED_SOURCE_SHA256) {
    throw new Error(
      `Natural Earth ${NATURAL_EARTH_VERSION} source checksum mismatch: ${sourceHash}`,
    );
  }
}

function isIncluded(properties) {
  return (
    properties.CONTINENT === 'Europe' ||
    (typeof properties.ADMIN === 'string' &&
      TRANSREGIONAL_ADMIN_NAMES.has(properties.ADMIN.trim()))
  );
}

function readStableId(properties) {
  for (const field of ID_FIELDS) {
    const candidate = properties[field];
    if (typeof candidate !== 'string') {
      continue;
    }

    const id = candidate.trim().toUpperCase();
    if (!SENTINEL_IDS.has(id)) {
      return id;
    }
  }

  throw new Error('Included Natural Earth feature has no stable administrative code.');
}

function readDisplayName(properties) {
  for (const field of NAME_FIELDS) {
    const candidate = properties[field];
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  throw new Error('Included Natural Earth feature has no display name.');
}

function readGeometry(feature, id) {
  if (!isRecord(feature.geometry) || typeof feature.geometry.type !== 'string') {
    throw new Error(`Natural Earth feature ${id} has no valid geometry object.`);
  }

  const { type, coordinates } = feature.geometry;
  if (type === 'Polygon' && isPolygonCoordinates(coordinates)) {
    return { type, coordinates };
  }

  if (type === 'MultiPolygon' && isMultiPolygonCoordinates(coordinates)) {
    return { type, coordinates };
  }

  throw new Error(`Natural Earth feature ${id} has unsupported or invalid geometry.`);
}

function compareIds(left, right) {
  if (left.id < right.id) {
    return -1;
  }
  if (left.id > right.id) {
    return 1;
  }
  return 0;
}

function normalizeSource(sourceValue) {
  if (
    !isRecord(sourceValue) ||
    sourceValue.type !== 'FeatureCollection' ||
    !Array.isArray(sourceValue.features)
  ) {
    throw new Error('Natural Earth source is not a GeoJSON FeatureCollection.');
  }

  const ids = new Set();
  const features = [];

  for (const candidate of sourceValue.features) {
    if (
      !isRecord(candidate) ||
      candidate.type !== 'Feature' ||
      !isRecord(candidate.properties) ||
      !isIncluded(candidate.properties)
    ) {
      continue;
    }

    const id = readStableId(candidate.properties);
    if (ids.has(id)) {
      throw new Error(`Natural Earth source contains duplicate normalized ID ${id}.`);
    }

    ids.add(id);
    features.push({
      type: 'Feature',
      id,
      properties: { name: readDisplayName(candidate.properties) },
      geometry: readGeometry(candidate, id),
    });
  }

  if (features.length === 0) {
    throw new Error('Natural Earth source produced no included European features.');
  }

  features.sort(compareIds);
  return {
    type: 'FeatureCollection',
    features,
  };
}

function createCanonicalBytes(sourceBytes) {
  const parsedSource = JSON.parse(sourceBytes.toString('utf8'));
  const normalized = normalizeSource(parsedSource);
  return Buffer.from(`${JSON.stringify(normalized)}\n`, 'utf8');
}

async function run() {
  const { check, source } = parseArguments(process.argv.slice(2));
  const sourceBytes = await readSource(source);
  verifySource(sourceBytes);
  const canonicalBytes = createCanonicalBytes(sourceBytes);

  if (check) {
    const committedBytes = await readFile(OUTPUT_PATH);
    if (!canonicalBytes.equals(committedBytes)) {
      throw new Error(
        'public/data/europe-modern.geojson differs from deterministic output.',
      );
    }
    globalThis.console.info('GeoJSON check passed: committed asset is current.');
    return;
  }

  await writeFile(OUTPUT_PATH, canonicalBytes);
  const normalized = JSON.parse(canonicalBytes.toString('utf8'));
  globalThis.console.info(
    `Wrote ${normalized.features.length} Natural Earth ${NATURAL_EARTH_VERSION} features to ${OUTPUT_PATH}.`,
  );
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unknown preparation error.';
  globalThis.console.error(`GeoJSON preparation failed: ${message}`);
  process.exitCode = 1;
});
