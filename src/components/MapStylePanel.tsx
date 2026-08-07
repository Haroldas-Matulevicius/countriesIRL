import { useCallback, useId, useMemo } from "react";
import type { ChangeEvent, FormEvent } from "react";

import {
  BORDER_COLOR_PRESETS,
  CUSTOM_SURFACE_COLOR_PLACEHOLDER,
  DEFAULT_COMPOSITION_SETTINGS,
  STROKE_WEIGHT_LABELS,
  STROKE_WEIGHT_ORDER,
  UNCOLORED_FILL_PRESETS,
  WATER_PRESETS,
} from "../constants/mapStyle";
import type { MapStylePatch } from "../providers/CompositionStateProvider";
import type { StrokeWeight } from "../types/composition";
import type { MapStyleColorPreset } from "../types/ui";
import { normalizeColor } from "../utils/colors";

const WATER_SECTION_LABEL = "Water";
const UNCOLORED_SECTION_LABEL = "Uncolored countries";
const BORDERS_SECTION_LABEL = "Borders";
const INTERIOR_SUBLABEL = "Interior";
const COASTLINES_SUBLABEL = "Coastlines";
const BORDER_COLOR_SUBLABEL = "Border color";
const CUSTOM_SURFACE_LABEL = "Custom water color";
const CUSTOM_UNCOLORED_LABEL = "Custom uncolored color";
const APPLY_SURFACE_LABEL = "Apply";
const RESET_MAP_STYLE_LABEL = "Reset Map Style";
const CUSTOM_SURFACE_ERROR =
  "Enter #RGB, #RRGGBB, or rgb values from 0 to 255.";

interface MapStylePanelProps {
  /** Canonical uppercase `#RRGGBB`, already validated by the reducer. */
  readonly surfaceColor: string;
  /** D4-09. Canonical uppercase `#RRGGBB`, already validated by the reducer. */
  readonly uncoloredFill: string;
  /** D4-08. Canonical uppercase `#RRGGBB`, already validated by the reducer. */
  readonly borderColor: string;
  readonly interiorWeight: StrokeWeight;
  readonly coastlineWeight: StrokeWeight;
  /**
   * Owned by `App` (`useInspectorUiState`): the 1200px transition remounts this
   * subtree, so an in-progress hex would otherwise be lost on resize.
   */
  readonly customDraft: string;
  readonly onCustomDraftChange: (draft: string) => void;
  readonly uncoloredDraft: string;
  readonly onUncoloredDraftChange: (draft: string) => void;
  readonly onSurfaceColorChange: (surfaceColor: string) => void;
  /** The ONE writer for everything below Water. `Reset` uses it too. */
  readonly onMapStyleChange: (patch: MapStylePatch) => void;
  readonly isDisabled?: boolean;
}

/**
 * The `Map style` flyout (D4-07, `04-UI-SPEC.md § 6.4`).
 *
 * Authored directly against § 6.3.2's flat vocabulary — a `--text-body-sm`
 * weight-500 section label, its content, and a hairline divider on the *next*
 * section. **Zero cards, zero nested borders.** It deliberately did not copy
 * the pre-`04-07` `colorPicker.css`, which the owner rejected as "too squished,
 * not organized well, hate the multi boxes within".
 *
 * `04-07` brought the Colors panel into this same vocabulary and, in the same
 * commit, moved the shared classes out of `mapStyle.css` into `editor.css`'s
 * `.panel-*` block. Two copies of a pill is the defect `04-UI-SPEC.md § 11`
 * rule 1 names by name, so this component consumes the shared classes rather
 * than owning private ones. `04-08` added two sections and reused every one of
 * them; the only new rule in `mapStyle.css` is the sub-label, which no other
 * surface has.
 *
 * **Sub-labels are `--text-caption` in `--themely-slate-blue`.** A second
 * `--text-body-sm` weight-500 level inside a section would be the 2px-hierarchy
 * problem `04-UI-SPEC.md § 1.1` exists to prevent.
 *
 * **No primary action, therefore no accent anywhere in this panel** (D-05).
 * Every pill applies immediately; the custom entries' submits are ghosts.
 *
 * Bands arrive in `04-10` and text in `04-11` — they extend this component
 * rather than replacing it.
 *
 * **Undo semantics, chosen at `04-01`'s Task 2 owner gate (`undo-b-reset-action`):**
 * `useMapState`'s history stays colours-only (Live Invariant 2), so Map style is
 * NOT step-by-step undoable. `Reset Map Style` is the escape hatch — extended by
 * `04-08` to cover all five settings, not re-decided — and the
 * `Undo Color Change` / `Redo Color Change` rail labels stay truthful.
 */
