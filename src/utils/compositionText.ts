import { MAP_VIEWBOX_SIZE } from '../constants/config';
import type {
  CompositionTextAlignment,
  CompositionTextAnchor,
  CompositionTextSize,
} from '../types/composition';
import { LEGEND_SAFE_INSET } from './legend';
import { measureTextEm } from './interMetrics';

/**
 * D4-15 — the creator's title, subtitle, and attribution (`04-UI-SPEC.md`
 * §§ 4.2, 6.8, 9).
 *
 * This is the element that turns a coloured map into a post, and it is also the
 * largest untrusted-input surface in the phase: a creator's keystrokes become a
 * node in markup that is serialised into a `data:image/svg+xml` URL and
 * rasterised. Two rules hold that safe and they are BOTH here rather than at
 * the render site:
 *
 * 1. **The value is sanitised at the state boundary**, not on the way to the
 *    attribute — the same discipline `canonicalizeSurfaceColor` applies to a
 *    hex. Control characters are stripped and the length is bounded.
 * 2. **It is deliberately NOT escaped here.** The value is set as SVG *text
 *    content*, and `XMLSerializer` escapes `<`, `>`, and `&` in a text node on
 *    its own. Pre-escaping plus serializer escaping is double-escaping, which
 *    puts a literal `&amp;` in the exported PNG.
 *
 * ⚠ **Vitest runs on `node`, so nothing here may call a live text-measurement
 * API.** That constraint used to force the fit rule to be a CHARACTER COUNT
 * against a worst-case width, which refused about half of what genuinely fits.
 * It is now met a different way: `src/utils/interMetrics.ts` vendors REAL
 * per-character advances, measured once in installed Chrome against the
 * vendored woff2 bytes and committed as data. Measurement is therefore
 * deterministic, identical in node and in the browser, and needs no DOM —
 * see `isCompositionTextOverBound`.
 *
 * **One ink, and the reason is arithmetic** (U-6, `04-UI-SPEC.md` § 4.2).
 * Hierarchy is carried by SIZE AND WEIGHT only; `COMPOSITION_INK_COLOR`
 * (`#111827`, `utils/contrast.ts`) is the single ink every composition string
 * is painted in. A second grey ink at `#4B5563` has relative luminance 0.0889
 * and would need a surface at `L >= 0.575` to clear AA 4.5:1 — near-white water
 * only, which would retire three of the four shipped water presets. `#111827`
 * needs only `L >= 0.2164`, so every surface lighter than mid-grey stays legal.
 *
 * ⚠ **U-6 is the one place the spec knowingly departs from the owner's Eurostat
 * reference (small grey attribution), and the owner has NOT reviewed it.** The
 * authorization in force is a blanket, in-advance, sight-unseen
 * proceed-authorization: it authorises proceeding, it is **not** a content
 * review, and it is **not** hash-bound (Immutable Safety Constraint 8). It is
 * flagged for `04-ACCEPTANCE.md`.
 */

/**
 * The role is this module's own: nothing outside it needs to name a composition
 * string by role. The size, alignment, and anchor vocabularies live in
 * `types/composition.ts` beside `StrokeWeight` and are re-exported here so a
 * consumer of the text module has one import site.
 */
export type CompositionTextRole = 'title' | 'subtitle' | 'attribution';
export type {
  CompositionTextAlignment,
  CompositionTextAnchor,
  CompositionTextSize,
};

/**
 * The vocabulary, in ONE home. The composition reducer's canonicaliser, the
 * panel, and `04-14`'s V3 record all read these — a value added in only one
 * place is a drift bug, not a feature (the `LEGEND_TEXT_SIZES` precedent).
 */
export const COMPOSITION_TEXT_SIZES: ReadonlySet<CompositionTextSize> = new Set(
  ['small', 'medium', 'large'],
);
export const COMPOSITION_TEXT_SIZE_ORDER: ReadonlyArray<CompositionTextSize> = [
  'small',
  'medium',
  'large',
];
export const COMPOSITION_TEXT_ALIGNMENTS: ReadonlySet<CompositionTextAlignment> =
  new Set(['left', 'center', 'right']);
export const COMPOSITION_TEXT_ALIGNMENT_ORDER: ReadonlyArray<CompositionTextAlignment> =
  ['left', 'center', 'right'];

/** `04-UI-SPEC.md` § 9, byte-exact. The panel renders these, never a derivation. */
export const COMPOSITION_TEXT_SIZE_LABELS: Readonly<
  Record<CompositionTextSize, string>
> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
};
export const COMPOSITION_TEXT_ALIGNMENT_LABELS: Readonly<
  Record<CompositionTextAlignment, string>
