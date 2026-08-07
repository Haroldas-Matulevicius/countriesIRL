import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  ChangeEvent,
  DragEvent,
  KeyboardEvent,
} from 'react';

import { DEFAULT_COLOR } from '../constants/colors';
import type {
  LegendCorner,
  LegendEntryState,
  LegendForm,
  LegendState,
  LegendTextSize,
} from '../types/composition';
import type { CompositionStateContextValue } from '../providers/CompositionStateProvider';
import type { BandExtents } from '../utils/bands';
import { MAX_LEGEND_CAPTION_LENGTH } from '../utils/compositionText';
import {
  LEGEND_LABEL_FIT_MESSAGE,
  getActiveLegendEntries,
  getLegendBlockingMessage,
  getLegendCornerPosition,
  nudgeLegendPosition,
  resolveLegendForm,
  resolveLegendPosition,
  validateActiveLegend,
} from '../utils/legend';
import type {
  LegendBounds,
  LegendNudgeDirection,
  LegendValidationResult,
} from '../utils/legend';
import { LayersIcon } from './icons/LayersIcon';

export const LEGEND_LABEL_MAX_LENGTH = 32;

const EMPTY_LABEL_MESSAGE = 'Enter a legend label.';
const TEXT_SIZE_OPTIONS: ReadonlyArray<{
  value: LegendTextSize;
  label: string;
}> = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];
/**
 * `04-UI-SPEC.md § 9`, byte-exact: *"Legend form options | `Bar` · `Rows`"*.
 *
 * Exported so a gate can ENUMERATE the vocabulary rather than restate it — the
 * same reason `LEGEND_CORNER_OPTIONS` is exported, and `legend.spec.ts` asserts
 * this list and `LEGEND_FORMS` agree in both directions.
 */
export const LEGEND_FORM_OPTIONS: ReadonlyArray<{
  value: LegendForm;
  label: string;
}> = [
  { value: 'bar', label: 'Bar' },
  { value: 'rows', label: 'Rows' },
];
/**
 * ⚠ **Authored here, not lifted from `04-UI-SPEC.md § 9`.** § 9 has a row for
 * the two form OPTION labels and none for the group headings, the caption
 * field, or the "no data" toggle — the spec specified the control's options
 * without specifying the control. Recorded as an unspecified string in
 * `04-13-SUMMARY.md` rather than presented as contract.
 *
 * None of them is a creator-facing MESSAGE, so none enters `ToastRegion`'s
 * allowlist and assertion 23's pinned counts do not move.
 */
export const LEGEND_CONTENT_GROUP_LABEL = 'Legend content';
export const LEGEND_FORM_GROUP_LABEL = 'Legend form';
export const LEGEND_CAPTION_LABEL = 'Legend caption';
export const LEGEND_NO_DATA_TOGGLE_LABEL = 'Show no data row';
/**
 * Exported so a gate can ENUMERATE the position presets instead of restating
 * them. `03-08`'s non-intersection assertion walks every legend preset, and a
 * hard-coded list there would silently stop covering a preset added here.
 * `navigation.spec.ts` also asserts this list and `LEGEND_CORNERS` are equal in
 * both directions, so a corner added to one and not the other fails.
 */
export const LEGEND_CORNER_OPTIONS: ReadonlyArray<{
  value: LegendCorner;
  label: string;
}> = [
  { value: 'top-left', label: 'Top left' },
  { value: 'top-right', label: 'Top right' },
  { value: 'bottom-left', label: 'Bottom left' },
  { value: 'bottom-right', label: 'Bottom right' },
];
const CORNER_OPTIONS = LEGEND_CORNER_OPTIONS;
export const LEGEND_CUSTOM_POSITION_LABEL = 'Custom';
const CUSTOM_POSITION_LABEL = LEGEND_CUSTOM_POSITION_LABEL;
const NUDGE_OPTIONS: ReadonlyArray<{
  direction: LegendNudgeDirection;
  label: string;
}> = [
  { direction: 'up', label: 'Nudge Up' },
  { direction: 'right', label: 'Nudge Right' },
  { direction: 'down', label: 'Nudge Down' },
  { direction: 'left', label: 'Nudge Left' },
];

