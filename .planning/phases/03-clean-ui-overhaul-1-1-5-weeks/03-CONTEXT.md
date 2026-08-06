# Phase 3: Clean UI Overhaul - Context

**Gathered:** 2026-08-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the CountriesIRL editor's chrome — the slate/teal token system, the app-bar +
right-inspector arrangement, and the accumulated CSS mass — with a **super-clean minimal
studio**: a full-bleed pannable map canvas plus **one left-side tool surface** holding every
tool, styled to the **Themely design system**.

The roadmap scopes this as "chrome, layout, and tokens only." **That boundary moved during
this discussion** — three deliberate expansions are recorded in
[§ Roadmap Amendments](#roadmap-amendments) below. Downstream agents must treat those as
authorized changes to the Phase 3 scope, not as drift, and `/gsd:plan-phase 3` must land the
corresponding `ROADMAP.md` edits explicitly rather than silently.

Still out of scope, unchanged: map fills, palette ramps, borders, the legend *content* model,
bands and text tools (Phase 4); any data features (Phase 5).

</domain>

<decisions>
## Implementation Decisions

### Design system source

- **D-01:** CountriesIRL adopts the **Themely design system**, sourced from
  `/Users/matul/claudeprojects/themely/Design.md` (sibling repo, outside this repo).
  The user directed this explicitly. — **Reversibility:** one-way — every token name, the
  type scale, the icon recipe, and the motion contract flow from this choice; reverting means
  re-authoring `theme.css`, `Design.md`, the contract test, and every restyled surface.
- **D-02:** Phase 3 creates **CountriesIRL's own `Design.md`**, derived from Themely's. It
  names Themely's as upstream, vendors the token table verbatim, and adds what Themely has no
  equivalent for: map canvas surfaces, HUD/rail anatomy, colour swatches, legend chrome,
  tooltip. **No cross-repo test dependency** — the repo stays self-contained, which the
  localhost-only, bundled-asset constraint requires. Drift from upstream is accepted and
  handled by hand.
- **D-03:** Token names use Themely's `--themely-*` namespace **verbatim**. This is not
  cosmetic: it discharges the roadmap's binding transition-readiness requirement that "new
  design tokens are namespaced so they can coexist with a host app's stylesheet." If the
  editor is later mounted inside Themely, the host's `globals.css` simply *becomes* the token
  source and our declarations act as fallbacks.

### Palette

- **D-04:** **Themely cool, verbatim.** Platinum `#ffffff`, Porcelain `#f8fafd`, Powder
  `#e5edf5`, Midnight Ink `#061b31`, Slate Blue `#50617a`, Nav Ink `#0d0d0d`, Ghost Gray
  `#64748d`, Stone Gray `#d8d6df`, Themely Red `#ff5252`, On-Accent `#ffffff`.
  *A warm/paper direction was raised first and then withdrawn* once the conflict with
  Themely's stated "cool platinum / never a warm accent swap" rule was surfaced.
- **D-05:** **Apple Blue `#0071e3` is the sole saturated accent** (`#2997ff` dark; hover
  `#005db8` / `#1a7fd4`). Design.md's rule binds: *reserve Apple Blue for **one** thing per
  surface — the primary action OR the active state OR the brand glyph, never three at once.*
  No second saturated accent may be introduced. Status hues are Apple Blue (info) or Themely
  Red (destructive) only.
- **D-06:** Themely's flat-with-hairlines elevation model replaces the current heavy panel
  shadows. Cards/inputs/rows get `0 0 0 1px var(--themely-stone-gray)/60%`; drop shadow is
  reserved for floating chrome (popover `0 4px 12px -2px rgba(6,27,49,0.10)`, dialog
  `0 10px 40px -10px rgba(6,27,49,0.20)`). The retired `--shadow-inspector` /
  `--shadow-navigation` / `--glass-*` families are **deleted, not aliased**, so stale
  references fail loudly at the contract test.
- **D-07:** Radii follow Themely: buttons/inputs 8px, cards 14px (`rounded-xl`), modals 18px,
  pills 9999px.

### Dark mode

- **D-08:** **Dark mode is ported, class-based.** Mirror Themely's X "Lights Out" palette 1:1
  (`--themely-platinum: #000000`, `--themely-porcelain: #16181c`, `--themely-powder: #1d1f23`,
  `--themely-midnight-ink: #e7e9ea`, `--themely-slate-blue: #8b9099`, `--themely-nav-ink:
  #ffffff`, `--themely-ghost-gray: #71767b`, `--themely-stone-gray: #2f3336`, `--themely-red:
  #ff6b6b`; Apple Blue lifts to `#2997ff`). The flip mechanism **changes from
  `prefers-color-scheme` to a `.dark` class on the mount root** — Themely's mechanism, and the
  one a future host can control. — **Reversibility:** costly — undo means re-deriving a second
  palette and re-running every contrast check; and the media-query→class switch changes
  observable behaviour for users relying on OS-level dark preference.
  - **This is Roadmap Amendment 1** — the roadmap lists dark mode as out of Phase 3 scope.
  - Themely's dark-mode Don'ts carry over: tokens flip themselves; no per-component dark
    overrides; `--themely-on-accent` stays `#ffffff` in **both** modes.
  - **Open sub-question for planning:** with no OS-preference listener, what sets `.dark` in
    the standalone app? A user-facing toggle is the obvious answer but is not yet decided.
    Whatever is chosen must not read OS preference in a way the host cannot override.

### Typography

- **D-09:** **Full type port, Inter self-hosted.** Vendor Inter Variable into the Vite build
  (not `next/font` — that API does not exist here) and adopt the whole role scale bundling
  size + line-height + weight + tracking per role: `display 40/1.10/700/-0.025em`,
  `h1 30/1.20/600/-0.02em`, `h2 24/1.25/600/-0.015em`, `h3 18/1.40/600/-0.01em`,
  `subheading 16/1.40/500`, `body 15/1.55/400`, `body-sm 14/1.50/400`, `caption 12/1.40/400`,
  `eyebrow 11/1.30/500/+0.08em`, `stat 30/1.00/600/-0.02em`. `tabular-nums` on for any numeric
  column. Fallback stack is Themely's declared substitute:
  `system-ui, -apple-system, "Segoe UI", sans-serif`.
- **D-10:** The existing `--font-label/body/heading/display` tokens are **retired**, not
  aliased.

### Layout — the app bar dissolves

- **D-11:** **The top app bar dissolves entirely.** No top chrome; the canvas is full-bleed
  edge to edge. This matches Themely's app shell (fixed left sidebar + full-bleed
  `SidebarInset`, no top bar), so an embedded editor drops into a host `SidebarInset` with
  nothing to reconcile.
