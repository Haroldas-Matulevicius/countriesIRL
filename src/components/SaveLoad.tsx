import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import type { FormEvent, KeyboardEvent } from 'react';

import type { CompositionLoadTransactionOutcome } from '../hooks/useCompositionLoadTransaction';
import type {
  CompositionSaveFailureReason,
  CompositionSaveTransactionOutcome,
} from '../hooks/useCompositionSaveTransaction';
import type { CompositionLoadWarning } from '../types/composition';
import type {
  SavedMapSummary,
  StorageErrorReason,
  StorageWarning,
} from '../types/ui';
import { MAX_MAP_NAME_LENGTH } from '../constants/config';
import { SNAPSHOT_CATALOG } from '../constants/snapshots';
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
  'A saved map already uses this name. Saving will replace its colors, view, period, and legend.';
const LEGACY_ROW_METADATA =
  'Legacy map · Opens with modern borders and whole-world view';
const SAVED_EMPTY_BODY =
  'Name the current map above to keep its colors, view, period, and legend in this browser.';
const DIRTY_LOAD_HEADING = 'Replace the current map?';
const CORRUPT_STORAGE_WARNING =
  'Some saved maps could not be read and were left out of the list. Your current map is unchanged.';
const LEGACY_LOAD_WARNING =
  'Older saved map loaded with a modern world view. Save it again to keep the full composition.';
const REPAIRED_COMPOSITION_WARNING =
  'Saved map loaded, but some unavailable settings were restored to safe defaults.';
const PARTIAL_LOAD_WARNING =
  'Saved map loaded, but some invalid saved colors were omitted.';
const STORAGE_UNAVAILABLE_ERROR =
  'This browser blocked local saves. You can keep editing and export a PNG, but maps cannot be saved here.';
const STORAGE_QUOTA_ERROR =
  'Browser storage is full. Delete an older saved map, then save this map again.';
const MAP_NOT_FOUND_ERROR =
  'This saved map is no longer available. The saved-map list has been refreshed.';
const LOAD_FAILED_ERROR =
  'This saved composition could not be loaded. Your current map is unchanged.';
const SAVE_FAILED_ERROR =
  'This map could not be saved and nothing was written. Try Save Current Map again.';
const CAMERA_BUSY_ERROR =
  'Finish the current export before loading a saved composition.';
const SNAPSHOT_UNAVAILABLE_ERROR =
  'This saved map uses a period that is not available. Choose another saved map or close this window.';

export type SaveLoadStatusSeverity = 'success' | 'warning';

