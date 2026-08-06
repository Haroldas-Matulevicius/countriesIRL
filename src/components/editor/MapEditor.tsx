import { useMemo } from 'react';

import App from '../../App';
import { DATA_BASE_PATH, resolveEditorAssetUrls } from '../../config/editorConfig';
import {
  EditorConfigProvider,
  type EditorConfigValue,
  type EditorThemeMode,
} from '../../providers/EditorConfigProvider';
import { CompositionStateProvider } from '../../providers/CompositionStateProvider';
import { MapStateProvider } from '../../providers/MapStateProvider';
import { createStorageAdapter, type StorageAdapter } from '../../utils/storage';

/**
 * The one component a host mounts.
 *
 * Transition-readiness (a): everything the editor needs from its host arrives
 * through these props, and the editor never reaches outside its own mount point
 * for chrome. The mount root is `.map-editor` - full-bleed, opaque, `100dvh`,
 * and the only element a host has to place. The theme class is written there
 * too, never on the host page's root element, so a host stays able to override
 * it.
 *
 * Comment discipline: this file is scanned by `MapEditor.test.tsx` for host
 * global references as a plain text search, with no parser between the rule and
 * the file. Describe host chrome without spelling the globals, or the gate goes
 * red on prose and gets loosened instead of obeyed.
 *
 * Deliberately absent, and it is not an oversight: no authentication, no
 * entitlement awareness, and no network call of any kind. Embedding this editor
 * in another product ends the localhost-only constraint this project runs
 * under, and that requires a new explicit owner decision - not a prop.
 */
export interface MapEditorProps {
  /**
   * Where the bundled map assets are served from. Defaults to the standalone
   * app's path, so mounting with no props is exactly the app that shipped.
   */
  dataBasePath?: string;
  /**
   * Persistence. Defaults to the browser-backed adapter in `utils/storage.ts`,
   * which is the only production file in `src/` that touches browser storage
   * directly - a host substituting its own adapter changes nothing else.
   */
  storage?: StorageAdapter;
  /**
   * The mode the mount root opens in. `03-06` builds the control that changes
   * it and the persistence that remembers it; the absent-key default is light.
   */
  initialThemeMode?: EditorThemeMode;
}

export function MapEditor({
  dataBasePath = DATA_BASE_PATH,
  storage,
  initialThemeMode = 'light',
}: MapEditorProps = {}): JSX.Element {
  const config = useMemo<EditorConfigValue>(
    (): EditorConfigValue => ({
      assetUrls: resolveEditorAssetUrls(dataBasePath),
      createStorage:
        storage === undefined
          ? (): StorageAdapter => createStorageAdapter()
          : (): StorageAdapter => storage,
      initialThemeMode,
    }),
    [dataBasePath, initialThemeMode, storage],
  );

  return (
    <EditorConfigProvider config={config}>
      <MapStateProvider>
        <CompositionStateProvider>
          <App />
        </CompositionStateProvider>
      </MapStateProvider>
    </EditorConfigProvider>
  );
}
