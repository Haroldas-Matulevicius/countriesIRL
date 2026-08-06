# Phase 4: Visual & Cartographic System - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `04-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-08-06
**Phase:** 4-Visual & Cartographic System
**Areas discussed:** Ramp assignment model, Colors panel (G-3) scope, Legend scope
(G-1 + editability gaps), Text tools vs latin-only font, Border quietness, Water &
background presets, Gradient band defaults, Persistence V3 — **all eight offered
areas were selected.**

---

## Ramp assignment model

### Q1 — How does a creator apply a ramp in Phase 4, with no CSV data yet?

| Option | Description | Selected |
|---|---|---|
| Pick a shade, then paint | Ramp strip replaces the 10-swatch row as a color source; colors stored as hex as today | ✓ (with a material qualification) |
| Rank buckets, engine shades | Creator drops countries into ordered buckets; `shadeForIndex(i, n)` computes hex | |
| Both modes, ramp is default | Rank buckets native, pick-a-shade for one-offs | |

**User's choice:** Pick a shade, then paint — *"however the shades will later also be
based on country statistics, like if Poland is 100% for something and Lithuania gets
entered as 50% for something, it needs to understand that Lithuanias shade is half of
what polands should be, so later it has to be connected to data."*

**Notes:** The qualification changed the shape of the answer. What the user described
is **continuous proportional shading against a normalized position** —
`shadeForValue(t)` — not the quantile/equal-interval classing the Phase 5 roadmap
entry names. Flagged in CONTEXT.md as a tension to surface at Phase 5 planning rather
than resolve silently here.

### Q2 — What gets stored when a creator paints from a ramp?

| Option | Description | Selected |
|---|---|---|
| Ramp + position | Store `{rampId, t}`, resolve hex at render — already CSV's native representation | ✓ |
| Raw hex, like today | Zero change to `ColorMap`, storage, undo, export — but the ramp is decoration | |
| Hex + position alongside | Hex as source of truth, `{rampId, t}` as annotation | |

**User's choice:** Ramp + position.

### Q3 — Continuous gradient or fixed ordered shades?

| Option | Description | Selected |
|---|---|---|
| Fixed steps | N ordered shades; `t` snaps to nearest. Bounded set for contrast gating and finite legend rows | ✓ |
| Continuous gradient | `t` interpolates anywhere; exactly proportional but unbounded | |
| Steps, count adjustable | Fixed steps with a creator-chosen count of 3–9 | |

**User's choice:** Fixed steps. Adjustable count therefore stays where the roadmap
already places it — Phase 5.

---

## Colors panel — G-3 scope

### Q1 — How does the G-3 rework relate to `04-02`'s palette work?

| Option | Description | Selected |
|---|---|---|
| One plan, redesign-first | `04-02` fixes the information architecture, then builds ramps into it | ✓ |
| Separate plan, before `04-02` | Dedicated redesign plan, then ramps into a good panel | |
| Ramps now, G-3 after | Build ramps into the current layout, clean up later | |

**User's choice:** One plan, redesign-first.

**Notes:** Framing that drove the question — `04-02` puts *more* content (ramp-family
picker, shade strip, custom-hex separation) into the panel already called too
squished.

### Q2 — How does the panel get room?

| Option | Description | Selected |
|---|---|---|
| Drill-down inside 280px | Card-row list → full-height sub-screens; kills nested boxes structurally | |
| Widen colors to ~360px | Keep flat structure, give the strip and country list real width | ✓ |
| Stay 280px, flatten hard | Delete nested boxes, tighten type, collapse the ramp picker inline | |

**User's choice:** Widen to ~360px.

### Q3 — Just colors, or every flyout?

| Option | Description | Selected |
|---|---|---|
| All flyouts → 360px | Uniform width preserved; edge never jumps between tools | ✓ |
| Colors only, per-panel width | Each panel takes what it needs; flyout edge shifts on tool switch | |
| You decide at plan time | Lock 360 for colors, let `04-02` decide the rest | |

**User's choice:** All flyouts → 360px.

**Notes:** This amends the **approved** `03-UI-SPEC.md`, which outranks `Design.md`.
Recorded in CONTEXT.md as a spec annotation required in the same commit as the width
change — the rules say report a spec divergence, never silently resolve it.

---

## Legend — G-1 and the editability gaps

### Q1 — How are export fixtures handled when five plans move exported pixels?

| Option | Description | Selected |
|---|---|---|
| Property assertions, not baselines | Each plan asserts only the property it owns; independent and RED-provable on its own subject | ✓ |
| Re-baseline per plan | Whole-image baselines re-cut by each pixel-moving plan, diff reviewed | |
| Properties now, one baseline at `04-10` | Per-property during the phase, one composition baseline at the close | |

**User's choice:** Property assertions, not baselines.

