import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

import {
  DEFAULT_EDITOR_ASSET_URLS,
  type EditorAssetUrls,
} from '../config/editorConfig';
import { createStorageAdapter, type StorageAdapter } from '../utils/storage';

/**
 * Everything the editor needs from a host, resolved.
 *
 * This is the inside of `MapEditor`'s props boundary: the editor reads the
 * resolved values from here, and `MapEditor` is the only place they are
 * produced. Nothing below this line reaches for a global to discover where its
 * assets live, how to persist, or which theme to open in.
 */
export interface EditorConfigValue {
  readonly assetUrls: EditorAssetUrls;
  /**
   * A factory, not an instance. The default adapter reaches browser storage
   * through `storage.ts` - the one production file allowed to know what backs
   * it - and constructing it at module scope would bind that decision at import
   * time, before a test (or a host) has installed the environment the editor is
   * supposed to run in.
   */
  readonly createStorage: () => StorageAdapter;
  readonly initialThemeMode: EditorThemeMode;
}

export type EditorThemeMode = 'light' | 'dark';

/**
 * The standalone app's configuration. It is also the context default, so a
 * component rendered outside `MapEditor` - every existing unit test does this -
 * behaves exactly as it did before the boundary existed.
 */
export const DEFAULT_EDITOR_CONFIG: EditorConfigValue = {
  assetUrls: DEFAULT_EDITOR_ASSET_URLS,
  createStorage: (): StorageAdapter => createStorageAdapter(),
  initialThemeMode: 'light',
};

const EditorConfigContext =
  createContext<EditorConfigValue>(DEFAULT_EDITOR_CONFIG);

export function EditorConfigProvider({
  config,
  children,
}: {
  config: EditorConfigValue;
  children: ReactNode;
}): JSX.Element {
  return (
    <EditorConfigContext.Provider value={config}>
      {children}
    </EditorConfigContext.Provider>
  );
}

export function useEditorConfig(): EditorConfigValue {
  return useContext(EditorConfigContext);
}
