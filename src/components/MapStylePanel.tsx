import { useCallback, useId, useMemo } from "react";
import type { ChangeEvent, FormEvent } from "react";

import {
  CUSTOM_SURFACE_COLOR_PLACEHOLDER,
  DEFAULT_SURFACE_COLOR,
  WATER_PRESETS,
} from "../constants/mapStyle";
import { normalizeColor } from "../utils/colors";

const WATER_SECTION_LABEL = "Water";
const CUSTOM_SURFACE_LABEL = "Custom water color";
const APPLY_SURFACE_LABEL = "Apply";
const RESET_MAP_STYLE_LABEL = "Reset Map Style";
const CUSTOM_SURFACE_ERROR =
  "Enter #RGB, #RRGGBB, or rgb values from 0 to 255.";

interface MapStylePanelProps {
  /** Canonical uppercase `#RRGGBB`, already validated by the reducer. */
  readonly surfaceColor: string;
  /**
   * Owned by `App` (`useInspectorUiState`): the 1200px transition remounts this
   * subtree, so an in-progress hex would otherwise be lost on resize.
   */
  readonly customDraft: string;
  readonly onCustomDraftChange: (draft: string) => void;
  readonly onSurfaceColorChange: (surfaceColor: string) => void;
  readonly isDisabled?: boolean;
}

/**
 * The `Map style` flyout (D4-07, `04-UI-SPEC.md § 6.4`).
 *
 * Authored directly against § 6.3.2's flat vocabulary — a `--text-body-sm`
 * weight-500 section label, its content, and a hairline divider on the *next*
 * section. **Zero cards, zero nested borders.** It deliberately does not copy
 * today's `colorPicker.css`, which the owner rejected as "too squished, not
 * organized well, hate the multi boxes within"; `04-07` brings the Colors panel
 * into this same vocabulary.
 *
 * **No primary action, therefore no accent anywhere in this panel** (D-05).
 * Every pill applies immediately; the custom entry's submit is a ghost.
 *
 * Wave 1 ships one section, `Water`. Uncolored fill and borders arrive in
 * `04-08`, bands in `04-10`, and text in `04-11` — they extend this component
 * rather than replacing it.
 *
 * **Undo semantics, chosen at `04-01`'s Task 2 owner gate (`undo-b-reset-action`):**
 * `useMapState`'s history stays colours-only (Live Invariant 2), so Map style is
 * NOT step-by-step undoable. `Reset Map Style` is the escape hatch, and the
 * `Undo Color Change` / `Redo Color Change` rail labels stay truthful.
 */
export function MapStylePanel({
  surfaceColor,
  customDraft,
  onCustomDraftChange,
  onSurfaceColorChange,
  isDisabled = false,
}: MapStylePanelProps): JSX.Element {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const waterGroupId = `${inputId}-water`;

  const customResult = useMemo(
    (): ReturnType<typeof normalizeColor> => normalizeColor(customDraft),
    [customDraft],
  );
  const hasCustomDraft = customDraft.trim().length > 0;
  const hasInvalidCustomDraft = hasCustomDraft && !customResult.ok;
  const hasCustomChange =
    customResult.ok && customResult.value !== surfaceColor;

  const handlePresetChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onSurfaceColorChange(event.currentTarget.value);
    },
    [onSurfaceColorChange],
  );

  const handleCustomDraftChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onCustomDraftChange(event.currentTarget.value);
    },
    [onCustomDraftChange],
  );

  const handleCustomSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();

      if (isDisabled || !customResult.ok) {
        return;
      }

      onSurfaceColorChange(customResult.value);
      onCustomDraftChange(customResult.value);
    },
    [customResult, isDisabled, onCustomDraftChange, onSurfaceColorChange],
  );

  const handleReset = useCallback((): void => {
    onSurfaceColorChange(DEFAULT_SURFACE_COLOR);
    onCustomDraftChange("");
  }, [onCustomDraftChange, onSurfaceColorChange]);

  return (
    /*
     * `<fieldset>` survives ONLY as a semantic group carrying `disabled` for
     * the whole section (§ 6.3.2). It is stripped of border, padding, and
     * margin in the stylesheet, and its `<legend>` IS the section label - no
     * second `<h2>`, because the panel title already owns that role.
     */
    <fieldset className="map-style__group" disabled={isDisabled}>
      <legend className="map-style__label" id={waterGroupId}>
        {WATER_SECTION_LABEL}
      </legend>

      <div className="map-style__pills">
        {WATER_PRESETS.map((preset): JSX.Element => (
          <label key={preset.value} className="map-style__pill">
            <input
              type="radio"
              name={waterGroupId}
              value={preset.value}
              checked={preset.value === surfaceColor}
              onChange={handlePresetChange}
            />
            <span
              className="map-style__swatch"
              style={{ background: preset.value }}
              aria-hidden="true"
            />
            {preset.name}
          </label>
        ))}
      </div>

      <form
        className="map-style__custom"
        onSubmit={handleCustomSubmit}
        noValidate
      >
        <label htmlFor={inputId}>{CUSTOM_SURFACE_LABEL}</label>
        <input
          id={inputId}
          type="text"
          value={customDraft}
          placeholder={CUSTOM_SURFACE_COLOR_PLACEHOLDER}
          onChange={handleCustomDraftChange}
          aria-invalid={hasInvalidCustomDraft}
          aria-describedby={hasInvalidCustomDraft ? errorId : undefined}
          autoComplete="off"
          spellCheck="false"
        />

        {hasInvalidCustomDraft ? (
          <p id={errorId} className="map-style__error">
            {CUSTOM_SURFACE_ERROR}
          </p>
        ) : null}

        {/* Ghost, never accent: this panel has no primary action (D-05). */}
        <button
          type="submit"
          className="map-style__action"
          disabled={!hasCustomChange}
        >
          {APPLY_SURFACE_LABEL}
        </button>
      </form>

      {/*
          The owner's Decision B. Not a toast: the whole ocean repainting is
          self-evident, and a new message would move `ToastRegion`'s allowlist
          counts, which assertion 23 pins as hard numbers.
        */}
      <button
        type="button"
        data-action="reset-map-style"
        className="map-style__action"
        onClick={handleReset}
        disabled={surfaceColor === DEFAULT_SURFACE_COLOR && !hasCustomDraft}
      >
        {RESET_MAP_STYLE_LABEL}
      </button>
    </fieldset>
  );
}
