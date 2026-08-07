import { geoPath } from 'd3';
import { afterEach, describe, expect, it, vi } from 'vitest';

import repositoryAttributes from '../../.gitattributes?raw';
import borderMeshText from '../../public/data/world-borders-modern.geojson?raw';
import manifestText from '../../public/data/world-manifest.json?raw';
import worldText from '../../public/data/world-modern.geojson?raw';
import {
  WORLD_BORDERS_URL,
  WORLD_DATA_URL,
  WORLD_MANIFEST_URL,
  loadWorldGeoData,
  startWorldGeoDataLoad,
} from '../hooks/useGeoData';
import { createSafeMapPath, createWorldProjection } from './mapProjection';

const EXPECTED_MANIFEST_SHA256 =
  'dcc2e78ad934d777b331897b81e4f8826df81a74348fe11c22707b42b53ba3bd';
const EXPECTED_WORLD_SHA256 =
  'd02b604a92a4a7f4481c6bf9a92490adbfe4c6bc4b7ed4fd044c36bb4e2b5645';
/**
 * The interior-border mesh (plan 04-06). Pinned here as well as in the
 * manifest because `npm run data:world:check` needs the network to fetch its
 * Natural Earth sources; this offline gate still reddens on a tampered mesh.
 * It is a digest pin, not a re-derivation - the derivational check is the one
 * in `scripts/prepareWorldData.mjs`.
 */
const EXPECTED_BORDER_MESH_SHA256 =
  '72939b8f1bb20bae624a429c4c76119cb0687a05712271f695804d4d8f093e41';
const EXPECTED_BORDER_MESH_GEOMETRY_COUNT = 327;
const EXPECTED_BASE_SOURCE_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.1/geojson/ne_50m_admin_0_countries.geojson';
const EXPECTED_SUPPLEMENT_SOURCE_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.1/geojson/ne_10m_admin_0_countries.geojson';
const EXPECTED_BASE_SOURCE_SHA256 =
  '3e458fc036ad0a66411f2c1e6cac49c5d7bfb81cb1123bc513b22511a2b7fdeb';
const EXPECTED_SUPPLEMENT_SOURCE_SHA256 =
  '239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255';
const EXPECTED_CORE_IDS = new Set(
  `AFG ALB DZA AND AGO ATG ARG ARM AUS AUT AZE BHS BHR BGD BRB BLR BEL BLZ BEN BTN
  BOL BIH BWA BRA BRN BGR BFA BDI CPV KHM CMR CAN CAF TCD CHL CHN COL COM COG COD
  CRI CIV HRV CUB CYP CZE PRK DNK DJI DMA DOM ECU EGY SLV GNQ ERI EST SWZ ETH FJI
  FIN FRA GAB GMB GEO DEU GHA GRC GRD GTM GIN GNB GUY HTI HND HUN ISL IND IDN IRN
  IRQ IRL ISR ITA JAM JPN JOR KAZ KEN KIR KWT KGZ LAO LVA LBN LSO LBR LBY LIE LTU
  LUX MDG MWI MYS MDV MLI MLT MHL MRT MUS MEX FSM MCO MNG MNE MAR MOZ MMR NAM NRU
  NPL NLD NZL NIC NER NGA MKD NOR OMN PAK PLW PAN PNG PRY PER PHL POL PRT QAT KOR
  MDA ROU RUS RWA KNA LCA VCT WSM SMR STP SAU SEN SRB SYC SLE SGP SVK SVN SLB SOM
  ZAF SSD ESP LKA SDN SUR SWE CHE SYR TJK THA TLS TGO TON TTO TUN TUR TKM TUV UGA
  UKR ARE GBR TZA USA URY UZB VUT VEN VNM YEM ZMB ZWE PSE VAT`
    .split(/\s+/u)
    .filter((value) => value.length > 0),
);
const EXPECTED_SUPPLEMENT_IDS = ['CLP', 'CSI', 'ESB', 'GIB', 'UMI', 'WSB'];
/**
 * D4-10: the twelve units that own their own colour. Written out rather than
 * counted, so a fixture that silently loses one reddens on the identity of the
 * missing unit instead of quietly agreeing with a smaller total.
 */
