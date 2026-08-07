import { useCallback, useId } from "react";
import type { ChangeEvent } from "react";

import { COMPOSITION_TEXT_LABELS } from "../constants/mapStyle";
import type { MapStylePatch } from "../providers/CompositionStateProvider";
import type {
  CompositionTextAlignment,
  CompositionTextSize,
} from "../types/composition";
import {
  COMPOSITION_TEXT_ALIGNMENT_LABELS,
  COMPOSITION_TEXT_ALIGNMENT_ORDER,
  COMPOSITION_TEXT_SIZE_LABELS,
  COMPOSITION_TEXT_SIZE_ORDER,
  type CompositionTextRole,
  characterBoundFor,
  compositionTextLength,
} from "../utils/compositionText";

const SIZE_CONTROL_SUFFIX = "size";
const SUBTITLE_ROWS = 2;

interface CompositionTextPanelProps {
  /** Already sanitised by the reducer; the field is controlled from it. */
  readonly title: string;
  readonly titleSize: CompositionTextSize;
  readonly subtitle: string;
  readonly subtitleSize: CompositionTextSize;
  readonly attribution: string;
  readonly textAlignment: CompositionTextAlignment;
  /** The SAME one writer every other `Map style` control uses. */
  readonly onMapStyleChange: (patch: MapStylePatch) => void;
  readonly isDisabled?: boolean;
}

/**
 * The `Text` section of the `Map style` flyout (D4-15, `04-UI-SPEC.md § 6.8`).
 *
 * **Why it lives inside `Map style` rather than in a rail row of its own** —
 * `04-11`'s Task 1 owner gate, answered `text-in-map-style`. The binding
 * constraint is the rail-height floor, which `04-01` MEASURED at **552px**
 * rather than the 540px § 6.1 estimated. Seven rows already sits at 552; an
 * eighth would be ~600px, and Phase 5's `05-05` Data HUD is the eighth row that
 * needs that headroom. The rail cannot become a scroll container instead,
 * because a tooltip has to escape the 48px column and `overflow-y: auto`
 * computes `overflow-x: auto`, which would clip every rail tooltip.
 *
 * **The accepted cost, stated rather than glossed:** "Map style" stretches to
 * cover typed content, and the panel becomes five sections and WILL scroll. A
 * *panel* scrolling is fine — it is the *rail* that must not.
 *
 * **Zero new pill classes.** The size and alignment rows are `.panel-pills` /
 * `.panel-pill` radios, the fields are `.panel-field`, and the labels are
 * `.map-style__sublabel` — the same vocabulary `04-07` moved into `editor.css`.
 * A copied pill is the defect `04-UI-SPEC.md § 11` rule 1 names by name. The
 * only rules this surface owns are the field-group grid, the sans-serif
 * override on `.panel-field` (whose monospace exists for hex entry, not for a
 * creator's title), and the counter's destructive state.
 *
 * **The counter is `aria-live="off"` on purpose**: it changes on every
 * keystroke, and a live region there would announce a character count over the
 * character the creator just typed.
 */