> = {
  left: 'Left',
  center: 'Center',
  right: 'Right',
};

/** `04-UI-SPEC.md` § 6.8: `Left` / `Center` / `Right` → `start` / `middle` / `end`. */
export const COMPOSITION_TEXT_ANCHORS: Readonly<
  Record<CompositionTextAlignment, CompositionTextAnchor>
> = {
  left: 'start',
  center: 'middle',
  right: 'end',
};

/**
 * ONE inset for every composition edge, which is what makes the title, the
 * legend, and the attribution align on the same left rule. It IS
 * `LEGEND_SAFE_INSET`, imported rather than retyped: two 32s in two modules is
 * how they stop agreeing.
 */
export const TEXT_SAFE_INSET = LEGEND_SAFE_INSET;

/** `1080 − 2 × 32` = **1016** user units of usable line width. */
export const COMPOSITION_TEXT_LINE_WIDTH =
  MAP_VIEWBOX_SIZE - 2 * TEXT_SAFE_INSET;

/**
 * The advance of `W` at weight 600, **1.0202em**.
 *
 * **This is not a new measurement.** It is the one `LEGEND_CHARACTERS_PER_LINE`
 * already records in `legend.ts`, taken in installed Chrome 151 from the
 * vendored `src/assets/inter-latin-variable.woff2` via canvas `measureText`.
 *
 * ⚠ **SUPERSEDED for composition text (2026-08-07).** Two things were wrong
 * with using it to bound a line, and both are now recorded rather than
 * quietly patched:
 *
 * 1. **It was never the widest character, and since `04-04` it is not even
 *    close.** The latin-ext face added there carries `U+01F1 DZ` at
 *    **1.3745em** — 35 % wider than `W`. Anything still claiming "a full line
 *    of the widest character cannot overflow" is false for latin-ext input.
 * 2. **Worst-case-uniform is the wrong model.** Asking "how many characters of
 *    THE WIDEST KIND fit?" charges every character the price of the widest
 *    one, which roughly HALVED the real capacity: a `medium` title got 22
 *    characters, while `'Countries I have visited in Europe'` (34 characters)
 *    bounds to 21.66em against the 23.09em the line actually offers.
 *    `03-VERIFICATION.md` predicted this over-estimate (~1.8×) against the
 *    legend's own ceiling; its three grounds were never rebutted, and the
 *    owner then hit the identical wall on the title in Phase 4 acceptance.
 *
 * Composition text now measures **actual per-character advances** through
 * `src/utils/interMetrics.ts` and no longer reads this constant.
 *
 * ⚠ It is **kept, not deleted**, because `LEGEND_CHARACTERS_PER_LINE` still
 * derives from the same worst-case model — so point (1) above is a live,
 * unfixed exposure for **legend labels** containing latin-ext digraphs. That
 * is a recorded finding, not a silent acceptance. Whoever migrates the legend
 * to `interMetrics` closes it; until then the legend's conservatism claim
 * holds for latin-1 and **fails for latin-ext**.
 */
export const WIDEST_CHARACTER_ADVANCE_EM = 1.0202;

/** `04-UI-SPEC.md` § 4.2 — user units of the 1080 viewBox. */
export const TITLE_FONT_SIZES: Readonly<Record<CompositionTextSize, number>> = {
  small: 36,
  medium: 44,
  large: 56,
};
export const SUBTITLE_FONT_SIZES: Readonly<
  Record<CompositionTextSize, number>
> = {
  small: 22,
  medium: 26,
  large: 32,
};
/**
 * Fixed, with NO size step. Attribution is meta, and a size control on meta is
 * a control nobody uses. (The legend caption at 24/600 is `04-13`'s, not this
 * module's.)
 */
export const ATTRIBUTION_FONT_SIZE = 20;

export const TITLE_FONT_WEIGHT = 600;
export const BODY_FONT_WEIGHT = 400;

/**
 * The hard bound on a stored composition string (T-04-11-02, T-04-11-03).
 *
 * It is deliberately ABOVE the point where text stops fitting, because the
 * product **refuses rather than truncates**: a creator has to be able to type
 * past the fit line, watch the counter pass 100 % and turn `--destructive`,
 * and be told what to shorten. A cap at the fit line would silently clip
 * instead, which is the behaviour § 4.2 forbids by name.
 *
 * 100 is the same bound `MAX_MAP_NAME_LENGTH` already applies to creator-typed
 * text in this repository, and it stays at 100 now that the fit rule measures
 * real advances (2026-08-07). The reachability argument still holds and is now
 * width-shaped rather than count-shaped: the tightest line is the `large`
 * title at 56px, which overflows after ~28 characters of ordinary text, so
 * 100 leaves the refusal path comfortably reachable on every role. It remains
 * a hard cap for its OTHER reason — an unbounded string inflates the
 * serialised SVG (T-04-11-03) — which is independent of how text is measured.
 */