export interface SaveLoadProps {
  isDirty: boolean;
  onSave: (name: string) => CompositionSaveTransactionOutcome;
  onLoad: (name: string) => Promise<CompositionLoadTransactionOutcome>;
  onCancelLoad: () => void;
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

function getSavedMapFocusKey(savedMap: SavedMapSummary): string {
  return `${savedMap.name.length}:${savedMap.name}:${savedMap.timestamp}`;
}

/**
 * UI-SPEC 15 asks for the "period short label", which is the leading token of
 * the catalog label (`Modern — current borders` -> `Modern`). The catalog stays
 * the only source, so a deferred period can never be named from a stored id.
 */
export function getPeriodShortLabel(snapshotId: string): string | null {
  const entry = SNAPSHOT_CATALOG.find(
    (candidate): boolean => candidate.id === snapshotId,
  );
  return entry === undefined ? null : entry.label.split(' — ')[0];
}

export function getLegendEntrySummary(entryCount: number): string {
  if (entryCount === 0) {
    return 'No legend entries';
  }
  return entryCount === 1 ? '1 legend entry' : `${entryCount} legend entries`;
}

export function getSavedMapMetadata(savedMap: SavedMapSummary): string {
  if (savedMap.sourceVersion === 1 || savedMap.snapshotId === null) {
    return LEGACY_ROW_METADATA;
  }

  const periodLabel = getPeriodShortLabel(savedMap.snapshotId);
  if (periodLabel === null) {
    return LEGACY_ROW_METADATA;
  }

  return [
    periodLabel,
    getLegendEntrySummary(savedMap.legendEntryCount),
    savedMap.isWholeWorldView ? 'Whole world view' : 'Custom view',
  ].join(' · ');
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
  compositionWarnings: ReadonlyArray<CompositionLoadWarning>,
  storageWarnings: ReadonlyArray<StorageWarning>,
): LoadFeedback {
  const warningMessages: string[] = [];
  if (compositionWarnings.some((warning) => warning.code === 'legacy-migrated')) {
    warningMessages.push(LEGACY_LOAD_WARNING);
  }
  if (
    compositionWarnings.some((warning) => warning.code === 'composition-repaired')
  ) {
    warningMessages.push(REPAIRED_COMPOSITION_WARNING);
  }
  if (storageWarnings.some((warning) => warning.code === 'corrupt-data')) {
    warningMessages.push(PARTIAL_LOAD_WARNING);
  }

  return warningMessages.length > 0
    ? { message: warningMessages.join(' '), severity: 'warning' }
    : { message: 'Saved map loaded.', severity: 'success' };
}

/**
 * A save failure must read as a save failure. Reporting `map-canvas-unavailable`
 * with the load copy told a creator who pressed Save Current Map that a
 * composition "could not be loaded", and `map-not-found` claimed the browser
 * blocks local saves.
 */
export function getSaveFailureMessage(
  reason: CompositionSaveFailureReason,
): string {
  switch (reason) {
    case 'invalid-name':
      return EMPTY_NAME_ERROR;
    case 'name-too-long':
      return NAME_TOO_LONG_ERROR;
    case 'quota-exceeded':
      return STORAGE_QUOTA_ERROR;
    case 'map-not-found':
      return MAP_NOT_FOUND_ERROR;
    case 'map-canvas-unavailable':
      return SAVE_FAILED_ERROR;
    case 'storage-unavailable':
      return STORAGE_UNAVAILABLE_ERROR;
  }
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
  isDirty,
  onSave,
  onLoad,
  onCancelLoad,
  onClose,
  onFocusMap,
  onStatus,
}: SaveLoadProps): JSX.Element {
  const {
    savedMapSummaries: savedMaps,
    warnings,
    error,
    refreshSavedMaps,
    deleteMap,
  } = useLocalStorage();
  const [mapName, setMapName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingDeleteKey, setPendingDeleteKey] = useState<string | null>(null);
  const [pendingLoad, setPendingLoad] = useState<SavedMapSummary | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmDialogRef = useRef<HTMLDivElement>(null);
  const confirmLoadButtonRef = useRef<HTMLButtonElement>(null);
  const confirmDeleteButtonRef = useRef<HTMLButtonElement>(null);
  const restoreDeleteFocusRef = useRef<string | null>(null);
  const restoreLoadFocusRef = useRef<string | null>(null);
  const deleteButtonRefs = useRef(new Map<string, HTMLButtonElement>());
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
  const confirmHeadingId = useId();
  const confirmBodyId = useId();

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
    onCancelLoad();
    onClose();
  }, [onCancelLoad, onClose]);

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

  const cancelPendingLoad = useCallback((): void => {
    if (pendingLoad !== null) {
      // The dialog behind the confirmation is inert, so focus cannot be
      // restored until React has removed that attribute - the effect below owns
      // the restore, not this handler.
      restoreLoadFocusRef.current = getSavedMapFocusKey(pendingLoad);
    }
    setPendingLoad(null);
  }, [pendingLoad]);

  // A nested `aria-modal` dialog does not hide its parent: `aria-modal` on the
  // outer dialog restricts assistive technology to the outer subtree, which
  // still contains Save, Delete, and Close. Without `inert`, a browse-mode user
  // reads past the confirmation and activates the very controls the sighted
  // user cannot reach.
  useEffect((): void => {
    const dialog = dialogRef.current;
    if (dialog === null) {
      return;
    }
    if (pendingLoad === null) {
      dialog.removeAttribute('inert');
      dialog.removeAttribute('aria-hidden');
      return;
    }
    dialog.setAttribute('inert', '');
    dialog.setAttribute('aria-hidden', 'true');
  }, [pendingLoad]);

  useEffect((): void => {
    if (pendingLoad !== null) {
      confirmLoadButtonRef.current?.focus();
      return;
    }

    const restoreKey = restoreLoadFocusRef.current;
    if (restoreKey === null) {
      return;
    }
    restoreLoadFocusRef.current = null;
    loadButtonRefs.current.get(restoreKey)?.focus();
  }, [pendingLoad]);

  // The row swaps its buttons, so the control to focus does not exist until
  // after the render that follows the state change.
  useEffect((): void => {
    if (pendingDeleteKey !== null) {
      confirmDeleteButtonRef.current?.focus();
      return;
    }

    const restoreKey = restoreDeleteFocusRef.current;
    if (restoreKey === null) {
      return;
    }
    restoreDeleteFocusRef.current = null;
    deleteButtonRefs.current.get(restoreKey)?.focus();
  }, [pendingDeleteKey]);

  const handleDialogKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      // The dirty-load confirmation owns dismissal and the trap while it is
      // open, so Escape can never skip past it and load over unsaved work.
      const trapRoot =
        pendingLoad === null ? dialogRef.current : confirmDialogRef.current;

      // Escape dismisses the innermost open confirmation only. Closing the
      // whole modal from a per-row delete prompt would discard the prompt and
      // force the user to reopen and re-navigate.
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (pendingLoad !== null) {
          cancelPendingLoad();
        } else if (pendingDeleteKey !== null) {
          restoreDeleteFocusRef.current = pendingDeleteKey;
          setPendingDeleteKey(null);
        } else {
          requestClose();
        }
        return;
      }

      if (event.key !== 'Tab' || trapRoot === null) {
        return;
      }

      const focusableElements = Array.from(
        trapRoot.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusableElements.length === 0) {
        event.preventDefault();
        trapRoot.focus();
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
      } else if (!trapRoot.contains(activeElement)) {
        event.preventDefault();
        firstElement.focus();
      }
    },
    [cancelPendingLoad, pendingDeleteKey, pendingLoad, requestClose],
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

      const result = onSave(trimmedName);

      saveInProgressRef.current = false;
      setIsSaving(false);

      if (!result.ok) {
        const message = getSaveFailureMessage(result.reason);
        if (
          result.reason === 'invalid-name' ||
          result.reason === 'name-too-long'
        ) {
          setNameError(message);
          nameInputRef.current?.focus();
          return;
        }

        setOperationError(message);
        if (result.reason === 'quota-exceeded') {
          savedMapsSectionRef.current?.scrollIntoView({ block: 'nearest' });
        }
        if (result.reason === 'map-not-found') {
          refreshSavedMaps();
        }
        return;
      }

      refreshSavedMaps();
      setMapName('');
      onStatus(
        result.value.replaced
          ? 'Saved map replaced.'
          : 'Map saved to this browser.',
      );
      nameInputRef.current?.focus();
    },
    [onSave, onStatus, refreshSavedMaps, trimmedName],
  );

  const performLoad = useCallback(
    async (savedMap: SavedMapSummary): Promise<void> => {
      setOperationError(null);
      setPendingLoad(null);
      setIsLoading(true);
      const result = await onLoad(savedMap.name);
      setIsLoading(false);

      if (!result.ok) {
        if (result.reason === 'map-not-found') {
          setOperationError(MAP_NOT_FOUND_ERROR);
          refreshSavedMaps();
        } else if (result.reason === 'camera-restore-blocked') {
          setOperationError(CAMERA_BUSY_ERROR);
        } else if (
          result.reason === 'snapshot-unavailable' ||
          result.reason === 'snapshot-resolution-failed'
        ) {
          setOperationError(SNAPSHOT_UNAVAILABLE_ERROR);
        } else if (result.reason !== 'cancelled') {
          setOperationError(LOAD_FAILED_ERROR);
        }
        return;
      }

      const feedback = getLoadFeedback(
        result.compositionWarnings,
        result.storageWarnings,
      );
      onStatus(feedback.message, feedback.severity);
      shouldRestoreOpenerRef.current = false;
      onClose();
      requestAnimationFrame(onFocusMap);
    },
    [onClose, onFocusMap, onLoad, onStatus, refreshSavedMaps],
  );

  const handleLoadRequest = useCallback(
    (savedMap: SavedMapSummary): void => {
      setPendingDeleteKey(null);
      if (isDirty) {
        setOperationError(null);
        setPendingLoad(savedMap);
        return;
      }
      void performLoad(savedMap);
    },
    [isDirty, performLoad],
  );

  const handleDelete = useCallback(
    (savedMap: SavedMapSummary, index: number): void => {
      setOperationError(null);
      setPendingDeleteKey(null);
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
      // The key handler lives on the overlay, not on the dialog: while the
      // load confirmation is open the dialog is inert, so nothing inside it can
      // be focused and no key event could reach a handler bound there.
      onKeyDown={handleDialogKeyDown}
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
        aria-busy={isSaving || isLoading}
        tabIndex={-1}
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
              disabled={
                isSaving || isLoading || error === 'storage-unavailable'
              }
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
              <p>{SAVED_EMPTY_BODY}</p>
            </div>
          ) : (
            <ul className="saved-maps-list">
              {savedMaps.map((savedMap, index) => {
                const focusKey = getSavedMapFocusKey(savedMap);
                const formattedDate = formatSavedDate(savedMap.timestamp);
                const isConfirmingDelete = pendingDeleteKey === focusKey;

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
                      <span className="saved-map-metadata">
                        {getSavedMapMetadata(savedMap)}
                      </span>
                    </div>
                    {isConfirmingDelete ? (
                      <div className="saved-map-actions saved-map-actions--confirm">
                        <p className="saved-map-delete-prompt">
                          {`Delete “${savedMap.name}”? This saved map cannot be recovered.`}
                        </p>
                        <button
                          ref={confirmDeleteButtonRef}
                          type="button"
                          className="saved-map-delete"
                          aria-label={`Delete Map: ${savedMap.name}`}
                          onClick={(): void => handleDelete(savedMap, index)}
                        >
                          Delete Map
                        </button>
                        <button
                          type="button"
                          aria-label={`Keep Map: ${savedMap.name}`}
                          onClick={(): void => {
                            restoreDeleteFocusRef.current = focusKey;
                            setPendingDeleteKey(null);
                          }}
                        >
                          Keep Map
                        </button>
                      </div>
                    ) : (
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
                          disabled={isLoading}
                          onClick={(): void => handleLoadRequest(savedMap)}
                        >
                          Load This Map
                        </button>
                        <button
                          ref={(element): void => {
                            if (element === null) {
                              deleteButtonRefs.current.delete(focusKey);
                            } else {
                              deleteButtonRefs.current.set(focusKey, element);
                            }
                          }}
                          type="button"
                          className="saved-map-delete"
                          aria-label={`Delete Saved Map: ${savedMap.name}`}
                          onClick={(): void => {
                            setOperationError(null);
                            setPendingDeleteKey(focusKey);
                          }}
                        >
                          Delete Saved Map
                        </button>
                      </div>
                    )}
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

      {/*
        Rendered as a sibling of the dialog, never inside it: the dialog is
        marked inert while this confirmation is open, and an inert ancestor
        would take the confirmation itself out of the accessibility tree and
        the tab order.
      */}
      {pendingLoad !== null && (
        <div className="save-load-confirm-overlay">
          <div
            ref={confirmDialogRef}
            className="save-load-confirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby={confirmHeadingId}
            aria-describedby={confirmBodyId}
          >
            <h3 id={confirmHeadingId}>{DIRTY_LOAD_HEADING}</h3>
            <p id={confirmBodyId}>
              {`Loading “${pendingLoad.name}” will replace unsaved colors, view, period, and legend changes.`}
            </p>
            <div className="save-load-confirm-actions">
              <button
                ref={confirmLoadButtonRef}
                type="button"
                onClick={(): void => {
                  void performLoad(pendingLoad);
                }}
              >
                Load Saved Map
              </button>
              <button type="button" onClick={cancelPendingLoad}>
                Keep Editing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
