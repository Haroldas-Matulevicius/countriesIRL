import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import type { FormEvent, KeyboardEvent } from 'react';

import type { ColorMap, CountryId } from '../types/map';
import type {
  SavedMap,
  StorageErrorReason,
  StorageWarning,
} from '../types/ui';
import { MAX_MAP_NAME_LENGTH } from '../constants/config';
import { useLocalStorage } from '../hooks/useLocalStorage';

const SAVE_LOAD_CONTROL_SELECTOR = '[data-save-load-control="true"]';
const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  '[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const EMPTY_NAME_ERROR = 'Enter a map name before saving.';
const NAME_TOO_LONG_ERROR = `Map names can be up to ${MAX_MAP_NAME_LENGTH} characters.`;
const OVERWRITE_NOTICE =
  'A saved map already uses this name. Saving will replace it.';
const CORRUPT_STORAGE_WARNING =
  'Some saved maps could not be read and were left out of the list. Your current map is unchanged.';
const PARTIAL_LOAD_WARNING =
  'Saved map loaded, but some invalid saved colors were omitted.';
const STORAGE_UNAVAILABLE_ERROR =
  'This browser blocked local saves. You can keep editing and export a PNG, but maps cannot be saved here.';
const STORAGE_QUOTA_ERROR =
  'Browser storage is full. Delete an older saved map, then save this map again.';
const MAP_NOT_FOUND_ERROR =
  'This saved map is no longer available. The saved-map list has been refreshed.';

export type SaveLoadStatusSeverity = 'success' | 'warning';

export interface SaveLoadProps {
  colors: ColorMap;
  validCountryIds: ReadonlySet<CountryId>;
  onLoad: (colors: ColorMap) => void;
  onClose: () => void;
  onFocusMap: () => void;
  onStatus: (message: string, severity?: SaveLoadStatusSeverity) => void;
}

export interface LoadFeedback {
  message: string;
  severity: SaveLoadStatusSeverity;
}

export interface ModalFocusTarget {
  isConnected: boolean;
  focus: () => void;
}

interface FormattedSavedDate {
  display: string;
  dateTime?: string;
}

function formatSavedDate(timestamp: number): FormattedSavedDate {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return { display: 'Date unknown' };
  }

  const day = String(date.getDate()).padStart(2, '0');
  return {
    display: `${day} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`,
    dateTime: date.toISOString(),
  };
}

function getSavedMapFocusKey(savedMap: SavedMap): string {
  return `${savedMap.name.length}:${savedMap.name}:${savedMap.timestamp}`;
}

export function restoreSaveLoadFocus(
  opener: ModalFocusTarget | null,
  currentControl: ModalFocusTarget | null,
  focusMap: () => void,
): void {
  if (opener?.isConnected) {
    opener.focus();
    return;
  }

  if (currentControl?.isConnected) {
    currentControl.focus();
    return;
  }

  focusMap();
}

export function getLoadFeedback(
  warnings: ReadonlyArray<StorageWarning>,
): LoadFeedback {
  return warnings.some((warning) => warning.code === 'corrupt-data')
    ? { message: PARTIAL_LOAD_WARNING, severity: 'warning' }
    : { message: 'Saved map loaded.', severity: 'success' };
}

function getStorageErrorMessage(
  reason: StorageErrorReason | null,
): string | null {
  switch (reason) {
    case 'storage-unavailable':
      return STORAGE_UNAVAILABLE_ERROR;
    case 'quota-exceeded':
      return STORAGE_QUOTA_ERROR;
    case 'map-not-found':
      return MAP_NOT_FOUND_ERROR;
    case 'invalid-name':
      return EMPTY_NAME_ERROR;
    case 'name-too-long':
      return NAME_TOO_LONG_ERROR;
    case null:
      return null;
  }
}

