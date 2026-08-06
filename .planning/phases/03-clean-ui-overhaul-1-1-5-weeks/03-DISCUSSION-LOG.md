# Phase 3: Clean UI Overhaul - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `03-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-08-06
**Phase:** 3-Clean UI Overhaul (1–1.5 weeks)
**Areas discussed:** Accent + neutral palette, App bar fate, HUD anatomy, Narrow-width + map chrome, Legend/export fidelity

---

## Area selection

| Option | Description | Selected |
|--------|-------------|----------|
| Accent + neutral palette | What replaces teal `#0f766e`; warm vs cool; fate of the dark block | ✓ |
| App bar fate | Dissolve entirely vs shrink to identity + save state + export | ✓ |
| HUD anatomy | Section order, accordion behaviour, first-load state, width | ✓ |
| Narrow-width + map chrome | Bottom sheet vs overlay; floating map controls; tooltip; cursor discipline | ✓ |

**User's choice:** all four.

---

## Accent + neutral palette

### Round 1

| Question | Options | Selected |
|---|---|---|
| Accent role | Near-invisible utility · Restrained brand colour · Pure monochrome | *(none — redirected)* |
| Accent hue | Neutral blue · Near-black/ink · Lighter teal · You decide | *(none — redirected)* |
| Warm or cool neutrals | Cool grey · Warm/paper · True neutral | Warm / paper |
| Fate of `prefers-color-scheme: dark` block | Delete it · Keep it, port it · Keep the block, freeze it | Keep it, port it |

**User's choice:** *"Please take the design.md document and tokens from themely repository"* /
*"Themely blue tokens from design.md in that repository."*

**Notes:** The first two questions were answered by redirection rather than selection — the
user pointed at an external design system instead of picking from the offered options. Located
`/Users/matul/claudeprojects/themely/Design.md` and read it in full before continuing. Three
conflicts surfaced and were put back to the user rather than silently resolved:

1. Themely is explicitly *"Glassy Apple-blue on cool platinum"* with a stated rule against warm
   accent swaps — directly contradicting the warm/paper selection.
2. Dark mode is listed as **out of scope for Phase 3** in `ROADMAP.md`, and CountriesIRL flips
   on `prefers-color-scheme` while Themely flips on a `.dark` class.
3. Stack mismatch: Themely is Next.js + Tailwind v4 + `next/font`; CountriesIRL is Vite + plain
   CSS with no Tailwind.

### Round 2 — reconciliation

| Question | Options | Selected |
|---|---|---|
| Warm vs cool | Themely cool verbatim · Themely tokens warm-shifted · Cool chrome warm map paper | ✓ Themely cool, verbatim |
| Dark mode | Port class-based · Port media-query · Class with media fallback · Delete it | ✓ Port it, class-based |
| Typography | Full port self-host Inter · Full scale system stack · Tokens only | ✓ Full port, self-host Inter |
| Design.md location | Own derived · Pointer file only · Derived + sync gate | ✓ Own Design.md, derived |

**Notes:** The warm/paper preference was withdrawn once the conflict was explicit. Adopting
Themely's literal `--themely-*` token names turned out to discharge the roadmap's binding
"namespaced tokens" transition-readiness requirement for free.

---

## App bar fate

| Question | Options | Selected |
|---|---|---|
| Does the top bar survive? | Dissolves entirely · Shrinks to a thin strip · Dissolves into floating overlays | ✓ Dissolves entirely |
| Where do name + save state go? | HUD header block · Inside Saved maps section · Floating pill over canvas | ✓ HUD header block |
| Export prominence | Pinned HUD footer button · A section like any other · Floating bottom-right | ✓ Pinned HUD footer button |
| Period select, catalog has one entry | Hide when single-entry · Keep visible, disabled-ish · Keep visible always | ✓ Keep it visible, disabled-ish |

**Notes:** Themely's own app shell has no top bar at all (fixed sidebar + full-bleed
`SidebarInset`), so dissolving is also the highest-fidelity embed answer. Flagged during the
area rather than as a question: `CompositionBar` owns the `role="status" aria-live="polite"`
period region, which needs a defined new home when the bar dissolves — a wiring requirement,
not a design choice.

---

## HUD anatomy

### Round 1

| Question | Options | Selected |
|---|---|---|
| Rail structure | One scrolling accordion · Icon rail + flyout panel · Fixed header/footer scrolling middle | ✓ Icon rail + flyout panel |
| Accordion behaviour | Multiple open remembered · Multiple open not remembered · One at a time | Multiple open, remembered |
| First-load default | Colouring only · Colouring + Legend · All collapsed | All collapsed |
| Width | Fixed 280px · Fixed 208px Themely parity · Resizable 240–400px | Fixed 280px |