const EXPECTED_SELF_COLORABLE_IDS = [
  'ATA',
  'COK',
  'CYN',
  'FLK',
  'GIB',
  'IOT',
  'KAS',
  'KOS',
  'NIU',
  'SAH',
  'SOL',
  'TWN',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readArray(record: Record<string, unknown>, key: string): ReadonlyArray<unknown> {
  const value = record[key];
  expect(Array.isArray(value)).toBe(true);
  return Array.isArray(value) ? value : [];
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  expect(typeof value).toBe('string');
  return typeof value === 'string' ? value : '';
}

function readJson(value: string): unknown {
  return JSON.parse(value) as unknown;
}

async function calculateSha256(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

function createJsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function readAssets(): {
  readonly manifestText: string;
  readonly worldText: string;
  readonly manifest: unknown;
  readonly world: unknown;
  readonly borderMesh: unknown;
} {
  return {
    manifestText,
    worldText,
    manifest: readJson(manifestText),
    world: readJson(worldText),
    borderMesh: readJson(borderMeshText),
  };
}

/**
 * The three same-origin payloads, routed by URL. 04-09 added the third; the
 * mock answers each with its REAL committed bytes, so a loader change that
 * silently stopped validating one is caught here rather than in the browser.
 */
function respondByUrl(
  input: RequestInfo | URL,
  assets: {
    readonly manifest: unknown;
    readonly world: unknown;
    readonly borderMesh: unknown;
  },
): unknown {
  const url = String(input);
  if (url === WORLD_MANIFEST_URL) {
    return assets.manifest;
  }
  if (url === WORLD_BORDERS_URL) {
    return assets.borderMesh;
  }
  return assets.world;
}

afterEach((): void => {
  vi.unstubAllGlobals();
});

describe('canonical world assets', (): void => {
  it('pins exact source and committed asset hashes', async (): Promise<void> => {
    const { manifestText: manifestBytes, worldText: worldBytes, manifest } =
      readAssets();

    await expect(calculateSha256(manifestBytes)).resolves.toBe(
      EXPECTED_MANIFEST_SHA256,
    );
    await expect(calculateSha256(worldBytes)).resolves.toBe(
      EXPECTED_WORLD_SHA256,
    );
    expect(isRecord(manifest)).toBe(true);
    if (!isRecord(manifest) || !isRecord(manifest.naturalEarth)) {
      return;
    }

    const sourceDefinitions = readArray(
      manifest.naturalEarth,
      'sources',
    ).map((source) =>
      isRecord(source)
        ? {
            id: readString(source, 'id'),
            url: readString(source, 'url'),
            sha256: readString(source, 'sha256'),
          }
        : null,
    );
    expect(sourceDefinitions).toEqual([
      {
        id: 'natural-earth-admin-0-50m',
        url: EXPECTED_BASE_SOURCE_URL,
        sha256: EXPECTED_BASE_SOURCE_SHA256,
      },
      {
        id: 'natural-earth-admin-0-10m',
        url: EXPECTED_SUPPLEMENT_SOURCE_URL,
        sha256: EXPECTED_SUPPLEMENT_SOURCE_SHA256,
      },
    ]);
    expect(repositoryAttributes.split(/\r?\n/u)).toEqual(
      expect.arrayContaining([
        'public/data/world-borders-modern.geojson text eol=lf',
        'public/data/world-manifest.json text eol=lf',
        'public/data/world-modern.geojson text eol=lf',
      ]),
    );
  });

  it('pins the interior-border mesh to the digest the manifest records', async (): Promise<void> => {
    const { manifest } = readAssets();
    await expect(calculateSha256(borderMeshText)).resolves.toBe(
      EXPECTED_BORDER_MESH_SHA256,
    );

    const mesh = readJson(borderMeshText);
    expect(isRecord(mesh)).toBe(true);
    if (!isRecord(mesh)) {
      return;
    }
    expect(mesh.type).toBe('GeometryCollection');
    const geometries = readArray(mesh, 'geometries');
    // A literal, never `a.length * b.length`: a product is green at zero rows.
    expect(geometries).toHaveLength(EXPECTED_BORDER_MESH_GEOMETRY_COUNT);
    expect(
      geometries.every(
        (geometry) =>
          isRecord(geometry) &&
          (geometry.type === 'LineString' || geometry.type === 'MultiLineString'),
      ),
    ).toBe(true);

    expect(isRecord(manifest)).toBe(true);
    if (!isRecord(manifest)) {
      return;
    }
    // The manifest record and the artifact are asserted against each other, so
    // editing one to agree with the other is not enough to keep this green.
    expect(manifest.interiorBorderMesh).toMatchObject({
      file: 'world-borders-modern.geojson',
      derivedFrom: 'world-modern.geojson',
      rootType: 'GeometryCollection',
      command:
        '-i input.geojson -innerlines -o format=geojson precision=0.0001 output.geojson',
      geometryCount: EXPECTED_BORDER_MESH_GEOMETRY_COUNT,
      byteLength: new TextEncoder().encode(borderMeshText).byteLength,
      sha256: EXPECTED_BORDER_MESH_SHA256,
    });
  });

  it('locks the exact core, supplement, count, and parent policy', async (): Promise<void> => {
    const { manifest } = await readAssets();
    expect(isRecord(manifest)).toBe(true);
    if (!isRecord(manifest)) {
      return;
    }

    const coreStates = readArray(manifest, 'coreStates');
    const nonCoreUnits = readArray(manifest, 'nonCoreUnits');
    const supplements = readArray(manifest, 'supplements');
    const coreIds = new Set(
      coreStates.map((record) => (isRecord(record) ? readString(record, 'id') : '')),
    );

    expect(coreIds).toEqual(EXPECTED_CORE_IDS);
    expect(coreStates).toHaveLength(195);
    expect(nonCoreUnits).toHaveLength(47);
    expect(supplements).toHaveLength(6);
    expect(
      supplements
        .map((record) => (isRecord(record) ? readString(record, 'id') : ''))
        .sort(),
    ).toEqual(EXPECTED_SUPPLEMENT_IDS);

    // D4-10: three categories now, and each one is asserted separately. A
    // self-colorable unit owns its own colour and can never borrow a core
    // state's; an inherit-parent unit still cannot be selected.
    const selfColorableIds: string[] = [];
    for (const record of [...nonCoreUnits, ...supplements]) {
      expect(isRecord(record)).toBe(true);
      if (!isRecord(record)) {
        continue;
      }

      if (record.colorPolicy === 'self-colorable') {
        selfColorableIds.push(readString(record, 'id'));
        expect(record.isSelectable).toBe(true);
        expect(record.parentCoreId).toBe(record.id);
        expect(coreIds.has(String(record.id))).toBe(false);
        continue;
      }

      expect(record.isSelectable).toBe(false);
      expect(record.colorPolicy).toBe('inherit-parent');
      expect(typeof record.parentCoreId).toBe('string');
      expect(coreIds.has(String(record.parentCoreId))).toBe(true);
    }

    expect(selfColorableIds.sort()).toEqual(EXPECTED_SELF_COLORABLE_IDS);

    expect(isRecord(manifest.policy)).toBe(true);
    expect(manifest.policy).toMatchObject({
      coreDefinition: '193 UN member states plus the Holy See and State of Palestine',
      coreStateCount: 195,
      selfColorableCount: 12,
      selectableCount: 207,
      runtimeUnitCount: 248,
      coreSelectable: true,
      selfColorableSelectable: true,
      inheritParentSelectable: false,
    });
    // The two counts mean different things and the second is derived from the
    // first. Written as literals deliberately: `a.length + b.length` would be
    // satisfied by an empty manifest.
    expect(manifest.policy).not.toHaveProperty('nonCoreSelectable');
  });

  it('normalizes all visible units into finite world paths', async (): Promise<void> => {
    const assets = await readAssets();
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL): Promise<Response> => {
        return Promise.resolve(createJsonResponse(respondByUrl(input, assets)));
      }),
    );

    const result = await loadWorldGeoData(new AbortController().signal);
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') {
      return;
    }

    const pathGenerator = geoPath(createWorldProjection());
    const paths = result.features.map((feature) =>
      createSafeMapPath(pathGenerator, feature),
    );

    expect(result.features).toHaveLength(248);
    // 195 is core states and did not move. 207 is colorable units (D4-10) and
    // is what the country browser and Locate see.
    expect(result.coreFeatures).toHaveLength(195);
    expect(result.entityLookup.size).toBe(248);
    expect(result.coreLookup.size).toBe(195);
    expect(result.colorableLookup.size).toBe(207);
    expect(result.countryMetadata).toHaveLength(207);
    expect(
      EXPECTED_SELF_COLORABLE_IDS.every((id) => result.colorableLookup.has(id)),
    ).toBe(true);
    expect(
      EXPECTED_SELF_COLORABLE_IDS.some((id) => result.coreLookup.has(id)),
    ).toBe(false);
    expect(new Set(result.features.map((feature) => feature.id)).size).toBe(248);
    expect(paths.every((path) => path.length > 0 && !/NaN|Infinity/u.test(path))).toBe(true);

    /*
     * 04-09: the SHIPPED mesh passes the loader's own validation, counted as
     * GEOMETRIES rather than `LineString`s. `04-06` measured 301 `LineString`
     * plus 26 `MultiLineString`, and `coding-rules/data.md` records why the
     * distinction matters: a LineString-only tally agrees happily with a mesh
     * that has lost all 26 MultiLineStrings. Both member counts are asserted
     * against literals so the sum cannot be satisfied by a redistribution.
     */
    expect(result.borderMesh).not.toBeNull();
    expect(result.borderMeshWarnings).toStrictEqual([]);
    const meshGeometries = result.borderMesh?.geometries ?? [];
    expect(meshGeometries).toHaveLength(EXPECTED_BORDER_MESH_GEOMETRY_COUNT);
    expect(
      meshGeometries.filter((geometry) => geometry.type === 'LineString'),
    ).toHaveLength(301);
    expect(
      meshGeometries.filter((geometry) => geometry.type === 'MultiLineString'),
    ).toHaveLength(26);

    // And it projects: an unprojectable mesh would render as an empty `d` and
    // the map would ship with no interior borders at all, which is the exact
    // Known Stub 04-08 opened and this plan closes.
    const meshPath =
      result.borderMesh === null
        ? ''
        : createSafeMapPath(pathGenerator, result.borderMesh);
    expect(meshPath.length).toBeGreaterThan(0);
    expect(/NaN|Infinity/u.test(meshPath)).toBe(false);
  });

  /*
   * The mesh is NON-FATAL, in both of its failure directions, and the map is
   * the reason: losing the lines BETWEEN countries must not cost the creator
   * the countries. Asserted as `borderMesh: null` on a still-`ready` state -
   * not as an error - because an error state is a blank editor.
   */
  it.each([
    {
      label: 'the mesh fetch fails',
      respond: (): unknown => null,
      status: 503,
    },
    {
      label: 'the mesh is the wrong root type',
      respond: (assets: { readonly world: unknown }): unknown => assets.world,
      status: 200,
    },
    {
      label: 'the mesh lost a geometry the manifest counts',
      respond: (assets: { readonly borderMesh: unknown }): unknown => {
        const mesh = assets.borderMesh;
        if (!isRecord(mesh) || !Array.isArray(mesh.geometries)) {
          throw new Error('the committed mesh is not a geometry collection.');
        }
        return { ...mesh, geometries: mesh.geometries.slice(1) };
      },
      status: 200,
    },
  ])(
    'keeps the map usable, without interior borders, when $label',
    async ({ respond, status }): Promise<void> => {
      const assets = readAssets();
      vi.stubGlobal(
        'fetch',
        vi.fn((input: RequestInfo | URL): Promise<Response> => {
          if (String(input) === WORLD_BORDERS_URL) {
            return Promise.resolve(
              createJsonResponse(respond(assets) ?? {}, status),
            );
          }
          return Promise.resolve(createJsonResponse(respondByUrl(input, assets)));
        }),
      );

      const result = await loadWorldGeoData(new AbortController().signal);
      expect(result.status).toBe('ready');
      if (result.status !== 'ready') {
        return;
      }
      expect(result.features).toHaveLength(248);
      expect(result.borderMesh).toBeNull();
    },
  );
});

