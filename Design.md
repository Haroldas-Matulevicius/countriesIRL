# CountriesIRL — Design Contract

> The normative design source for Phase 3 onward. `03-03` and every plan after it implement
> against this file. A token value wrong here propagates silently into `src/styles/theme.css` and
> then into every surface, with nothing failing.

**Status:** authored 2026-08-06 by plan `03-02`, immediately after the D-01 one-way commitment gate.

**Amended 2026-08-07 by plan `04-07` (CD-1 / D4-05): the tool panel is 360px, not 280px.** Every
flyout widened uniformly so the panel edge never jumps between tools. This file is **outranked** by
`.planning/phases/03-clean-ui-overhaul-1-1-5-weeks/03-UI-SPEC.md`, which carries the full thirteen-row
disposition table — but it must not be left stating a retired number, so its seven `280` references
moved here in the same commit. **Two of them are renumbered in name only:** the `--text-subheading`
ban (§ 4) and the near-size adjacency rule (§ 4) **stay in force**. Their subject is a 2px size step
reading as an accident rather than a hierarchy, which is just as illegible at 360px as at 280px; the
width was the occasion, not the cause. The open width itself is declared once in `editor.css` as
`--panel-width-open` — **never as a bare literal**, because `360px` already means two other things
in that file.

---

## 1. Upstream attribution (D-02)

This document is **derived from Themely's design system**, in a sibling repository, read-only:

| Upstream source | Read | Used for |
|---|---|---|
| `/Users/matul/claudeprojects/themely/Design.md` | in full, 2026-08-06 | palette, type scale, radii, shadows, motion, component recipes, Do's and Don'ts |
| `/Users/matul/claudeprojects/themely/src/app/globals.css` (`:root` 173-258, `.dark` 319-357) | token blocks, 2026-08-06 | **authoritative where it disagrees with Themely's `Design.md`** |
| `/Users/matul/claudeprojects/themely/src/lib/motion/tokens.ts` | in full, 2026-08-06 | the motion TS-mirror shape |
| `/Users/matul/claudeprojects/themely/src/components/ui/search.tsx` | in full, 2026-08-06 | the vendored animated-icon shape |

**There is no cross-repo test dependency, and there will not be one.** CountriesIRL is
browser-only and localhost-only, running against bundled same-origin assets; a test that reads a
file in another repository would make this repo un-runnable the moment that repository moves,
changes, or is absent. The repo stays **self-contained**: values are vendored here, and **drift
from upstream Themely is accepted and reconciled by hand**, deliberately, in a change that says so.

**Where this file and `.planning/phases/03-clean-ui-overhaul-1-1-5-weeks/03-UI-SPEC.md` disagree,
the approved UI-SPEC wins** and the disagreement is *reported*, not silently resolved. The UI-SPEC
has already reconciled Themely's `Design.md` against `globals.css`; re-deriving a value here would
be a second, unreviewed reconciliation.

---

## 2. Colour tokens, vendored verbatim (D-03, D-04)

### Namespace rule (D-03)

Colour tokens use Themely's `--themely-*` names **verbatim**. Type roles use `--text-*`; motion
uses `--motion-*`. Families Themely does not namespace — spacing, focus, radii, and the
CountriesIRL-only `--map-*` / `--tooltip-*` export set — keep their existing local names.

**This is not cosmetic.** It discharges the ROADMAP's binding **transition-readiness**
requirement that new design tokens be namespaced so they can coexist with a host app's stylesheet.
If this editor is later mounted inside Themely, the host's `globals.css` simply **becomes** the
token source and our declarations act as fallbacks — no rename, no shim.

### Light (`:root`)

**No value may be adjusted.**

| Token | Value | Role in CountriesIRL |
|---|---|---|
| `--themely-platinum` | `#ffffff` | Editor wall — the full-bleed shell background behind the rail and panel |
| `--themely-porcelain` | `#f8fafd` | Card / row surface: rail hover, panel body, saved-map rows, empty states, icon chips |
| `--themely-powder` | `#e5edf5` | Active surface: the open tool's rail row, the selected colour tile, the selected legend position |
| `--themely-apple-blue` | `#0071e3` | Sole saturated accent — see § 6 |
| `--themely-apple-blue-hover` | `#005db8` | Accent hover only |
| `--themely-midnight-ink` | `#061b31` | Primary text, panel titles, primary icon fill |
| `--themely-slate-blue` | `#50617a` | Secondary text, descriptions, helper labels |
| `--themely-nav-ink` | `#0d0d0d` | Rail row text/icons — **constant across inactive/hover/active** (D-29) |
| `--themely-ghost-gray` | `#64748d` | **Carries no text in CountriesIRL — see the note below.** Declared for palette parity |
| `--themely-stone-gray` | `#d8d6df` | Hairline borders and dividers — always consumed at 60% for card borders |
| `--themely-red` | `#ff5252` | Destructive only: `Delete Saved Map`, error banners. Never decorative |
| `--themely-on-accent` | `#ffffff` | Text/icons on an Apple Blue or Themely Red **fill**. Identical in both modes |
| `--themely-media-backdrop` | `#000000` | Fixed black — scrims. Identical in both modes |
| `--themely-on-media` | `#ffffff` | Text/icons on dark media. Identical in both modes |

**`--themely-ghost-gray` carries no text here, and the reason is a measurement.** Against this
palette it is **3.88:1** on Porcelain and **3.60:1** on Powder in dark mode — both below AA for the
12px `--text-caption` the tertiary meta role uses, and `--text-caption` is not large text. D-04
forbids adjusting a Themely value, and the contract forbids enumerating a contrast exception, so the
third option is the one taken: **tertiary meta consumes `--themely-slate-blue`** (worst case 5.15:1),
and the ghost value stays declared, unadjusted, for parity with upstream. This is the same treatment
D-09 already gives `--text-display` and `--text-stat` — declared for parity, with the reason
recorded — and it is a **gate**, not a note: `uiContract.test.ts` fails any rule that sets `color`
from it. A token left out of a contrast matrix with only a comment to explain it is an exception
wearing a different hat.

### Dark (`.dark`, D-08)

The flip is a **`.dark` class on the editor mount root**, never `document.documentElement`, and
**no `prefers-color-scheme` query exists anywhere in the dark path** (D-30).

| Token | Dark value |
|---|---|
| `--themely-platinum` | `#000000` |
| `--themely-porcelain` | `#16181c` |
| `--themely-powder` | `#1d1f23` |
| `--themely-apple-blue` | `#2997ff` |
| `--themely-apple-blue-hover` | `#1a7fd4` |
| `--themely-midnight-ink` | `#e7e9ea` |
| `--themely-slate-blue` | `#8b9099` |
| `--themely-nav-ink` | `#ffffff` |
| `--themely-ghost-gray` | `#71767b` |
| `--themely-stone-gray` | `#2f3336` |
| `--themely-red` | `#ff6b6b` |
| `--themely-on-accent` / `--themely-media-backdrop` / `--themely-on-media` | **unchanged** — `#ffffff` / `#000000` / `#ffffff` |

