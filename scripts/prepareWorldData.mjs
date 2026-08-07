import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

import mapshaper from 'mapshaper';

const MANIFEST_PATH = fileURLToPath(
  new URL('../public/data/world-manifest.json', import.meta.url),
);
const OUTPUT_PATH = fileURLToPath(
  new URL('../public/data/world-modern.geojson', import.meta.url),
);
const MESH_OUTPUT_PATH = fileURLToPath(
  new URL('../public/data/world-borders-modern.geojson', import.meta.url),
);
const MESH_FILE_LABEL = 'public/data/world-borders-modern.geojson';
/**
 * The interior-border mesh: the edges shared by exactly two polygons, so a
 * coastline is absent by construction. Held as one string because the manifest
 * records the exact command and `readMeshRecord` compares against this constant
 * - a derivation whose recorded provenance drifts from the code that ran is a
 * provenance record for something else.
 */
const MESH_DERIVATION_COMMAND =
  '-i input.geojson -innerlines -o format=geojson precision=0.0001 output.geojson';
const MESH_INPUT_KEY = 'input.geojson';
const MESH_OUTPUT_KEY = 'output.geojson';
const MESH_FILE_NAME = 'world-borders-modern.geojson';
const MESH_SOURCE_FILE_NAME = 'world-modern.geojson';
const MESH_ROOT_TYPE = 'GeometryCollection';
const EXPECTED_MESH_GEOMETRY_COUNT = 327;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const EXPECTED_NATURAL_EARTH_VERSION = '5.1.1';
const EXPECTED_BASE_SOURCE_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.1/geojson/ne_50m_admin_0_countries.geojson';
const EXPECTED_SUPPLEMENT_SOURCE_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.1/geojson/ne_10m_admin_0_countries.geojson';
const EXPECTED_BASE_SOURCE_SHA256 =
  '3e458fc036ad0a66411f2c1e6cac49c5d7bfb81cb1123bc513b22511a2b7fdeb';
const EXPECTED_SUPPLEMENT_SOURCE_SHA256 =
  '239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255';
const EXPECTED_CORE_COUNT = 195;
const EXPECTED_SUPPLEMENT_COUNT = 6;
const EXPECTED_RUNTIME_UNIT_COUNT = 248;
/**
 * D4-10 (Phase 4): the twelve formerly `neutral` units own their own color.
 * `EXPECTED_CORE_COUNT` still means *core states* and is still 195 - the core
 * definition did not move. This is the separate quantity: how many units a
 * creator can paint. Every count assertion below is derived from the manifest
 * and cross-checked against these two, never re-hard-coded a third time.
 */