**Notes:** The question was reframed before asking. The area was selected as "does
`04-08` absorb G-1", but scouting showed **five of eleven plans** move exported pixels
(`04-03`, `04-05`, `04-06`, `04-07`, `04-08`), so "re-baseline once" was never
actually available. A re-baseline diff also cannot fail on its own subject, which the
project's standing gate rule forbids.

### Q2 — What is actually wrong with the legend?

| Option | Description | Selected |
|---|---|---|
| Default lands badly | Correct relative to its corner; the default corner/offset is wrong for a square frame | |
| Corner math is off | Inset too far from the edge at every corner — possibly the same defect 03-08 RED-proved | |
| Needs free positioning | Drag anywhere, clamp to bounds, persist arbitrary coordinates | |
| Not sure — look at it | Reproduce against the running editor and characterize before deciding | |

**User's choice:** None of the above — free-text plus an image.
*"I dont know the entire legend is off and just not write, its a bit too high thats
for sure and its too big. Look at image 1, the legend on the left edge, it needs to be
that subtle. That level of clean. It can't be like a big ass box. Needs to be well
strutured out."*

**Notes:** The attached **Eurostat "Unemployment rates, June 2026"** choropleth became
the single strongest input to this phase. It is characterized in detail in
CONTEXT.md `<specifics>`. It resolved parts of four separate areas at once — legend
form and chrome, water color, uncolored-land treatment, and band necessity. Because
the user was not certain the position was the only defect, "verify against the running
editor before assuming a cause" was carried into CONTEXT.md as Open Question 3.

### Q3 — What happens to the row-based legend?

| Option | Description | Selected |
|---|---|---|
| Bar is default, rows stay available | Stacked bar with break ticks default; rows survive for categorical maps | ✓ (extended) |
| Replace rows with the bar | One legend form only | |
| Rows, restyled to match | Keep entries model, restyle to the same restraint | |

**User's choice:** *"Both should be available but the row based legend needs to be
made just as subtle, user should be able to pick - well it should be default based on
what color technique used tbh too, but yeah both available."*

**Notes:** Extended beyond the option as written — the **default is inferred from the
coloring technique in use** (ramp-painted → bar; categorical → rows), with an
override. Rows are held to the same restraint as the bar, not left as-is.

### Q4 — What happens to box chrome (`theme`, `backgroundOpacity`, `borderStyle`)?

| Option | Description | Selected |
|---|---|---|
| Delete it entirely | Legend is always bare marks and type; three fields leave `LegendState` | ✓ |
| Keep fields, default to none | Bare by default, controls survive for the overlap case | |
| Collapse to one toggle | `none` (default) / `subtle` hairline | |

**User's choice:** Delete it entirely.

---

## Text tools vs the latin-only font

### Q1 — How should text handle characters outside the latin subset?

| Option | Description | Selected |
|---|---|---|
| Widen to latin-ext | Vendor the wider subset; ~+113 KB base64 per export; re-record SHA-256 | ✓ |
| Keep latin-only, refuse loudly | Reject out-of-subset characters at entry | |
| Keep latin-only, warn and allow | Toast warning, nothing blocked | |
| Widen further — latin+greek+cyrillic | Cover Ελλάδα and Србија too | |

**User's choice:** Widen to latin-ext.

**Notes:** A Phase 3-era framing was corrected during the discussion — the base64 font
inlines into the **intermediate SVG**, not the PNG raster, so exported file size is
unaffected; the cost is export time and memory.

---

## Border quietness / uncolored countries

### Q1 — With near-invisible coastlines, what does an uncolored country look like?

| Option | Description | Selected |
|---|---|---|
| Flat grey, like the reference | Render-time grey; `#FFFFFF` stays the stored sentinel | ✓ (with two extensions) |
| Stay white, keep coastlines | Walks back the "outlines disappear" goal | |
| Grey, and water gets tinted | Two independent separations | |

**User's choice:** *"This should also be changeable, but default value should be flat
grey, but a user can change it to other colors. Also we should consider making the
thickness of the outlines and other options also changeable - like the coastline
outline, etc. Put that in a different tab."*

**Notes:** Two extensions beyond the option: the fill is **creator-changeable**, and
stroke controls get **their own rail tool**. Assessed against the scope guardrail and
judged **in scope, not creep** — `04-03` and `04-05` already needed a UI surface and
had none assigned.

### Q2 — What lives in the new tab?

| Option | Description | Selected |
|---|---|---|
| "Map style" — everything non-country | Water, uncolored fill, neutral fill, border color, interior + coastline weight | ✓ |
| Split — "Background" and "Borders" | Two narrower single-purpose tools | |
| "Map style", borders collapsed | One tool with weights behind an Advanced row | |

**User's choice:** "Map style" — everything non-country.