`.dark` additionally carries `color-scheme: dark` so native controls and scrollbars follow.
`export.ts:269` and `:285` set `style.colorScheme = 'light'` on the export frame and the cloned
SVG — that is deliberate export theme-independence and **must not be removed**.

**Retired, deleted, never aliased.** `--accent`, `--accent-hover`, `--accent-contrast`,
`--surface-*`, `--text-primary` / `-secondary` / `-muted`, `--border-strong`, and the whole
`--glass-*` family go away. Aliasing them would let a stale reference keep working and keep the
retired teal `#0f766e` family alive in the product; deleting them makes a stale reference fail
loudly at the contract test.

---

## 3. The mode-invariant (fixed) token set — the export firewall

**Live Invariant 9 outranks Themely's "tokens flip themselves" rule for this family.** These
tokens are declared **exactly once, in the unconditioned `:root`**, and appear in **no** `.dark`
block, no media query, and no `@supports` block. Redefining one makes the exported PNG follow the
viewer's theme — a defect no rendering test catches.

| Token | Value | Phase 3 disposition | Why fixed |
|---|---|---|---|
| `--map-surface` | `#ffffff` | unchanged | paints the exported square |
| `--map-fill-default` | `#ffffff` | unchanged | uncoloured country fill in the PNG |
| `--map-border-default` | `#000000` | unchanged | in the PNG; mirrors `DEFAULT_BORDER_COLOR` |
| `--map-border-hover` | `#000000` | unchanged | state is carried by stroke-**width**, never colour |
| `--map-border-selected` | `#000000` | unchanged | as above |
| `--map-border-focus` | `#0071e3` | **value changes** `#0f766e` → `#0071e3` | see below |
| `--map-fixed-text` | `#111827` | **unchanged — stays fixed** | any re-tone changes exported pixels for every existing saved composition, and D-25 already spends the phase's one deliberate export-pixel change on the legend typeface. Phase 4 owns the map's visual language |
| `--map-skeleton-fill` / `--map-skeleton-stroke` | `#e5e7eb` / `#d1d5db` | unchanged | loading state inside the square |
| `--swatch-border` | `#9ca3af` | unchanged | mirrors the literal `LegendOverlay.tsx:313` hard-codes (`stroke="#9CA3AF"`) |
| `--tooltip-surface` | `#061b31` | **re-toned** (D-22) | § 7 |
| `--tooltip-text` | `#ffffff` | **re-toned** (D-22) | |
| `--tooltip-border` | `rgba(255, 255, 255, 0.14)` | **re-toned** | |
| `--tooltip-shadow` | `0 4px 12px -2px rgba(6, 27, 49, 0.10)` | re-toned to the popover tier (D-06) | |
| `--map-frame-edge` | `rgba(6, 27, 49, 0.55)` | **new** | D-32 export-frame hairline |
| `--map-frame-scrim` | `rgba(6, 27, 49, 0.06)` | **new** | D-32 out-of-frame dim |
| `--accent-fill` | `#0071e3` | **new** (owner-decided) | the `Export PNG` fill — see § 6 |
| `--accent-fill-hover` | `#005db8` | **new** (owner-decided) | hover pair for the above |

`--accent-fill` / `--accent-fill-hover` are **chrome, not export.** They are listed here because
they share the *mechanism* — declared once in the unconditioned `:root`, never in `.dark` — for a
different reason: accessibility rather than export independence.

**`--map-border-focus` re-tone.** `#0f766e` is the retired teal. Leaving it on the map's focus
stroke keeps a second saturated hue alive in the product, which D-05 forbids. It moves to Apple
Blue's **light** value and stays fixed in both modes. This is safe for the export because
`sanitizeExportClone` strips `focused` classes and `data-focused` before capture, so the focus
stroke never reaches a PNG. It stays dashed at 3px — the one map border state carried by colour
rather than weight, because it must read against an already-selected country.

**Deleted from the fixed set.** `--mixed-color-light` / `--mixed-color-dark` /
`--active-check-border` / `--active-check-surface` / `--active-check-text` are **chrome**, not
export, and their fixed values go invisible under `.dark` (a `#111827` check chip on Powder
`#1d1f23`). They are **deleted, not aliased**, and their two surfaces are re-expressed on flipping
`--themely-*` tokens — see § 7. `--map-shadow` is **deleted**: a full-bleed canvas has nothing to
elevate.

---

## 4. Typography (D-09, D-10)

Inter Variable, **self-hosted woff2 vendored into `src/assets/`** — no Google Fonts `@import`, no
runtime third-party request. Fallback stack is Themely's declared substitute:
`system-ui, -apple-system, "Segoe UI", sans-serif`. `tabular-nums` on for any numeric column.

> **Known limitation — the vendored subset is latin-only.** `src/assets/inter-latin-variable.woff2`
> is 48,432 B and stops at `U+00FF`. Characters in latin-ext (`U+0100-024F`) fall back to
> `system-ui` mid-string, in the editor **and inside the exported PNG**: `Ł ł ą ę ś ż ź ć ń`,
> `ą č ę ė į š ų ū ž`, `ő ű`, `č ć đ š ž`, `ā ē ī ū ģ ķ ļ ņ`, `ě ď ř ů`, `ș ț`. Iberia and
> Scandinavia are unaffected (those diacritics are latin-1), and the bundled geometry is
> unaffected (Natural Earth `properties.name` values are English ASCII). The real exposure is a
> **creator-typed legend label in a native orthography**: `Magyarország` renders, `Košice` and
> `Łódź` do not. **This does not claim full Unicode coverage.** The decision belongs to `03-11`,
> where the font is actually embedded; the measured cost of closing the gap is recorded in
> `03-01-SUMMARY.md` FINDING 2 and `src/assets/README.md`.

The four retired tokens `--font-label` / `--font-body` / `--font-heading` / `--font-display` and
their companions `--weight-regular` / `--weight-semibold` are **deleted, not aliased** (D-10) —
the role tokens bundle weight.

### The ten roles

Each role bundles size + line-height + weight + tracking as one CSS class, the way Tailwind's
`text-<role>` utility does upstream.