const SELF_COLORABLE_POLICY = 'self-colorable';
const EXPECTED_SELF_COLORABLE_COUNT = 12;
const REQUIRED_FEATURE_PROPERTY_KEYS = [
  'colorOwnerId',
  'isSelectable',
  'name',
  'sourceFeatureId',
];

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseArguments(args) {
  let check = false;
  let baseSource = null;
  let supplementSource = null;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--check') {
      check = true;
      continue;
    }

    if (argument === '--base-source' || argument === '--supplement-source') {
      const source = args[index + 1];
      if (!source) {
        throw new Error(`${argument} requires a URL or local file path.`);
      }
      if (argument === '--base-source') {
        baseSource = source;
      } else {
        supplementSource = source;
      }
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  return { check, baseSource, supplementSource };
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

function calculateSha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function parseJson(bytes, label) {
  try {
    return JSON.parse(bytes.toString('utf8'));
  } catch {
    throw new Error(`${label} is not valid JSON.`);
  }
}

function readManifestSource(
  manifest,
  sourceId,
  expectedUrl,
  expectedSha256,
) {
  if (
    !isRecord(manifest.naturalEarth) ||
    manifest.naturalEarth.version !== EXPECTED_NATURAL_EARTH_VERSION ||
    !Array.isArray(manifest.naturalEarth.sources)
  ) {
    throw new Error('World manifest has invalid Natural Earth metadata.');
  }

  const source = manifest.naturalEarth.sources.find(
    (candidate) => isRecord(candidate) && candidate.id === sourceId,
  );
  if (
    !isRecord(source) ||
    source.url !== expectedUrl ||
    source.sha256 !== expectedSha256
  ) {
    throw new Error(`World manifest source ${sourceId} is not the pinned source.`);
  }

  return source;
}

function verifySource(bytes, source, label) {
  const actualHash = calculateSha256(bytes);
  if (actualHash !== source.sha256) {
    throw new Error(`${label} checksum mismatch: ${actualHash}`);
  }
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
  return (
    first.length === last.length &&
    first.every((coordinate, index) => coordinate === last[index])
  );
}

function isLinearRing(value) {
  return (
    Array.isArray(value) &&
    value.length >= 4 &&
    value.every(isPosition) &&
    positionsMatch(value[0], value[value.length - 1])
  );
}

function isPolygonCoordinates(value) {
  return Array.isArray(value) && value.length > 0 && value.every(isLinearRing);
}

function isMultiPolygonCoordinates(value) {
  return Array.isArray(value) && value.length > 0 && value.every(isPolygonCoordinates);
}

function readGeometry(feature, sourceId) {
  if (!isRecord(feature.geometry)) {
    throw new Error(`Natural Earth feature ${sourceId} has no geometry object.`);
  }

  const { type, coordinates } = feature.geometry;
  if (type === 'Polygon' && isPolygonCoordinates(coordinates)) {
    return { type, coordinates };
  }
  if (type === 'MultiPolygon' && isMultiPolygonCoordinates(coordinates)) {
    return { type, coordinates };
  }

  throw new Error(`Natural Earth feature ${sourceId} has invalid or unsupported geometry.`);
}

function indexSourceFeatures(sourceValue, label) {
  if (
    !isRecord(sourceValue) ||
    sourceValue.type !== 'FeatureCollection' ||
    !Array.isArray(sourceValue.features)
  ) {
    throw new Error(`${label} is not a GeoJSON FeatureCollection.`);
  }

  const featuresBySourceId = new Map();
  for (const candidate of sourceValue.features) {
    if (!isRecord(candidate) || candidate.type !== 'Feature' || !isRecord(candidate.properties)) {
      throw new Error(`${label} contains an invalid feature record.`);
    }

    const sourceId = candidate.properties.ADM0_A3;
    if (typeof sourceId !== 'string' || sourceId.trim().length === 0) {
      throw new Error(`${label} contains a feature without ADM0_A3.`);
    }

    const normalizedSourceId = sourceId.trim().toUpperCase();
    if (featuresBySourceId.has(normalizedSourceId)) {
      throw new Error(`${label} contains duplicate source ID ${normalizedSourceId}.`);
    }
    featuresBySourceId.set(normalizedSourceId, candidate);
  }

  return featuresBySourceId;
}

function readManifestRecords(manifest, field, expectedCount) {
  const records = manifest[field];
  if (!Array.isArray(records) || records.length !== expectedCount) {
    throw new Error(`World manifest ${field} must contain exactly ${expectedCount} records.`);
  }
  return records;
}

function createRuntimeFeature(record, sourceFeature, isCore) {
  if (
    !isRecord(record) ||
    typeof record.id !== 'string' ||
    typeof record.name !== 'string' ||
    typeof record.sourceId !== 'string'
  ) {
    throw new Error('World manifest contains an invalid unit record.');
  }

  const isSelfColorable =
    !isCore && record.colorPolicy === SELF_COLORABLE_POLICY;
  const parentCoreId = isCore ? record.id : record.parentCoreId;
  if (isCore) {
    const sourceMatchValue = sourceFeature.properties[record.sourceMatchField];
    if (
      typeof record.sourceMatchField !== 'string' ||
      typeof record.sourceMatchValue !== 'string' ||
      typeof sourceMatchValue !== 'string' ||
      sourceMatchValue.trim().toUpperCase() !== record.sourceMatchValue
    ) {
      throw new Error(`Core state ${record.id} does not match its reviewed source join.`);
    }
  } else if (isSelfColorable) {
    // The third branch (D4-10). It is a branch rather than a loosening of the
    // two throws below: those still fire for every unit outside this category,
    // so a dependency cannot quietly become selectable by dropping a field.
    if (parentCoreId !== record.id) {
      throw new Error(
        `Self-colorable world unit ${record.id} must own its own color.`,
      );
    }
    if (record.isSelectable !== true) {
      throw new Error(`Self-colorable world unit ${record.id} must be selectable.`);
    }
  } else {
    if (parentCoreId !== null && typeof parentCoreId !== 'string') {
      throw new Error(`World manifest unit ${record.id} has an invalid parentCoreId.`);
    }
    if (record.isSelectable !== false) {
      throw new Error(`Non-core world unit ${record.id} must be non-selectable.`);
    }
    const expectedPolicy = parentCoreId === null ? 'neutral' : 'inherit-parent';
    if (record.colorPolicy !== expectedPolicy) {
      throw new Error(`World manifest unit ${record.id} has inconsistent color policy.`);
    }
  }

  return {
    type: 'Feature',
    id: record.id,
    properties: {
      name: record.name,
      sourceFeatureId: record.sourceId,
      colorOwnerId: parentCoreId,
      isSelectable: isCore || isSelfColorable,
    },
    geometry: readGeometry(sourceFeature, record.sourceId),
  };
}

function compareFeatureIds(left, right) {
  return left.id.localeCompare(right.id);
}

function validateRuntimeFeatures(
  features,
  coreIds,
  selfColorableIds,
  expectedSelectableCount,
) {
  if (features.length !== EXPECTED_RUNTIME_UNIT_COUNT) {
    throw new Error(`Expected ${EXPECTED_RUNTIME_UNIT_COUNT} world units, received ${features.length}.`);
  }

  const logicalIds = new Set();
  const sourceIds = new Set();
  let selectableCount = 0;

  for (const feature of features) {
    if (logicalIds.has(feature.id)) {
      throw new Error(`Generated world asset contains duplicate logical ID ${feature.id}.`);
    }
    logicalIds.add(feature.id);

    const propertyKeys = Object.keys(feature.properties).sort();
    if (JSON.stringify(propertyKeys) !== JSON.stringify(REQUIRED_FEATURE_PROPERTY_KEYS)) {
      throw new Error(`Generated world unit ${feature.id} contains unexpected runtime properties.`);
    }

    const sourceId = feature.properties.sourceFeatureId;
    if (sourceIds.has(sourceId)) {
      throw new Error(`Generated world asset contains duplicate source ID ${sourceId}.`);
    }
    sourceIds.add(sourceId);

    if (feature.properties.isSelectable) {
      selectableCount += 1;
      const isRecognizedOwner =
        coreIds.has(feature.id) || selfColorableIds.has(feature.id);
      if (!isRecognizedOwner || feature.properties.colorOwnerId !== feature.id) {
        throw new Error(`Selectable world unit ${feature.id} does not match core policy.`);
      }
    } else {
      const owner = feature.properties.colorOwnerId;
      if (owner !== null && !coreIds.has(owner)) {
        throw new Error(`World unit ${feature.id} has invalid color owner ${owner}.`);
      }
    }
  }

  if (selectableCount !== expectedSelectableCount) {
    throw new Error(
      `Expected ${expectedSelectableCount} colorable units, received ${selectableCount}.`,
    );
  }
}

function createCanonicalBytes(manifest, baseValue, supplementValue) {
  const policy = manifest.policy;
  if (
    !isRecord(policy) ||
    policy.coreStateCount !== EXPECTED_CORE_COUNT ||
    policy.runtimeUnitCount !== EXPECTED_RUNTIME_UNIT_COUNT ||
    policy.coreSelectable !== true ||
    policy.selfColorableSelectable !== true ||
    policy.inheritParentSelectable !== false ||
    typeof policy.selfColorableCount !== 'number' ||
    typeof policy.selectableCount !== 'number'
  ) {
    throw new Error('World manifest count or selectability policy is invalid.');
  }
  // The two counts are checked against each other, not against a third
  // literal: 195 core states plus however many units own their own color.
  if (policy.selectableCount !== policy.coreStateCount + policy.selfColorableCount) {
    throw new Error(
      `World manifest selectableCount ${policy.selectableCount} does not equal coreStateCount ${policy.coreStateCount} plus selfColorableCount ${policy.selfColorableCount}.`,
    );
  }

  const coreRecords = readManifestRecords(manifest, 'coreStates', EXPECTED_CORE_COUNT);
  const nonCoreRecords = readManifestRecords(manifest, 'nonCoreUnits', 47);
  const supplementRecords = readManifestRecords(
    manifest,
    'supplements',
    EXPECTED_SUPPLEMENT_COUNT,
  );
  const coreIds = new Set(coreRecords.map((record) => record.id));
  if (coreIds.size !== EXPECTED_CORE_COUNT) {
    throw new Error('World manifest core IDs are not unique.');
  }

  // Derived from the records themselves, then compared with what the manifest
  // claims. A manifest whose recorded count disagrees with its own records is
  // refused here rather than silently regenerating a different asset.
  const selfColorableIds = new Set(
    [...nonCoreRecords, ...supplementRecords]
      .filter(
        (record) => isRecord(record) && record.colorPolicy === SELF_COLORABLE_POLICY,
      )
      .map((record) => record.id),
  );
  if (selfColorableIds.size !== policy.selfColorableCount) {
    throw new Error(
      `World manifest records ${selfColorableIds.size} self-colorable units but selfColorableCount is ${policy.selfColorableCount}.`,
    );
  }
  if (selfColorableIds.size !== EXPECTED_SELF_COLORABLE_COUNT) {
    throw new Error(
      `Expected ${EXPECTED_SELF_COLORABLE_COUNT} self-colorable units, received ${selfColorableIds.size}.`,
    );
  }

  const baseFeatures = indexSourceFeatures(baseValue, 'Natural Earth 50m source');
  const supplementFeatures = indexSourceFeatures(
    supplementValue,
    'Natural Earth 10m source',
  );
  if (baseFeatures.size !== EXPECTED_RUNTIME_UNIT_COUNT - EXPECTED_SUPPLEMENT_COUNT) {
    throw new Error(`Expected 242 Natural Earth 50m units, received ${baseFeatures.size}.`);
  }

  const features = [];
  for (const record of coreRecords) {
    const sourceFeature = baseFeatures.get(record.sourceId);
    if (!sourceFeature) {
      throw new Error(`Natural Earth 50m source is missing core join ${record.sourceId}.`);
    }
    features.push(createRuntimeFeature(record, sourceFeature, true));
  }
  for (const record of nonCoreRecords) {
    const sourceFeature = baseFeatures.get(record.sourceId);
    if (!sourceFeature) {
      throw new Error(`Natural Earth 50m source is missing non-core unit ${record.sourceId}.`);
    }
    features.push(createRuntimeFeature(record, sourceFeature, false));
  }
  for (const record of supplementRecords) {
    const sourceFeature = supplementFeatures.get(record.sourceId);
    if (!sourceFeature) {
      throw new Error(`Natural Earth 10m source is missing supplement ${record.sourceId}.`);
    }
    features.push(createRuntimeFeature(record, sourceFeature, false));
  }

  features.sort(compareFeatureIds);
  validateRuntimeFeatures(
    features,
    coreIds,
    selfColorableIds,
    policy.selectableCount,
  );

  return Buffer.from(
    `${JSON.stringify({ type: 'FeatureCollection', features })}\n`,
    'utf8',
  );
}

/**
 * The one derivation. Both the write path and the `--check` path call it with
 * the *canonical* polygon bytes, so the mesh is bound to the geometry the
 * script just regenerated rather than to whatever happens to be on disk.
 *
 * `mapshaper.applyCommands` is the Node API and returns a Buffer per output
 * key with no temporary file and no child process; measured deterministic
 * across repeated runs on identical input.
 */
async function createMeshBytes(polygonBytes) {
  const output = await mapshaper.applyCommands(MESH_DERIVATION_COMMAND, {
    [MESH_INPUT_KEY]: polygonBytes,
  });
  const meshBytes = output[MESH_OUTPUT_KEY];
  if (!Buffer.isBuffer(meshBytes)) {
    throw new Error('Interior-border mesh derivation produced no output buffer.');
  }
  return meshBytes;
}

/**
 * Counts geometries, not `LineString`s: `-innerlines` emits 301 `LineString`s
 * and 26 `MultiLineString`s for this asset. Counting only one type would agree
 * with a mesh that had silently lost the other.
 */
function countMeshGeometries(meshBytes, label) {
  const value = parseJson(meshBytes, label);
  if (
    !isRecord(value) ||
    value.type !== 'GeometryCollection' ||
    !Array.isArray(value.geometries)
  ) {
    throw new Error(`${label} is not a GeoJSON GeometryCollection.`);
  }

  for (const geometry of value.geometries) {
    if (
      !isRecord(geometry) ||
      (geometry.type !== 'LineString' && geometry.type !== 'MultiLineString')
    ) {
      throw new Error(`${label} contains a geometry that is not a line.`);
    }
  }

  return value.geometries.length;
}

function readMeshRecord(manifest) {
  const record = manifest.interiorBorderMesh;
  if (
    !isRecord(record) ||
    record.file !== MESH_FILE_NAME ||
    record.derivedFrom !== MESH_SOURCE_FILE_NAME ||
    record.rootType !== MESH_ROOT_TYPE ||
    record.command !== MESH_DERIVATION_COMMAND ||
    typeof record.sha256 !== 'string' ||
    !SHA256_PATTERN.test(record.sha256) ||
    typeof record.byteLength !== 'number' ||
    !Number.isInteger(record.byteLength) ||
    record.byteLength <= 0
  ) {
    throw new Error('World manifest interior-border mesh record is invalid.');
  }
  // A literal, so a manifest edited into agreement with a broken mesh is
  // refused here rather than validating itself.
  if (record.geometryCount !== EXPECTED_MESH_GEOMETRY_COUNT) {
    throw new Error(
      `World manifest records ${record.geometryCount} interior-border geometries, expected ${EXPECTED_MESH_GEOMETRY_COUNT}.`,
    );
  }

  return record;
}

/**
 * Four assertions in a deliberate order, each reachable on its own subject.
 * A geometry deletion changes the count, the length, and the bytes at once, so
 * an ordering that put byte equality first would report a generic mismatch and
 * leave the count assertion unfalsifiable - which is how a vacuous gate ships.
 *
 * What this covers: a tampered committed mesh (2, 3, 4) and a mesh that no
 * longer matches the geometry the script just regenerated (3). What it does
 * NOT cover: a properties-only change to world-modern.geojson. `-innerlines`
 * reads geometry only, so such a change leaves every number below identical -
 * measured, and the reason the mesh is bound to its own digest rather than to
 * the polygon asset's. The polygon asset's own byte-equality check above is
 * what catches that.
 */
async function verifyMesh(manifest, canonicalBytes) {
  const record = readMeshRecord(manifest);
  const committedMeshBytes = await readFile(MESH_OUTPUT_PATH);

  const committedGeometryCount = countMeshGeometries(
    committedMeshBytes,
    MESH_FILE_LABEL,
  );
  if (committedGeometryCount !== record.geometryCount) {
    throw new Error(
      `${MESH_FILE_LABEL} holds ${committedGeometryCount} geometries but the manifest records ${record.geometryCount}.`,
    );
  }

  if (committedMeshBytes.length !== record.byteLength) {
    throw new Error(
      `${MESH_FILE_LABEL} is ${committedMeshBytes.length} bytes but the manifest records ${record.byteLength}.`,
    );
  }

  const derivedMeshBytes = await createMeshBytes(canonicalBytes);
  if (!derivedMeshBytes.equals(committedMeshBytes)) {
    throw new Error(
      `${MESH_FILE_LABEL} differs from the mesh re-derived from the canonical world geometry.`,
    );
  }

  const committedSha256 = calculateSha256(committedMeshBytes);
  if (committedSha256 !== record.sha256) {
    throw new Error(
      `${MESH_FILE_LABEL} digest ${committedSha256} does not match the manifest record ${record.sha256}.`,
    );
  }

  return { geometryCount: committedGeometryCount, byteLength: committedMeshBytes.length };
}

async function run() {
  const { check, baseSource, supplementSource } = parseArguments(
    process.argv.slice(2),
  );
  const manifestBytes = await readFile(MANIFEST_PATH);
  const manifest = parseJson(manifestBytes, 'World manifest');
  const baseDefinition = readManifestSource(
    manifest,
    'natural-earth-admin-0-50m',
    EXPECTED_BASE_SOURCE_URL,
    EXPECTED_BASE_SOURCE_SHA256,
  );
  const supplementDefinition = readManifestSource(
    manifest,
    'natural-earth-admin-0-10m',
    EXPECTED_SUPPLEMENT_SOURCE_URL,
    EXPECTED_SUPPLEMENT_SOURCE_SHA256,
  );
  const baseBytes = await readSource(baseSource ?? baseDefinition.url);
  const supplementBytes = await readSource(
    supplementSource ?? supplementDefinition.url,
  );

  verifySource(baseBytes, baseDefinition, 'Natural Earth 50m source');
  verifySource(
    supplementBytes,
    supplementDefinition,
    'Natural Earth 10m source',
  );

  const canonicalBytes = createCanonicalBytes(
    manifest,
    parseJson(baseBytes, 'Natural Earth 50m source'),
    parseJson(supplementBytes, 'Natural Earth 10m source'),
  );

  if (check) {
    const committedBytes = await readFile(OUTPUT_PATH);
    if (!canonicalBytes.equals(committedBytes)) {
      throw new Error(
        'public/data/world-modern.geojson differs from deterministic output.',
      );
    }
    const mesh = await verifyMesh(manifest, canonicalBytes);
    // Two numbers, stated separately and read from the manifest the check just
    // validated. 195 is core states; 207 is colorable units. Collapsing them
    // into one figure is the misreading this line exists to prevent.
    globalThis.console.info(
      `World GeoJSON check passed: ${manifest.policy.runtimeUnitCount} units, ${manifest.policy.coreStateCount} selectable core states, and ${manifest.policy.selectableCount} colorable units. Interior-border mesh re-derived and matched: ${mesh.geometryCount} geometries, ${mesh.byteLength} bytes.`,
    );
    return;
  }

  await writeFile(OUTPUT_PATH, canonicalBytes);
  const meshBytes = await createMeshBytes(canonicalBytes);
  await writeFile(MESH_OUTPUT_PATH, meshBytes);
  globalThis.console.info(
    `Wrote ${EXPECTED_RUNTIME_UNIT_COUNT} canonical world units to ${OUTPUT_PATH}.`,
  );
  globalThis.console.info(
    `Wrote ${countMeshGeometries(meshBytes, MESH_FILE_LABEL)} interior-border geometries (${meshBytes.length} bytes, sha256 ${calculateSha256(meshBytes)}) to ${MESH_OUTPUT_PATH}.`,
  );
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unknown preparation error.';
  globalThis.console.error(`World GeoJSON preparation failed: ${message}`);
  process.exitCode = 1;
});