export type LegendEditorCommands = Pick<
  CompositionStateContextValue,
  'setLegendEntry' | 'setLegendStyle' | 'setLegendOrder' | 'setLegendPosition'
>;

interface LegendEditorProps {
  legend: LegendState;
  effectiveColors: ReadonlyArray<string>;
  bounds: LegendBounds;
  /** D4-13 — see `LegendOverlay`. The picker and the overlay must agree. */
  bandExtents: BandExtents;
  /**
   * D4-12 — the form the colours imply. The `Form` pills show the RESOLVED
   * form, so a creator who has set no override still sees which one is in
   * effect rather than an empty group.
   */
  inferredForm: LegendForm;
  commands: LegendEditorCommands;
  onStatusMessage: (message: string) => void;
}

export type LegendLabelCommitResult =
  | { readonly ok: true; readonly label: string }
  | {
      readonly ok: false;
      readonly restoredLabel: string;
      readonly message: string;
    };

export function resolveLegendLabelCommit(
  draft: string,
  committedLabel: string,
): LegendLabelCommitResult {
  if (draft.trim().length === 0) {
    return {
      ok: false,
      restoredLabel: committedLabel,
      message: EMPTY_LABEL_MESSAGE,
    };
  }
  if (draft.length > LEGEND_LABEL_MAX_LENGTH) {
    return {
      ok: false,
      restoredLabel: committedLabel,
      message: LEGEND_LABEL_FIT_MESSAGE,
    };
  }
  return { ok: true, label: draft };
}

function focusLegendRow(color: string): void {
  requestAnimationFrame((): void => {
    document
      .querySelector<HTMLElement>(`[data-legend-row-color="${color}"]`)
      ?.focus({ preventScroll: true });
  });
}

