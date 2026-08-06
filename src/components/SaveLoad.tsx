import { useCallback, useEffect, useId, useRef, useState } from 'react';
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
import { MapIcon } from './icons/MapIcon';

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
  'This map could not be saved and nothing was written. Try Save Map again.';
const CAMERA_BUSY_ERROR =
  'Finish the current export before loading a saved composition.';
const SNAPSHOT_UNAVAILABLE_ERROR =
  'This saved map uses a period that is not available. Choose another saved map.';

export type SaveLoadStatusSeverity = 'success' | 'warning';

export interface SaveLoadProps {
  isDirty: boolean;
  isMapReady: boolean;
  /**
   * The snapshot ids the APPROVED manifest actually yields, resolved by the
   * owner from `useSnapshotCatalog` - the same source `resolvePeriodOptions`
   * reads. A stored record can carry any id the storage validator admits
   * (all five catalog ids), so the row resolver filters through this set
   * rather than the label registry (OPEN ITEM 4).
   */
  approvedPeriodIds: ReadonlySet<string>;
  onSave: (name: string) => CompositionSaveTransactionOutcome;
  onLoad: (name: string) => Promise<CompositionLoadTransactionOutcome>;
  /** A committed delete, so the owner can drop identity that named it. */
  onDeleted: (name: string) => void;
  onFocusMap: () => void;
  onStatus: (message: string, severity?: SaveLoadStatusSeverity) => void;
}