- **D-12:** **Composition identity + saved/dirty state live in a pinned HUD header block** at
  the top of the left rail, above the tools — mirroring Themely's workspace-switcher slot.
  Always visible; never scrolls away. The composition name remains identity **owned by the
  composition root**, set only on a committed save or load (existing invariant, unchanged).
- **D-13:** **Export is a pinned Apple Blue primary button in the HUD footer**, always visible
  regardless of panel or scroll state. Per D-05 this is the rail's *one* Apple Blue surface,
  so no other rail element may carry the accent as a fill.
- **D-14:** **The period control stays visible** even though `SNAPSHOT_CATALOG` holds exactly
  one approved entry (`Modern`), rendered in its own HUD surface in a visibly inert state.
  **Hard constraint:** this changes presentation only. Catalog and approval semantics are
  untouched, period labels still resolve *only* through `SNAPSHOT_CATALOG`, and nothing here
  may make a deferred snapshot nameable or reachable.
- **D-15:** `CompositionBar` currently owns the `role="status" aria-live="polite"` period
  region. When the bar dissolves that live region needs a **defined new home** — this is a
  required wiring task, not an optional one. `ToastRegion` remains the allowlist boundary for
  every creator-facing message.

### The tool HUD — icon rail + flyout

- **D-16:** **Icon rail + single flyout panel**, not a collapsible accordion column. A narrow
  always-present icon strip (Themely's `PrimaryNavRow` idiom) opens one tool panel at a time —
  the VS Code / Figma model. — **Reversibility:** costly — the rail-and-panel DOM is what the
  rewritten CSS contract test, the responsive spec, and the focus-order e2e all assert against.
  - **This is Roadmap Amendment 2** — `03-02` specifies "left HUD **column** (collapsible
    sections, one scroll container)."