export function LegendEditor({
  legend,
  effectiveColors,
  bounds,
  bandExtents,
  inferredForm,
  commands,
  onStatusMessage,
}: LegendEditorProps): JSX.Element {
  const resolvedForm = resolveLegendForm(legend, inferredForm);
  const activeEntries = useMemo(
    (): ReadonlyArray<LegendEntryState> =>
      getActiveLegendEntries(effectiveColors, legend),
    [effectiveColors, legend],
  );
  const [drafts, setDrafts] = useState<Readonly<Record<string, string>>>({});
  const [labelErrors, setLabelErrors] = useState<
    Readonly<Record<string, string>>
  >({});
  const draggedColorRef = useRef<string | null>(null);

  useEffect((): void => {
    const entriesByColor = new Map(
      legend.entries.map((entry): [string, LegendEntryState] => [
        entry.color,
        entry,
      ]),
    );
    let nextOrder = legend.entries.reduce(
      (maximum, entry): number => Math.max(maximum, entry.order),
      -1,
    );

    effectiveColors.forEach((color): void => {
      const normalizedColor = color.toUpperCase();
      if (normalizedColor !== DEFAULT_COLOR && !entriesByColor.has(normalizedColor)) {
        nextOrder += 1;
        commands.setLegendEntry({
          color: normalizedColor,
          label: normalizedColor,
          order: nextOrder,
        });
      }
    });
  }, [commands, effectiveColors, legend.entries]);

  const validation = useMemo(
    (): LegendValidationResult =>
      validateActiveLegend(legend, effectiveColors, bounds, bandExtents),
    [bandExtents, bounds, effectiveColors, legend],
  );

  const blockingMessage = validation.ok
    ? null
    : getLegendBlockingMessage(validation.issues);
  const isEmpty = activeEntries.length === 0;

  const updateOrder = (color: string, targetIndex: number): void => {
    const colors = activeEntries.map((entry): string => entry.color);
    const currentIndex = colors.indexOf(color);
    if (currentIndex < 0) {
      return;
    }

    const [movedColor] = colors.splice(currentIndex, 1);
    const clampedTarget = Math.min(
      colors.length,
      Math.max(0, Math.trunc(targetIndex)),
    );
    colors.splice(clampedTarget, 0, movedColor);
    commands.setLegendOrder(colors);
    onStatusMessage(
      `Moved ${legend.entries.find((entry): boolean => entry.color === color)?.label ?? color} to position ${clampedTarget + 1} of ${colors.length}.`,
    );
    focusLegendRow(color);
  };

  const commitLabel = (entry: LegendEntryState): void => {
    const draft = drafts[entry.color] ?? entry.label;
    const result = resolveLegendLabelCommit(draft, entry.label);
    if (!result.ok) {
      setDrafts((current) => ({
        ...current,
        [entry.color]: result.restoredLabel,
      }));
      setLabelErrors((current) => ({
        ...current,
        [entry.color]: result.message,
      }));
      return;
    }

    setDrafts((current) => {
      const next = { ...current };
      delete next[entry.color];
      return next;
    });
    setLabelErrors((current) => {
      const next = { ...current };
      delete next[entry.color];
      return next;
    });
    if (result.label !== entry.label) {
      commands.setLegendEntry({ ...entry, label: result.label });
    }
  };

  const handleLabelKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    entry: LegendEntryState,
  ): void => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitLabel(entry);
      event.currentTarget.blur();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setDrafts((current) => {
        const next = { ...current };
        delete next[entry.color];
        return next;
      });
      setLabelErrors((current) => {
        const next = { ...current };
        delete next[entry.color];
        return next;
      });
    }
  };

  const handleRowKeyDown = (
    event: KeyboardEvent<HTMLElement>,
    entry: LegendEntryState,
    index: number,
  ): void => {
    if (!event.altKey) {
      return;
    }
    if (event.key === 'ArrowUp' && index > 0) {
      event.preventDefault();
      updateOrder(entry.color, index - 1);
    } else if (event.key === 'ArrowDown' && index < activeEntries.length - 1) {
      event.preventDefault();
      updateOrder(entry.color, index + 1);
    }
  };

  const handleDrop = (
    event: DragEvent<HTMLElement>,
    targetIndex: number,
  ): void => {
    event.preventDefault();
    event.stopPropagation();
    const draggedColor = draggedColorRef.current;
    draggedColorRef.current = null;
    if (draggedColor !== null) {
      updateOrder(draggedColor, targetIndex);
    }
  };

  const setCorner = (corner: LegendCorner, label: string): void => {
    commands.setLegendPosition(
      getLegendCornerPosition(corner, bounds, bandExtents),
    );
    onStatusMessage(`Legend moved to ${label}.`);
  };

  // The Custom cell adopts the position the overlay is actually rendering as a
  // free position, which is what reveals the nudge controls. Its announcement
  // is the existing approved string - no new message enters the allowlist.
  const setCustomPosition = (): void => {
    const resolved = resolveLegendPosition(legend.position, bounds, bandExtents);
    commands.setLegendPosition({
      x: resolved.x,
      y: resolved.y,
      preset: null,
    });
    onStatusMessage('Legend position updated.');
  };

  const nudge = (direction: LegendNudgeDirection): void => {
    // Nudge from the position the overlay is actually rendering, not from a
    // stored value that may predate a column reflow.
    commands.setLegendPosition(
      nudgeLegendPosition(
        resolveLegendPosition(legend.position, bounds, bandExtents),
        direction,
        bounds,
      ),
    );
    onStatusMessage('Legend position updated.');
  };

  return (
    <div className="legend-editor" data-legend-validation={validation.ok ? 'valid' : 'invalid'}>
      {isEmpty ? (
        <div className="legend-editor__empty">
          <span className="legend-editor__empty-chip" aria-hidden="true">
            <LayersIcon size={16} />
          </span>
          <h3>Your legend will appear here</h3>
          <p>Color at least one country to create the first legend entry.</p>
        </div>
      ) : (
        <div className="legend-editor__entries" aria-label="Legend entries">
          {activeEntries.map((entry, index): JSX.Element => {
            const draft = drafts[entry.color] ?? entry.label;
            const error = labelErrors[entry.color];
            const errorId = `legend-label-error-${index}`;

            return (
              <div
                key={entry.color}
                className="legend-editor__entry"
                data-legend-row-color={entry.color}
                /*
                  Keyed on a data attribute, never a positional selector: the
                  red left edge belongs to the row that is invalid, not to
                  whichever row happens to sit where an invalid one once did.
                */
                data-entry-invalid={error === undefined ? undefined : 'true'}
                tabIndex={0}
                aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
                onKeyDown={(event): void => handleRowKeyDown(event, entry, index)}
                onDragOver={(event): void => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onDrop={(event): void => handleDrop(event, index)}
              >
                <span
                  className="legend-editor__swatch"
                  role="img"
                  aria-label={`Color ${entry.color}`}
                  style={{ backgroundColor: entry.color }}
                />
                <label>
                  <span>{`Legend label for ${entry.color}`}</span>
                  <input
                    type="text"
                    value={draft}
                    maxLength={LEGEND_LABEL_MAX_LENGTH}
                    aria-invalid={error === undefined ? undefined : true}
                    aria-describedby={error === undefined ? undefined : errorId}
                    onChange={(event: ChangeEvent<HTMLInputElement>): void => {
                      setDrafts((current) => ({
                        ...current,
                        [entry.color]: event.target.value,
                      }));
                    }}
                    onBlur={(): void => commitLabel(entry)}
                    onKeyDown={(event): void => handleLabelKeyDown(event, entry)}
                  />
                </label>
                <span
                  className={
                    draft.length >= LEGEND_LABEL_MAX_LENGTH
                      ? 'legend-editor__counter legend-editor__counter--limit'
                      : 'legend-editor__counter'
                  }
                  aria-live="off"
                >
                  {draft.length}/32
                </span>
                {error === undefined ? null : (
                  <p id={errorId} role="alert">
                    {error}
                  </p>
                )}
                {/*
                  Grouped so the three reorder controls can be laid out as one
                  equal-width row. Positional selectors on interactive elements
                  are banned, so the row needs a class of its own rather than a
                  `:nth-child` reach from the entry.
                */}
                {/*
                  Icon-only ghost buttons on their own row (UI-SPEC 7): a
                  full-phrase control row has no width at which it fits a
                  280px column. Inline SVG glyphs follow the MapNavigation
                  precedent; the accessible names are unchanged, and keyboard
                  reorder through the two arrows stays the PRIMARY path -
                  drag is the enhancement.
                */}
                <div className="legend-editor__row-actions">
                  <button
                    type="button"
                    className="legend-editor__row-action"
                    aria-label="Move Up"
                    title="Move Up"
                    disabled={index === 0}
                    onClick={(): void => updateOrder(entry.color, index - 1)}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path d="M10 16V4M10 4 5 9M10 4l5 5" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="legend-editor__row-action"
                    aria-label="Move Down"
                    title="Move Down"
                    disabled={index === activeEntries.length - 1}
                    onClick={(): void => updateOrder(entry.color, index + 1)}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path d="M10 4v12m0 0 5-5m-5 5-5-5" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="legend-editor__row-action"
                    draggable
                    aria-label={`Drag ${entry.label} to reorder`}
                    title={`Drag ${entry.label} to reorder`}
                    onDragStart={(event): void => {
                      event.stopPropagation();
                      draggedColorRef.current = entry.color;
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', entry.color);
                    }}
                    onDragEnd={(event): void => {
                      event.stopPropagation();
                      draggedColorRef.current = null;
                    }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      stroke="none"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <circle cx="7" cy="5" r="1.5" />
                      <circle cx="13" cy="5" r="1.5" />
                      <circle cx="7" cy="10" r="1.5" />
                      <circle cx="13" cy="10" r="1.5" />
                      <circle cx="7" cy="15" r="1.5" />
                      <circle cx="13" cy="15" r="1.5" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {blockingMessage === null ? null : (
        <p role="alert" tabIndex={-1} data-legend-error="blocking">
          {blockingMessage}
        </p>
      )}

      {/*
        D4-11: three of the four style fieldsets are GONE with the state they
        wrote — `Legend theme`, `Background opacity`, and `Legend border`. The
        legend has no box chrome to style. `Legend text size` survives, and the
        `Legend position` picker below is byte-identical, announcements
        included.

        D4-12 (`04-13`): `Legend content` and `Legend form` join it. Neither is
        chrome — one is what the legend SAYS and the other is which marks it
        draws. ⚠ The plan asked for ONE new group; two shipped, because the
        caption and the "no data" row are rendered into the exported PNG and a
        rendered element a creator cannot author is a stub. Recorded as a
        deviation in `04-13-SUMMARY.md`.
      */}
      <fieldset disabled={isEmpty}>
        <legend>Legend style and position</legend>

        <fieldset aria-label={LEGEND_CONTENT_GROUP_LABEL}>
          <legend>{LEGEND_CONTENT_GROUP_LABEL}</legend>
          <label className="legend-editor__caption">
            <span>{LEGEND_CAPTION_LABEL}</span>
            <input
              type="text"
              value={legend.caption}
              maxLength={MAX_LEGEND_CAPTION_LENGTH}
              onChange={(event: ChangeEvent<HTMLInputElement>): void => {
                commands.setLegendStyle({ caption: event.target.value });
              }}
            />
          </label>
          {/*
            A checkbox in a pill: `.legend-editor__pill:has(input:checked)`
            already paints a checked control Powder, so the toggle reuses the
            radio pill's whole recipe rather than authoring a second one.
          */}
          <label className="legend-editor__pill">
            <input
              type="checkbox"
              checked={legend.showNoData}
              onChange={(event: ChangeEvent<HTMLInputElement>): void => {
                commands.setLegendStyle({ showNoData: event.target.checked });
              }}
            />
            {LEGEND_NO_DATA_TOGGLE_LABEL}
          </label>
        </fieldset>

        <fieldset aria-label={LEGEND_FORM_GROUP_LABEL}>
          <legend>{LEGEND_FORM_GROUP_LABEL}</legend>
          {LEGEND_FORM_OPTIONS.map((option): JSX.Element => (
            <label key={option.value} className="legend-editor__pill">
              <input
                type="radio"
                name="legend-form"
                value={option.value}
                checked={resolvedForm === option.value}
                onChange={(): void =>
                  commands.setLegendStyle({ form: option.value })
                }
              />
              {option.label}
            </label>
          ))}
        </fieldset>

        <fieldset aria-label="Legend text size">
          <legend>Legend text size</legend>
          {TEXT_SIZE_OPTIONS.map((option): JSX.Element => (
            <label key={option.value} className="legend-editor__pill">
              <input
                type="radio"
                name="legend-text-size"
                value={option.value}
                checked={legend.textSize === option.value}
                onChange={(): void =>
                  commands.setLegendStyle({ textSize: option.value })
                }
              />
              {option.label}
            </label>
          ))}
        </fieldset>

        {/*
          UI-SPEC 7: a 3x3 grid of 44px cells - the four corner presets plus
          Custom in the centre. The radios keep their visible-to-AT labels
          (visually hidden, never display: none), so `Top left` etc. stay the
          accessible names every locator and announcement keys on. The
          announcements are the existing approved strings; nothing new enters
          the allowlist.
        */}
        <fieldset aria-label="Legend position">
          <legend>Legend position</legend>
          <div className="legend-editor__position-grid">
            {CORNER_OPTIONS.map((option): JSX.Element => (
              <label
                key={option.value}
                className={`legend-editor__position-cell legend-editor__position-cell--${option.value}`}
              >
                <input
                  type="radio"
                  name="legend-position"
                  value={option.value}
                  checked={legend.position.preset === option.value}
                  onChange={(): void => setCorner(option.value, option.label)}
                />
                <span className="legend-editor__position-label">
                  {option.label}
                </span>
                <span
                  className="legend-editor__position-dot"
                  aria-hidden="true"
                />
              </label>
            ))}
            <label className="legend-editor__position-cell legend-editor__position-cell--custom">
              <input
                type="radio"
                name="legend-position"
                value="custom"
                checked={legend.position.preset === null}
                onChange={setCustomPosition}
              />
              <span className="legend-editor__position-label">
                {CUSTOM_POSITION_LABEL}
              </span>
              <span
                className="legend-editor__position-dot"
                aria-hidden="true"
              />
            </label>
          </div>
        </fieldset>

        {legend.position.preset === null ? (
          <div aria-label="Custom legend position controls">
            {NUDGE_OPTIONS.map((option): JSX.Element => (
              <button
                key={option.direction}
                type="button"
                onClick={(): void => nudge(option.direction)}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
      </fieldset>
    </div>
  );
}
