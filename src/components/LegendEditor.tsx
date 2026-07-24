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

import type {
  LegendBorderStyle,
  LegendCorner,
  LegendEntryState,
  LegendState,
  LegendTextSize,
  LegendTheme,
} from '../types/composition';
import type {
  CompositionStateContextValue,
  LegendStyleState,
} from '../providers/CompositionStateProvider';
import {
  getActiveLegendEntries,
  getLegendCornerPosition,
  nudgeLegendPosition,
  validateLegend,
} from '../utils/legend';
import type {
  LegendBounds,
  LegendNudgeDirection,
  LegendValidationIssue,
  LegendValidationResult,
} from '../utils/legend';

export const LEGEND_LABEL_MAX_LENGTH = 32;

const EMPTY_LABEL_MESSAGE = 'Enter a legend label.';
const LABEL_FIT_MESSAGE = 'Shorten this label so it fits in the exported legend.';
const LEGEND_OVERFLOW_MESSAGE =
  'This map uses more than 30 legend colors. Reduce the number of colors so every label stays readable in the export.';
const THEME_OPTIONS: ReadonlyArray<{ value: LegendTheme; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'soft', label: 'Soft' },
];
const TEXT_SIZE_OPTIONS: ReadonlyArray<{
  value: LegendTextSize;
  label: string;
}> = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];
const BORDER_OPTIONS: ReadonlyArray<{
  value: LegendBorderStyle;
  label: string;
}> = [
  { value: 'none', label: 'None' },
  { value: 'hairline', label: 'Hairline' },
  { value: 'strong', label: 'Strong' },
];
const CORNER_OPTIONS: ReadonlyArray<{
  value: LegendCorner;
  label: string;
}> = [
  { value: 'top-left', label: 'Top left' },
  { value: 'top-right', label: 'Top right' },
  { value: 'bottom-left', label: 'Bottom left' },
  { value: 'bottom-right', label: 'Bottom right' },
];
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
  commands: LegendEditorCommands;
  onStatusMessage: (message: string) => void;
  onValidationChange: (result: LegendValidationResult) => void;
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
      message: LABEL_FIT_MESSAGE,
    };
  }
  return { ok: true, label: draft };
}

export function getLegendBlockingMessage(
  issues: ReadonlyArray<LegendValidationIssue>,
): string | null {
  if (issues.some((issue): boolean => issue.code === 'too-many-active-colors')) {
    return LEGEND_OVERFLOW_MESSAGE;
  }
  if (
    issues.some(
      (issue): boolean =>
        issue.code === 'label-does-not-fit' || issue.code === 'invalid-label',
    )
  ) {
    return LABEL_FIT_MESSAGE;
  }
  return null;
}