- **D-17:** **One tool open at a time.** Clicking an icon opens that tool and closes the
  previous.
- **D-18:** **First run opens with the panel closed** — full-bleed world map plus a quiet icon
  strip. Thereafter the rail **restores the last-open tool**. That persisted state goes through
  the **storage-adapter interface** (the transition-readiness constraint), never raw
  `localStorage`, and must respect the bounded V2 record contract.
- **D-19:** **Widths: rail ~56px, panel 280px** (~336px total open, 56px closed). The panel
  **reserves layout space** — the canvas reflows when a tool opens; the panel does not overlay
  the map. 280px is deliberately wider than Themely's 208px sub-sidebar because this rail holds
  editing controls (swatch grids, legend label fields, saved-map rows), not nav links.

### Narrow width

- **D-20:** Below the existing narrow breakpoint the **rail becomes a bottom bar** (icons
  thumb-reachable) and a tapped tool raises a **bottom sheet** over the map. `--target-compact`
  (44px) already carries the touch-target size. 360px containment and the 200%-equivalent
  check still apply, and `prefers-reduced-motion` / `prefers-reduced-transparency` behaviour is
  re-verified in the new chrome.

### Map chrome

- **D-21:** **Floating map controls: zoom `+`, zoom `−`, reset view**, bottom-right,
  Google-Maps idiom. Neutral surfaces with Stone Gray hairlines — **no accent** (the accent
  belongs to Export in the rail, per D-05). No scale bar.
- **D-22:** **Tooltip is a dark ink chip** — Midnight Ink `#061b31` background, white text,
  8px radius, popover-tier shadow. Chosen over a light Porcelain card because creators colour
  countries white, and a near-white tooltip over a near-white fill loses its edge.
- **D-23:** **Kosovo cursor discipline carries forward**: colorable units get `pointer`,
  non-colorable units get `default`, and the tooltip states the honest non-colorable reason
  rather than a colour readout. Roadmap `03-07` requires an assertion that goes RED if this
  regresses.
- **D-24:** **The legend stays a canvas overlay** inside the export-bearing composition —
  placement still decides export membership, and the typed `legendSlot` / `navigationSlot`
  contract is preserved verbatim. Only the legend *editor* moves into the rail.

### Legend typography enters the exported PNG

- **D-25:** **The legend adopts Themely typography** (Inter + the type-role scale). Because the
  legend renders inside the export-bearing composition, **this changes exported PNG pixels** —
  Phase 3 is no longer purely chrome. — **Reversibility:** one-way — once export baselines are
  re-cut, restoring Phase 2 output means reverting the legend styling and re-cutting again.
  Consequences that **must** be handled at plan time:
  - **Export e2e assertions and any pixel evidence must be explicitly re-baselined**, with the
    re-baseline recorded as a deliberate act. A silently updated fixture here would be exactly
    the "gate that cannot fail" failure mode this repo has already shipped three times.
  - **`html2canvas` + a web font is a real hazard.** The export clone must actually resolve
    Inter, or exported PNGs silently fall back to a system font while the on-screen editor
    looks correct. This needs its own gate: an export test that fails when Inter is *not*
    applied in the clone. Prove it RED by removing the font from the clone path.
  - **`02-28` binds `fe5f946`.** The acceptance matrix describes the pre-Phase-3 build. The
    owner performs it against the preserved tag/commit, **never** against a restyled HEAD, and
    Phase 3 must not be allowed to confuse which build the matrix describes.
  - The 1080×1080 export size contract is unchanged and non-negotiable.