export const MAX_COMPOSITION_TEXT_LENGTH = 100;

/**
 * `04-UI-SPEC.md` § 9, byte-exact. Each **names the fix, imperatively**,
 * mirroring `LEGEND_LABEL_FIT_MESSAGE`. All three pass through `ToastRegion`'s
 * allowlist; none tells the creator to refresh the page, because the
 * composition lives only in browser memory.
 */
export const TITLE_TEXT_FIT_MESSAGE =
  'Shorten the title so it fits in the exported map.';
export const SUBTITLE_TEXT_FIT_MESSAGE =
  'Shorten the subtitle so it fits in the exported map.';
export const ATTRIBUTION_TEXT_FIT_MESSAGE =
  'Shorten the attribution so it fits in the exported map.';

export const COMPOSITION_TEXT_FIT_MESSAGES: Readonly<
  Record<CompositionTextRole, string>
> = {
  title: TITLE_TEXT_FIT_MESSAGE,
  subtitle: SUBTITLE_TEXT_FIT_MESSAGE,
  attribution: ATTRIBUTION_TEXT_FIT_MESSAGE,
};

export interface CompositionTextContent {
  readonly title: string;
  readonly subtitle: string;
  readonly attribution: string;
}

/** Attribution is absent on purpose: it has no size step. */
export interface CompositionTextSizeSteps {
  readonly title: CompositionTextSize;
  readonly subtitle: CompositionTextSize;
}

export interface CompositionTextLine {
  readonly role: CompositionTextRole;
  readonly value: string;
  readonly x: number;
  readonly y: number;
  readonly fontSize: number;
  readonly fontWeight: number;
  readonly textAnchor: CompositionTextAnchor;
}

/**
 * Length in CODE POINTS, not UTF-16 units. The counter, the bound check, and
 * the sanitiser's cap all read it, so an emoji or a surrogate pair counts once
 * everywhere instead of once here and twice there.
 */
export function compositionTextLength(value: string): number {
  return [...value].length;
}

export function compositionTextFontSize(
  role: CompositionTextRole,
  size: CompositionTextSize = 'medium',
): number {
  switch (role) {
    case 'title':
      return TITLE_FONT_SIZES[size];
    case 'subtitle':
      return SUBTITLE_FONT_SIZES[size];
    case 'attribution':
      return ATTRIBUTION_FONT_SIZE;
  }
}

export function compositionTextFontWeight(role: CompositionTextRole): number {
  return role === 'title' ? TITLE_FONT_WEIGHT : BODY_FONT_WEIGHT;
}

/**
 * How many characters of the WORST-CASE width fit on one composition line:
 * `floor(1016 / (size × 1.0202))`.
 *
 * The seven values it produces are the § 4.2 table — 27 / 22 / 17 for the
 * title, 45 / 38 / 31 for the subtitle, 49 for the attribution. `size` is
 * ignored for `attribution`, which has no step.
 *
 * ⚠ **No longer the refusal rule** (2026-08-07). It is retained because § 4.2
 * publishes these seven numbers and a reader who finds them gone cannot tell
 * whether they were wrong or merely moved. The live rule is
 * {@link isCompositionTextOverBound}, which measures real advances. This
 * function now describes only the pathological all-`W` case, and it is
 * **not even a floor for latin-ext** — see `WIDEST_CHARACTER_ADVANCE_EM`.
 */
export function characterBoundFor(
  role: CompositionTextRole,
  size: CompositionTextSize = 'medium',
): number {
  return Math.floor(
    COMPOSITION_TEXT_LINE_WIDTH /
      (compositionTextFontSize(role, size) * WIDEST_CHARACTER_ADVANCE_EM),
  );
}

/**
 * A provable UPPER BOUND on the rendered width of `value`, in user units of
 * the 1080 viewBox — the same space `COMPOSITION_TEXT_LINE_WIDTH` is measured
 * in, so the two are directly comparable.
 *
 * Upper bound, never an estimate: `measureTextEm` sums real per-character
 * advances (each stored rounded UP) and adds the worst adjacent-pair kerning
 * once per gap. Under-stating here is the clipped-PNG defect this project has
 * already shipped once, so every rounding decision leans wide.
 */