export function MapStylePanel({
  surfaceColor,
  uncoloredFill,
  borderColor,
  interiorWeight,
  coastlineWeight,
  customDraft,
  onCustomDraftChange,
  uncoloredDraft,
  onUncoloredDraftChange,
  onSurfaceColorChange,
  onMapStyleChange,
  isDisabled = false,
}: MapStylePanelProps): JSX.Element {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const waterGroupId = `${inputId}-water`;
  const uncoloredInputId = `${inputId}-uncolored-input`;
  const uncoloredErrorId = `${inputId}-uncolored-error`;
  const uncoloredGroupId = `${inputId}-uncolored`;
  const interiorGroupId = `${inputId}-interior`;
  const coastlineGroupId = `${inputId}-coastline`;
  const borderColorGroupId = `${inputId}-border-color`;

  const customResult = useMemo(
    (): ReturnType<typeof normalizeColor> => normalizeColor(customDraft),
    [customDraft],
  );
  const hasCustomDraft = customDraft.trim().length > 0;
  const hasInvalidCustomDraft = hasCustomDraft && !customResult.ok;
  const hasCustomChange =
    customResult.ok && customResult.value !== surfaceColor;

  const uncoloredResult = useMemo(
    (): ReturnType<typeof normalizeColor> => normalizeColor(uncoloredDraft),
    [uncoloredDraft],
  );
  const hasUncoloredDraft = uncoloredDraft.trim().length > 0;
  const hasInvalidUncoloredDraft = hasUncoloredDraft && !uncoloredResult.ok;
  const hasUncoloredChange =
    uncoloredResult.ok && uncoloredResult.value !== uncoloredFill;

  const handlePresetChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onSurfaceColorChange(event.currentTarget.value);
    },
    [onSurfaceColorChange],
  );

  const handleUncoloredPresetChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onMapStyleChange({ uncoloredFill: event.currentTarget.value });
    },
    [onMapStyleChange],
  );

  const handleBorderColorChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onMapStyleChange({ borderColor: event.currentTarget.value });
    },
    [onMapStyleChange],
  );

  const handleInteriorWeightChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onMapStyleChange({
        interiorWeight: event.currentTarget.value as StrokeWeight,
      });
    },
    [onMapStyleChange],
  );

  const handleCoastlineWeightChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onMapStyleChange({
        coastlineWeight: event.currentTarget.value as StrokeWeight,
      });
    },
    [onMapStyleChange],
  );

  const handleCustomDraftChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onCustomDraftChange(event.currentTarget.value);
    },
    [onCustomDraftChange],
  );

  const handleUncoloredDraftChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onUncoloredDraftChange(event.currentTarget.value);
    },
    [onUncoloredDraftChange],
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

  const handleUncoloredSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();

      if (isDisabled || !uncoloredResult.ok) {
        return;
      }

      onMapStyleChange({ uncoloredFill: uncoloredResult.value });
      onUncoloredDraftChange(uncoloredResult.value);
    },
    [isDisabled, onMapStyleChange, onUncoloredDraftChange, uncoloredResult],
  );

  const handleReset = useCallback((): void => {
    onMapStyleChange({
      surfaceColor: DEFAULT_COMPOSITION_SETTINGS.surfaceColor,
      uncoloredFill: DEFAULT_COMPOSITION_SETTINGS.uncoloredFill,
      borderColor: DEFAULT_COMPOSITION_SETTINGS.borderColor,
      interiorWeight: DEFAULT_COMPOSITION_SETTINGS.interiorWeight,
      coastlineWeight: DEFAULT_COMPOSITION_SETTINGS.coastlineWeight,
    });
    onCustomDraftChange("");
    onUncoloredDraftChange("");
  }, [onCustomDraftChange, onMapStyleChange, onUncoloredDraftChange]);

  const isDefaultMapStyle =
    surfaceColor === DEFAULT_COMPOSITION_SETTINGS.surfaceColor &&
    uncoloredFill === DEFAULT_COMPOSITION_SETTINGS.uncoloredFill &&
    borderColor === DEFAULT_COMPOSITION_SETTINGS.borderColor &&
    interiorWeight === DEFAULT_COMPOSITION_SETTINGS.interiorWeight &&
    coastlineWeight === DEFAULT_COMPOSITION_SETTINGS.coastlineWeight;

  const renderSwatchPills = (
    presets: ReadonlyArray<MapStyleColorPreset>,
    groupName: string,
    selected: string,
    onChange: (event: ChangeEvent<HTMLInputElement>) => void,
  ): JSX.Element => (
    <div className="panel-pills">
      {presets.map((preset): JSX.Element => (
        <label key={preset.value} className="panel-pill">
          <input
            type="radio"
            name={groupName}
            value={preset.value}
            checked={preset.value === selected}
            onChange={onChange}
          />
          <span
            className="panel-swatch"
            style={{ background: preset.value }}
            aria-hidden="true"
          />
          {preset.name}
        </label>
      ))}
    </div>
  );

  /*
   * FIVE pills, and they WRAP to two rows by contract. The stylesheet comment
   * carries the arithmetic; shrinking the type to force one row is the
   * hierarchy defect `04-UI-SPEC.md § 1.1` forbids.
   */
  const renderWeightPills = (
    groupName: string,
    labelledBy: string,
    selected: StrokeWeight,
    onChange: (event: ChangeEvent<HTMLInputElement>) => void,
  ): JSX.Element => (
    <div className="panel-pills" role="radiogroup" aria-labelledby={labelledBy}>
      {STROKE_WEIGHT_ORDER.map((weight): JSX.Element => (
        <label key={weight} className="panel-pill">
          <input
            type="radio"
            name={groupName}
            value={weight}
            checked={weight === selected}
            onChange={onChange}
          />
          {STROKE_WEIGHT_LABELS[weight]}
        </label>
      ))}
    </div>
  );

  return (
    /*
     * `<fieldset>` survives ONLY as a semantic group carrying `disabled` for
     * the whole section (§ 6.3.2). It is stripped of border, padding, and
     * margin in the stylesheet, and its `<legend>` IS the section label - no
     * second `<h2>`, because the panel title already owns that role.
     */
    <>
      <fieldset className="panel-section" disabled={isDisabled}>
        <legend className="panel-section__label" id={waterGroupId}>
          {WATER_SECTION_LABEL}
        </legend>

        {renderSwatchPills(
          WATER_PRESETS,
          waterGroupId,
          surfaceColor,
          handlePresetChange,
        )}

        <form
          className="map-style__custom"
          onSubmit={handleCustomSubmit}
          noValidate
        >
          <label htmlFor={inputId}>{CUSTOM_SURFACE_LABEL}</label>
          <input
            id={inputId}
            type="text"
            className="panel-field"
            value={customDraft}
            placeholder={CUSTOM_SURFACE_COLOR_PLACEHOLDER}
            onChange={handleCustomDraftChange}
            aria-invalid={hasInvalidCustomDraft}
            aria-describedby={hasInvalidCustomDraft ? errorId : undefined}
            autoComplete="off"
            spellCheck="false"
          />

          {hasInvalidCustomDraft ? (
            <p id={errorId} className="panel-error">
              {CUSTOM_SURFACE_ERROR}
            </p>
          ) : null}

          {/* Ghost, never accent: this panel has no primary action (D-05). */}
          <button
            type="submit"
            className="panel-action"
            disabled={!hasCustomChange}
          >
            {APPLY_SURFACE_LABEL}
          </button>
        </form>
      </fieldset>

      {/*
        D4-09. An uncoloured country is what makes a quiet coastline survivable:
        with white water and no outline, a white country would vanish. The
        STORED value stays the `#FFFFFF` sentinel - this only changes what the
        render maps it to.
      */}
      <fieldset className="panel-section" disabled={isDisabled}>
        <legend className="panel-section__label" id={uncoloredGroupId}>
          {UNCOLORED_SECTION_LABEL}
        </legend>

        {renderSwatchPills(
          UNCOLORED_FILL_PRESETS,
          uncoloredGroupId,
          uncoloredFill,
          handleUncoloredPresetChange,
        )}

        <form
          className="map-style__custom"
          onSubmit={handleUncoloredSubmit}
          noValidate
        >
          <label htmlFor={uncoloredInputId}>{CUSTOM_UNCOLORED_LABEL}</label>
          <input
            id={uncoloredInputId}
            type="text"
            className="panel-field"
            value={uncoloredDraft}
            placeholder={CUSTOM_SURFACE_COLOR_PLACEHOLDER}
            onChange={handleUncoloredDraftChange}
            aria-invalid={hasInvalidUncoloredDraft}
            aria-describedby={
              hasInvalidUncoloredDraft ? uncoloredErrorId : undefined
            }
            autoComplete="off"
            spellCheck="false"
          />

          {hasInvalidUncoloredDraft ? (
            <p id={uncoloredErrorId} className="panel-error">
              {CUSTOM_SURFACE_ERROR}
            </p>
          ) : null}

          <button
            type="submit"
            className="panel-action"
            disabled={!hasUncoloredChange}
          >
            {APPLY_SURFACE_LABEL}
          </button>
        </form>
      </fieldset>

      <fieldset className="panel-section" disabled={isDisabled}>
        <legend className="panel-section__label">
          {BORDERS_SECTION_LABEL}
        </legend>

        <p className="map-style__sublabel" id={`${interiorGroupId}-label`}>
          {INTERIOR_SUBLABEL}
        </p>
        {renderWeightPills(
          interiorGroupId,
          `${interiorGroupId}-label`,
          interiorWeight,
          handleInteriorWeightChange,
        )}

        <p className="map-style__sublabel" id={`${coastlineGroupId}-label`}>
          {COASTLINES_SUBLABEL}
        </p>
        {renderWeightPills(
          coastlineGroupId,
          `${coastlineGroupId}-label`,
          coastlineWeight,
          handleCoastlineWeightChange,
        )}

        <p className="map-style__sublabel" id={`${borderColorGroupId}-label`}>
          {BORDER_COLOR_SUBLABEL}
        </p>
        {renderSwatchPills(
          BORDER_COLOR_PRESETS,
          borderColorGroupId,
          borderColor,
          handleBorderColorChange,
        )}
      </fieldset>

      {/*
          The owner's Decision B, extended by `04-08` to every Map style
          setting rather than re-decided. Not a toast: the map repainting is
          self-evident, and a new message would move `ToastRegion`'s allowlist
          counts, which assertion 23 pins as hard numbers.
        */}
      <fieldset className="panel-section" disabled={isDisabled}>
        <button
          type="button"
          data-action="reset-map-style"
          className="panel-action"
          onClick={handleReset}
          disabled={isDefaultMapStyle && !hasCustomDraft && !hasUncoloredDraft}
        >
          {RESET_MAP_STYLE_LABEL}
        </button>
      </fieldset>
    </>
  );
}