export interface LoadFeedback {
  message: string;
  severity: SaveLoadStatusSeverity;
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
 * UI-SPEC 15 asks for the "period short label", the leading token of the
 * catalog label (`Modern — current borders` -> `Modern`).
 *
 * The id is resolved through the APPROVED manifest ids first (OPEN ITEM 4):
 * the storage validator admits any of the five catalog ids, so a hand-crafted
 * record carrying `"snapshotId": "1914"` validates - and the label registry
 * alone would then name a deferred period on the row. An id the approved
 * manifest does not yield resolves to `null` and the row renders no period
 * label. The label text itself still comes only from the approved registry,
 * never from manifest text (T-02-40).
 */
export function getPeriodShortLabel(
  snapshotId: string,
  approvedPeriodIds: ReadonlySet<string>,
): string | null {
  if (!approvedPeriodIds.has(snapshotId)) {
    return null;
  }
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

export function getSavedMapMetadata(
  savedMap: SavedMapSummary,
  approvedPeriodIds: ReadonlySet<string>,
): string {
  if (savedMap.sourceVersion === 1 || savedMap.snapshotId === null) {
    return LEGACY_ROW_METADATA;
  }

  const periodLabel = getPeriodShortLabel(
    savedMap.snapshotId,
    approvedPeriodIds,
  );

  // A V2 record whose period is not approved is NOT a legacy map - it will
  // not "open with modern borders"; loading it refuses with the
  // period-unavailable message. The row states what it can prove and simply
  // renders no period label.
  return [
    ...(periodLabel === null ? [] : [periodLabel]),
    getLegendEntrySummary(savedMap.legendEntryCount),
    savedMap.isWholeWorldView ? 'Whole world view' : 'Custom view',
  ].join(' · ');
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
 * with the load copy told a creator who pressed Save Map that a composition
 * "could not be loaded", and `map-not-found` claimed the browser blocks local
 * saves.
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

/**
 * The `saved` tool's panel content (UI-SPEC 8). The Phase 2 modal dialog
 * dissolved here in `03-07`: the dialog role, the modality attribute, the
 * overlay, the focus trap, and the imperative `inert` all retired WITH the
 * dialog. (Named indirectly on purpose - the retirement gate is a plain text
 * scan with no parser between the rule and this file.)
 *
 * What survives, verbatim, is the nested-confirmation contract - it was never
 * about the modal:
 * - a confirmation renders as a SIBLING of the surface it interrupts (the
 *   row's action group swaps in place), never as a descendant of it;
 * - it carries its own `tabIndex={-1}`: as a swapped-in block it has no
 *   focusable ancestor of its own, so a mouse-down on its body text would
 *   otherwise drop focus to `document.body` - and from there the panel's
 *   keydown handler never fires, so Escape dies;
 * - `Escape` dismisses the INNERMOST open confirmation, branching over every
 *   open layer in order, and only an Escape that closes nothing propagates up
 *   to the tool panel's own close handler;
 * - focus returns to the control that opened the confirmation, from an
 *   EFFECT, keyed by a stable row key - index keys break as soon as a row is
 *   deleted.
 */
export function SaveLoad({
  isDirty,
  isMapReady,
  approvedPeriodIds,
  onSave,
  onLoad,
  onDeleted,
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
  const confirmLoadButtonRef = useRef<HTMLButtonElement>(null);
  const confirmDeleteButtonRef = useRef<HTMLButtonElement>(null);
  const restoreDeleteFocusRef = useRef<string | null>(null);
  const restoreLoadFocusRef = useRef<string | null>(null);
  const deleteButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const nameInputRef = useRef<HTMLInputElement>(null);
  const savedMapsSectionRef = useRef<HTMLElement>(null);
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

  useEffect((): void => {
    refreshSavedMaps();
  }, [refreshSavedMaps]);

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
      // The row's actions swap back in on the NEXT render, so the effect
      // below owns the focus restore, not this handler.
      restoreLoadFocusRef.current = getSavedMapFocusKey(pendingLoad);
    }
    setPendingLoad(null);
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

  const handlePanelKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      if (event.key !== 'Escape') {
        return;
      }

      // Escape dismisses the INNERMOST open confirmation only, branching over
      // every open layer in order. An Escape that closes nothing here is left
      // to propagate, so the tool panel's own handler can close the panel.
      if (pendingLoad !== null) {
        event.preventDefault();
        event.stopPropagation();
        cancelPendingLoad();
        return;
      }
      if (pendingDeleteKey !== null) {
        event.preventDefault();
        event.stopPropagation();
        restoreDeleteFocusRef.current = pendingDeleteKey;
        setPendingDeleteKey(null);
      }
    },
    [cancelPendingLoad, pendingDeleteKey, pendingLoad],
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

      const result = onSave(trimmedName);

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
      // A successful load is the intentional exception to in-place focus:
      // the creator's next act is on the map they just loaded.
      requestAnimationFrame(onFocusMap);
    },
    [onFocusMap, onLoad, onStatus, refreshSavedMaps],
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

      // The owner may be holding this name as the composition's identity; the
      // record it pointed at no longer exists.
      onDeleted(savedMap.name);

      const nextMap = savedMaps[index + 1] ?? savedMaps[index - 1];
      pendingDeleteFocusRef.current =
        nextMap === undefined ? 'map-name' : getSavedMapFocusKey(nextMap);
      onStatus('Saved map deleted.');
    },
    [deleteMap, onDeleted, onStatus, refreshSavedMaps, savedMaps],
  );

  return (
    <div
      className="save-load"
      aria-busy={isSaving || isLoading}
      onKeyDown={handlePanelKeyDown}
    >
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

      <section className="save-load-section" aria-labelledby={`${headingId}-save`}>
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

          {/*
            The `saved` panel's ONE Apple Blue element (D-05). The label stays
            `Save Map` in the replace case too; the overwrite notice above is
            what carries the replace semantics.
          */}
          <button
            type="submit"
            className="save-load-submit"
            disabled={
              isSaving ||
              isLoading ||
              !isMapReady ||
              error === 'storage-unavailable'
            }
          >
            Save Map
          </button>
        </form>
      </section>

      <section
        ref={savedMapsSectionRef}
        className="save-load-section saved-maps-section"
        aria-labelledby={`${headingId}-saved`}
      >
        <h3 id={`${headingId}-saved`}>Saved maps</h3>

        {savedMaps.length === 0 ? (
          <div className="saved-maps-empty">
            <span className="saved-maps-empty__chip" aria-hidden="true">
              <MapIcon size={16} />
            </span>
            <h4>No saved maps yet</h4>
            <p>{SAVED_EMPTY_BODY}</p>
          </div>
        ) : (
          <ul className="saved-maps-list">
            {savedMaps.map((savedMap, index) => {
              const focusKey = getSavedMapFocusKey(savedMap);
              const formattedDate = formatSavedDate(savedMap.timestamp);
              const isConfirmingDelete = pendingDeleteKey === focusKey;
              const isConfirmingLoad =
                pendingLoad !== null &&
                getSavedMapFocusKey(pendingLoad) === focusKey;

              return (
                <li key={`${focusKey}::${index}`} className="saved-map-row">
                  <div className="saved-map-details">
                    <span className="saved-map-chip" aria-hidden="true">
                      <MapIcon size={16} />
                    </span>
                    <div className="saved-map-text">
                      <strong title={savedMap.name}>{savedMap.name}</strong>
                      <time dateTime={formattedDate.dateTime}>
                        {formattedDate.display}
                      </time>
                      <span className="saved-map-metadata">
                        {getSavedMapMetadata(savedMap, approvedPeriodIds)}
                      </span>
                    </div>
                  </div>
                  {isConfirmingLoad ? (
                    /*
                      The dirty-load confirmation, carried across the dialog's
                      retirement verbatim: a sibling of the actions it
                      replaces, its own tabIndex so a mouse-down on the body
                      text cannot drop focus to `document.body`, Escape
                      handled innermost-first, and focus returned to this
                      row's `Load This Map` from the effect above, keyed by
                      the stable row key.
                    */
                    <div
                      className="saved-map-actions saved-map-actions--confirm saved-map-load-confirm"
                      tabIndex={-1}
                      aria-labelledby={confirmHeadingId}
                      aria-describedby={confirmBodyId}
                    >
                      <h4 id={confirmHeadingId}>{DIRTY_LOAD_HEADING}</h4>
                      <p id={confirmBodyId} className="saved-map-load-prompt">
                        {`Loading “${savedMap.name}” will replace unsaved colors, view, period, and legend changes.`}
                      </p>
                      <button
                        ref={confirmLoadButtonRef}
                        type="button"
                        className="saved-map-confirm-action"
                        onClick={(): void => {
                          void performLoad(savedMap);
                        }}
                      >
                        Load Saved Map
                      </button>
                      <button
                        type="button"
                        onClick={cancelPendingLoad}
                      >
                        Keep Editing
                      </button>
                    </div>
                  ) : isConfirmingDelete ? (
                    <div
                      className="saved-map-actions saved-map-actions--confirm"
                      tabIndex={-1}
                    >
                      <p className="saved-map-delete-prompt">
                        {`Delete “${savedMap.name}”? This saved map cannot be recovered.`}
                      </p>
                      <button
                        ref={confirmDeleteButtonRef}
                        type="button"
                        className="saved-map-delete saved-map-delete--confirm"
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
                        disabled={isLoading || !isMapReady}
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
                          setPendingLoad(null);
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
    </div>
  );
}