| Role | Size | Line height | Weight | Tracking | Phase 3 consumers |
|---|---|---|---|---|---|
| `--text-display` | 40px | 1.10 | 700 | -0.025em | **none** — declared for D-09 parity; see the exemption |
| `--text-h1` | 30px | 1.20 | 600 | -0.02em | `FatalErrorState` heading |
| `--text-h2` | 24px | 1.25 | 600 | -0.015em | Save form heading inside the Saved Maps panel |
| `--text-h3` | 18px | 1.40 | 600 | -0.01em | tool panel title; HUD composition name; empty-state heading |
| `--text-subheading` | 16px | 1.40 | 500 | 0 | onboarding banner heading; fatal-error lead line. **Never inside a tool panel** *(CD-1: the ban survives D4-05's widening to 360px — its subject is a 2px size step reading as an accident, not the column width)* |
| `--text-body` | 15px | 1.55 | 400 | 0 | prose: empty-state body, confirmation prompts, onboarding |
| `--text-body-sm` | 14px | 1.50 | 400 | 0 | **the workhorse** — rail rows, buttons, inputs, list rows |
| `--text-caption` | 12px | 1.40 | 400 | 0 | meta, helper text, field errors, swatch labels |
| `--text-eyebrow` | 11px | 1.30 | 500 | +0.08em | inert pills, uppercase section eyebrows |
| `--text-stat` | 30px | 1.00 | 600 | -0.02em | **none** — declared for D-09 parity; see the exemption |

**Chrome subset (normative for restraint).** The editor's own chrome uses exactly four roles:
`--text-h3` (titles), `--text-body-sm` (rows, buttons, inputs), `--text-caption` (meta), and
`--text-eyebrow` (pills). Weights in chrome: 400, 500, 600. The remaining roles serve dialogs,
prose, and error states.

**Near-size adjacency rule.** `--text-body-sm` (14), `--text-body` (15), and `--text-subheading`
(16) sit within 2px of each other — inherited from Themely's scale, where a wider layout keeps
them apart. Inside **any tool panel** at most **two** of the three may appear, and a
hierarchy step within the panel is carried by **weight**, not by a 1-2px size difference. In
practice the panel uses `--text-body-sm` (400 for rows, 500 for sub-headings) and `--text-body`
(prose only); `--text-subheading` does not appear there at all.

**Consumer exemption — a CLOSED set of exactly two.** A declared token needs a consumer, or its
contract assertion is theatre. `--text-display` and `--text-stat` have **no consumer in this app**
— there is no marketing hero and no stat card — but D-09 vendors the whole scale. They are
declared with an explicit, commented exemption naming that reason, and **the exemption list in the
contract test is a closed set containing exactly these two. Adding a third must fail.**

**Legend typography [D-25 — changes exported pixels].** The legend renders inside the
export-bearing composition. Its labels adopt Inter at the sizes `LegendOverlay.tsx:34-38` already
declares (`small: 24`, `medium: 32`, `large: 40` user units) at weight **600**. Two consequences:
`LEGEND_CHARACTERS_PER_LINE` and `LABEL_CHARACTERS_PER_LINE` hold the same table under two names
and must collapse to one exported constant re-derived from Inter's worst-case advance width; and
the font must actually reach the export clone. **OQ-1 was answered POSITIVE from installed Chrome
151 by `03-01`** — an inline base64 `@font-face` does resolve inside SVG-as-image — so the seam is
buildable as specced and no owner descope is required.

**Legend colour exemption.** `LegendOverlay.tsx:65-74` hard-codes `THEME_COLORS`
(`background: '#FFFFFF'`, `text: '#111827'`, `border: '#CBD5E1'`) and `:313` hard-codes
`stroke="#9CA3AF"`. These are **deliberate export-fixed values, not an oversight.** The
"no hex literal in `.tsx`" assertion gives `LegendOverlay.tsx` an explicit, commented exemption
naming this reason. Note the name collision: the legend's `light`/`dark` is a *creator-chosen
legend theme*, not the app's colour scheme.

---

## 5. Spacing, radii, elevation, motion

### Spacing — the 8-point scale (unchanged)

| Token | Value | Usage |
|---|---|---|
| `--space-xs` | 4px | icon gaps, inline padding, swatch gutters |
| `--space-sm` | 8px | compact element spacing, grid gaps inside the panel |
| `--space-md` | 16px | default element spacing, panel horizontal padding |
| `--space-lg` | 24px | section padding, floating-control inset from the canvas edge |
| `--space-xl` | 32px | gap between panel sections |
| `--space-2xl` | 48px | **minimum interactive control height** |
| `--space-3xl` | 64px | HUD header block height |
| `--target-compact` | 44px | touch target under the narrow breakpoint (D-20) |

**Exceptions: none.** Every spacing value in this contract is a multiple of 4: rail 56, panel 360,
rail row 36, rail icon slot 32, icon glyph 20, control min-height 48, touch target 44. Radii are a
separate scale and are not spacing.

### Radii (D-07)

| Token | Value | Themely equivalent | Applies to |
|---|---|---|---|
| `--radius-control` | 8px | `rounded-md` | buttons, inputs, rail rows' inner chips, tooltip |
| `--radius-row` | 10px | `rounded-lg` | **the rail row itself** |
| `--radius-card` | 14px | `rounded-xl` | cards, panel sections, saved-map rows, inline banners |
| `--radius-modal` | 18px | `rounded-2xl` | the one remaining large surface (fatal error state) |
| `--radius-pill` | 9999px | `rounded-full` | pills and badges |

`--radius-large: 16px` is **retired**, superseded by `--radius-card: 14px`.

### Elevation (D-06) — flat with hairlines

**`--shadow-inspector`, `--shadow-navigation`, and the entire `--glass-*` family (64 references)
are deleted, not aliased**, so a stale reference fails loudly at the contract test.
**`backdrop-filter` is forbidden outright** — a blanket ban, simpler than an approved-surface
allowlist, and it cannot rot.

| Token | Value | Only for |
|---|---|---|
| `--hairline` | `0 0 0 var(--border-width) var(--hairline-color)` | cards, inputs, list rows, panel sections |
| `--hairline-color` | `color-mix(in srgb, var(--themely-stone-gray) 60%, transparent)` | the same relationship as a **colour**, for boundaries that must still occupy layout (a rail edge, a panel divider, an input border). It is what replaced the retired `--border-default`, and routing the width through `--border-width` is what lets `prefers-contrast: more` thicken both forms in one place |
| `--popover-shadow` | `0 4px 12px -2px rgba(6, 27, 49, 0.10)` | floating map controls, the narrow-width bottom sheet, toasts |
| `--dialog-shadow` | `0 10px 40px -10px rgba(6, 27, 49, 0.20)` | fatal error surface |
| `--toast-shadow` | *retired* → consumes `--popover-shadow` | |
| `--modal-shadow` | *retired* → consumes `--dialog-shadow` | |

`.dark` swaps `--popover-shadow` to `0 4px 12px -2px rgba(0, 0, 0, 0.45)`. **No shadow token may
be referenced by anything the export clone carries** — a hairline is still a `box-shadow`. See § 8.

### Motion (D-26)

CSS custom properties are the runtime source of truth; `src/lib/motion/tokens.ts` is a TS mirror
pinned by a lockstep test that reads `theme.css` as text and fails when either layer moves alone.

| Token | Value | TS mirror | Role |
|---|---|---|---|
| `--motion-ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | `EASE_OUT` | entrance/settle; **absorbs `--easing-camera`, byte-identical** |
| `--motion-ease-snappy` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | `EASE_SNAPPY` | hover/press micro-feedback; **absorbs `--easing-control: ease-out` as a deliberate retime** |
| `--motion-ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | `EASE_IN` | exit curve (bottom sheet down) |
| `--motion-duration-fast` | `150ms` | `DURATION_FAST` | **absorbs `--motion-fast`, byte-identical** |
| `--motion-duration-base` | `240ms` | `DURATION_BASE` | **absorbs `--motion-camera`, byte-identical**; panel open/close |
| `--motion-duration-slow` | `360ms` | `DURATION_SLOW` | theme crossfade |
| `--motion-scene` | `160ms` | `SCENE_CROSSFADE_DURATION_MS` | **kept local, documented** — Themely's do-not-snap idiom |

- `CAMERA_MOTION_DURATION_MS` **derives** from `DURATION_BASE` rather than restating `240`.
- `@media (prefers-reduced-motion: reduce)` zeroes `--motion-duration-fast`, `-base`, `-slow`, and
  `--motion-scene`.
- **Every motion token must have a live consumer** — a CSS `var()` in a rule that **paints**, or a
  named read in `src/utils/motion.ts`. **The TS mirror does not count**, because it is the layer
  under test: accepting it made `--motion-ease-snappy`, `--motion-ease-in`, and
  `--motion-duration-slow` "consumed" by the file they were being compared against. `03-04` closed
  that and restored the Phase 2 rule. Their consumers now: the snappy curve on control
  micro-feedback (buttons, country paths, list rows); the slow duration on the **theme crossfade**,
  which is the one surface change in this editor where an instant flip reads as a fault; and the
  exit curve on the tool panel's **close**, the same directional pairing D-20 specifies for the
  narrow-width bottom sheet — `03-09` joins that token rather than introducing a second one.
- **A rename and a retime look identical in a diff.** The three byte-identical absorptions are
  asserted *equal*; the one deliberate retime (`--easing-control` → `--motion-ease-snappy`) is
  asserted *different*, so "simplifying" the pair cannot ship a timing change as a cleanup.
- `prefers-reduced-motion` remains legitimate everywhere. **D-30 forbids `prefers-color-scheme`
  only.** `prefers-reduced-transparency`, `prefers-contrast`, and `forced-colors` also survive.

### Preference blocks under a class-based dark mode

Any `prefers-contrast` / `forced-colors` override of a `--themely-*` token must be declared for
**both** `:root` and `.dark` inside the same at-rule. The preference block is authored after the
palette at equal specificity, so a literal written for one mode silently wins in the other — the
defect that once painted a light bar under light text at **1.0:1** for the user who asked for
*more* contrast.

### Animation runtime — a note on what `motion` actually pins

`motion` is pinned **exact `12.40.0`** (D-27), never a caret. The pin was chosen partly to
byte-match Themely. Measured, that holds only one level deep: `motion@12.40.0` declares
`framer-motion: ^12.40.0`, and this repo resolves `framer-motion` / `motion-dom` to **12.43.0**
where Themely resolves **12.40.0**. **Research assumption A4 was therefore not removed — it moved
one level down, to the transitive resolution.** No npm `overrides` block was added: `^12.40.0`
cannot reach `13.x`, `package-lock.json` makes the tree deterministic, and forcing a transitive
downgrade below what the package author declares is a supply-chain policy change no gate
authorized. The vendored icons were verified against the **resolved** 12.43.0 in this repo, not
against Themely's 12.40.0.

---

## 6. The accent budget (D-05)

**Apple Blue is one thing per surface** — the primary action OR the active state OR the brand
glyph, never three at once.

| Surface | Its **one** Apple Blue element | Everything else on that surface |
|---|---|---|
| Tool rail (56px) | **`Export PNG`** filled button in the footer, filled from `--accent-fill` | Active tool row = Powder + Nav Ink. Theme toggle = **neutral**. Undo/Redo = neutral |
| Tool panel (360px) | the panel's **single primary action**, where it has one (`Apply Color`, `Save Map`) | Selected/active states use Powder + Midnight Ink. A panel with no primary action carries **no** accent |
| Canvas region | **none** (D-21 — the accent belongs to Export) | Floating controls, export frame, and legend chrome are neutral with Stone Gray hairlines |
| Tooltip | **none** (D-22) | dark ink chip |
| Toast region | **none** | error = Themely Red; status/warning = neutral ink on Porcelain |
| Onboarding banner | its single CTA | dismiss is a ghost button |

**Global exemption, recorded so it cannot silently widen.** `:focus-visible` rings are Apple Blue
on every surface and are **exempt from the per-surface budget** — they are transient,
keyboard-only, and required by NFR11. **The exemption covers `:focus-visible` and nothing else. It
does not extend to `:hover` or `:active`.**

**Second semantic colour:** `--themely-red` only, and only for destructive actions and error
states. No third status hue exists — info is Apple Blue or no colour at all.

**The destructive SURFACE consumes `--destructive`, not `--themely-red` directly, and for the same
reason the Export fill does.** Measured: `#ff5252` is **3.05:1** on Porcelain and white on a
`#ff5252` fill is **3.19:1** — both below AA, in light mode. `--destructive` is therefore `#b42318`
in light (6.29:1 on Porcelain, 6.57:1 under white) and `var(--themely-red)` in dark, where `#ff6b6b`
clears AA on every chrome surface (6.40:1 on Porcelain). The Themely value is unadjusted; the
surface that owes AA has its own token. `--success` / `--warning` survive this phase unchanged
because the toast severity surfaces that consume them are restyled in `03-10`; collapsing them onto
Themely Red and neutral ink per D-05 belongs to that plan.

### The Export fill is mode-invariant — and why (owner-decided 2026-08-06)

**`Export PNG`'s fill is `--accent-fill: #0071e3` in BOTH modes**, consumed from its own
mode-invariant token rather than from the flipping `--themely-apple-blue`.

| Pair | Ratio | Verdict |
|---|---|---|
| `#ffffff` on `#0071e3` (the shipped fill, both modes) | **4.70:1** | AA for normal text |
| `#ffffff` on `#2997ff` (what the flipping token would give in dark) | **3.02:1** | below AA's 4.5:1 |
| `#ffffff` on `#1a7fd4` (`--themely-apple-blue-hover` dark) | **4.18:1** | still short |

**This changes no locked decision.** D-13 holds — Export is still a filled Apple Blue primary and
still the rail's one accent surface. D-08 is untouched — `--themely-apple-blue` still flips to
`#2997ff` for every other consumer.

**Do not "simplify" this back onto the flipping token.** Pointing `--accent-fill` at
`var(--themely-apple-blue)` looks tidier and silently reintroduces a 3.02:1 white-on-blue label in
dark mode — a failure no rendering test catches. `--accent-fill` is declared **exactly once, in the
unconditioned `:root`**, appears in no `.dark` block, and its hover pair `--accent-fill-hover:
#005db8` is likewise fixed.

**There is no contrast exception in this contract.** Every text-on-surface pair meets WCAG AA in
both modes, and the matrix asserts its own row count so it cannot silently resolve to nothing.

---

## 7. CountriesIRL-only anatomy **[FOR REVIEW]**

> **[FOR REVIEW]** — Themely has no analog for the surfaces in this section, so
> `03-CONTEXT.md` § Claude's Discretion delegated them. Everything here was decided at Claude's
> discretion following the nearest Themely recipe, and is surfaced here rather than buried so the
> owner can see what was chosen. **Nothing in this section is an owner decision.** The items are
> listed for skim in `03-02-SUMMARY.md` § Design.md discretion items.

### 7.1 The shell and the map's own surfaces

```
.map-editor                       ← mount root; grid; 100dvh; [data-panel-open]
├── .tool-rail          56px      ← data-editor-only="true"
│   ├── .tool-rail__header        ← HUD identity block (pinned, never scrolls)
│   ├── .tool-rail__tools         ← 4 tool rows + the Undo/Redo pair
│   └── .tool-rail__footer        ← Export (accent) · theme toggle (neutral)
├── .tool-panel         0 | 360px ← at most ONE open; reserves layout space
└── .map-workspace      1fr       ← full-bleed canvas region
    ├── .map-workspace__canvas    ← container-type: size; overflow: hidden
    │   ├── div.map-export-source
    │   │   └── svg.map-canvas    ← THE EXPORT SOURCE — viewBox "0 0 1080 1080"
    │   ├── .map-frame            ← export frame; data-editor-only; aria-hidden
    │   └── navigationSlot        ← floating cluster; SIBLING of the export source
    ├── .period-hud               ← inert period surface + the live region
    └── ToastRegion
```

- **`[data-panel-open]` is exactly `'true' | 'false'`** — never absent, never a third value.
- The panel track animates on a registered `--panel-width` custom property over
  `--motion-duration-base` / `--motion-ease-out`, **not** on `grid-template-columns`.
- **No `ResizeObserver` is required and none may be added.**
- `.map-workspace__square` is renamed `.map-workspace__canvas`; `aspect-ratio: 1` moves to
  `.map-frame`. A class named `__square` that is no longer square is a stale name.
- The export frame is `1px solid var(--map-frame-edge)` with everything outside dimmed by
  `--map-frame-scrim`. No accent, no radius, no label.

#### OQ-2 resolved — full-bleed surface, framed square (D-32)

**The decision, stated as D-32 states it.** The map **surface** is full-bleed and pans and zooms
in the Google-Maps idiom, and a visible square **export frame** sits centred on it marking exactly
what lands in the PNG. The two are not in tension: the frame is what buys the full-bleed surface
its WYSIWYG back.

Everything below is unchanged by the decision, which is why it is safe:

- The SVG `viewBox` stays `0 0 1080 1080` and `preserveAspectRatio="xMidYMid meet"` is untouched,
  so the composition square lands centred at side `min(width, height)` of the canvas region.
- Geometry beyond that square paints into the letterbox gutters. That is the full-bleed feel, and
  it is also why the frame is not decoration: without it a creator cannot tell which of the
  visible countries will survive the crop.
- The export clone re-asserts the square (`export.ts:277-284`, `overflow: hidden`), so gutter
  geometry is clipped and the PNG is untouched. **The 1080×1080 contract does not move.**

**Two verified facts make this safe. Cited so nobody re-derives them:**

| Fact | Consequence |
|---|---|
| `useCameraController.ts:310-313` pins d3-zoom's `extent` to `[[0,0],[1080,1080]]` — the 1080 square, **not** the element rect | a rail or panel reflow cannot change the camera's input space |
| `MapCanvas.tsx:839-840` fixes the `viewBox` at `0 0 1080 1080` | a reflow cannot change the projection or what the export clone carries |

**Therefore no `ResizeObserver` is required, and none may be added** to the projection, camera, or
export path. `Tooltip.tsx` has observed its own element since Phase 2 for viewport clamping and
that is unrelated and untouched; `uiContract.test.ts` states the rule as an **ownership set** over
`src/` rather than a blanket ban, because a ban that is red on arrival gets deleted instead of
obeyed. If something here appears to need an observer, that is the signal that the geometry was
re-derived somewhere it should not have been.

**Measured, not assumed.** `tests/e2e/shell.spec.ts` projects the viewBox corners `(0,0)` and
`(1080,1080)` through `svg.map-canvas`'s `getScreenCTM()` and compares them to `.map-frame`'s
client rect at a wide, a tall, and a near-square viewport. The largest disagreement on any edge in
installed Chrome is **6e-14 px**. It is an equality rather than an approximation because both are
literally "the centred `min(w, h)` square of the same box".

#### Narrow width (D-20) — specification for `03-09`, not implementation

Recorded here so `03-09` implements a decision rather than inventing one. **Nothing in this
subsection is built yet**; `03-03` landed the desktop shell only.

Below the existing **1200px** breakpoint the grid collapses:

| Element | Narrow behaviour |
|---|---|
| Rail | becomes a **bottom bar**, icons thumb-reachable, `--target-compact` (44px) targets, `data-editor-only="true"` |
| Panel | a tapped tool raises a **bottom sheet** over the map — the one surface that overlays the canvas — entering on `--motion-duration-base` / `--motion-ease-out` and exiting on `--motion-ease-in` |
| Floating cluster | sits directly above the bottom bar, still **outside** the export frame |
| HUD header / footer | fold into the bottom bar: the composition name truncates to one line and `Export PNG` stays pinned and visible |

360px containment and the 200 %-equivalent check still apply, and the halved CSS viewport is
**labelled as the equivalent, never as physical zoom**. `prefers-reduced-transparency` is asserted
**statically**, because Playwright cannot emulate it and emulation a browser does not support is
not evidence.

### 7.2 Rail row — the signature component (D-16, D-29)

36px tall, full width, `--radius-row` (10px), `--text-body-sm`, `--themely-nav-ink`. Icon slot
32×32 with a 20px glyph **sized via the `size` prop, never className sizing**.

- **Hover paint is INSTANT.** No `transition` on the row background — an ease here is a
  regression, not polish. Only the icon glyph animates.
- **Colour is constant across inactive / hover / active.** No accent bar, no blue active icon, no
  weight bump. **Only the row background carries state**: hover `--themely-porcelain`, active
  (`[aria-expanded="true"]`) `--themely-powder`.
- The glyph animation is triggered from **ROW** hover through the imperative handle, not icon
  hover. `startAnimation()` is gated on reduced motion; `stopAnimation()` is unconditional.
- `<button type="button">` with `aria-expanded` / `aria-controls`. **No positional CSS selector
  may style a rail row** — key on a role class and a stable `data-tool`.

| `data-tool` | Label | Glyph |
|---|---|---|
| `colors` | `Colors` | `palette` |
| `countries` | `Countries` | `list` |
| `legend` | `Legend` | `layers` |
| `saved` | `Saved Maps` | `folder` |

Pinned non-tool rows: `Undo Color Change` (`undo-2`), `Redo Color Change` (`redo-2`) — labels
unchanged, because the e2e locators and the toast allowlist are keyed to them.

### 7.3 HUD header and footer

**Header** (pinned, never scrolls): a 32×32 `--radius-row` Powder chip holding an Apple-Blue-free
monogram (or a `map` glyph when unnamed), the composition name at `--text-h3` with ellipsis, and a
`Saved` / `Unsaved changes` neutral pill (`--radius-pill`, `--text-eyebrow`, Porcelain + Slate
Blue). At 56px the name and pill are `opacity: 0` — **never `display: none`**, which would remove
them from the accessible name. **No Apple Blue anywhere in this block.**

**Footer** (pinned): `Export PNG` filled `--accent-fill` with `--themely-on-accent` label at
`--text-body-sm` weight 500, `--radius-control`, hover `--accent-fill-hover`, disabled 40% opacity
with no pointer events. Busy label swaps exactly `Export PNG` ⇄ `Exporting PNG…` with native
`disabled` + `aria-busy` — **never `aria-disabled` on a still-clickable button**. Theme toggle is a
**neutral** ghost icon control (`sun` / `moon`), accessible name naming the destination, with
`aria-pressed`. Theme persists through the **storage-adapter interface**, never raw
`localStorage`; absent key ⇒ **light**; **no `prefers-color-scheme` read anywhere**.

### 7.4 Colour swatch grid

```css
.color-picker__preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(76px, 1fr));
  gap: var(--space-sm);
}
```

The column count is **derived from a minimum track wide enough for the longest label**, never
fixed. A fixed count plus `width: max-content` inside `overflow: hidden` once clipped `Magenta` at
the tile edge with nothing failing. Overflow stays visible so the next one is caught by eye.

| Part | Contract |
|---|---|
| Element | `<button type="button" data-color-name="…" aria-label="Apply <Name>">` — role-classed, never styled by position |
| Box | `min-block-size: 48px`; `--radius-control`; Platinum background; `--hairline`; `--space-sm` padding |
| Swatch | 24×24, `border-radius: 8px`, `1px solid var(--swatch-border)` — the border is what keeps a **white** preset visible on a Platinum tile |
| Label | `--text-caption`, `--themely-midnight-ink`, never truncated |
| Hover | `--themely-porcelain`, **instant, no transition** |
| Selected | `--themely-powder`; a `check` glyph (16px) at the tile's trailing-top corner **on the tile background, not on the swatch**, so it stays legible over any creator colour. `aria-pressed="true"` |
| Focus | the global Apple Blue `:focus-visible` ring |

This replaces `--active-check-border` / `-surface` / `-text`, **deleted** because their fixed
`#111827`-on-white values went invisible under `.dark`.

**Mixed-selection indicator.** A 24×24 chip split diagonally between `--themely-porcelain` and
`--themely-slate-blue` with the `--swatch-border` hairline, plus the visible text `Mixed`. This is
chrome and **flips with the theme** — it represents a state, not a colour. Replaces
`--mixed-color-light` / `--mixed-color-dark`, **deleted**.

**Uncoloured is not filled.** `canonicalizeColorMap` deletes any entry equal to `DEFAULT_COLOR`, so
white and uncoloured are one state. Unset rows get an **outline**, coloured rows get a **fill**.
The accessible name stays `Current color #FFFFFF`, because the country really is white on the map
and every row locator is keyed on that string.

**Custom hex form.** Input at `--text-body-sm`, `--radius-control`, `--hairline`, Apple Blue focus
ring; error message `--text-caption` in `--themely-red`, wired by `aria-describedby` +
`aria-invalid`. Its submit (`Apply Color`) is the panel's **one** Apple Blue element.

### 7.5 Legend editor rows

The legend itself stays a **canvas overlay inside the export-bearing composition** (D-24) — only
the *editor* moves. Nothing reads `legend.position` raw; every read goes through
`resolveLegendPosition` / `resolveLegendRender`.

| Part | Contract |
|---|---|
| Row | Porcelain card, `--radius-card`, `--hairline`, `--space-sm` padding and gap. **No inner hairline** — the label input sits directly on the card with a bottom edge only |
| Swatch | 20×20, `border-radius: 6px`, `1px solid var(--swatch-border)`, `aria-label="Color <hex>"` |
| Label input | `--text-body-sm`, transparent background, full row width, `--themely-slate-blue` placeholder (a placeholder is text, and ghost gray misses AA — see § 2) |
| Counter | `--text-caption`, `--themely-slate-blue`, `tabular-nums`, `aria-live="off"` — it must not announce on every keystroke. Turns `--destructive` at the limit |
| Actions | icon-only ghost buttons at 44×44, `--themely-nav-ink` glyphs, **stacked onto their own row** — *(CD-1: practice preserved, reason corrected. Two full-phrase controls need ≈383px and still do not fit in 328px of content at 360px.)* |
| Reorder | keyboard reorder via the two arrow buttons is the **primary** path; drag is an enhancement |
| Invalid | `data-legend-validation="invalid"` stays; a `--themely-red` 2px inset left edge keyed on the **data attribute**, never a positional selector, plus its message at `--text-caption` in `--themely-red` |

**Style controls** (theme, text size, border, position) are four `<fieldset>`s, each a Porcelain
card whose `<legend>` is **`--text-body-sm` at weight 500** — deliberately *not*
`--text-subheading`. 16px and 14px are 2px apart, which reads as an accident rather than a
hierarchy in a tool panel at any width; the weight bump carries it instead. Options are **pills**: neutral
(Porcelain + Slate Blue) unselected, **Powder + Midnight Ink** selected. **No accent** — the
`legend` panel has no primary action, so per D-05 it carries no Apple Blue at all.

**Position picker** is a 3×3 grid of 44×44 cells with the four presets and `Custom`; the selected
cell is Powder. Its announcements are the existing approved strings, unchanged.

**Empty state**: `--radius-card`, **dashed** `--themely-stone-gray` at 70%, `--themely-porcelain`
at 40%, centred, `--space-lg` padding, a 40×40 round `--themely-apple-blue` at 10% chip holding a
16px `layers` glyph. Copy unchanged.

### 7.6 Saved-map row anatomy

`SaveLoad`'s modal dialog dissolves into the `saved` tool panel; the modal machinery
(`role="dialog"`, `aria-modal`, the overlay, the imperative `inert`) retires **with the dialog**.
What survives verbatim is the **nested-confirmation contract**, which was never about the modal: a
confirmation renders as a **sibling** of the surface it interrupts; it carries its own
**`tabIndex={-1}`**; `Escape` dismisses the **innermost** open layer, branching over every open
layer in order; focus returns to the control that opened it, **from an effect**, keyed by a
**stable row key**. The `02-22` action-order semantics must be **explicitly preserved or explicitly
superseded in writing** — recorded, never silent.

| Part | Contract |
|---|---|
| Row | Porcelain card, `--radius-card`, `--hairline`, `px 16 / py 12`, `--space-sm` gap. Hover `--themely-powder`, **instant** |
| Chip | 32×32 `--radius-control`, Platinum background, `--hairline` ring, `map` glyph in `--themely-slate-blue`. Chips step **up** from the Porcelain card |
| Name | `--text-body-sm`, `--themely-midnight-ink`, one line, ellipsis |
| Meta | `--text-caption`, `--themely-slate-blue`, `tabular-nums` |
| `Load This Map` | ghost: transparent, `--themely-midnight-ink`, `--hairline`, hover Porcelain. Accessible name `Load This Map: <name>` (unchanged) |
| `Delete Saved Map` | **destructive**: `--themely-red` text on transparent, hover `--themely-red` at 10%. **Never one-shot** — always paired with the inline confirmation |
| Confirm state | the row's actions swap to `Delete Map: <name>` (filled `--themely-red`, `--themely-on-accent` text) and `Keep Map: <name>` (ghost), plus the prompt at `--text-caption` |
| Save form | name input + `Save Map` — the `saved` panel's **one** Apple Blue element |

**Open correction the restyle must not paper over.** A saved-map row *can* name a deferred
snapshot today: `storage.ts:61-63` builds `SNAPSHOT_IDS` from **all five** `SNAPSHOT_CATALOG`
entries, so a hand-crafted `localStorage` record carrying `"snapshotId": "1914"` validates and
`getPeriodShortLabel` returns `1914`. **This is pre-existing Phase 2 behavior, not something Phase
3 introduces**, the label is still catalog-derived (Live Invariant 6 intact — manifest text never
reaches the UI), and reaching it requires hand-editing browser storage. Phase 3 **must not restate
the false inference** at `SaveLoad.tsx:127-131`, and **must not silently fix it either** — a
behavior change to the storage validator is out of a chrome phase's scope. The recommended
resolution is an approved-id filter on the short-label resolver; either way it is recorded.

### 7.7 Floating map controls

Bottom-right, Google-Maps idiom, neutral surfaces with Stone Gray hairlines, **no accent**. **One
bordered cluster** holding four 44×44 icon buttons — not four floating pills. `Zoom In` (`plus`),
`Zoom Out` (`minus`, **absent at the whole-world fit**, and its absence is asserted), `Move Map`,
`Reset View` (`crosshair`). Pan directions are placed by role classes, never by child index.

**The cluster occupies the letterbox gutter, never the export frame.** Screen-sized chrome
overlaying canvas-positioned content is a defect this project has already shipped: the map
navigation once overlaid the square's top-left corner where the legend's default preset lives, and
nothing failed because both elements were present, visible, and correctly placed by their own
rules. **Assert non-intersection with the frame rect, not placement.**

`Reset View` is camera-only and must exist **exactly once** in the composed DOM. `Reset All Colors`
is undoable content reset and lives in the Colors panel. **The two never sit together.**

### 7.8 Period surface and the rehomed live region

`CompositionBar` dissolves; its two responsibilities land in one `.period-hud` surface in the
canvas region — **not** in the rail, because the region is an `aria-describedby` target as well as
a live region and must sit next to the control it describes.

- It renders the options `useSnapshotCatalog` returns, which currently resolve to **exactly one
  entry: `Modern — current borders`**.
- **It must NOT render `SNAPSHOT_CATALOG` directly.** That constant is a five-entry **label
  registry**, not an approval list. Rendering it would make four deferred snapshots nameable in the
  UI — a direct violation of Immutable Safety Constraint 3 and Live Invariant 6.
- With one resolved option it renders as a **visibly inert read-only pill**, not a disabled
  `<select>`: `Map period` (`--text-eyebrow` uppercase, Slate Blue) above the single resolved label
  (`--text-body-sm`, Midnight Ink), on a Porcelain pill with `--hairline` and `--radius-pill`. **No
  dropdown affordance, no chevron, no "coming soon", no count of hidden periods.**
- `COMPOSITION_PERIOD_STATUS_ID` stays **byte-identical** (`'composition-bar-period-status'`), the
  element keeps `role="status" aria-live="polite"`, and the period control keeps
  `aria-describedby` pointing at it. It is **not** merged into `ToastRegion` and **not** merged
  into `.selection-live-region`.

### 7.9 Tooltip — dark ink chip (D-22)

An HTML overlay (`div.map-tooltip`), never inside `svg.map-canvas`, so it cannot reach the export
clone — yet declared with **fixed, mode-invariant** tokens anyway.

| Property | Value | Why |
|---|---|---|
| Background | `--tooltip-surface: #061b31` | Midnight Ink's **light** value, literal. The flipping token would produce a light chip with white text in dark mode |
| Text | `--tooltip-text: #ffffff` | matches `--themely-on-accent`'s both-modes contract |
| Border | `--tooltip-border: rgba(255, 255, 255, 0.14)` | gives the chip an edge against a near-black dark wall |
| Radius | 8px (`--radius-control`) | |
| Shadow | `--tooltip-shadow` — the popover tier | |
| Padding / type | `--space-sm` / `--space-md`; `--text-caption` detail lines, `--text-body-sm` weight 600 for the country name | |

Chosen over a light Porcelain card because creators colour countries white, and a near-white
tooltip over a near-white fill loses its edge. White on `#061b31` measures **17.9:1**.

**Cursor and copy discipline carries forward verbatim (D-23).** A colourable unit gets
`cursor: pointer`; a non-colourable unit (`colorOwnerId === null` — Kosovo, Western Sahara,
Antarctica; 12 units) gets `cursor: default`, keeps `NEUTRAL_UNIT_COLOR`'s solid light-grey fill in
**both** colour resolvers, and its tooltip states the honest reason — `Not colorable in this map` —
rather than announcing a colour. The neutral fill is a solid colour, **never a CSS `filter`**.

### 7.10 Toast region and onboarding

`ToastRegion` is unchanged as a **boundary, not a renderer**. Only its surface is restyled:
Porcelain card, `--radius-card`, `--hairline`, `--popover-shadow`, `--text-body-sm`. Error variant:
`--themely-red` at 10% background, at 20% border, `--themely-red` text. **No accent.**

The onboarding banner becomes an inline info card on the canvas region: Porcelain, `--radius-card`,
`--hairline`, a single CTA (its one Apple Blue element) and a ghost `Dismiss Help`. Its accent must
be keyed on a **role class**, never `button:first-child` — that exact selector once meant
reordering would have moved the accent onto `Dismiss Help` with nothing failing.

**The accent-tinted surface and the accent left edge are gone** (`03-04`). The Phase 2 banner had a
`--surface-accent-tint` background, a 4px accent left rule, *and* a filled CTA. D-05 gives this
surface exactly **one** Apple Blue element; three is not a stronger reading of the rule.

---

## 8. Export-unsafe CSS — the reason, restated for the post-D-34 world

**No `filter`, `box-shadow`, `text-shadow`, `mix-blend-mode`, `mask`, or `clip-path` on anything
the export clone carries** — `.map-canvas`, `.country-path`, `.scene-path`, `[data-layer=…]`,
`.map-export-source`. `backdrop-filter` is banned everywhere.

The Phase 2 justification for this guard was a **rasterizer-mismatch argument about html2canvas**,
and that argument **is retired**: D-34 removes html2canvas from the export path entirely, so the
old wording describes a library the code no longer calls. The true reason is **stronger, not
weaker**:

> Under D-34 the clone is serialised with `XMLSerializer` into a `data:image/svg+xml` URL and
> rasterised as an `<img>`. That image is an **isolated document**: it sees none of the host
> page's stylesheets. A `box-shadow`, `filter`, `backdrop-filter`, `mask`, or `clip-path` applied
> through an external CSS rule therefore does not render *approximately* — it renders **not at
> all**. The only signal is a PNG that quietly lost an effect the editor shows on screen, which is
> a harder failure than a mismatch and a quieter one.

Anything an exported surface needs must be an **inline attribute or an inline style inside the
serialised subtree**. `sanitizeExportClone` hard-sets stroke and stroke-width inline for exactly
this reason; it does **not** neutralise an inherited effect.

D-06 makes hairline `box-shadow` pervasive across chrome, so this guard is **more load-bearing
after this phase than before it**. `EXPORT_CONTENT_PATTERN` must stay bound back to `MapCanvas.tsx`
source — `.map-unit-path` was once omitted from that pattern for a whole phase.

---

## 9. Do's and Don'ts

### Do

- Prioritize **Platinum** for the editor wall and **Porcelain** for cards and inset zones; let the
  surface breathe.
- Use **Midnight Ink** for primary text and **Slate Blue** for secondary — those two cover ~90% of
  typography needs.
- Reach for a `--text-<role>` bundle instead of a raw size; the role carries weight and tracking
  with it.
- Pair an icon chip with its glyph in Slate Blue, never a naked icon floating in card padding.
- Use `--radius-pill` for pills and `--radius-card` (14px) for cards — these are signature shapes.
- Reserve Apple Blue for **one** thing per surface.
- Use `tabular-nums` for any column or stat that shows numbers.
- **Translate** a Themely recipe into CSS. Every time.

### Don't

- **Don't paint hover with a transition** on a row or tile. Instant is the contract; an ease here
  is a regression, not polish.
- **Don't change a rail row's text or icon colour** across inactive / hover / active. Only the
  background carries state.
- **Don't write a per-component dark override.** Tokens flip themselves; a component that reaches
  for a dark literal is the start of a second palette.
- **Don't flip `--themely-on-accent`.** It is `#ffffff` in both modes, by contract.
- **Don't style an interactive element with a positional selector** (`:nth-child`,
  `:first-child`, `:last-child`) — anywhere, not just in the action strip. Order is copy; key on a
  role class.
