/**
 * The single production home for the data asset base path.
 *
 * Transition-readiness (c): a host that mounts `MapEditor` may serve the
 * bundled world asset from somewhere other than `/data/`, so the base path is a
 * parameter rather than a literal scattered across the fetch sites. Every
 * production fetch URL in the app is derived here.
 *
 * Two literals under `src/` are deliberately NOT routed through this module,
 * and that exemption is enforced by `editorConfig.test.ts` rather than merely
 * described: `historicalValidation.ts`'s two asset-path predicates. They are
 * safety predicates on MANIFEST-DECLARED paths, not fetch URLs. Parameterising
 * them alongside the fetch paths would let a host-configured base path widen
 * what counts as an acceptable asset path - a loosening of the approval chain
 * dressed up as a refactor. See `.planning/coding-rules/data.md`.
 */

export const DATA_BASE_PATH = '/data/';

const WORLD_MANIFEST_FILE = 'world-manifest.json';
const WORLD_DATA_FILE = 'world-modern.geojson';
const SNAPSHOT_MANIFEST_FILE = 'snapshots/index.json';

export interface EditorAssetUrls {
  readonly worldManifestUrl: string;
  readonly worldDataUrl: string;
  readonly snapshotManifestUrl: string;
}

/**
 * A base path is a directory, so it ends in a separator. Normalizing here means
 * a host can pass `/assets/countriesirl` or `/assets/countriesirl/` and get the
 * same URLs, instead of one of the two silently producing `…irlworld-manifest`.
 */
export function normalizeDataBasePath(dataBasePath: string): string {
  return dataBasePath.endsWith('/') ? dataBasePath : `${dataBasePath}/`;
}

export function resolveEditorAssetUrls(
  dataBasePath: string = DATA_BASE_PATH,
): EditorAssetUrls {
  const base = normalizeDataBasePath(dataBasePath);

  return {
    worldManifestUrl: `${base}${WORLD_MANIFEST_FILE}`,
    worldDataUrl: `${base}${WORLD_DATA_FILE}`,
    snapshotManifestUrl: `${base}${SNAPSHOT_MANIFEST_FILE}`,
  };
}

export const DEFAULT_EDITOR_ASSET_URLS: EditorAssetUrls =
  resolveEditorAssetUrls();
