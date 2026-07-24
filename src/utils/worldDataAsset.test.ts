import { geoPath } from 'd3';
import { afterEach, describe, expect, it, vi } from 'vitest';

import repositoryAttributes from '../../.gitattributes?raw';
import manifestText from '../../public/data/world-manifest.json?raw';
import worldText from '../../public/data/world-modern.geojson?raw';
import {
  WORLD_DATA_URL,
  WORLD_MANIFEST_URL,
  loadWorldGeoData,
  startWorldGeoDataLoad,
} from '../hooks/useGeoData';
import { createSafeMapPath, createWorldProjection } from './mapProjection';

const EXPECTED_MANIFEST_SHA256 =
  '57313d11df49285e348b3fb67179aedd7d01f227426729eb0107c4f18fb51fe4';
const EXPECTED_WORLD_SHA256 =
  '45ccfed198f2d3ba4cbeb1d1b06889b0ba6869ee944feff32a5355b94cf0827a';
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
} {
  return {
    manifestText,
    worldText,
    manifest: readJson(manifestText),
    world: readJson(worldText),
  };
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
        'public/data/world-manifest.json text eol=lf',
        'public/data/world-modern.geojson text eol=lf',
      ]),
    );
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

    for (const record of [...nonCoreUnits, ...supplements]) {
      expect(isRecord(record)).toBe(true);
      if (!isRecord(record)) {
        continue;
      }

      expect(record.isSelectable).toBe(false);
      if (record.parentCoreId === null) {
        expect(record.colorPolicy).toBe('neutral');
      } else {
        expect(typeof record.parentCoreId).toBe('string');
        expect(coreIds.has(String(record.parentCoreId))).toBe(true);
        expect(record.colorPolicy).toBe('inherit-parent');
      }
    }

    expect(isRecord(manifest.policy)).toBe(true);
    expect(manifest.policy).toMatchObject({
      coreStateCount: 195,
      runtimeUnitCount: 248,
      coreSelectable: true,
      nonCoreSelectable: false,
    });
  });

  it('normalizes all visible units into finite world paths', async (): Promise<void> => {
    const { manifest, world } = await readAssets();
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL): Promise<Response> => {
        const url = String(input);
        return Promise.resolve(
          createJsonResponse(url === WORLD_MANIFEST_URL ? manifest : world),
        );
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
    expect(result.coreFeatures).toHaveLength(195);
    expect(result.entityLookup.size).toBe(248);
    expect(result.coreLookup.size).toBe(195);
    expect(result.countryMetadata).toHaveLength(195);
    expect(new Set(result.features.map((feature) => feature.id)).size).toBe(248);
    expect(paths.every((path) => path.length > 0 && !/NaN|Infinity/u.test(path))).toBe(true);
  });
});

describe('world data loader', (): void => {
  it('fetches same-origin manifest and world data once with one abort signal', async (): Promise<void> => {
    const { manifest, world } = await readAssets();
    const signals: AbortSignal[] = [];
    const fetchMock = vi.fn(
      (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        if (init?.signal instanceof AbortSignal) {
          signals.push(init.signal);
        }
        return Promise.resolve(
          createJsonResponse(String(input) === WORLD_MANIFEST_URL ? manifest : world),
        );
      },
    );
    vi.stubGlobal('fetch', fetchMock);

    const controller = new AbortController();
    const result = await loadWorldGeoData(controller.signal);

    expect(result.status).toBe('ready');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.map(([input]) => String(input))).toEqual([
      WORLD_MANIFEST_URL,
      WORLD_DATA_URL,
    ]);
    expect(WORLD_MANIFEST_URL.startsWith('/data/')).toBe(true);
    expect(WORLD_DATA_URL.startsWith('/data/')).toBe(true);
    expect(signals).toEqual([controller.signal, controller.signal]);
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
    expect(signals).toHaveLength(2);

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
      const { manifest, world } = await readAssets();
      vi.stubGlobal(
        'fetch',
        vi.fn((input: RequestInfo | URL): Promise<Response> => {
          const url = String(input);
          if (url === failedUrl) {
            return Promise.resolve(createJsonResponse({}, 503));
          }
          return Promise.resolve(
            createJsonResponse(url === WORLD_MANIFEST_URL ? manifest : world),
          );
        }),
      );

      await expect(loadWorldGeoData(new AbortController().signal)).resolves.toEqual({
        status: 'error',
        reason: 'fetch-failed',
        source,
      });
    },
  );

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
      const { manifest, world } = readAssets();
      vi.stubGlobal(
        'fetch',
        vi.fn((input: RequestInfo | URL): Promise<Response> => {
          const url = String(input);
          if (url === invalidUrl) {
            return Promise.resolve(createJsonResponse(invalidValue));
          }
          return Promise.resolve(
            createJsonResponse(url === WORLD_MANIFEST_URL ? manifest : world),
          );
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
    const { manifest, world } = readAssets();
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
          createJsonResponse(String(input) === WORLD_MANIFEST_URL ? manifest : oversizedWorld),
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