- **Don't copy a Tailwind `className`.** This repo has no Tailwind, so a copied class produces an
  element that *looks* wired up and renders unstyled.
- **Don't introduce a second saturated accent.** Apple Blue (info), Themely Red (destructive), or
  no colour at all.
- **Don't put a border on top of a border.** Stack by background shift (Platinum → Porcelain).
- **Don't use a heavy drop shadow on a content card.** Flat with hairlines; shadow is for floating
  chrome only.
- **Don't tell the user to refresh the page,** ever. The composition lives only in browser memory.
- **Don't advertise a deferred feature** in onboarding, status, or empty-state copy. The approved
  snapshot catalog holds exactly `Modern`; the 1492 / 1700 / 1815 / 1914 packets are **deferred for
  missing rights-cleared source material**, and **deferred is not done**.

---

*Last updated: 2026-08-06 — the token layer landed (plan 03-04) and three things it MEASURED are now recorded here rather than discovered again: `--themely-ghost-gray` carries no text (3.88:1 on Porcelain, 3.60:1 on Powder in dark) and tertiary meta moves to Slate Blue; the destructive surface consumes `--destructive` for the same reason the Export fill consumes `--accent-fill` (3.05:1 / 3.19:1 measured on the verbatim red); `--hairline-color` joins elevation as the layout-occupying form of the hairline that replaced `--border-default`; the three formerly mirror-only motion tokens name their real consumers and the mirror is excluded from the consumer set; and the onboarding banner drops its accent tint and accent edge to satisfy D-05's one-accent-per-surface rule.*
*Last updated: 2026-08-06 — created by plan 03-02 as the design contract 03-03 onward implements against (upstream attribution with no cross-repo test dependency, the verbatim token tables, the export firewall, the ten type roles with a closed two-token exemption, spacing/radii/elevation/motion, the accent budget, the CountriesIRL-only anatomy marked [FOR REVIEW], the post-D-34 export-unsafe reason, and the translated Do's and Don'ts), then extended by plan 03-03 with the § 7.1 OQ-2 resolution: full-bleed surface with a framed square, the two verified citations that make it safe (`useCameraController.ts:310-313`, `MapCanvas.tsx:839-840`), the "no `ResizeObserver` may be added, and the rule is an ownership set" statement, the measured 6e-14 px frame↔viewBox agreement, and the D-20 narrow-width contract as specification for `03-09`.*

*Full edit history: `git log -p -- Design.md`.*