**Notes:** Internal tension surfaced — "multiple open" and "all collapsed" are accordion
concepts that don't map onto an icon-rail model, and the rail is a deviation from `03-02`'s
"left HUD column (collapsible sections, one scroll container)." Reconciled rather than
guessed at.

### Round 2 — reconciliation

| Question | Options | Selected |
|---|---|---|
| Panels open at once | One tool at a time · Panel holds an accordion · Stack multiple panels | ✓ One tool at a time |
| First load | Rail only panel closed · Rail only remember last state · Open the colouring panel | ✓ Rail only, remember last state |
| What 280px measures | Panel 280 rail extra · 280 total when open · Panel overlays canvas | ✓ Panel is 280px, rail extra |

---

## Narrow-width + map chrome

### Round 1

| Question | Options | Selected |
|---|---|---|
| Narrow breakpoint | Rail becomes bottom bar · Rail stays left panel overlays · Rail collapses to menu button | ✓ Rail becomes a bottom bar |
| Floating map controls | Zoom +/− and reset · Reset only · Zoom, reset, scale bar | ✓ Zoom +/− and reset |
| Tooltip restyle | Dark ink chip · Light card · You decide | ✓ Dark ink chip |
| Carry-ins (multi-select) | Kosovo cursor discipline · Legend stays canvas overlay · Keyboard parity for the rail · Instant hover no ease | ✓ Kosovo cursor · Legend overlay · Instant hover |

**User's added note:** *"adopt themely's icon animation style as well and the motion tools it
uses to have good fluidity."*

**Notes:** *Keyboard parity for the rail* was not selected. Recorded in CONTEXT.md as already
binding via the existing single-roving-tabindex invariant (commit `074173e`) rather than
treated as dropped. Investigated Themely's motion stack before asking follow-ups: `motion` v12,
`src/lib/motion/tokens.ts` (CSS vars + TS mirror + lockstep test), and vendored lucide-animated
icons documented in Themely's `coding-rules/frontend.md`. Found that CountriesIRL's existing
`--easing-camera` and `--motion-fast` already equal Themely's `EASE_OUT` and `DURATION_FAST`.

### Round 2 — motion follow-up

| Question | Options | Selected |
|---|---|---|
| Motion adoption depth | Tokens + motion/react + animated icons · Tokens + icons CSS-driven · Tokens only no deps | ✓ Tokens + motion/react + animated icons |
| Icon source | Vendor from Themely · lucide-react static · Hand-authored inline SVG | ✓ Vendor from Themely |
| Hover behaviour | Instant bg animated glyph · Ease everything at 150ms · You decide | ✓ Instant bg, animated glyph |

---

## Legend / export fidelity

| Question | Options | Selected |
|---|---|---|
| Legend restyle vs export pixels | Legend keeps Phase 2 pixels · Legend adopts Themely type · Discuss properly as a fifth area | ✓ Legend adopts Themely type |

**Notes:** Raised unprompted at the end because the legend renders inside the export-bearing
composition, so restyling it changes exported PNG bytes — meaning Phase 3 is not purely chrome.
The user chose visual consistency between studio and output. Three consequences recorded as
hard planning requirements in CONTEXT.md D-25: deliberate re-baselining of export fixtures (not
silent), an `html2canvas`-plus-webfont gate proving Inter actually resolves in the export clone,
and the reminder that `02-28` binds `fe5f946` and must be performed against that commit rather
than a restyled HEAD.

---

## Claude's Discretion

- Per-surface application of Themely recipes to chrome Themely has no analog for: colour swatch
  grid, legend editor rows, saved-map row anatomy, the map's own `--map-*` tokens.
- Whether `--map-fixed-text` and the map surfaces re-tone onto Themely tokens or stay fixed.
- Icon selection per tool, subject to the vendoring rules.
- Exact hue/contrast specification lands in `Design.md` (`03-01`) for owner review.

## Deferred Ideas

- Warm "paper" cast on the map's own surfaces → Phase 4 (Visual & Cartographic System).
- A user-facing dark-mode toggle — palette and mechanism decided, trigger not; open
  sub-question for `/gsd:plan-phase 3`, not deferred out of the phase.
- Scale bar on the map — rejected for Phase 3 (misleading on Mercator; cartography, not chrome).
- Actually embedding the editor in Themely — outside v1.1, needs new owner authorization.

## Roadmap amendments this discussion created

1. Dark mode moves from out-of-scope to in-scope, class-based.
2. `03-02`'s HUD becomes an icon rail + flyout rather than a collapsible column.
3. Two runtime dependencies (`motion` v12, vendored lucide-animated icons) plus a legend
   restyle that changes exported pixels enter a phase specced as "chrome, layout, and tokens
   only."