export function CompositionTextPanel({
  title,
  titleSize,
  subtitle,
  subtitleSize,
  attribution,
  textAlignment,
  onMapStyleChange,
  isDisabled = false,
}: CompositionTextPanelProps): JSX.Element {
  const fieldId = useId();

  const handleTitleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onMapStyleChange({ title: event.currentTarget.value });
    },
    [onMapStyleChange],
  );

  const handleSubtitleChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>): void => {
      onMapStyleChange({ subtitle: event.currentTarget.value });
    },
    [onMapStyleChange],
  );

  const handleAttributionChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onMapStyleChange({ attribution: event.currentTarget.value });
    },
    [onMapStyleChange],
  );

  const handleTitleSizeChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onMapStyleChange({
        titleSize: event.currentTarget.value as CompositionTextSize,
      });
    },
    [onMapStyleChange],
  );

  const handleSubtitleSizeChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onMapStyleChange({
        subtitleSize: event.currentTarget.value as CompositionTextSize,
      });
    },
    [onMapStyleChange],
  );

  const handleAlignmentChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onMapStyleChange({
        textAlignment: event.currentTarget.value as CompositionTextAlignment,
      });
    },
    [onMapStyleChange],
  );

  /*
   * ONE derivation feeds the counter's destructive state AND the export
   * refusal: both read `characterBoundFor`, so the number a creator sees turn
   * red can never disagree with the number that blocks the export.
   */
  const renderCounter = (
    role: CompositionTextRole,
    value: string,
    size: CompositionTextSize,
    counterId: string,
  ): JSX.Element => {
    const bound = characterBoundFor(role, size);
    const length = compositionTextLength(value);

    return (
      <p
        id={counterId}
        className={
          length > bound
            ? "map-style__readout composition-text__counter--over"
            : "map-style__readout"
        }
        aria-live="off"
      >
        {`${length}/${bound}`}
      </p>
    );
  };

  const renderSizePills = (
    groupName: string,
    fieldLabel: string,
    selected: CompositionTextSize,
    onChange: (event: ChangeEvent<HTMLInputElement>) => void,
  ): JSX.Element => (
    <div
      className="panel-pills"
      role="radiogroup"
      aria-label={`${fieldLabel} ${SIZE_CONTROL_SUFFIX}`}
    >
      {COMPOSITION_TEXT_SIZE_ORDER.map((size): JSX.Element => (
        <label key={size} className="panel-pill">
          <input
            type="radio"
            name={groupName}
            value={size}
            checked={size === selected}
            onChange={onChange}
          />
          {COMPOSITION_TEXT_SIZE_LABELS[size]}
        </label>
      ))}
    </div>
  );

  return (
    <fieldset className="panel-section" disabled={isDisabled}>
      <legend className="panel-section__label">
        {COMPOSITION_TEXT_LABELS.section}
      </legend>

      <div className="composition-text__group">
        <label
          className="map-style__sublabel"
          htmlFor={`${fieldId}-title`}
        >
          {COMPOSITION_TEXT_LABELS.title}
        </label>
        <input
          id={`${fieldId}-title`}
          type="text"
          className="panel-field composition-text__field"
          value={title}
          onChange={handleTitleChange}
          aria-describedby={`${fieldId}-title-counter`}
          autoComplete="off"
        />
        {renderCounter(
          "title",
          title,
          titleSize,
          `${fieldId}-title-counter`,
        )}
        {renderSizePills(
          `${fieldId}-title-size`,
          COMPOSITION_TEXT_LABELS.title,
          titleSize,
          handleTitleSizeChange,
        )}
      </div>

      <div className="composition-text__group">
        <label
          className="map-style__sublabel"
          htmlFor={`${fieldId}-subtitle`}
        >
          {COMPOSITION_TEXT_LABELS.subtitle}
        </label>
        <textarea
          id={`${fieldId}-subtitle`}
          rows={SUBTITLE_ROWS}
          className="panel-field composition-text__field"
          value={subtitle}
          onChange={handleSubtitleChange}
          aria-describedby={`${fieldId}-subtitle-counter`}
          autoComplete="off"
        />
        {renderCounter(
          "subtitle",
          subtitle,
          subtitleSize,
          `${fieldId}-subtitle-counter`,
        )}
        {renderSizePills(
          `${fieldId}-subtitle-size`,
          COMPOSITION_TEXT_LABELS.subtitle,
          subtitleSize,
          handleSubtitleSizeChange,
        )}
      </div>

      {/*
        No size pills: attribution is fixed at 20 units by § 4.2, because it is
        meta and a size control on meta is a control nobody uses.
      */}
      <div className="composition-text__group">
        <label
          className="map-style__sublabel"
          htmlFor={`${fieldId}-attribution`}
        >
          {COMPOSITION_TEXT_LABELS.attribution}
        </label>
        <input
          id={`${fieldId}-attribution`}
          type="text"
          className="panel-field composition-text__field"
          value={attribution}
          onChange={handleAttributionChange}
          aria-describedby={`${fieldId}-attribution-counter`}
          autoComplete="off"
        />
        {renderCounter(
          "attribution",
          attribution,
          "medium",
          `${fieldId}-attribution-counter`,
        )}
      </div>

      {/*
        ONE alignment for the whole composition. § 6.8's control contract lists
        exactly one Alignment row with three pills and no per-field qualifier;
        § 4.2's per-row "Anchor" column names where each line can sit rather
        than prescribing a second control. The disagreement is REPORTED in
        `04-11-SUMMARY.md`, not silently resolved.
      */}
      <p className="map-style__sublabel" id={`${fieldId}-alignment-label`}>
        {COMPOSITION_TEXT_LABELS.alignment}
      </p>
      <div
        className="panel-pills"
        role="radiogroup"
        aria-labelledby={`${fieldId}-alignment-label`}
      >
        {COMPOSITION_TEXT_ALIGNMENT_ORDER.map((alignment): JSX.Element => (
          <label key={alignment} className="panel-pill">
            <input
              type="radio"
              name={`${fieldId}-alignment`}
              value={alignment}
              checked={alignment === textAlignment}
              onChange={handleAlignmentChange}
            />
            {COMPOSITION_TEXT_ALIGNMENT_LABELS[alignment]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