### Q3 — How granular are the stroke-weight controls?

| Option | Description | Selected |
|---|---|---|
| Named steps | none / hairline / thin / medium / bold, interior and coastline independent | ✓ |
| Numeric slider | Continuous px width | |
| Steps, plus coastline on/off | Steps for interiors, binary for coastlines | |

**User's choice:** Named steps.

---

## Gradient band defaults

### Q1 — Default state, and relationship to surface color?

| Option | Description | Selected |
|---|---|---|
| Follows the surface, on by default | Fades from current water color to transparent; top on, bottom off | ✓ |
| Follows surface, off by default | Same mechanism, both bands start off — matches the reference exactly | |
| Auto — appears with text | No band unless a title or footer text box exists | |

**User's choice:** Follows the surface, on by default.

**Notes:** The question was reframed after the reference image arrived. With white
default water, a white→transparent band is invisible — so the band had to become
surface-derived rather than hardcoded white, which in turn makes its color
**serialized export state** rather than a CSS token read at export time.

---

## Persistence V3

### Q1 — What does a V2 map look like after Phase 4?

| Option | Description | Selected |
|---|---|---|
| Adopt the new look | Phase 4 defaults applied; one rendering path, no legacy mode | ✓ |
| Preserve appearance where possible | Keep white uncolored and the deleted legend chrome as a legacy path | |
| Adopt, but say so on load | New defaults plus a one-time ToastRegion notice | |

**User's choice:** Adopt the new look.

**Notes:** Accepted knowingly — a saved map will look different when reopened and its
export will differ from one already posted. The alternative reintroduces the
two-coexisting-models complexity that produced the G-3 complaint.

### Q2 — Does `04-09` close out G-2?

| Option | Description | Selected |
|---|---|---|
| Yes, fold it into `04-09` | Migration suite already builds stored records directly | ✓ |
| No, keep it separate | Phase 3 debt closed on its own | |
| Fold it in, and revisit F-1 | Also re-derive the 14-char label ceiling | |

**User's choice:** Yes, fold it into `04-09`. F-1 **not** folded — stays
accepted-as-deferred.

---

## Closing exchange — neutral units

Asked whether to settle three loose ends (grey-vs-grey conflict, water preset list,
rail height vs D-5) or proceed to CONTEXT.md.

**User's response:** *"I want kosovo and the othe regions colorable, there should not
be a region that is not colorable. Other than that ready for context."*

**Notes:** A data-layer policy reversal affecting **twelve** units carrying
`colorPolicy: "neutral"` — `ATA`, `COK`, `CYN`, `FLK`, `GIB`, `IOT`, `KAS`, `KOS`,
`NIU`, `SAH`, `SOL`, `TWN`. The 41 `inherit-parent` units are unaffected. Verified
against the actual asset before recording rather than assuming Kosovo was the only
one.

Consequences recorded in CONTEXT.md D4-10 rather than absorbed: the manifest is
hash-verified so the hash is re-derived; the selectable-core-state count moves
195 → 207; and it **contradicts the Phase 5 roadmap line at `05-02`** ("neutral units
are reported as 'not colorable', not matched"), which needs an explicit `ROADMAP.md`
amendment. Stated plainly in CONTEXT.md that **no approval is implicated** — no
geometry is promoted and no snapshot changes — so this is not, and must not later
read as, a bypassed approval.

It also **dissolved the grey-vs-grey conflict** raised minutes earlier: with no "not
colorable" bucket, `NEUTRAL_UNIT_COLOR` is freed to mean simply "uncolored".

---

## Claude's Discretion

- Ramp step count and exact hex sets (roadmap already flags these as plan-time).
- Whether latin-ext is always inlined or inlined conditionally — recommendation
  recorded: always inline, because a content-dependent branch in
  `src/utils/export.ts` trades determinism in the repo's most safety-critical file
  for a saving that does not affect output size.
- Band gradient stops, and band-vs-legend z-order on overlap.
- Text font stack for title/subtitle/attribution.

## Deferred Ideas

- **Per-country value labels** — Phase 5 (already scheduled there).
- **Malta-style inset boxes** — explicit Phase 6 owner decision; no plan may
  reference it until that decision exists.
- **Revisiting F-1**, the 14-char legend-label export ceiling — offered and declined;
  ships accepted-as-deferred.
- **Creator-adjustable ramp step count** — considered and rejected for Phase 4;
  Phase 5 already schedules it.

## Loose Ends Carried Forward as Open Questions

Recorded in CONTEXT.md rather than decided, at the user's direction:

1. Which water/background presets ship (only the white default is settled).
2. Rail height vs. the new Map style icon, against unclosed **D-5**.
3. Whether the reference-derived legend default fully resolves **G-1**.
4. The proportional-vs-classed tension, which surfaces at Phase 5 planning.