describe('world data loader', (): void => {
  it('fetches same-origin manifest and world data once with one abort signal', async (): Promise<void> => {
    const assets = await readAssets();
    const signals: AbortSignal[] = [];
    const fetchMock = vi.fn(
      (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        if (init?.signal instanceof AbortSignal) {
          signals.push(init.signal);
        }
        return Promise.resolve(createJsonResponse(respondByUrl(input, assets)));
      },
    );
    vi.stubGlobal('fetch', fetchMock);

    const controller = new AbortController();
    const result = await loadWorldGeoData(controller.signal);

    expect(result.status).toBe('ready');
    // Three since 04-09: the interior-border mesh is the third same-origin
    // payload. The URL LIST is asserted, not just the count, so the new fetch
    // is named rather than absorbed into a bigger number.
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.map(([input]) => String(input))).toEqual([
      WORLD_MANIFEST_URL,
      WORLD_DATA_URL,
      WORLD_BORDERS_URL,
    ]);
    expect(WORLD_MANIFEST_URL.startsWith('/data/')).toBe(true);
    expect(WORLD_DATA_URL.startsWith('/data/')).toBe(true);
    expect(WORLD_BORDERS_URL.startsWith('/data/')).toBe(true);
    expect(signals).toEqual([
      controller.signal,
      controller.signal,
      controller.signal,
    ]);
  });

  it('aborts both in-flight requests through the hook request cleanup', async (): Promise<void> => {
    const signals: AbortSignal[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const signal = init?.signal;
        if (signal instanceof AbortSignal) {
          signals.push(signal);
        }

        return new Promise<Response>((_resolve, reject) => {
          signal?.addEventListener('abort', (): void => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      }),
    );

    const request = startWorldGeoDataLoad();
    expect(signals).toHaveLength(3);

    request.abort();

    await expect(request.promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(signals.every((signal) => signal.aborted)).toBe(true);
  });

  it.each([
    { failedUrl: WORLD_MANIFEST_URL, source: 'manifest' },
    { failedUrl: WORLD_DATA_URL, source: 'world-asset' },
  ] as const)(
    'returns a typed fatal state when $source fetch fails',
    async ({ failedUrl, source }): Promise<void> => {
      const assets = await readAssets();
      vi.stubGlobal(
        'fetch',
        vi.fn((input: RequestInfo | URL): Promise<Response> => {
          if (String(input) === failedUrl) {
            return Promise.resolve(createJsonResponse({}, 503));
          }
          return Promise.resolve(createJsonResponse(respondByUrl(input, assets)));
        }),
      );

      await expect(loadWorldGeoData(new AbortController().signal)).resolves.toEqual({
        status: 'error',
        reason: 'fetch-failed',
        source,
      });
    },
  );

  it('refuses a manifest with no interior-border-mesh record (04-09)', async (): Promise<void> => {
    const assets = readAssets();
    const { manifest } = assets;
    expect(isRecord(manifest)).toBe(true);
    if (!isRecord(manifest)) {
      return;
    }
    const withoutMeshRecord = Object.fromEntries(
      Object.entries(manifest).filter(([key]) => key !== 'interiorBorderMesh'),
    );
    expect('interiorBorderMesh' in withoutMeshRecord).toBe(false);
    expect('interiorBorderMesh' in manifest).toBe(true);

    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL): Promise<Response> =>
        Promise.resolve(
          createJsonResponse(
            respondByUrl(input, { ...assets, manifest: withoutMeshRecord }),
          ),
        ),
      ),
    );

    /*
     * The mesh ARTIFACT is non-fatal; the manifest RECORD is not. The record is
     * what the artifact is counted against, so a manifest without it is a
     * provenance pair this build does not recognise - and accepting it would
     * quietly turn the count gate off rather than fail it.
     */
    await expect(loadWorldGeoData(new AbortController().signal)).resolves.toEqual({
      status: 'error',
      reason: 'invalid-data',
      source: 'manifest',
    });
  });

  it.each([
    {
      invalidUrl: WORLD_MANIFEST_URL,
      invalidValue: { schemaVersion: 1 },
      source: 'manifest',
    },
    {
      invalidUrl: WORLD_DATA_URL,
      invalidValue: { type: 'FeatureCollection', features: [] },
      source: 'world-asset',
    },
  ] as const)(
    'returns a typed fatal state when $source validation fails',
    async ({ invalidUrl, invalidValue, source }): Promise<void> => {
      const assets = readAssets();
      vi.stubGlobal(
        'fetch',
        vi.fn((input: RequestInfo | URL): Promise<Response> => {
          if (String(input) === invalidUrl) {
            return Promise.resolve(createJsonResponse(invalidValue));
          }
          return Promise.resolve(createJsonResponse(respondByUrl(input, assets)));
        }),
      );

      await expect(loadWorldGeoData(new AbortController().signal)).resolves.toEqual({
        status: 'error',
        reason: 'invalid-data',
        source,
      });
    },
  );

  it('rejects an over-bounded world collection before geometry traversal', async (): Promise<void> => {
    const assets = readAssets();
    const { world } = assets;
    expect(isRecord(world) && Array.isArray(world.features)).toBe(true);
    if (!isRecord(world) || !Array.isArray(world.features)) {
      return;
    }

    const oversizedWorld = {
      ...world,
      features: [...world.features, world.features[0]],
    };
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL): Promise<Response> =>
        Promise.resolve(
          createJsonResponse(
            respondByUrl(input, { ...assets, world: oversizedWorld }),
          ),
        ),
      ),
    );

    await expect(loadWorldGeoData(new AbortController().signal)).resolves.toEqual({
      status: 'error',
      reason: 'invalid-data',
      source: 'world-asset',
    });
  });

  it('keeps valid world units ready when one neighboring unit is malformed', async (): Promise<void> => {
    const { manifest, worldText: worldBytes } = readAssets();
    const malformedWorld = JSON.parse(
      worldBytes.replace('"id":"ABW"', '"id":""'),
    ) as unknown;
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL): Promise<Response> =>
        Promise.resolve(
          createJsonResponse(String(input) === WORLD_MANIFEST_URL ? manifest : malformedWorld),
        ),
      ),
    );

    const result = await loadWorldGeoData(new AbortController().signal);

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') {
      return;
    }
    expect(result.features).toHaveLength(247);
    expect(result.coreFeatures).toHaveLength(195);
    expect(result.warnings).toContainEqual({ featureIndex: 0, code: 'missing-id' });
  });
});