export function compositionTextWidth(
  role: CompositionTextRole,
  value: string,
  size: CompositionTextSize = 'medium',
): number {
  return (
    measureTextEm(value, compositionTextFontWeight(role)) *
    compositionTextFontSize(role, size)
  );
}

/**
 * How much of the usable line the value consumes, as a ratio where `1` is
 * exactly full. The panel's readout and the export refusal both call this, so
 * the number a creator watches climb is the number that blocks the export —
 * they cannot drift apart.
 */
export function compositionTextFillRatio(
  role: CompositionTextRole,
  value: string,
  size: CompositionTextSize = 'medium',
): number {
  return compositionTextWidth(role, value, size) / COMPOSITION_TEXT_LINE_WIDTH;
}

/*
 * Control (`Cc`), format (`Cf`, which is where the bidi overrides live), and
 * the line and paragraph separators. `Cf` matters twice over: it is what keeps
 * a right-to-left override out of a serialised `<text>` node, and it is the
 * same class `ToastRegion`'s legend-reorder guard already rejects.
 *
 * A newline is `Cc` and is therefore stripped. That is deliberate rather than
 * incidental: the subtitle's `<textarea rows=2>` is an affordance for reading a
 * long line, not a multi-line field, and the character bound above is a
 * SINGLE-LINE derivation that a wrapped value would silently escape.
 */
const CONTROL_CHARACTER_PATTERN = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu;

/**
 * Strip control characters and bound the length. Returns a PLAIN STRING and
 * deliberately does not HTML- or XML-escape — see the module comment.
 *
 * Called at the composition reducer's boundary, so nothing downstream has to
 * remember to call it.
 */
export function sanitizeCompositionText(raw: string): string {
  const stripped = raw.replaceAll(CONTROL_CHARACTER_PATTERN, '');
  const codePoints = [...stripped];
  return codePoints.length <= MAX_COMPOSITION_TEXT_LENGTH
    ? stripped
    : codePoints.slice(0, MAX_COMPOSITION_TEXT_LENGTH).join('');
}

/**
 * `04-13`'s legend caption bound (`04-UI-SPEC.md § 6.7`).
 *
 * 32, matching `LEGEND_LABEL_MAX_LENGTH` — the caption sits in the same legend
 * and is measured by the same worst-case advance, so a second, looser bound
 * would let a caption widen the legend past a label that is already refused.
 */
export const MAX_LEGEND_CAPTION_LENGTH = 32;

/**
 * The caption is creator-typed text on its way to an SVG text node, so it gets
 * the SAME treatment the title, the subtitle, and the attribution get: control
 * characters stripped, length bounded, at the state boundary.
 *
 * It **truncates rather than refuses**, which is the opposite of the composition
 * text fields, and the reason is deliberate: a refusal needs a creator-facing
 * message, every such message passes through `ToastRegion`'s allowlist, and
 * `uiContract.test.ts` assertion 23 pins those counts as hard numbers.
 * `04-13` moves none of them. The `maxLength` on the input means the bound is
 * reached by the control before it is reached by the sanitiser.
 *
 * It lives HERE rather than in `utils/legend.ts` because `compositionText.ts`
 * already imports `LEGEND_SAFE_INSET` from that module, and the reverse edge
 * would be a circular dependency. One control-character pattern, two callers.
 */
export function sanitizeLegendCaption(raw: string): string {
  const stripped = raw.replaceAll(CONTROL_CHARACTER_PATTERN, '');
  const codePoints = [...stripped];
  return codePoints.length <= MAX_LEGEND_CAPTION_LENGTH
    ? stripped
    : codePoints.slice(0, MAX_LEGEND_CAPTION_LENGTH).join('');
}

/**
 * Whether a field renders at all. **An empty field renders NO `<text>` element,
 * not an empty one** — an empty `<text>` still carries a `font-family`, so
 * `collectCompositionFonts` would report a family for a composition with no
 * type in it. That is a behavioural difference, not a tidiness preference.
 */
export function hasCompositionText(value: string): boolean {
  return value.trim().length > 0;
}

/**
 * The live fit rule: does this value actually overflow its line?
 *
 * **Measured, not counted** (2026-08-07). It was
 * `compositionTextLength(value) > characterBoundFor(role, size)` — a character
 * count against a worst-case-uniform bound, which refused roughly half of what
 * genuinely fits and, since `04-04`'s latin-ext face, was not even conservative
 * for digraphs. See `WIDEST_CHARACTER_ADVANCE_EM` for both defects.
 *
 * The comparison is `>`, not `>=`: a value that exactly fills the line fits.
 */
export function isCompositionTextOverBound(
  role: CompositionTextRole,
  value: string,
  size: CompositionTextSize = 'medium',
): boolean {
  return compositionTextWidth(role, value, size) > COMPOSITION_TEXT_LINE_WIDTH;
}