function getStyleState(
  legend: LegendState,
  overrides: Partial<LegendStyleState>,
): LegendStyleState {
  return {
    theme: overrides.theme ?? legend.theme,
    textSize: overrides.textSize ?? legend.textSize,
    backgroundOpacity:
      overrides.backgroundOpacity ?? legend.backgroundOpacity,
    borderStyle: overrides.borderStyle ?? legend.borderStyle,
  };
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
  commands,
  onStatusMessage,
  onValidationChange,
}: LegendEditorProps): JSX.Element {
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
  const validationSignatureRef = useRef<string | null>(null);

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
      if (normalizedColor !== '#FFFFFF' && !entriesByColor.has(normalizedColor)) {
        nextOrder += 1;
        commands.setLegendEntry({
          color: normalizedColor,
          label: normalizedColor,
          order: nextOrder,
        });
      }
    });
  }, [commands, effectiveColors, legend.entries]);

  const validation = useMemo((): LegendValidationResult => {
    const validationLegend: LegendState = {
      ...legend,
      entries: activeEntries,
      backgroundOpacity: legend.backgroundOpacity / 100,
    };
    return validateLegend(validationLegend, effectiveColors, bounds);
  }, [activeEntries, bounds, effectiveColors, legend]);

  const validationSignature = JSON.stringify(validation);

  useEffect((): void => {
    if (validationSignatureRef.current !== validationSignature) {
      validationSignatureRef.current = validationSignature;
      onValidationChange(validation);
    }
  }, [onValidationChange, validation, validationSignature]);

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

  const setTheme = (theme: LegendTheme): void => {
    commands.setLegendStyle(
      getStyleState(legend, {
        theme,
        borderStyle: theme === 'soft' ? 'none' : 'hairline',
      }),
    );
  };

  const setCorner = (corner: LegendCorner, label: string): void => {
    commands.setLegendPosition(getLegendCornerPosition(corner, bounds));
    onStatusMessage(`Legend moved to ${label}.`);
  };

  const nudge = (direction: LegendNudgeDirection): void => {
    commands.setLegendPosition(
      nudgeLegendPosition(legend.position, direction, bounds),
    );
    onStatusMessage('Legend position updated.');
  };

  return (
    <div className="legend-editor" data-legend-validation={validation.ok ? 'valid' : 'invalid'}>
      {isEmpty ? (
        <div className="legend-editor__empty">
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
                <span aria-live="off">{draft.length}/32</span>
                {error === undefined ? null : (
                  <p id={errorId} role="alert">
                    {error}
                  </p>
                )}
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={(): void => updateOrder(entry.color, index - 1)}
                >
                  Move Up
                </button>
                <button
                  type="button"
                  disabled={index === activeEntries.length - 1}
                  onClick={(): void => updateOrder(entry.color, index + 1)}
                >
                  Move Down
                </button>
                <button
                  type="button"
                  draggable
                  aria-label={`Drag ${entry.label} to reorder`}
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
                  Drag
                </button>
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

      <fieldset disabled={isEmpty}>
        <legend>Legend style and position</legend>
        <fieldset aria-label="Legend theme">
          <legend>Legend theme</legend>
          {THEME_OPTIONS.map((option): JSX.Element => (
            <label key={option.value}>
              <input
                type="radio"
                name="legend-theme"
                value={option.value}
                checked={legend.theme === option.value}
                onChange={(): void => setTheme(option.value)}
              />
              {option.label}
            </label>
          ))}
        </fieldset>

        <fieldset aria-label="Legend text size">
          <legend>Legend text size</legend>
          {TEXT_SIZE_OPTIONS.map((option): JSX.Element => (
            <label key={option.value}>
              <input
                type="radio"
                name="legend-text-size"
                value={option.value}
                checked={legend.textSize === option.value}
                onChange={(): void =>
                  commands.setLegendStyle(
                    getStyleState(legend, { textSize: option.value }),
                  )
                }
              />
              {option.label}
            </label>
          ))}
        </fieldset>

        <label>
          <span>Background opacity</span>
          <input
            type="range"
            min="70"
            max="100"
            step="5"
            value={legend.backgroundOpacity}
            onChange={(event: ChangeEvent<HTMLInputElement>): void =>
              commands.setLegendStyle(
                getStyleState(legend, {
                  backgroundOpacity: Number(event.target.value),
                }),
              )
            }
          />
          <output>{legend.backgroundOpacity}%</output>
        </label>

        <fieldset aria-label="Legend border">
          <legend>Legend border</legend>
          {BORDER_OPTIONS.map((option): JSX.Element => (
            <label key={option.value}>
              <input
                type="radio"
                name="legend-border"
                value={option.value}
                checked={legend.borderStyle === option.value}
                onChange={(): void =>
                  commands.setLegendStyle(
                    getStyleState(legend, { borderStyle: option.value }),
                  )
                }
              />
              {option.label}
            </label>
          ))}
        </fieldset>

        <fieldset aria-label="Legend position">
          <legend>Legend position</legend>
          {CORNER_OPTIONS.map((option): JSX.Element => (
            <label key={option.value}>
              <input
                type="radio"
                name="legend-position"
                value={option.value}
                checked={legend.position.preset === option.value}
                onChange={(): void => setCorner(option.value, option.label)}
              />
              {option.label}
            </label>
          ))}
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
