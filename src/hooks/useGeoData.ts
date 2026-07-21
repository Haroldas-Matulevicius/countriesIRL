import { useEffect, useMemo, useState } from 'react';

import type {
  GeoDataState,
  GeoFeature,
  GeoJsonWarning,
} from '../types/map';
import { normalizeGeoJson } from '../utils/geojson';

const GEO_DATA_URL = '/data/europe-modern.geojson';
const MAP_LOAD_START_MARK = 'countriesirl-map-load-start';

type GeoDataLoadState =
  | { status: 'loading' }
  | {
      status: 'ready';
      features: ReadonlyArray<GeoFeature>;
      warnings: ReadonlyArray<GeoJsonWarning>;
    }
  | {
      status: 'error';
      reason: 'fetch-failed' | 'invalid-data';
    };

async function loadGeoData(signal: AbortSignal): Promise<GeoDataLoadState> {
  globalThis.performance.mark(MAP_LOAD_START_MARK);
  const response = await globalThis.fetch(GEO_DATA_URL, { signal });
  if (!response.ok) {
    return { status: 'error', reason: 'fetch-failed' };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { status: 'error', reason: 'invalid-data' };
  }

  const normalizationResult = normalizeGeoJson(payload);
  if (!normalizationResult.ok) {
    return { status: 'error', reason: 'invalid-data' };
  }

  return {
    status: 'ready',
    features: normalizationResult.features,
    warnings: normalizationResult.warnings,
  };
}

export function useGeoData(): GeoDataState {
  const [loadState, setLoadState] = useState<GeoDataLoadState>({
    status: 'loading',
  });

  useEffect((): (() => void) => {
    const controller = new AbortController();

    void loadGeoData(controller.signal)
      .then((nextState): void => {
        if (!controller.signal.aborted) {
          setLoadState(nextState);
        }
      })
      .catch((): void => {
        if (!controller.signal.aborted) {
          setLoadState({ status: 'error', reason: 'fetch-failed' });
        }
      });

    return (): void => controller.abort();
  }, []);

  const lookup = useMemo<ReadonlyMap<string, GeoFeature>>(() => {
    if (loadState.status !== 'ready') {
      return new Map<string, GeoFeature>();
    }

    return new Map(
      loadState.features.map((feature): [string, GeoFeature] => [
        feature.id,
        feature,
      ]),
    );
  }, [loadState]);

  return useMemo<GeoDataState>(() => {
    if (loadState.status === 'ready') {
      return {
        status: 'ready',
        features: loadState.features,
        lookup,
        warnings: loadState.warnings,
      };
    }

    return loadState;
  }, [loadState, lookup]);
}