export function SaveLoad({
  colors,
  validCountryIds,
  onLoad,
  onClose,
  onFocusMap,
  onStatus,
}: SaveLoadProps): JSX.Element {
  const {
    savedMaps,
    warnings,
    error,
    refreshSavedMaps,
    saveMap,
    loadMap,
    deleteMap,
  } = useLocalStorage();
  const [mapName, setMapName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const savedMapsSectionRef = useRef<HTMLElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const shouldRestoreOpenerRef = useRef(true);
  const saveInProgressRef = useRef(false);
  const pendingDeleteFocusRef = useRef<string | 'map-name' | null>(null);
  const loadButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const headingId = useId();
  const nameErrorId = useId();
  const overwriteNoticeId = useId();

  const trimmedName = mapName.trim();
  const isReplacing =
    trimmedName.length > 0 && savedMaps.some((map) => map.name === trimmedName);
  const hasCorruptWarning = warnings.some(
    (warning) => warning.code === 'corrupt-data',
  );
  const storageError = getStorageErrorMessage(error);
  const describedBy = [
    nameError === null ? null : nameErrorId,
    isReplacing ? overwriteNoticeId : null,
  ]
    .filter((id): id is string => id !== null)
    .join(' ');

  const requestClose = useCallback((): void => {
    onClose();
  }, [onClose]);

  useEffect((): (() => void) => {
    openerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    refreshSavedMaps();
    nameInputRef.current?.focus();

    return (): void => {
      if (shouldRestoreOpenerRef.current) {
        restoreSaveLoadFocus(
          openerRef.current,
          document.querySelector<HTMLElement>(SAVE_LOAD_CONTROL_SELECTOR),
          onFocusMap,
        );
      }
    };
  }, [onFocusMap, refreshSavedMaps]);

  useEffect((): void => {
    const pendingFocus = pendingDeleteFocusRef.current;
    if (pendingFocus === null) {
      return;
    }

    pendingDeleteFocusRef.current = null;

    if (pendingFocus === 'map-name') {
      nameInputRef.current?.focus();
      return;
    }

    const nextButton = loadButtonRefs.current.get(pendingFocus);
    if (nextButton !== undefined) {
      nextButton.focus();
      return;
    }

    nameInputRef.current?.focus();
  }, [savedMaps]);

  const handleDialogKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        requestClose();
        return;
      }

      if (event.key !== 'Tab' || dialogRef.current === null) {
        return;
      }

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      } else if (!dialogRef.current.contains(activeElement)) {
        event.preventDefault();
        firstElement.focus();
      }
    },
    [requestClose],
  );

  const handleSave = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      setOperationError(null);

      if (trimmedName.length === 0) {
        setNameError(EMPTY_NAME_ERROR);
        nameInputRef.current?.focus();
        return;
      }

      if (trimmedName.length > MAX_MAP_NAME_LENGTH) {
        setNameError(NAME_TOO_LONG_ERROR);
        nameInputRef.current?.focus();
        return;
      }

      setNameError(null);
      setIsSaving(true);
      saveInProgressRef.current = true;

      const result = saveMap(trimmedName, colors);

      saveInProgressRef.current = false;
      setIsSaving(false);

      if (!result.ok) {
        if (result.reason === 'invalid-name') {
          setNameError(EMPTY_NAME_ERROR);
          nameInputRef.current?.focus();
        } else if (result.reason === 'name-too-long') {
          setNameError(NAME_TOO_LONG_ERROR);
          nameInputRef.current?.focus();
        } else if (result.reason === 'quota-exceeded') {
          savedMapsSectionRef.current?.scrollIntoView({ block: 'nearest' });
        }
        return;
      }

      setMapName('');
      onStatus(
        result.value.replaced
          ? 'Saved map replaced.'
          : 'Map saved to this browser.',
      );
      nameInputRef.current?.focus();
    },
    [colors, onStatus, saveMap, trimmedName],
  );

  const handleLoad = useCallback(
    (savedMap: SavedMap): void => {
      setOperationError(null);
      const result = loadMap(savedMap.name, validCountryIds);

      if (!result.ok) {
        if (result.reason === 'map-not-found') {
          setOperationError(MAP_NOT_FOUND_ERROR);
          refreshSavedMaps();
        }
        return;
      }

      onLoad(result.value);
      const feedback = getLoadFeedback(result.warnings);
      onStatus(feedback.message, feedback.severity);
      shouldRestoreOpenerRef.current = false;
      onClose();
      requestAnimationFrame(onFocusMap);
    },
    [loadMap, onClose, onFocusMap, onLoad, onStatus, refreshSavedMaps, validCountryIds],
  );

  const handleDelete = useCallback(
    (savedMap: SavedMap, index: number): void => {
      setOperationError(null);
      const result = deleteMap(savedMap.name);

      if (!result.ok) {
        if (result.reason === 'map-not-found') {
          setOperationError(MAP_NOT_FOUND_ERROR);
          refreshSavedMaps();
        }
        return;
      }

      const nextMap = savedMaps[index + 1] ?? savedMaps[index - 1];
      pendingDeleteFocusRef.current =
        nextMap === undefined ? 'map-name' : getSavedMapFocusKey(nextMap);
      onStatus('Saved map deleted.');
    },
    [deleteMap, onStatus, refreshSavedMaps, savedMaps],
  );

  return (
    <div
      className="save-load-overlay"
      onMouseDown={(event): void => {
        if (
          event.target === event.currentTarget &&
          !saveInProgressRef.current
        ) {
          requestClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        className="save-load-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-busy={isSaving}
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
      >
        <header className="save-load-header">
          <h2 id={headingId}>Save or load maps</h2>
          <button type="button" onClick={requestClose}>
            Close Saved Maps
          </button>
        </header>

        {hasCorruptWarning && (
          <p className="save-load-warning" role="status">
            {CORRUPT_STORAGE_WARNING}
          </p>
        )}

        {storageError !== null && (
          <p className="save-load-error" role="alert">
            {storageError}
          </p>
        )}

        {operationError !== null && (
          <p className="save-load-error" role="alert">
            {operationError}
          </p>
        )}

        <section aria-labelledby={`${headingId}-save`}>
          <h3 id={`${headingId}-save`}>Save current map</h3>
          <form onSubmit={handleSave} noValidate>
            <label htmlFor={`${headingId}-name`}>Map name</label>
            <input
              ref={nameInputRef}
              id={`${headingId}-name`}
              name="map-name"
              type="text"
              value={mapName}
              maxLength={MAX_MAP_NAME_LENGTH}
              placeholder="Example: Europe summer map"
              aria-invalid={nameError !== null}
              aria-describedby={describedBy.length === 0 ? undefined : describedBy}
              onChange={(event): void => {
                setMapName(event.target.value);
                setNameError(null);
                setOperationError(null);
              }}
            />

            {nameError !== null && (
              <p id={nameErrorId} className="save-load-error" role="alert">
                {nameError}
              </p>
            )}

            {isReplacing && (
              <p id={overwriteNoticeId} className="save-load-warning">
                {OVERWRITE_NOTICE}
              </p>
            )}

            <button
              type="submit"
              disabled={isSaving || error === 'storage-unavailable'}
            >
              {isReplacing ? 'Replace Saved Map' : 'Save Current Map'}
            </button>
          </form>
        </section>

        <section
          ref={savedMapsSectionRef}
          className="saved-maps-section"
          aria-labelledby={`${headingId}-saved`}
        >
          <h3 id={`${headingId}-saved`}>Saved maps</h3>

          {savedMaps.length === 0 ? (
            <div className="saved-maps-empty">
              <h4>No saved maps yet</h4>
              <p>
                Name the current map above to keep it in this browser and load it later.
              </p>
            </div>
          ) : (
            <ul className="saved-maps-list">
              {savedMaps.map((savedMap, index) => {
                const focusKey = getSavedMapFocusKey(savedMap);
                const formattedDate = formatSavedDate(savedMap.timestamp);

                return (
                  <li
                    key={`${focusKey}::${index}`}
                    className="saved-map-row"
                  >
                    <div className="saved-map-details">
                      <strong title={savedMap.name}>{savedMap.name}</strong>
                      <time dateTime={formattedDate.dateTime}>
                        {formattedDate.display}
                      </time>
                    </div>
                    <div className="saved-map-actions">
                      <button
                        ref={(element): void => {
                          if (element === null) {
                            loadButtonRefs.current.delete(focusKey);
                          } else {
                            loadButtonRefs.current.set(focusKey, element);
                          }
                        }}
                        type="button"
                        aria-label={`Load This Map: ${savedMap.name}`}
                        onClick={(): void => handleLoad(savedMap)}
                      >
                        Load This Map
                      </button>
                      <button
                        type="button"
                        className="saved-map-delete"
                        aria-label={`Delete Saved Map: ${savedMap.name}`}
                        onClick={(): void => handleDelete(savedMap, index)}
                      >
                        Delete Saved Map
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <footer className="save-load-footer">
          <button type="button" onClick={requestClose}>
            Close Saved Maps
          </button>
        </footer>
      </div>
    </div>
  );
}