/**
 * The one classifier that decides whether composition text may block
 * `Export PNG`, mirroring `getLegendBlockingMessage`.
 *
 * **Refusal, not truncation**, and it is decided SYNCHRONOUSLY before the
 * export transaction takes a camera lease — so it is never offered a retry,
 * which would re-enter the same refusal forever.
 *
 * `04-11` adds **no** `ExportFailureReason` variant: a refusal decided before
 * any work begins is a different thing from a failure.
 */
export function getCompositionTextBlockingMessage(
  text: CompositionTextContent,
  sizes: CompositionTextSizeSteps,
): string | null {
  const fields: ReadonlyArray<
    readonly [CompositionTextRole, string, CompositionTextSize]
  > = [
    ['title', text.title, sizes.title],
    ['subtitle', text.subtitle, sizes.subtitle],
    ['attribution', text.attribution, 'medium'],
  ];

  for (const [role, value, size] of fields) {
    if (hasCompositionText(value) && isCompositionTextOverBound(role, value, size)) {
      return COMPOSITION_TEXT_FIT_MESSAGES[role];
    }
  }

  return null;
}

/** Half of `TEXT_SAFE_INSET`'s quarter: the gap between a title and its subtitle. */
export const COMPOSITION_TEXT_STACK_GAP = TEXT_SAFE_INSET / 4;

function anchorX(alignment: CompositionTextAlignment): number {
  switch (alignment) {
    case 'left':
      return TEXT_SAFE_INSET;
    case 'center':
      return MAP_VIEWBOX_SIZE / 2;
    case 'right':
      return MAP_VIEWBOX_SIZE - TEXT_SAFE_INSET;
  }
}

/**
 * The composition's type, resolved to placed lines — the ONE reader of "what
 * text renders, where". `MapCanvas` maps over the result; nothing re-derives a
 * baseline beside it.
 *
 * **Every baseline is anchored to the SQUARE's edge by `TEXT_SAFE_INSET`, not
 * to a band extent**, and that is a decision rather than an oversight. A band
 * is a backdrop for type, not a container: at the shipped defaults the title
 * and subtitle sit inside the 120-unit top band and the attribution inside the
 * bottom one, but a creator who drags a band shut does not have their title
 * follow it off the square. Tying a baseline to `resolveBandExtents` would also
 * make every text pixel gate a function of band height. `04-12`'s legend inset
 * remains the one consumer of that seam.
 *
 * A field with no content contributes NO line, which is what makes "an empty
 * field renders no `<text>` at all" a pure, `node`-testable property rather
 * than a JSX conditional nobody can assert.
 */
export function resolveCompositionTextLines(
  text: CompositionTextContent,
  sizes: CompositionTextSizeSteps,
  alignment: CompositionTextAlignment,
): ReadonlyArray<CompositionTextLine> {
  const x = anchorX(alignment);
  const textAnchor = COMPOSITION_TEXT_ANCHORS[alignment];
  const lines: CompositionTextLine[] = [];

  const titleFontSize = TITLE_FONT_SIZES[sizes.title];
  const subtitleFontSize = SUBTITLE_FONT_SIZES[sizes.subtitle];
  const hasTitle = hasCompositionText(text.title);

  if (hasTitle) {
    lines.push({
      role: 'title',
      value: text.title,
      x,
      y: TEXT_SAFE_INSET + titleFontSize,
      fontSize: titleFontSize,
      fontWeight: TITLE_FONT_WEIGHT,
      textAnchor,
    });
  }

  if (hasCompositionText(text.subtitle)) {
    lines.push({
      role: 'subtitle',
      value: text.subtitle,
      // A lone subtitle takes the title's own baseline rather than leaving a
      // title-shaped hole at the top of the square.
      y: hasTitle
        ? TEXT_SAFE_INSET +
          titleFontSize +
          COMPOSITION_TEXT_STACK_GAP +
          subtitleFontSize
        : TEXT_SAFE_INSET + subtitleFontSize,
      x,
      fontSize: subtitleFontSize,
      fontWeight: BODY_FONT_WEIGHT,
      textAnchor,
    });
  }

  if (hasCompositionText(text.attribution)) {
    lines.push({
      role: 'attribution',
      value: text.attribution,
      x,
      y: MAP_VIEWBOX_SIZE - TEXT_SAFE_INSET,
      fontSize: ATTRIBUTION_FONT_SIZE,
      fontWeight: BODY_FONT_WEIGHT,
      textAnchor,
    });
  }

  return lines;
}