### Motion and icons

- **D-26:** **Full Themely motion port.** Adopt the `--motion-*` CSS vars as the runtime source
  of truth (`--motion-ease-out: cubic-bezier(0.22,1,0.36,1)`, `--motion-ease-snappy:
  cubic-bezier(0.2,0.8,0.2,1)`, `--motion-ease-in: cubic-bezier(0.4,0,1,1)`,
  `--motion-duration-fast: 150ms`, `--motion-duration-base: 240ms`, `--motion-duration-slow:
  360ms`) **plus a TS mirror with a lockstep test**, following Themely's
  `src/lib/motion/tokens.ts` pattern. A lockstep test suits this repo well — it is pure
  constants, so it runs in the `node` Vitest environment with no DOM.
  - Happy accident: `theme.css` already carries `--easing-camera: cubic-bezier(0.22, 1, 0.36,
    1)` and `--motion-fast: 150ms` — byte-identical to Themely's `EASE_OUT` and
    `DURATION_FAST`. The existing camera/scene timings should be reconciled onto the token set,
    not duplicated beside it.
- **D-27:** **Add the `motion` package (v12)** for panel/sheet transitions and the animated
  icons. — **Reversibility:** costly — a runtime dependency in a phase specced as tokens-only;
  removing it later means re-authoring every animated surface in CSS.
- **D-28:** **Vendor the lucide-animated icon components from Themely**, carrying their
  contract intact: each exports a `forwardRef` component plus a structurally-identical
  `*IconHandle` (`{ startAnimation, stopAnimation }` via `useImperativeHandle`); **size via the
  `size` PROP, never className sizing**; the **`strokeWidth` 2→1.5 local patch with its marker
  comment** must be re-applied on any re-vendor. Add the map-specific icons the rail needs
  (palette, legend, export, saved maps, layers, locate, period).
- **D-29:** **Hover: instant background, animated glyph.** Row background snaps to
  Porcelain (hover) / Powder (active) with **no `transition`** — Themely states an ease here is
  "a regression, not polish." Only the icon glyph animates, **triggered from ROW hover via the
  imperative handle**, not icon hover. `startAnimation()` is gated by reduced-motion;
  `stopAnimation()` is unconditional. Nav text/icon colour is **constant across
  inactive/hover/active** (`--themely-nav-ink`) — only the row background carries state.
  - **This plus D-27 is Roadmap Amendment 3** — two runtime dependencies and an icon-vendoring
    surface enter a phase specced as "chrome, layout, and tokens only."

### Resolved at plan time (2026-08-06, owner-decided)

- **D-30: A theme toggle pinned in the HUD rail footer sets `.dark`.** This closes D-08's open
  sub-question. A small sun/moon control sits in the rail footer alongside the Export button;
  per D-05 Export keeps the rail's single Apple Blue fill, so the toggle is a **neutral** icon
  control and never carries the accent. Constraints:
  - The chosen theme persists through the **storage-adapter interface** (the same seam as
    D-18's last-open tool), never raw `localStorage`, and respects the bounded V2 record
    contract.
  - **No `prefers-color-scheme` read anywhere** — not even to seed a first-run default. The
    standalone app defaults to light. This keeps the host story clean: a future host controls
    `.dark` on the mount root and there is no OS listener to fight it.
  - The class is written to the **editor mount root**, never unconditionally to
    `document.documentElement` (existing transition-readiness constraint).
  - *Gate:* an assertion that goes RED if a `prefers-color-scheme` media query reappears in the
    dark-mode path, and a Playwright slice proving both palettes render from the same tokens.

- **D-31: `fe5f946` is git-tagged before any Phase 3 commit lands.** The first task of `03-01`
  creates an annotated tag (e.g. `acceptance-02-28`) on
  `fe5f946060707c48c3d9591d368b5f3f8f90dd4d` so the owner can check out the exact pre-restyle
  build the `02-28` acceptance matrix describes. Phase 3 then proceeds in parallel with the open
  gate. The matrix itself is **not** modified, its SHA binding is unchanged, and no cell may be
  filled from a restyled build. This is a safeguard on evidence, not a resolution of the gate —
  `02-28` remains OPEN until the owner physically performs it.

### Resolved after research (2026-08-06, owner-decided)

These three answer open questions raised by `03-RESEARCH.md`. Each finding below was
independently re-verified against the tree before the decision was taken.

- **D-32: full-bleed map *surface*, centred 1:1 export frame.** Resolves OQ-2. The map surface
  fills the viewport edge to edge and pans/zooms in the Google-Maps idiom (D-11 stands — no top
  chrome), but a visible square export frame sits centred on it marking exactly what lands in
  the PNG. WYSIWYG is preserved: what is inside the frame is what exports. The SVG `viewBox`
  stays fixed at `0 0 1080 1080` and `preserveAspectRatio="xMidYMid meet"` is unchanged
  (`export.ts:16-17`), so the 1080×1080 contract is untouched. The frame is chrome and carries
  `data-editor-only="true"` so it never enters the export clone.
  - *Verified:* `useCameraController.ts:310-313` pins d3-zoom's `extent` to `[[0,0],[1080,1080]]`
    rather than the element rect, and `MapCanvas.tsx:839-840` fixes the `viewBox` — so a rail/panel
    reflow (D-19) cannot disturb the projection, the camera lease, or the export. **No
    `ResizeObserver` is required.**

- **D-33: the `03-10` gate runs Chrome-only and says so plainly.** Microsoft Edge is **not
  installed** on this machine (`/Applications` holds no `Microsoft*.app`;
  `~/Library/Caches/ms-playwright` holds only `ffmpeg-1011`), so `npm run test:e2e`'s `msedge`
  project cannot launch. Per the browser-certification guardrail, `03-10`'s evidence must state
  **"Edge not certified — not installed"** rather than omit it or infer a pass.
  - ⚠ **This contradicts `STATE.md`, which records "Edge 150 — 71/71" at `fe5f946`.** That record
    is **Phase 2 evidence and is immutable** — it must be *annotated*, never rewritten. Resolving
    how an Edge result was recorded on a machine with no Edge is **out of Phase 3 scope** and is
    filed as a pending todo against Phase 2's evidence, not as Phase 3 work. Phase 3 must not
    cite the Edge record and must not repeat it.

- **D-34: Phase 3 owns the SVG→PNG export path; `html2canvas` is removed.** The entire
  composition — camera layer *and* legend layer — is a **single SVG** (`export.ts:21-22`
  `[data-layer="camera"]` / `[data-layer="legend"]`), and `html2canvas@1.4.1` never descends into
  an `<svg>`: it serialises the element with `XMLSerializer` into a `data:image/svg+xml` URL and
  rasterises it as an `<img>`. An SVG rendered as an image is an isolated document that sees none
  of the host page's `@font-face` rules — which is why `LegendOverlay.tsx:167` names Inter while
  `grep '@font-face' src/ public/ index.html` returns **zero hits**: the legend already exports in
  a system fallback today. The dependency is therefore ~200KB doing a job we can do directly, in
  the one way that also fixes the font.
  - **Replacement:** serialise the frozen clone → embed the required fonts inline as base64
    `@font-face` inside the SVG's `<defs><style>` → `Image` → `drawImage` onto a 1080×1080 canvas
    → `toBlob`. An inline data-URI font is **not** an external fetch, which is why it resolves
    inside SVG-as-image. **The exported PNG does not grow** — it is raster; the font bytes exist
    only in a throwaway in-memory SVG string.
  - **D-34a — build the font-embedding seam generalised, use it only for Inter.** The step is
    "collect the fonts this composition uses → embed each inline", not a hard-coded Inter branch,
    so Phase 4's custom text tools plug in without re-opening the export chokepoint. Only Inter is
    in play in Phase 3.
  - **Non-negotiables carried verbatim:** the 1080×1080 size contract; the clone contract; every
    existing refusal reason (disconnected / multi-SVG / sibling-legend); `sanitizeExportClone`'s
    strip list; `data-editor-only` exclusion; placement decides export membership.
  - **This makes D-25 feasible by construction rather than by luck — but it is still not
    proven.** OQ-1 survives in amended form and stays **blocking**: a throwaway Playwright spike
    must confirm that an inline base64 `@font-face` actually renders inside SVG-as-image in
    installed Chrome, **before** legend typography is locked. Prove it RED by removing the
    embedded font and watching the assertion fail.
  - ⚠ **`export.ts` is the most safety-critical file in the repo.** This is the largest single
    risk in Phase 3. It earns the independent non-author review of `03-10` on its own, and the
    export e2e slice must be RED-proven against the new path, not merely observed green.
  - — **Reversibility:** one-way once export baselines are re-cut.

- **D-35: the dark-mode switch silently disarms an existing gate — it must be re-armed.**
  `tests/e2e/responsive.spec.ts:1025,1048` ("the PNG is identical across theme, forced colors, and
  DPR") flips theme with `page.emulateMedia({ colorScheme })`. Once D-08/D-30 move the flip to a
  `.dark` class, that emulation changes nothing, both exports become trivially identical, and
  **Live Invariant 9 loses its only browser-level guard** — this repo's fourth "gate that cannot
  fail." The rewritten assertion must toggle the `.dark` class and be **RED-proven** by making the
  export theme-sensitive on purpose.

### Roadmap Amendments

`/gsd:plan-phase 3` **must** land these as explicit `ROADMAP.md` edits in the same commit
series, not leave them as undocumented divergence:

| # | Amendment | Roadmap text it changes |
|---|---|---|
| 1 | Dark mode is **in** scope, class-based (D-08) | "Out of scope (Phase 3): … dark mode" |
| 2 | HUD is an **icon rail + flyout**, not a collapsible column (D-16) | `03-02` "left HUD column (collapsible sections, one scroll container)" |
| 3 | Two runtime deps + vendored icons enter the phase (D-27, D-28); legend restyle changes exported pixels (D-25) | "this is chrome, layout, and tokens only" / "Nothing about map *content* rendering changes in this phase" |
| 4 | **`html2canvas` is removed and Phase 3 owns the SVG→PNG export path**, with a generalised inline-font-embedding seam (D-34, D-34a) | Phase 3 § Plans has no export-pipeline plan at all; `03-06` covers only "export migration" into the HUD. A new plan is required, and § Out of scope must no longer read as though `src/utils/export.ts` internals are untouched. |

### Claude's Discretion

- Exact per-surface application of the Themely recipes to CountriesIRL-specific chrome that
  Themely has no analog for: colour swatch grid, legend editor rows, the map's own
  `--map-*` tokens, saved-map row anatomy. Specify in `Design.md` (`03-01`) following the
  nearest Themely recipe, and surface it for review there.
- Whether `--map-fixed-text` and the map's own surfaces re-tone onto Themely tokens or stay
  fixed — bearing in mind D-25's export consequence applies to anything inside the composition.
- Icon selection per tool (subject to D-28's vendoring rules).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design system (upstream — user-directed, highest priority)

- `/Users/matul/claudeprojects/themely/Design.md` — **the** design contract this phase adopts.
  Absolute path: it lives in a **sibling repo**, not in CountriesIRL. Read §Tokens — Colors,
  §Tokens — Colors (Dark Mode), §Tokens — Typography, §Tokens — Spacing & Shapes,
  §Tokens — Motion, §Components, §Do's and Don'ts, §Surfaces, §Elevation, §Layout.
- `/Users/matul/claudeprojects/themely/src/app/globals.css` — Themely's **runtime** token
  source of truth; `Design.md` is a reference snapshot of it. When the two disagree, `globals.css`
  is authoritative upstream.
- `/Users/matul/claudeprojects/themely/src/lib/motion/tokens.ts` — the TS motion mirror to
  replicate (D-26), and `src/lib/motion/__tests__/tokens.test.ts` for the lockstep test shape.
- `/Users/matul/claudeprojects/themely/.planning/coding-rules/frontend.md`
  §Vendored lucide-animated Icons — the full vendoring contract for D-28.
- `/Users/matul/claudeprojects/themely/src/components/app-sidebar.tsx` —
  `PrimaryNavRow` / `DisabledNavRow`, the reference implementation of the rail row recipe.

### CountriesIRL — binding rules (read before any code)

- `.planning/coding-rules/general.md` — **read first.** Canonical home of §Live Invariants and
  §Immutable Safety Constraints, plus git/planning-file safety.
- `.planning/coding-rules/frontend.md` — React / D3 / CSS / composition-root rules.
- `.planning/coding-rules/export.md` — PNG clone contract, sanitization, refusal reasons.
  **Load-bearing for D-25.**
- `.planning/coding-rules/storage.md` — bounded V2 records. Load-bearing for D-18.
- `.planning/coding-rules/data.md` — catalog and approval chain. Load-bearing for D-14.
- `CLAUDE.md` — routing table, guardrails, model routing.

### CountriesIRL — phase scope and status

- `.planning/ROADMAP.md` §Phase 3 — the plan breakdown `03-01`…`03-10` and its gates.
  **Amend per §Roadmap Amendments above.**
- `.planning/ROADMAP.md` §Progress — canonical for status and counts.
- `.planning/STATE.md` — live position; the two open owner gates.
- `.planning/phases/02-region-variants-advanced-features-1-5-2-weeks/.continue-here.md` —
  session resumption and working-tree hazards.
- `.planning/phases/02-region-variants-advanced-features-1-5-2-weeks/02-28-ACCEPTANCE-MATRIX.md`
  — binds `fe5f946`; **must be performed against that commit, not a restyled HEAD** (D-25).
- `.planning/phases/02-region-variants-advanced-features-1-5-2-weeks/02-24-UISPEC-GAPS.md` —
  known UI-spec gaps carried out of Phase 2.

### Code the phase rewrites

- `src/styles/theme.css` (349 lines) — the token file being replaced.
- `src/styles/phase2CssContract.test.ts` — the machine-enforced CSS contract being rewritten
  (roadmap suggests successor name `uiContract.test.ts`).
- `src/styles/Controls.css` (1128 lines) — split per-surface in `03-09`.
- `src/components/MapWorkspace.tsx` — typed `legendSlot` / `navigationSlot`; preserve verbatim.
- `src/components/CompositionBar.tsx` — dissolves (D-11); owns the `role="status"` region
  that needs rehoming (D-15).
- `src/utils/export.ts` — the export chokepoint; D-25's font hazard lands here.
- `tests/e2e/support/appHarness.ts` — shared browser fixtures. **Import these, never
  re-declare.**

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`Controls` single-component `variant` rule** (`app-bar` | `strip`): a **HUD/rail variant is
  added, never a copy**. This is an existing invariant, not a new decision.
- **`--target-compact: 44px`** already exists and carries the touch-target size for D-20.
- **`--easing-camera` and `--motion-fast`** already equal Themely's `EASE_OUT` and
  `DURATION_FAST` — reconcile onto the token set rather than duplicating (D-26).
- **`data-editor-only="true"`** is the established marker for chrome excluded from the export
  clone. The rail, panel, floating map controls, and tooltip all need it.
- **`tests/e2e/support/appHarness.ts`** — shared camera/browser fixtures.
- **`resolveLegendPosition` / `resolveLegendRender`** in `src/utils/legend.ts` — nothing reads
  `legend.position` raw; keep it that way.

### Established Patterns

- **Vitest runs in the `node` environment with no DOM.** Component behaviour is proven in
  Playwright, not Vitest. A motion-token lockstep test (pure constants) fits Vitest; animated
  icon behaviour does not.
- **Single roving-tabindex writer**, restored in the join layout effect (commit `074173e`).
  The rail must not introduce a second writer. Keyboard reachability and focus movement into
  the opened panel are covered by this existing invariant — the user did not select it as a
  new decision because it is already binding, not because it may be dropped.
- **A gate must be able to fail on the bug it covers.** Every rewritten contract assertion is
  broken once and observed RED before landing. This repo has already shipped three tests that
  could not fail.
- **Independent non-author review of the aggregate diff** is mandatory (`03-10`); executor
  self-reported checkpoints have proven unreliable — five real defects found post-"resolved."
- **Never `git checkout --` a file with uncommitted work.** Copy to the scratchpad first.
- **Never run `state.advance-plan`, `state.update-progress`, or `roadmap.update-plan-progress`.**
  Edit `STATE.md` / `ROADMAP.md` by hand.

### Integration Points

- **Transition-readiness (binding on every plan):** canvas + rail assemble into **one mountable
  editor component behind an explicit props boundary**; it never assumes it owns
  `document`/`window` chrome beyond its mount point; persistence goes through a
  **storage-adapter interface**; the data asset base path is a **parameter**, not a scattered
  literal; tokens are namespaced (D-03 discharges this). `/gsd:plan-phase 3` turns each into a
  RED-provable gate — e.g. a grep gate on hard-coded `/data/` literals outside the config home.
  **Embedding itself remains out of scope and needs new explicit authorization.**
- **`.dark` on the mount root** (D-08) is a second host-controlled seam alongside the props
  boundary — it must not be attached to `document.documentElement` unconditionally.
- **Export membership is decided by placement** in `MapWorkspace`'s typed slots. Moving tools
  into the rail must not move anything *into* or *out of* the exported composition, with the
  single deliberate exception of D-25's legend typography.

</code_context>

<specifics>
## Specific Ideas

- *"Please take the design.md document and tokens from themely repository"* — the anchoring
  instruction for this entire phase. Themely is the sibling project the editor is intended to
  be embedded into in ~1–2 months.
- *"adopt themely's icon animation style as well and the motion tools it uses to have good
  fluidity"* — the request that pulled `motion` v12, the vendored lucide-animated icons, and
  the motion-token lockstep into scope (D-26 → D-29).
- The target feel is Themely's own words: *"Glassy Apple-blue on cool platinum … Apple's
  restraint and Linear's information density: predominantly white surfaces, subtle hairline
  borders, soft shadows, rounded corners that feel friendly without being playful."*
- The map canvas is the Google-Maps idiom: full-bleed, pannable, floating controls bottom-right.

</specifics>

<deferred>
## Deferred Ideas

- **Warm "paper" cast on the map's own surfaces** (`--map-surface`, `--map-fill-default`) so
  landmasses read as printed paper against cool chrome. Raised, then set aside because it
  touches map rendering. → **Phase 4 (Visual & Cartographic System)**, and note D-25 means any
  such change alters exported pixels.
- ~~**A user-facing dark-mode toggle.**~~ **RESOLVED 2026-08-06 — see D-30.** A rail-footer
  toggle ships in Phase 3, persisted through the storage adapter, with no `prefers-color-scheme`
  read anywhere.
- **Scale bar on the map.** Considered and rejected for Phase 3 — misleading on a Mercator
  world map, and it is cartography (Phase 4) rather than chrome.
- **Actually embedding the editor in Themely.** Explicitly outside v1.1; needs new owner
  authorization (ROADMAP §Beyond v1.1).

</deferred>

---

*Phase: 3-Clean UI Overhaul*
*Context gathered: 2026-08-06*
