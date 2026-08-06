# Phase 3: Clean UI Overhaul - Research

**Researched:** 2026-08-06
**Domain:** Design-system adoption (cross-repo), CSS token replacement, icon-rail/flyout layout, self-hosted variable font inside an `html2canvas` export clone, class-based dark mode, embed-readiness seams
**Confidence:** HIGH on the in-repo mechanics (everything is read from source this session); **MEDIUM–LOW on the single highest-risk item** — whether a data-URI `@font-face` actually resolves inside an SVG-as-image in Chrome/Edge (§Open Question OQ-1). That one needs a spike before D-25 is planned in detail.

<user_constraints>
## User Constraints (from CONTEXT.md)

> Copied verbatim from `.planning/phases/03-clean-ui-overhaul-1-1-5-weeks/03-CONTEXT.md`.
> **The planner must honour every line. None of these is re-litigated in this document.**

### Locked Decisions

#### Design system source

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

#### Palette

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

#### Dark mode

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

#### Typography

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

#### Layout — the app bar dissolves

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

#### The tool HUD — icon rail + flyout

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

#### Narrow width

- **D-20:** Below the existing narrow breakpoint the **rail becomes a bottom bar** (icons
  thumb-reachable) and a tapped tool raises a **bottom sheet** over the map. `--target-compact`
  (44px) already carries the touch-target size. 360px containment and the 200%-equivalent
  check still apply, and `prefers-reduced-motion` / `prefers-reduced-transparency` behaviour is
  re-verified in the new chrome.

#### Map chrome

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

#### Legend typography enters the exported PNG

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

#### Motion and icons

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

#### Resolved at plan time (2026-08-06, owner-decided)

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

#### Roadmap Amendments

`/gsd:plan-phase 3` **must** land these as explicit `ROADMAP.md` edits in the same commit
series, not leave them as undocumented divergence:

| # | Amendment | Roadmap text it changes |
|---|---|---|
| 1 | Dark mode is **in** scope, class-based (D-08) | "Out of scope (Phase 3): … dark mode" |
| 2 | HUD is an **icon rail + flyout**, not a collapsible column (D-16) | `03-02` "left HUD column (collapsible sections, one scroll container)" |
| 3 | Two runtime deps + vendored icons enter the phase (D-27, D-28); legend restyle changes exported pixels (D-25) | "this is chrome, layout, and tokens only" / "Nothing about map *content* rendering changes in this phase" |

### Claude's Discretion

- Exact per-surface application of the Themely recipes to CountriesIRL-specific chrome that
  Themely has no analog for: colour swatch grid, legend editor rows, the map's own
  `--map-*` tokens, saved-map row anatomy. Specify in `Design.md` (`03-01`) following the
  nearest Themely recipe, and surface it for review there.
- Whether `--map-fixed-text` and the map's own surfaces re-tone onto Themely tokens or stay
  fixed — bearing in mind D-25's export consequence applies to anything inside the composition.
- Icon selection per tool (subject to D-28's vendoring rules).

### Deferred Ideas (OUT OF SCOPE)

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
</user_constraints>

## Project Constraints (from CLAUDE.md and coding-rules/)

Directives extracted this session. Each is as binding on the plan as a locked decision.

| # | Directive | Source |
|---|---|---|
| C-1 | **No runtime third-party network request.** "Map data is bundled same-origin under `public/data/` and integrity-checked. A request to another origin at runtime is a defect, not an optimization." | `coding-rules/general.md:240-242` |
| C-2 | **No backend, no deployment, no env secrets.** Browser-only, localhost-only. | `coding-rules/general.md:234-238`, Immutable Safety Constraint 7 |
| C-3 | **A gate must be able to fail on the bug it covers.** Break its subject, watch it go RED, restore by copying from a scratchpad — never `git checkout --`. | `coding-rules/general.md:59-60, 199-215, 380-396` |
| C-4 | **Vitest runs on the `node` environment, no DOM.** Component behaviour is proven in Playwright. | `vitest.config.ts:8` (`environment: 'node'`), `coding-rules/general.md:189-197` |
| C-5 | **Strict TypeScript, no `any`, return types on every function, discriminated unions over boolean flags.** | `coding-rules/general.md:64-100` |
| C-6 | **No magic numbers, no hardcoded strings, no `console.log`, no empty catch, no gradients** (the last enforced by the CSS contract test). | `coding-rules/general.md:244-269`, `phase2CssContract.test.ts:1029-1038` |
| C-7 | **`alert()` is not the reporting channel.** Everything creator-facing goes through `ToastRegion`'s allowlist. **No message may say "Refresh the page."** | `coding-rules/general.md:307-318` |
| C-8 | **Never run `state.advance-plan`, `state.update-progress`, `roadmap.update-plan-progress`.** Edit `STATE.md`/`ROADMAP.md` by hand. | `coding-rules/general.md:401-413` |
| C-9 | **Firefox / Safari / previous-version certification has never run here and must never be reported as passed.** Acceptance is scoped to installed Chrome + Edge. | `coding-rules/general.md:56-58, 447-452` |
| C-10 | **Approval is evidence, never inference.** A deferred snapshot may never read as delivered; the six historical region IDs are never merged. | `coding-rules/general.md:41-49` |
| C-11 | **Independent non-author review of the aggregate diff is mandatory** (`03-10`). Executor self-reported checkpoints are not trusted. | `CLAUDE.md` §Guardrails, `STATE.md:76-78` |
| C-12 | **Update the matching `coding-rules/*.md` in the same commit that lands the behaviour**, and keep only the two most recent "Last updated" entries per file. | `CLAUDE.md` §Update Process |
| C-13 | **`Controls` keeps one component with a declared `variant`** — a HUD variant is *added*, never a copy. | `CLAUDE.md` §Stack, `src/components/Controls.tsx:21,37,77,120` |
| C-14 | Live Invariants 1–9 (selection/scene, colors-only history, `resolveLegendPosition`, one `MapCanvasHandle`, unfiltered 195-core catalog, catalog-driven period selector, strip-semantics-never-geometry, single 0–100 legend opacity scale, `--map-*` declared once in `:root`). | `coding-rules/general.md:21-31` |

**Live Invariant 9 is the one Phase 3 is most likely to break by accident:** *"`--map-*` are export tokens, declared exactly once in `:root`. No media, `@supports`, or nested block may redefine one, or the exported PNG starts following the viewer's theme."* A `.dark { … }` block that re-tones a `--map-*` token is exactly that defect wearing D-08's hat. See §Pitfall P-2.

## Summary

Phase 3 is a **CSS-and-composition-root refactor with two genuinely new runtime surfaces** (a
self-hosted variable font and an animation library), landing inside a codebase whose export
path is protected by an unusually strict, machine-enforced contract. Almost everything in it
is mechanical: the token file is 349 lines, the retired-token reference set is small and fully
enumerated below (§Current-State Inventory), the storage-adapter seam already exists
(`src/utils/storage.ts:71-88`), and the map's camera and projection are pinned to a fixed
1080-unit canvas space (`useCameraController.ts:310-313`, `MapCanvas.tsx:839-840`), so a rail
that reserves layout space **cannot** disturb the camera, the projection, or the export.

Three things are not mechanical, and they are where the plan earns its keep.

**First, D-25's font hazard is worse than the CONTEXT wording implies, and it is structural.**
Reading the shipped `html2canvas@1.4.1` source confirms it does not traverse into an `<svg>` at
all: it serialises the entire `svg.map-canvas` subtree with `XMLSerializer` into a
`data:image/svg+xml,…` URL and rasterises it as an `<img>`
(`node_modules/html2canvas/dist/html2canvas.js:4554-4568, 4756, 4772-4773, 4820`). An SVG loaded
as an image is a sandboxed replaced element: it sees none of the host document's stylesheets and
therefore none of its `@font-face` rules. `foreignObjectRendering` is left at its default `false`
(`:7743`), so there is no alternate path. The consequence is that **the app's *existing* legend
already exports in a system fallback font** — `LegendOverlay.tsx:167` names `Inter` but nothing
in this repo ever loads Inter (`grep '@font-face'` across `src/`, `public/`, `index.html`
returns zero hits; `theme.css:240` names Inter in the body stack with no `@font-face` behind
it). Self-hosting Inter for the chrome will therefore make the on-screen editor and the exported
PNG *diverge*, not converge, unless the font is also embedded **as a base64 `@font-face` inside a
`<style>` element within the cloned SVG**. `sanitizeExportClone` will not strip such a `<style>`
(`export.ts:26` removes only `title,desc,metadata`), so the mechanism is available — but whether
Chrome honours a data-URI font inside an SVG-as-image is a browser-behaviour question this
research could not settle from source. **It needs a real-browser spike before `03-01` locks the
legend typography** (§OQ-1).

**Second, the dark-mode mechanism change silently disarms an existing gate.**
`tests/e2e/responsive.spec.ts:1015-1052` — "the PNG is identical across theme, forced colors,
and device pixel ratio" — flips theme via `page.emulateMedia({ colorScheme })`. Once D-08 moves
the flip from `@media (prefers-color-scheme: dark)` to a `.dark` class, that emulation changes
nothing, both exports are trivially identical, and the test passes while proving nothing. It is
the repo's fourth "gate that cannot fail" waiting to happen, and it guards Live Invariant 9.
Rewriting it to toggle `.dark` on the mount root is a required task, not a nice-to-have.

**Third, the "full-bleed canvas" of D-11 is not free.** The on-screen SVG is
`viewBox="0 0 1080 1080" preserveAspectRatio="xMidYMid meet"` (`MapCanvas.tsx:839-840`), and the
export clone re-asserts the same square (`export.ts:277-278`). In a non-square full-bleed
container, `meet` letterboxes the composition — so "edge to edge" means an edge-to-edge
*surface* with a centred square composition, not an edge-to-edge *map*. Any attempt to make the
map itself fill a wide viewport breaks WYSIWYG against the 1080 square. CONTEXT.md does not
decide this; the planner must (§OQ-2).

**Primary recommendation:** sequence the phase as *(0) tag `fe5f946` → (1) prove the
data-URI-font-in-SVG-image technique in real Chrome and Edge as a throwaway spike → (2) Design.md
+ tokens + motion lockstep → (3) rail/panel shell → (4) tool migration → (5) legend typography
last, behind the now-proven font gate*. Put the legend restyle **after** everything else, because
it is the only task that changes exported pixels and it is the only one whose feasibility is
still open.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Design tokens, type scale, motion vars | Browser / Client (CSS `:root` + `.dark`) | — | No build-time theming layer exists; `theme.css` is loaded by `main.tsx:11-14` and is the only token source |
| Dark-mode flip | Browser / Client (class on editor mount root) | — | D-08/D-30: a class a future host can control; never an OS listener |
| Icon rail + flyout panel layout | Browser / Client (CSS grid on the editor root) | — | Pure layout; the panel reserves space via a grid track, not an overlay |
| Icon glyph animation | Browser / Client (`motion` v12 + imperative handle) | — | D-28/D-29; row-hover-triggered, reduced-motion-gated |
| Map projection + camera | Browser / Client (D3 in fixed 1080-unit space) | — | `useCameraController.ts:310-313` pins zoom `extent` to `[[0,0],[1080,1080]]` — resolution-independent |
| Live-region announcements | Browser / Client (`role="status"` in the composition root) | — | D-15; `App.tsx` already owns one such region at `:1052-1060` |
| Last-open tool + theme persistence | Database / Storage (`StorageAdapter`) | Browser / Client (`window.localStorage` impl) | D-18/D-30 require the seam, and `storage.ts:71-88` already declares it |
| Inter font bytes (chrome) | CDN / Static (Vite-emitted same-origin asset) | — | C-1 forbids a CDN origin; Vite emits a hashed same-origin file |
| Inter font bytes (export clone) | Browser / Client (base64 inlined into the JS bundle) | — | The clone is a data-URL SVG image; only inlined bytes can reach it |
| PNG rasterisation | Browser / Client (`html2canvas` on a detached frame) | — | `export.ts:368-375`; unchanged by this phase |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `motion` | `12.43.0` (latest 12.x) | Panel/sheet transitions and the vendored animated-icon `useAnimation` controller | D-27 locks it. Themely runs `motion 12.40.0` and its vendored icons import `{ motion, useAnimation }` and `type { Variants }` from `motion/react` (`themely/src/components/ui/square-pen.tsx:3-4`). `motion/react` is a straight re-export of `framer-motion` (`themely/node_modules/motion/dist/es/react.mjs:1` — `export * from 'framer-motion';`). [VERIFIED: npm registry + sibling-repo source] |
| Inter Variable (woff2, latin subset) | n/a — a font file, not a package | The one UI typeface (D-09) and the legend's exported typeface (D-25) | Themely's declared primary typeface; `Design.md:85-95`. Must be self-hosted: C-1 forbids the Google Fonts `@import` that Themely's `globals.css:1` uses. |

**React compatibility is confirmed, not assumed.** `motion@12` declares
`"react": "^18.0.0 || ^19.0.0"` and `"react-dom": "^18.0.0 || ^19.0.0"`
[VERIFIED: `npm view motion@12.40.0 peerDependencies`]. This repo is on `react 18.3.1`
(`package.json` dependencies), Themely is on `react 19.2.3` — the port is safe in that direction.

**Do not take `motion@latest`.** Latest is `13.0.0`, published `2026-08-05`
[VERIFIED: `npm view motion version time.modified`]. D-27 says v12; v13 is one day old at the
time of this research and its React peer range was not checked. Pin `12.43.0`.

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@fontsource-variable/inter` | `5.3.0` | Ships pre-subset Inter Variable woff2 files (including a latin-only cut) so no local subsetting toolchain is needed | Only if the plan prefers an npm-managed font over a hand-vendored `src/assets/inter-latin.woff2`. **See the caution below.** |

**Recommendation: hand-vendor the woff2 rather than add the package.** Reasons, in order of
weight: (1) the repo already has a first-class pattern for a bundled, hash-verified,
same-origin asset — `public/data/world-manifest.json` plus `npm run data:world:check`
(`package.json` scripts) — and a font is the same shape of problem; (2) a vendored file makes
the *exact bytes* reviewable and pinnable, which matters because those bytes end up inside every
exported PNG; (3) it avoids a dependency whose only job is to copy a file. If the plan does take
the package, treat the file path inside it as `[ASSUMED]` until an executor lists the installed
`files/` directory — I did not install it and cannot name the woff2 filename from evidence.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Base64 `@font-face` inside the cloned SVG | Convert legend labels to `<path>` outlines at export time | Bulletproof against any font-resolution issue and immune to browser differences — but needs a glyph-outline library (adds a dependency far heavier than `motion`) and breaks the "strip semantics, never geometry" simplicity of `sanitizeExportClone`. Keep as the fallback only if OQ-1 comes back negative. |
| Base64 `@font-face` inside the cloned SVG | Accept the system fallback for exported legend text; apply Inter to chrome only | Zero risk, zero new export machinery — and it is the *status quo*, since the legend already exports in a fallback font. Costs D-25. This is the honest descope option if OQ-1 fails; it needs an owner decision, not an executor's. |
| `motion` v12 | Pure CSS transitions + `@keyframes` | Removes a runtime dependency, and the panel slide is trivially expressible in CSS. But D-28's vendored icons *are* `motion` components — porting them to CSS means re-authoring every glyph animation, which is exactly what D-27 flags as the costly reversal. Not a real option while D-28 stands. |
| `@fontsource-variable/inter` | `pyftsubset` / `glyphhanger` local subsetting | Smaller file, but neither tool is installed and `fontTools` is absent from the system Python (§Environment Availability). Adding a Python build step to a Node-only repo is disproportionate. |

**Installation:**

```bash
npm install motion@12.43.0
# Font: vendor the woff2 by hand into src/assets/ — no package install.
# (If the plan instead chooses the package: npm install @fontsource-variable/inter@5.3.0)
```

## Package Legitimacy Audit

Run via `gsd-tools query package-legitimacy check --ecosystem npm motion @fontsource-variable/inter`
on 2026-08-06.

| Package | Registry | Age signal | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----------|-----------|-------------|---------|-------------|
| `motion` | npm | last publish `2026-08-05` (v13.0.0) | 17,553,114 / wk | `github.com/motiondivision/motion` | **SUS** (`too-new`) | **Keep, pinned to `12.43.0`.** See analysis below. |
| `@fontsource-variable/inter` | npm | last publish `2026-07-19` | 2,857,793 / wk | `github.com/fontsource/font-files` | **SUS** (`too-new`) | **Optional — not recommended** (hand-vendor instead). If used, planner adds `checkpoint:human-verify`. |

**Reading the SUS verdicts honestly.** In both cases the sole reason returned was `too-new`,
and in both cases the signal is derived from the **most recent publish date**, not from the
package's age. `motion` at 17.5M weekly downloads with a matching source repo, and
`@fontsource-variable/inter` at 2.9M, are not plausibly slopsquats; the flag is a false positive
caused by an active release cadence. Neither declares a `postinstall`
[VERIFIED: `npm view motion scripts.postinstall` and the seam's `postinstall: null` signal].

**That does not make the flag free.** The planner must still:
- Pin exact versions (`motion@12.43.0`), never a caret range, so a fresh `npm install` cannot
  silently pull `13.x`.
- Insert one `checkpoint:human-verify` before the `motion` install, per the SUS protocol.
- Record `motion`'s provenance as **the sibling repo's own dependency**, not a web search:
  `themely/package.json` declares `"motion": "^12.40.0"` and `themely/node_modules/motion` is at
  `12.40.0` — the vendored icon files this phase copies import from it directly. That is the
  strongest legitimacy signal available here.

**Packages removed due to SLOP verdict:** none.
**Packages flagged SUS:** `motion`, `@fontsource-variable/inter` — both `too-new` only; see above.

## Architecture Patterns

### System Architecture Diagram — the export path, which is what this phase must not break

```
                      ┌─────────────────────────────────────────┐
  creator input  ───► │  Editor mount root  (className: .dark?) │
  (pointer/kbd)       │  ── owns the ONE storage adapter        │
                      │  ── owns the ONE camera handle          │
                      └──────────────┬──────────────────────────┘
                                     │
              ┌──────────────────────┼──────────────────────────┐
              ▼                      ▼                          ▼
   ┌────────────────────┐  ┌──────────────────────┐  ┌────────────────────┐
   │ Icon rail (56px)   │  │  Canvas region       │  │ ToastRegion        │
   │ + flyout (280px)   │  │  (grid track 1fr)    │  │ (allowlist gate)   │
   │ data-editor-only   │  │                      │  └────────────────────┘
   └─────────┬──────────┘  │  div.map-export-source
             │             │   └ svg.map-canvas          ◄── THE EXPORT SOURCE
   opens ONE panel        │      viewBox 0 0 1080 1080
   (D-17); reserves       │      ├ g[data-layer=camera]  ── transform=zoom/pan
   layout space, does     │      │  ├ g[outgoing-scenes] ── stripped in clone
   NOT overlay (D-19)     │      │  └ g[countries]       ── 248 × 3 wrapped paths
             │             │      └ g[data-layer=legend] ── MUST stay INSIDE the svg
             │             │         └ <text font-family="Inter …">  ◄── D-25 lands here
             │             │  floating zoom/reset cluster (D-21, data-editor-only)
             │             └──────────────────────┘
             │                        │
             │                        ▼  export transaction: freeze camera → lease
             │             ┌──────────────────────────────────────────────┐
             │             │ exportMapPng(source)                         │
             │             │  1. refuse if ≠1 svg / legend outside svg    │
             │             │  2. cloneNode(true)  ── deep copy            │
             │             │  3. sanitizeExportClone                      │
             │             │       strips: outgoing scenes, [data-editor- │
             │             │       only], title/desc/metadata, aria-*,    │
             │             │       role/tabindex/id (reference-aware)     │
             │             │       KEEPS: <style>, geometry, transforms   │◄── font @font-face
             │             │  4. append to offscreen 540px frame          │    must be injected
             │             │  5. html2canvas(frame, scale 2)              │    HERE
             │             └──────────────────┬───────────────────────────┘
             │                                ▼
             │             ┌──────────────────────────────────────────────┐
             │             │ html2canvas DocumentCloner                   │
             │             │  · does NOT descend into <svg>  (:4756)      │
             │             │  · XMLSerializer → "data:image/svg+xml,…"    │
             │             │  · rasterises it as an <img>     (:4562)     │
             │             │  ⇒ SANDBOX: no host stylesheets, no host     │
             │             │     @font-face, no external requests         │
             │             └──────────────────┬───────────────────────────┘
             │                                ▼
             └───────────────────────►  canvas 1080×1080 → toBlob → <a download>
```

The single most important arrow in this diagram is the sandbox boundary at the
`data:image/svg+xml` step. Everything D-25 needs must be *inside* the serialised subtree.

### Recommended Project Structure

```
src/
├── assets/
│   └── inter-latin-variable.woff2   # vendored bytes; the ONLY font file
├── components/
│   ├── editor/                      # NEW — the mountable editor boundary
│   │   ├── MapEditor.tsx            # the one component a host mounts (props boundary)
│   │   ├── ToolRail.tsx             # 56px icon strip; owns roving tabindex? NO — see below
│   │   ├── ToolPanel.tsx            # the single 280px flyout
│   │   └── ToolRailRow.tsx          # PrimaryNavRow analogue; owns iconRef + hover handlers
│   ├── icons/                       # NEW — vendored lucide-animated ports (D-28)
│   │   └── <name>.tsx               # forwardRef + <Name>IconHandle + strokeWidth marker
│   └── …                            # existing components, restyled not rewritten
├── config/
│   └── editorConfig.ts              # NEW — the data asset base path lives here, once
├── lib/motion/
│   ├── tokens.ts                    # NEW — TS mirror of the --motion-* CSS vars
│   └── tokens.test.ts               # NEW — lockstep pin (node env, pure constants)
├── styles/
│   ├── theme.css                    # rewritten: --themely-* :root + .dark
│   ├── editor.css                   # NEW — rail/panel/HUD shell (replaces app-bar rules)
│   ├── MapCanvas.css                # map surfaces + floating controls
│   ├── controls/                    # 03-09 split of the 1128-line Controls.css
│   │   ├── colorPicker.css
│   │   ├── countryList.css
│   │   ├── legendEditor.css
│   │   ├── locateCountry.css
│   │   ├── saveLoad.css
│   │   └── selectionPanel.css
│   ├── uiContract.test.ts           # successor to phase2CssContract.test.ts
│   └── interFontFace.ts             # NEW — base64 @font-face string for the export clone
└── utils/
    └── export.ts                    # + injectExportFontFace(clonedSvg)
```

---

### Pattern 1 — Making Inter reach the export clone (D-25, the highest-risk item)

**What.** Two independent font deliveries: one for the on-screen chrome (a normal same-origin
`@font-face` with `url()`), one for the export clone (a base64 `@font-face` injected into a
`<style>` *inside* the cloned SVG). They are not interchangeable and neither substitutes for
the other.

**Why two.** The chrome lives in the host document, where a same-origin `url()` is the correct,
cacheable, `font-display`-controllable form. The clone lives inside a `data:image/svg+xml` image,
which cannot see the host document's stylesheets and cannot issue any request — including a
same-origin one. [VERIFIED: `node_modules/html2canvas/dist/html2canvas.js:4554-4568`, verbatim:

```js
    var SVGElementContainer = /** @class */ (function (_super) {
        __extends(SVGElementContainer, _super);
        function SVGElementContainer(context, img) {
            var _this = _super.call(this, context, img) || this;
            var s = new XMLSerializer();
            var bounds = parseBounds(context, img);
            img.setAttribute('width', bounds.width + "px");
            img.setAttribute('height', bounds.height + "px");
            _this.svg = "data:image/svg+xml," + encodeURIComponent(s.serializeToString(img));
```

and `:4820`, verbatim: `var isSVGElement = function (node) { return node.tagName === 'svg'; };`
and `:4772-4773`, verbatim:

```js
        if (isSVGElement(element)) {
            return new SVGElementContainer(context, element);
        }
```

and `:4754-4757`, verbatim:

```js
                        else if (!isTextareaElement(childNode) &&
                            !isSVGElement(childNode) &&
                            !isSelectElement(childNode)) {
                            parseNodeTree(context, childNode, container, root);
```

— the `!isSVGElement(childNode)` guard is what stops html2canvas from ever walking into the map's
children. And `:7743`, verbatim:
`foreignObjectRendering = (_k = opts.foreignObjectRendering) !== null && _k !== void 0 ? _k : false;`
— `export.ts:368-375` passes no such option, so the default `false` stands and there is no
alternative render path.]

The browser-security rule this collides with is well documented: SVG referenced by `<img>` may
not initiate network requests, so an external font never loads; a base64 data-URI `@font-face`
inside the SVG is the standard workaround, and **WebKit is the known exception** — it treats
data URIs in SVG-as-image as external files
[CITED: https://supercodepower.com/en/svg-img-use-font/ ; https://oreillymedia.github.io/Using_SVG/extras/ch07-dataURI-fonts.html].
Safari is out of certification scope here anyway (C-9), so that exception is recorded rather
than solved — but it means **this technique must never be described as cross-browser.**

**Where to inject.** In `createExportFrame`, immediately after `cloneNode(true)` and before
`sanitizeExportClone`. Three properties make this the right seam:

1. The live DOM stays clean — no ~300KB base64 string in the editor's SVG on every render.
2. `sanitizeExportClone` will not remove it: `export.ts:26` is verbatim
   `const NON_VISUAL_ELEMENT_SELECTOR = 'title,desc,metadata';` — `<style>` is not listed, and
   the only other removals are `[data-layer="outgoing-scene(s)"]` (`:23-24`) and
   `[data-editor-only]` (`:25`).
3. `collectReferencedIds` already reads `<style>` text content (`export.ts:73-82`), so the
   codebase has an established precedent for a `<style>` element inside the composition.

**The one structural check to respect.** `isPreservedComposition` (`export.ts:228-255`) reads
`[...svg.children]`, finds the camera and legend indices, and refuses if
`cameraIndex > legendIndex`. Inserting the `<style>` as `firstChild` shifts both indices equally
and keeps camera-before-legend, so the check still passes — but the *documented* canonical shape
in `coding-rules/export.md:109-118` shows `g[data-layer="camera"] ← must come FIRST`. **Update
that documented shape in the same commit** (C-12), or the next reader will read the doc as
forbidding what the code now does.

**Getting the bytes.** Vite supports an explicit inline suffix:

> "Assets can be explicitly imported with inlining or no inlining using the `?inline` or
> `?no-inline` suffix respectively."
> [CITED: https://vite.dev/guide/assets]

So `import interDataUrl from '../assets/inter-latin-variable.woff2?inline'` yields a
`data:font/woff2;base64,…` string baked into the bundle at build time — no runtime fetch, no
async failure mode, deterministic across dev and build. Vite 8.1.5 is installed
[VERIFIED: `node_modules/vite/package.json` → `8.1.5`].

**Cost, stated plainly.** The same woff2 will be emitted twice — once as a hashed same-origin
file for the chrome `@font-face`, once as base64 inside the JS bundle for the export. Base64
inflates by ~33%. For a latin-subset Inter Variable this is a bundle cost measured in hundreds of
kilobytes. For a localhost-only, no-deployment app (C-2) that is acceptable and should be
recorded as a deliberate trade, not discovered later.

**Example:**

```typescript
// src/styles/interFontFace.ts
// The export clone is rasterised from a data:image/svg+xml URL, which cannot see
// the host document's @font-face rules and cannot issue any request. The only way
// Inter reaches the exported PNG is as bytes inside the serialised SVG subtree.
import interDataUrl from '../assets/inter-latin-variable.woff2?inline';

export const EXPORT_FONT_FAMILY = 'Inter';

export function buildExportFontFaceCss(): string {
  return (
    `@font-face{font-family:'${EXPORT_FONT_FAMILY}';` +
    `src:url(${interDataUrl}) format('woff2');` +
    `font-weight:100 900;font-style:normal;font-display:block;}`
  );
}
```

```typescript
// src/utils/export.ts — inside createExportFrame, after cloneNode, before sanitize
const clonedNode = sourceSvg.cloneNode(true) as SVGSVGElement;
// … existing viewBox / size / background assignments …

const fontStyle = clonedNode.ownerDocument.createElementNS(SVG_NAMESPACE, 'style');
fontStyle.textContent = buildExportFontFaceCss();
clonedNode.insertBefore(fontStyle, clonedNode.firstChild);

sanitizeExportClone(clonedNode);
```

---

### Pattern 2 — A gate for D-25 that can actually go RED

C-3 is the binding rule, and this is the assertion most likely to be written in a way that
cannot fail. A gate that only checks "the clone contains `@font-face`" proves the injection ran;
it proves **nothing** about whether Chrome honoured it. If Chrome silently ignores the data-URI
font, that gate stays green and every exported PNG ships the wrong typeface.

**Two-part gate. Part 2 is the load-bearing half.**

**Part 1 — structural, via `MutationObserver`.** `coding-rules/export.md:477-480` already
mandates this technique: *"Inspect the clone with a `MutationObserver` on `document.body`, not by
stubbing. The export frame is a body-level `div[aria-hidden="true"]` containing the sanitized
clone."* Assert the observed clone contains `svg.map-canvas > style` whose text matches
`/@font-face/` and `/src:\s*url\(data:font\/woff2;base64,/`.
*RED probe:* delete the `insertBefore` line, run, observe failure, restore from scratchpad.

**Part 2 — discrimination control on the pixels.** In the same Playwright run, export the same
composition twice: once normally, once with the embedded `@font-face` neutralised via a
page-level patch (e.g. `page.addInitScript` rewriting `buildExportFontFaceCss` output to an empty
string, or a test-only exported hook). Then assert the two PNGs' **legend-region pixel signatures
differ**.

This is precisely the pattern `coding-rules/export.md:465-470` already demands for cross-export
equality: *"A cross-export equality needs a discrimination control in the same test… Export the
known-different state in the same run and assert it differs."* Applied here it inverts to: if
disabling the font changes nothing, the font was never applied. **That is the only assertion in
this phase that can catch "Chrome ignored the data-URI font."**

Sample the legend corner only, never the whole frame — `export.md:456-463`: *"Count colors in
disjoint regions, never in the whole frame… Split the 1080 square into a legend corner box and a
map column that do not overlap."* Measured reference values already recorded there: one legend
swatch ≈ 570 corner pixels at a 1.5× world camera.

Add a **content floor before the relational assertion**, per `export.md:437-455`: assert the
legend region has non-white ink above a threshold *first*, so two blank corners cannot satisfy
"they differ" by both being empty.

---

### Pattern 3 — Icon rail + reserved-space flyout, and why the map does not care

**What.** A CSS grid on the editor root with three tracks: `56px` rail, a panel track that
animates between `0` and `280px`, and `1fr` for the canvas. The canvas reflows; the panel never
overlays the map (D-19).

```css
.map-editor {
  display: grid;
  grid-template-columns: var(--rail-width) var(--panel-width) 1fr;
  block-size: 100dvh;
}
:root { --rail-width: 56px; --panel-width: 0px; }
.map-editor[data-panel-open='true'] { --panel-width: 280px; }
```

**The map is immune to the reflow, and this is verifiable rather than hoped for.** Three facts,
each read from source this session:

1. The SVG is authored in a fixed user-unit space:
   `MapCanvas.tsx:839-840` is verbatim
   ``viewBox={`0 0 ${MAP_VIEWBOX_SIZE} ${MAP_VIEWBOX_SIZE}`}`` and
   `preserveAspectRatio="xMidYMid meet"`, with `src/constants/config.ts:7` verbatim
   `export const MAP_VIEWBOX_SIZE = 1080;`.
2. The camera's zoom behaviour is pinned to that same space, **not** to the element's client
   rect. `src/hooks/useCameraController.ts:310-313` is verbatim:
   ```
         .extent([
           [0, 0],
           [WORLD_SIZE, WORLD_SIZE],
         ])
   ```
   with `src/constants/camera.ts:3` verbatim `export const WORLD_SIZE = 1080;`. d3-zoom's default
   extent *is* the element's bounding rect; overriding it removes the dependency on rendered
   size.
3. The projection is likewise 1080-unit; `CameraState` is `{ zoom, centerLongitude,
   centerLatitude }` (`src/constants/camera.ts:15-19`), i.e. semantic, not pixel-based.

**Therefore: no `ResizeObserver` is needed, the camera lease is unaffected, and export output is
unchanged by a panel open/close.** The only two places that read pixel geometry are
`LegendOverlay.tsx:142` (`svg.getBoundingClientRect().width`, used to convert a pointer drag into
canvas units — read fresh at drag time, so a reflow between drags is harmless) and
`MapCanvas.tsx:320` (`pathElement.getBoundingClientRect()` for keyboard tooltip anchoring — also
read on demand). Neither caches.

**One genuine risk to gate:** a transition on `grid-template-columns` fires many layout passes
per frame across a 248 × 3-path SVG. Prefer transitioning the `--panel-width` custom property
with `@property` registration, or accept an instant snap. D-29's spirit — *"Hover paint is
INSTANT — no `transition-colors` on sidebar hover surfaces; adding an ease here is a regression,
not polish"* (`themely/Design.md:202`) — applies to row backgrounds specifically, not to the
panel; the panel is structural motion and gets `--motion-duration-base` (240ms) per
`themely/Design.md:173`.

**Do not add a second roving-tabindex writer.** `03-CONTEXT.md` §Established Patterns records a
single roving-tabindex writer restored in commit `074173e`. The rail's rows should be plain tab
stops or reuse the existing writer — a second one is the regression class that commit fixed.

---

### Pattern 4 — Rehoming the `role="status"` live region (D-15)

**The current state — there are already three announcement channels, and they are distinct.**

| Region | Location | Role | Notes |
|---|---|---|---|
| Selection announcements | `src/App.tsx:1052-1060` | `role="status" aria-live="polite" aria-atomic="true"` | Visually hidden via `.selection-live-region` (`App.css:20-29`); marked `data-selection-live-region="true"`; asserted at `src/App.test.tsx:274-276` |
| Period status | `src/components/CompositionBar.tsx:82-88` | `role="status" aria-live="polite"` | **Also the `aria-describedby` target of the period `<select>`** — `CompositionBar.tsx:59` verbatim `aria-describedby={COMPOSITION_PERIOD_STATUS_ID}`, and `:8` verbatim `export const COMPOSITION_PERIOD_STATUS_ID = 'composition-bar-period-status';` |
| Toasts | `src/components/ToastRegion.tsx:202` | `aria-live={isError ? 'assertive' : 'polite'}` | The allowlist boundary |

**Recommendation: move the period status region *with* the period control into its own HUD
surface (D-14), keeping `COMPOSITION_PERIOD_STATUS_ID` byte-identical.** Rationale:

- It is not only a live region, it is a **description**. Merging it into `ToastRegion` or into
  `.selection-live-region` would orphan the `aria-describedby` reference and silently degrade
  the period control's accessible description — a defect no visual check catches.
- `ToastRegion` is an allowlist for *transient* creator messages; the period status is a
  *persistent* description of current state. Routing it through the allowlist would either
  require adding every period-status string to `APPROVED_STATIC_MESSAGES`
  (`ToastRegion.tsx:44+`) or degrade it to a severity fallback. Both are worse.
- Merging it into `.selection-live-region` gives one region two writers, which produces
  interleaved and truncated announcements.

**Gate shape already exists to copy:** `src/App.test.tsx:274-276` asserts the exact live-region
markup string. Mirror it for the rehomed period region, and add an assertion that the id in
`aria-describedby` resolves to an element that exists — that is the one that goes RED if the
region is dropped during the rail migration.

---

### Pattern 5 — Motion tokens with a lockstep test (D-26)

Themely's shape is directly portable and fits this repo's `node`-environment Vitest perfectly
(C-4) because it is pure constants plus a file read.

The upstream mirror is `themely/src/lib/motion/tokens.ts:15-30`, verbatim:

```ts
export const EASE_OUT = [0.22, 1, 0.36, 1] as const
export const EASE_SNAPPY = [0.2, 0.8, 0.2, 1] as const
export const EASE_IN = [0.4, 0, 1, 1] as const
export const DURATION_FAST = 0.15 // s — 150ms
export const DURATION_BASE = 0.24 // s — 240ms
export const DURATION_SLOW = 0.36 // s — 360ms
```

and the pin is `themely/src/lib/motion/__tests__/tokens.test.ts:48-55`, verbatim:

```ts
const EXPECTED_CSS_DECLARATIONS: Record<string, string> = {
  '--motion-ease-out': 'cubic-bezier(0.22, 1, 0.36, 1)',
  '--motion-ease-snappy': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  '--motion-ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
  '--motion-duration-fast': '150ms',
  '--motion-duration-base': '240ms',
  '--motion-duration-slow': '360ms',
}
```

**The reconciliation D-26 asks for is real and precise.** Current CountriesIRL values, read from
source:

| Existing | Value | Themely counterpart | Action |
|---|---|---|---|
| `theme.css:46` `--easing-camera: cubic-bezier(0.22, 1, 0.36, 1);` | identical | `--motion-ease-out` (`themely/globals.css:251`) | **Rename onto the token.** Byte-identical. |
| `theme.css:42` `--motion-fast: 150ms;` | identical | `--motion-duration-fast` (`themely/globals.css:254`) | **Rename onto the token.** |
| `theme.css:44` `--motion-camera: 240ms;` | identical | `--motion-duration-base` (`themely/globals.css:255`) | **Rename onto the token.** |
| `src/constants/camera.ts:12` `export const CAMERA_MOTION_DURATION_MS = 240;` | identical | `DURATION_BASE` (0.24s) | **Derive from the TS mirror** rather than restating 240. |
| `theme.css:43` `--motion-scene: 160ms;` | **no Themely equivalent** | — | **Keep as a local token with a documented reason** — Themely's "do-not-snap list" idiom (`themely/Design.md:186-194`). Retiming the scene crossfade to 150ms is a visible change. |
| `src/constants/camera.ts:13` `export const SCENE_CROSSFADE_DURATION_MS = 160;` | matches `--motion-scene` | — | Same: keep, documented. |
| `theme.css:45` `--easing-control: ease-out;` | — | `--motion-ease-snappy` is the nearest | Judgement call; `ease-out` is not byte-equal to any Themely curve. Recommend mapping control micro-feedback onto `--motion-ease-snappy` and recording it as a deliberate retime. |

**Do not lose the reduced-motion zeroing.** `theme.css:335-340` zeroes `--motion-fast`,
`--motion-scene`, `--motion-camera` under `@media (prefers-reduced-motion: reduce)`, and
`phase2CssContract.test.ts:704-741` asserts both that zeroing *and* that every motion token has a
live consumer. The renamed `--motion-duration-*` tokens must inherit both assertions. Note the
consumer test's rationale, `phase2CssContract.test.ts:713-719` — those tokens were once declared,
gated, and read by nothing, so the reduced-motion assertion proved nothing. The successor test
must keep that check.

**`prefers-reduced-motion` remains legitimate.** D-30 forbids `prefers-color-scheme` in the
dark-mode path only. `motion`'s `useReducedMotion()` — reachable via `motion/react`, since
`themely/node_modules/motion/dist/es/react.mjs:1` is verbatim `export * from 'framer-motion';`
and `framer-motion/dist/es/index.mjs:37` is verbatim
`export { useReducedMotion } from './utils/reduced-motion/use-reduced-motion.mjs';` — is the
correct gate for `startAnimation()` per D-29 and Themely's own `PrimaryNavRow`
(`themely/src/components/app-sidebar.tsx:602-609`).

---

### Pattern 6 — Vendored animated icons, translated out of Tailwind

**CountriesIRL has no Tailwind.** `package.json` lists no Tailwind dependency; styling is plain
CSS with custom properties, and `main.tsx:11-14` imports four stylesheets directly. Every
Themely recipe quoted in `Design.md` is expressed as Tailwind utilities and **must be translated
to CSS**, not copied. The `03-01` `Design.md` is the right place to record each translation.

The vendoring contract itself is Tailwind-free and ports verbatim
[CITED: `themely/.planning/coding-rules/frontend.md:121-127`]:

- *"Each exports a forwardRef component plus a structurally-identical `*IconHandle`
  (`{ startAnimation: () => void; stopAnimation: () => void }` via `useImperativeHandle`).
  Attaching a ref flips the internal `isControlledRef`, so the icon's own self-hover defers to
  the parent — ref-driven and hover-driven modes never fight."*
- *"**Size via the `size` PROP, never className sizing.** The prop feeds the `<svg width/height>`
  attributes (default 28); sidebar nav rows pass `size={20}`."*
- *"**`strokeWidth="1.5"` is a LOCAL PATCH** — upstream ships 2. Every vendored file carries the
  marker comment `vendored from lucide-animated; strokeWidth patched 2→1.5 (house icon recipe) —
  re-running shadcn add overwrites this patch`."*
- *"**Trigger from ROW hover via the imperative handle**, not icon hover… `useReducedMotion()`
  gates `startAnimation()` (mandatory); `stopAnimation()` is unconditional."*

The reference implementation to translate is `themely/src/components/ui/square-pen.tsx` (whole
file read this session): `useAnimation()` controls, an `isControlledRef` flipped inside
`useImperativeHandle`, `handleMouseEnter`/`handleMouseLeave` that defer to the parent when
controlled, and a `<motion.path animate={controls} variants={…}>` inside a plain `<svg>`.
The only CountriesIRL-specific changes are dropping `"use client"` (no Next.js), dropping
`cn()` from `@/lib/utils` (no Tailwind merge), and replacing the className plumbing with a
plain `className` passthrough.

**A vendoring gate that can fail:** assert every file in `src/components/icons/` contains the
literal marker comment and the literal `strokeWidth="1.5"`. RED probe: change one to `"2"`.
This is a pure-string test, so it runs in the `node` Vitest environment (C-4).

**What is NOT unit-testable here:** the animation behaviour itself. `useAnimation` needs a DOM.
Per C-4 and `03-CONTEXT.md` §Established Patterns — *"A motion-token lockstep test (pure
constants) fits Vitest; animated icon behaviour does not."* Row-hover-triggers-glyph belongs in
Playwright or nowhere.

**These icons must not reach the export clone.** The rail, panel, floating map controls, and
tooltip all need `data-editor-only="true"` — the established marker, stripped by
`export.ts:25` (`const EDITOR_ONLY_SELECTOR = '[data-editor-only]';`) and `:168-170`. In
practice the rail sits outside `div.map-export-source` entirely, so this is belt-and-braces —
but `MapWorkspace`'s slot contract is what decides export membership, and the CONTEXT is
explicit that moving tools must not move anything into or out of the exported composition.

---

### Pattern 7 — `.dark` on the mount root without `prefers-color-scheme` (D-08/D-30)

**Mechanics.**

```css
/* theme.css */
:root { /* light --themely-* values */ }
.dark { /* X "Lights Out" values — mirrors :root role tokens 1:1 */ }
```

Themely's own flip is exactly this (`themely/src/app/globals.css:319-433`, `.dark { … }`), and
its rule is quoted in `Design.md:35`: *"Same role tokens as light mode, swapped values via
`.dark { … }` in `globals.css`. **No `dark:` modifiers in component files** — the tokens flip
themselves."* Design.md's Dark-mode Don'ts (`:62-66`) carry over verbatim, including
*"Don't hardcode hex literals in component files."*

**Three constraints specific to this repo:**

1. **The class goes on the editor mount root, not `document.documentElement`.** Today
   `App.tsx:1014` renders `<div className="app">` as the outermost element and `main.tsx` mounts
   into `#root`. The natural mount root is that outer div, which becomes the `MapEditor`
   boundary. Because `theme.css` declares tokens on `:root`, the `.dark` block must be written as
   a *descendant-or-self* selector that works on a non-root element — i.e. `.dark { … }` applied
   to the editor div, with all consuming rules inside it. That works because CSS custom
   properties inherit; a `.dark` div re-declares the tokens for its whole subtree.
   **Caveat the planner must handle:** `theme.css:227-238` currently sets `background` on `html`
   and `body` from `var(--surface-page)`. Those elements are *outside* the editor root, so they
   will not flip. Either give the editor root its own full-bleed background (correct, and
   required by D-11's full-bleed shell anyway) or accept a light page behind a dark editor.
2. **No `prefers-color-scheme` read anywhere in the dark path**, not even to seed the default
   (D-30). Standalone default is light.
3. **`color-scheme` is a separate property and needs care.** `theme.css:21` sets
   `color-scheme: light` on `:root` and `:113` sets `color-scheme: dark` inside the media query.
   The `.dark` block should carry `color-scheme: dark` so native form controls and scrollbars
   follow. But note `export.ts:269` and `:285` set `style.colorScheme = 'light'` on the export
   frame and the cloned SVG — that is deliberate export theme-independence and must **not** be
   removed.

**The gate D-30 asks for, made RED-provable:** a `uiContract.test.ts` assertion that no rule in
any stylesheet has `prefers-color-scheme` in its at-rule conditions. The existing parser already
exposes `rule.conditions` (`phase2CssContract.test.ts:20-25, 58-108`), so this is a few lines.
RED probe: re-add `@media (prefers-color-scheme: dark) { :root { … } }`, watch it fail, restore
from scratchpad.

### Pattern 8 — Rewriting `phase2CssContract.test.ts` as `uiContract.test.ts`

The file is 1089 lines. **Its parser and helpers are the valuable part and should survive
verbatim; its assertions are what Phase 3 replaces.** Below is the full audit of what it
currently asserts, whether it is load-bearing for export fidelity, and its disposition.

#### Keep verbatim — infrastructure, not policy

| Lines | What | Why it must survive |
|---|---|---|
| `27-39` | `readStyleSheet` via `process.getBuiltinModule('fs')` | The only way to read CSS in the `node` Vitest environment (C-4) |
| `41-108` | `stripComments` + `parseRules` brace-walking parser | Nested at-rule awareness is what lets any assertion see `@supports > @media` nesting |
| `110-139` | `assertParsableStyleSheet` | **Critical.** It checks the parser's own assumptions (no quoted `;{}`, balanced braces, non-zero rule count) so a desynchronised walk fails instead of silently making every other assertion vacuous. The comment at `:110-115` explains exactly this. |
| `141-154` | `declarationsOf` | — |
| `156-192` | `findRule` **including the duplicate-rule throw** | The comment at `:176-182` records a real defect: returning the first match made a doubly-declared `.app > header` invisible, and the `.app { overflow-x }` guard defeatable by appending a second `.app` rule. Do not simplify. |
| `194-200` | `tokensOf` | — |
| `238-252` | `resolveRootTokens` — cascade resolution for a set of active conditions | The comment at `:227-237` explains why block-by-block assertion cannot see preference blocks overriding the dark block. **Still needed under `.dark`**, with the active-condition list gaining a class dimension instead of a media dimension. |
| `254-273` | `resolveTokenValue` — `var()` alias-chain follower with cycle detection | Needed the moment tokens alias each other, which the Themely port will do |
| `275-327` | `parseHexColor`, `relativeLuminance`, `contrastRatio` (WCAG 2.2) | Reusable as-is for the new palette's AA checks |

#### Load-bearing for export fidelity — must be carried forward, adapted

| Lines | Assertion | Disposition |
|---|---|---|
| `528-545` | **"never redefines an export token outside the unconditioned root"** — walks every rule in every stylesheet and fails if any `--map-*`/`--swatch-border` token is declared anywhere but the bare `:root` | **CARRY FORWARD UNCHANGED IN SPIRIT — and extend it to `.dark`.** This is the executable form of Live Invariant 9. Under D-08 the `.dark` block is a new place an export token could be redefined, and the current test would catch it only because `.dark` ≠ `:root`. Verify that by RED probe: add `--map-surface` to `.dark`, watch it fail. |
| `557-574` | **"gives every `--map-*` token a consumer"** | **CARRY FORWARD.** The comment at `:547-556` records two tokens that were declared, gated, and read by nothing — so the guard described a treatment the map did not have. |
| `576-583` | **"declares every export token exactly once"** | **CARRY FORWARD.** |
| `947-994` | **export-unsafe-CSS guard** (`filter`, `backdrop-filter`, `box-shadow`, `text-shadow`, `mix-blend-mode`, `mask`, `mask-image`, `clip-path` must be `none` on exported content) **plus the binding of `EXPORT_CONTENT_PATTERN` back to `MapCanvas.tsx` source** | **CARRY FORWARD, HIGH PRIORITY.** `export.md:428-435` records that `.map-unit-path` was omitted from the pattern for a whole phase. D-06's move to hairline `box-shadow: 0 0 0 1px …` makes this *more* dangerous, not less: a hairline is still a `box-shadow`, and one applied to legend or canvas content rasterises differently under html2canvas. |
| `996-1014` | `touch-action: none` scoped to `.map-canvas` alone | **CARRY FORWARD.** The comment at `MapCanvas.css:113-118` explains that on any ancestor it swallows touch scrolling — and D-20's bottom-sheet makes ancestors newly relevant. |
| `1016-1025` | composition square is `aspect-ratio: 1`, `background: var(--map-surface)`, `overflow: hidden` | **CARRY FORWARD — but see §OQ-2.** If D-11's full-bleed changes the square's containment, this assertion is exactly where the decision becomes visible. Good. |
| `1029-1038` | no gradients anywhere | **CARRY FORWARD.** Themely uses gradients (`--marketing-band`, `--scrim`) but none of those surfaces exist here, and a gradient inside the composition rasterises unpredictably. |
| `1047-1063` | **never style an interactive control by position** (`:nth-child`, `:last-child` …) | **CARRY FORWARD.** The comment at `:1040-1046` records the `02-22` defect where a reorder would have tinted "Save or Load Maps" red with nothing failing. A rail of icon rows is the *ideal* place to reintroduce this bug. |

#### Retire or rewrite — Phase 2 policy that D-01…D-31 replaces

| Lines | Assertion | Disposition |
|---|---|---|
| `396-420` | `EXACT_SCALE_TOKENS` — `--font-label/body/heading/display`, `--motion-fast/scene/camera`, `--easing-camera`, radii | **REWRITE** to the Themely type-role and `--motion-duration-*` sets (D-09, D-26). `--target-compact: 44px` survives (D-20). |
| `422-441` | `EXACT_LIGHT_COLOR_TOKENS` incl. `--accent: #0f766e`, `--text-primary: #111827`, `--border-strong: #1f2937` | **REWRITE** to the `--themely-*` light palette (D-04). `03-01`'s stated gate — re-add `--accent: #0f766e` → test fails — is satisfied by this table plus the retired-name grep below. |
| `443-455` | `EXACT_DARK_CHROME_TOKENS` read from `findRule(THEME_RULES, ':root', [DARK_CONDITION])` | **REWRITE** to read `findRule(THEME_RULES, '.dark')` with no conditions (D-08). |
| `473-480`, `586-620` | the entire `--glass-*` family and its `@supports`/preference restoration matrix | **DELETE.** D-06 retires `--glass-*` outright; Themely reserves glass for floating chrome only, and no Phase 3 surface qualifies. |
| `629-662` | contrast matrix over `PREFERENCE_CASES`, ending `expect(assertions).toBe(54)` | **REWRITE, KEEP THE COUNT ASSERTION.** The `:660-661` comment — *"A matrix that silently resolved to nothing would pass. It must not."* — is the pattern to preserve; only the number changes. The new matrix has a `.dark` dimension instead of a `prefers-color-scheme` one. |
| `672-694` | contrast block must restate literals for dark | **REWRITE** in `.dark` terms. |
| `696-702` | `--border-width: 2px` / `--focus-width: 3px` under contrast + forced colors | **KEEP** — orthogonal to the palette change. |
| `704-741` | reduced-motion zeroing + "every motion token has a consumer" | **KEEP, rename tokens.** See Pattern 5. |
| `790-909` | responsive layout contract: `1440px` measure, `minmax(0, 1fr) 376px` desktop grid, breakpoint set `{1199, 899, 767}`, inspector shell using `--shadow-inspector`, `.app` never a scroll container | **REWRITE WHOLESALE.** The app bar dissolves (D-11), the 376px inspector column dies (D-16/D-19), and the measure is replaced by full-bleed. The **spacing-tokens-only** assertion (`868-887`) and the **48px minimum target height** assertion (`889-908`) should survive with their allowlists updated. |
| `744-753` | `GLASS_SELECTORS` naming `.app > header`, `.workspace--desktop .workspace__control-column`, `.map-navigation__cluster` | **DELETE** with the glass family. |
| `1065-1087` | `backdrop-filter` only inside the supports query, only on approved glass surfaces | **DELETE** with the glass family — **but replace with a stricter rule**: `backdrop-filter` is forbidden outright (D-06 reserves elevation for hairlines and drop shadows). A blanket ban is simpler and cannot rot. |

#### The new assertions Phase 3 owes

Each must be broken once and observed RED before landing (C-3):

1. **No `prefers-color-scheme` in any rule's conditions** (D-30). RED: re-add the media query.
2. **No retired token name appears in any stylesheet.** Grep the exact strings listed in
   §Current-State Inventory. RED: re-add `--accent: #0f766e`.
3. **Every `--themely-*` token declared in `:root` has a counterpart in `.dark`, and vice versa**
   — except the fixed set (`--themely-on-accent`, `--themely-media-backdrop`, `--themely-on-media`)
   which must be **identical in both**. Mirrors Themely's own rule
   (`themely/Design.md:22`, `:50`: On-Accent is `#ffffff` in both modes). RED: drop one token
   from `.dark`.
4. **No hex/rgba literal in any component `.tsx`** — extending `themeTokens.test.ts:90-101`,
   which today scans **only** `MapCanvas.css` and `Controls.css`
   (`themeTokens.test.ts:95-96`, verbatim: `expect(mapCanvasCss).not.toMatch(COMPONENT_COLOR_LITERAL);`
   / `expect(controlsCss).not.toMatch(COMPONENT_COLOR_LITERAL);`). **Deliberate exception list
   required** — see §Pitfall P-3, `LegendOverlay.tsx` legitimately hard-codes export colours.
5. **Selector inventory shrinks** (roadmap `03-09` gate): assert a maximum count of distinct
   selectors across the stylesheet set so growth fails. RED: add a dead rule.
6. **Rail/panel structural contract**: `[data-panel-open]` values are exactly `'true'|'false'`;
   the panel track resolves to `0px` when closed and `280px` when open (D-19).
7. **Vendored-icon marker** — see Pattern 6.
8. **Motion lockstep** — see Pattern 5.

---

### Pattern 9 — Transition-readiness gates, each mechanically checkable

The roadmap makes this *"binding for every Phase 3 plan"* (`ROADMAP.md:225-236`). Concrete
RED-provable forms:

**(a) One mountable editor component behind an explicit props boundary.**
- *Gate:* a `node`-environment test that reads `src/components/editor/MapEditor.tsx` as text and
  asserts (i) it exports exactly one component, (ii) its props interface is exported, and (iii)
  the file contains no `document.` or `window.` reference outside a narrowly allowed list.
- *Stronger, structural gate:* `renderToStaticMarkup(<MapEditor …/>)` in the `node` environment
  and assert the markup has exactly one root element. This repo already tests component-shaped
  code that way — `App.test.tsx` asserts on `markup` strings (`:274-276`).
- *RED probe:* add `document.body.classList.add('x')` at module scope; watch the text gate fail.

**(b) A storage-adapter interface — already exists; the gate is that nothing bypasses it.**
`src/utils/storage.ts:71-88` declares it, verbatim:

```ts
export interface StorageAdapter {
  list: () => StorageResult<ReadonlyArray<SavedMap>>;
  listSummaries: () => StorageResult<ReadonlyArray<SavedMapSummary>>;
  save: (
    name: string,
    snapshot: CompositionSnapshot,
  ) => StorageResult<SaveMapValue>;
  load: {
    (name: string): StorageResult<CompositionLoadOutcome>;
    (
      name: string,
      validCountryIds: ReadonlySet<string>,
    ): StorageResult<ColorMap>;
  };
  delete: (name: string) => StorageResult<ReadonlyArray<SavedMap>>;
  getOnboardingDismissed: () => StorageResult<boolean>;
  dismissOnboarding: () => StorageResult<boolean>;
}
```

**Complete `localStorage` inventory in production source — there is exactly one call site:**

| File:line | Code | Status |
|---|---|---|
| `src/utils/storage.ts:142` | `return typeof window === 'undefined' ? null : window.localStorage;` (inside `getDefaultStorage`, `:140-146`, wrapped in try/catch) | **The only production reference.** Correct — this is the adapter's default implementation. |
| `src/App.test.tsx:212` | `localStorage: storage,` | test injection |
| `src/components/ErrorBoundary.test.tsx:59` | `localStorage: createBlockedStorage(),` | test injection |
| `tests/e2e/*` (13 sites across `transactions`, `phase2-composition`, `persistence`, `appHarness`) | `page.evaluate(… localStorage …)` | browser-context test setup, not app code |

- *Gate:* grep-based test asserting `window.localStorage` / `localStorage.` appears in
  **exactly one** file under `src/` and that file is `src/utils/storage.ts`.
- *RED probe:* add a raw `localStorage.setItem` in the rail component; watch it fail.
- **D-18 and D-30 both require extending the adapter** with last-open-tool and theme entries.
  Both must respect the bounded V2 record contract — `storage.ts:45-47` verbatim:
  `export const MAX_STORAGE_SERIALIZED_LENGTH = 1_000_000;`,
  `export const MAX_STORAGE_JSON_DEPTH = 32;`,
  `export const MAX_STORAGE_JSON_NODES = 50_000;` — and the limits are checked **before**
  `JSON.parse`. Note there is precedent for a small non-composition key:
  `src/constants/config.ts:5` verbatim
  `export const ONBOARDING_DISMISSED_KEY = 'countriesirl_onboarding_dismissed';`, surfaced through
  `getOnboardingDismissed` / `dismissOnboarding`. **Follow that pattern** rather than widening
  the composition record.

**(c) The data asset base path as a parameter — complete inventory of hard-coded `/data/`
literals.**

*Production source (must move behind a config home):*

| File:line | Literal |
|---|---|
| `src/hooks/useGeoData.ts:11` | `export const WORLD_MANIFEST_URL = '/data/world-manifest.json';` |
| `src/hooks/useGeoData.ts:12` | `export const WORLD_DATA_URL = '/data/world-modern.geojson';` |
| `src/constants/snapshots.ts:7` | `export const SNAPSHOT_MANIFEST_URL = '/data/snapshots/index.json';` |

*Production source — validation predicates, NOT fetch paths (treat separately):*

| File:line | Literal | Note |
|---|---|---|
| `src/utils/historicalValidation.ts:1098` | `!input.assetPath.startsWith('/data/') \|\|` | A **safety predicate** on manifest-declared asset paths. |
| `src/utils/historicalValidation.ts:1190` | `entry.assetPath.startsWith('/data/snapshots/')` | Same. |

**These two are a trap.** Parameterising them alongside the fetch URLs would let a
host-configured base path widen what counts as an acceptable asset path — a loosening of the
approval chain (C-10) dressed up as a refactor. **Recommendation: leave both as literals and
exempt them explicitly in the gate, with the reason recorded in `coding-rules/data.md`.** If the
base path ever becomes configurable, the predicate must validate against the *configured* base,
not against a wildcard.

*Tests and fixtures (out of scope for the gate, listed so the planner does not chase them):*
`src/utils/worldDataAsset.test.ts:253-254`, `src/utils/historicalValidation.test.ts:679,708`,
`src/utils/snapshotScene.test.ts:76,100`, `src/utils/periods.test.ts:21,36`,
`src/components/MapWorkspace.test.tsx:52,79`, `tests/e2e/phase2-composition.spec.ts:508,749`,
`tests/e2e/transactions.spec.ts:236`, `tests/e2e/history.spec.ts:11-13,97`,
`tests/e2e/support/historicalFixture.ts:14,72`.

*Build scripts (out of scope — they write files, they are not the app):*
`scripts/prepareWorldData.mjs:9,12,417`, `scripts/prepareGeoData.mjs:14,252`,
`scripts/verifyPhase2ExactCommit.mjs:190,219`.

- *Gate:* a test that greps `src/**/*.{ts,tsx}` excluding `*.test.*` for the literal `'/data/`
  and asserts the only matches are in `src/config/editorConfig.ts` plus the two named
  `historicalValidation.ts` predicate lines.
- *RED probe:* re-add `/data/world-modern.geojson` to `useGeoData.ts`; watch it fail.

**(d) Namespaced tokens.** D-03 discharges this by construction. *Gate:* assert every custom
property declared in `theme.css` matches `/^--(themely|motion|map|target|focus|border|radius|space)-/`
— i.e. an explicit allowlist of namespace prefixes, so an un-namespaced `--accent` cannot
reappear. *RED probe:* add `--accent: #0071e3;`.

**(e) `.dark` on the mount root, never `document.documentElement`.** *Gate:* grep test asserting
no `src/**` file contains `documentElement.classList`. *RED probe:* add one.

## Current-State Inventory

> Everything below was produced by grep over `src/` this session and each line is quotable. This
> is the raw material for `03-03`'s "delete, don't alias" gate and `03-09`'s CSS sweep.

### Retired tokens — every declaration and every consumer

**`--accent` family** (D-05 replaces with `--themely-apple-blue`):

| File:line | Kind |
|---|---|
| `src/styles/theme.css:62` | declaration `--accent: #0f766e;` |
| `src/styles/theme.css:63` | declaration `--accent-contrast: #ffffff;` |
| `src/styles/theme.css:64` | declaration `--accent-hover: #0b5b55;` |
| `src/styles/theme.css:124-126` | dark-block declarations `--accent: #5eead4; --accent-contrast: #042f2e; --accent-hover: #99f6e4;` |
| `src/styles/theme.css:293` | consumer — `outline: var(--focus-width) solid var(--accent);` |
| `src/styles/App.css:110` | consumer — `border-left: var(--space-xs) solid var(--accent);` |
| `src/styles/App.css:148-150` | consumers — `border-color` / `background` / `color: var(--accent-contrast)` |
| `src/styles/App.css:154-155` | consumers — `--accent-hover` |
| `src/styles/Controls.css:84-86` | consumers — `border-color` / `background` / `color: var(--accent-contrast)` |
| `src/styles/Controls.css:96-97` | consumers — `--accent-hover` |
| `src/styles/Controls.css:454` | consumer — focus outline |
| `src/styles/Controls.css:943, 949` | consumers — `accent-color: var(--accent);` |
| `src/styles/phase2CssContract.test.ts:433, 454` | assertion table entries |
| — | Also `--surface-accent-tint: #ccfbf1` (`theme.css:56`, dark `:118`) is part of the teal family |

**`--text-primary`** (D-04 replaces with `--themely-midnight-ink`):
`theme.css:57` (decl), `theme.css:119` (dark decl), `theme.css:239, 261` (consumers),
`MapCanvas.css:49, 59, 86`, `Controls.css:298, 393, 531, 736, 897, 1001`,
`phase2CssContract.test.ts:392, 428` (assertion tables).
*Companions:* `--text-secondary` (24 refs), `--text-muted` (8 refs) → `--themely-slate-blue`,
`--themely-ghost-gray`.

**`--border-strong`** (no Themely equivalent — D-06's model is hairline-only):

| File:line | Kind |
|---|---|
| `src/styles/theme.css:61` | declaration `--border-strong: #1f2937;` |
| `src/styles/theme.css:123` | dark declaration `--border-strong: #f8fafc;` |
| `src/styles/theme.css:277` | consumer — `button:active` border-color |
| `src/styles/Controls.css:265-266` | consumers — border-color + `inset 0 0 0 1px` |
| `src/styles/Controls.css:459` | consumer — `inset var(--space-xs) 0 0` |
| `src/styles/Controls.css:466` | consumer — `accent-color:` |
| `src/styles/Controls.css:786` | consumer — border-color |
| `src/styles/phase2CssContract.test.ts:432` | assertion table entry |

**`--shadow-inspector`** (D-06 deletes; the inspector container itself dies with D-16):
`theme.css:80` (decl), `theme.css:214` (forced-colors `none`), `App.css:227` (the only
consumer), `phase2CssContract.test.ts:845` (assertion).

**`--shadow-navigation`** (D-06 deletes; D-21's floating controls use the popover shadow):
`theme.css:81` (decl), `theme.css:215` (forced-colors `none`),
`MapCanvas.css:216` and `MapCanvas.css:250` (the two consumers).

**`--glass-*` family — 64 references, the largest single deletion.** Declarations:
`theme.css:73-78` (six opaque fallbacks), `theme.css:128-130` (dark), `theme.css:136-141`
(`@supports` translucent + blur), `theme.css:146-148` (`@supports` + dark),
`theme.css:165-170` (reduced-transparency), `theme.css:181-186` (contrast),
`theme.css:208-213` (forced-colors). Consumers, all six of them:
`App.css:56` (`--glass-app-bar`), `App.css:62` (blur),
`App.css:226` (`--glass-inspector`), `App.css:239` (blur),
`MapCanvas.css:214` (`--glass-navigation`), `MapCanvas.css:221` (blur).
Test references: `phase2CssContract.test.ts:386-390, 473-480, 586-620, 744-753, 1065-1087`.

**`--font-label / --font-body / --font-heading / --font-display`** (D-10 retires for the
Themely role scale). Declarations `theme.css:32-35`. Consumers:
`theme.css:242, 262, 318, 325, 331`; `MapCanvas.css:24, 38, 76, 323`;
`Controls.css:87, 155, 257, 301, 373, 380, 485, 646, 652, 672, 871, 917`
(plus prose mentions at `Controls.css:219, 251`).
Test table: `phase2CssContract.test.ts:405-408`.
*Companions:* `--weight-regular` (`theme.css:36`), `--weight-semibold` (`theme.css:37`) — the
Themely role tokens bundle weight, so these become redundant.

**Tokens that survive unchanged** (no action, listed so they are not swept by mistake):
`--space-xs…3xl` (`theme.css:23-29`), `--target-compact: 44px` (`theme.css:30`, needed by D-20),
`--focus-width` / `--focus-offset` / `--border-width` (`theme.css:48-50`), and the whole
`--map-*` / `--tooltip-*` / `--swatch-border` / `--mixed-color-*` / `--active-check-*` export set
(`theme.css:85-104`) — subject to §Pitfall P-2.

### `Controls.css` surface split (roadmap `03-09`)

1128 lines. Top-level block prefixes by rule count, which is the natural split:

| Prefix | Rules | Suggested file |
|---|---|---|
| `.country-list` | 24 | `controls/countryList.css` |
| `.legend-editor` | 20 | `controls/legendEditor.css` |
| `.color-picker` | 17 | `controls/colorPicker.css` |
| `.locate-country` | 13 | `controls/locateCountry.css` |
| `.selection-panel` | 12 | `controls/selectionPanel.css` |
| `.save-load-*` / `.saved-map*` (11 distinct prefixes) | 26 | `controls/saveLoad.css` |
| `.app` / `.workspace` / `.workspace--desktop` | 20 | **dissolves** into the new `editor.css` (D-11/D-16) |
| `.controls` / `.controls--app-bar` | 6 | `controls/controls.css` — and `--app-bar` becomes the new rail variant (C-13) |
| `.legend-disclosure` | 3 | `controls/legendEditor.css` |

For reference, `App.css` (336 lines) splits as: `.onboarding` (10), `.workspace*` (15),
`.app` (6), `.app-bar` (2 — **dies with D-11**), `.selection-live-region` (1 — **survives**,
see Pattern 4).

**Note the parser constraint:** `main.tsx:11-14` imports stylesheets explicitly, and
`phase2CssContract.test.ts:202-213` hard-codes the four filenames. A split into
`src/styles/controls/*.css` means both lists must be updated, and the successor contract test
should **glob** the directory rather than hard-code names — otherwise a new file silently escapes
every assertion. *That is itself a gate:* assert the globbed file count matches the count
imported by `main.tsx`.

### `prefers-color-scheme` — complete inventory (D-30 forbids it in the dark path)

| File:line | Kind | Disposition |
|---|---|---|
| `src/styles/theme.css:111` | `@media (prefers-color-scheme: dark) { :root { … } }` — **the dark palette** | **DELETE**, replaced by `.dark` |
| `src/styles/theme.css:144` | nested `@media (prefers-color-scheme: dark)` inside `@supports (backdrop-filter…)` — dark glass | **DELETE** with the glass family |
| `src/styles/theme.css:196` | `@media (prefers-contrast: more) and (prefers-color-scheme: dark)` | **REWRITE** as `.dark` + `@media (prefers-contrast: more)` |
| `src/styles/theme.css:13, 18, 159` | explanatory comments | Rewrite with the file |
| `src/styles/phase2CssContract.test.ts:215` | `const DARK_CONDITION = '@media (prefers-color-scheme: dark)';` | **REWRITE** to a `.dark` selector lookup |
| `src/styles/phase2CssContract.test.ts:221` | `CONTRAST_DARK_CONDITION` | **REWRITE** |
| `src/styles/phase2CssContract.test.ts:233` | comment | Rewrite |
| `tests/e2e/responsive.spec.ts:718` | `await page.emulateMedia({ colorScheme: 'light' });` | **REWRITE** to `.dark` toggling — see §Pitfall P-1 |
| `tests/e2e/responsive.spec.ts:759` | `await page.emulateMedia({ colorScheme: 'dark' });` | **REWRITE** |
| `tests/e2e/responsive.spec.ts:1025, 1048, 1052` | `colorScheme:` in the export-independence contexts | **REWRITE — highest priority.** See §Pitfall P-1 |

**Legitimate media queries that must NOT be swept:** `prefers-reduced-motion`
(`theme.css:335`), `prefers-reduced-transparency` (`theme.css:163`), `prefers-contrast`
(`theme.css:174`), `forced-colors` (`theme.css:204`). D-30 names `prefers-color-scheme` only.

### Snapshot catalog — the precise state (D-14 depends on getting this right)

`03-CONTEXT.md` D-14 says *"`SNAPSHOT_CATALOG` holds exactly one approved entry (`Modern`)"*.
The precise mechanics are two-layered and the planner should not conflate them:

- **`SNAPSHOT_CATALOG` is a five-entry *label registry*.** `src/constants/snapshots.ts:10-19`,
  verbatim:
  ```ts
  export const SNAPSHOT_CATALOG = [
    { id: MODERN_SNAPSHOT_ID, label: 'Modern — current borders' },
    { id: '1492', label: '1492 — Early modern Europe' },
    { id: '1700', label: '1700 — Post-Westphalia Europe' },
    { id: '1815', label: '1815 — Congress of Vienna' },
    { id: '1914', label: '1914 — Before World War I' },
  ] as const satisfies ReadonlyArray<{
    readonly id: SnapshotId;
    readonly label: string;
  }>;
  ```
  This is what Live Invariant 6 means by *"a manifest label can never override an approved
  catalog label"* — labels resolve **only** through here.
- **Reachability is decided by the approved manifest**, `public/data/snapshots/index.json`, which
  contains exactly one entry, `"id": "modern"`, `"reviewStatus": "source-reviewed"`. The hook
  reads it once and falls back to Modern-only on any failure —
  `src/hooks/useSnapshotCatalog.ts:46-49` comment, verbatim: *"Reads the live catalog once. A
  catalog that cannot be read leaves the selector on Modern only rather than inventing periods
  the app cannot render."*

**So D-14's "visibly inert period control" must render from the hook's `options` (currently one
item), not from `SNAPSHOT_CATALOG`.** Rendering the constant directly would make four deferred
snapshots nameable in the UI — a direct violation of Immutable Safety Constraint 3 and Live
Invariant 6. *Gate:* assert the rendered period control shows exactly the manifest-derived
options, and that no string from the four historical labels appears in the DOM. RED probe: render
`SNAPSHOT_CATALOG` directly.

## Runtime State Inventory

> Phase 3 is a refactor/rename phase (token names, class names, component boundaries), so this
> section is mandatory. Every category is answered explicitly.

| Category | Items found | Action required |
|----------|-------------|------------------|
| **Stored data** | `localStorage['countriesirl_maps']` (`src/constants/config.ts:4`) holds bounded V2 composition records — **untouched by this phase**; no token name, class name, or layout string is persisted. `localStorage['countriesirl_onboarding_dismissed']` (`config.ts:5`) is a boolean. **New keys arrive** for D-18 (last-open tool) and D-30 (theme). | **Code edit only, no data migration.** New keys must be additive and absent-tolerant: a returning creator has neither key, and D-18 already specifies the correct default (panel closed) and D-30 specifies light. Add both through `StorageAdapter`, never as new raw keys. |
| **Live service config** | **None — verified.** There is no backend, no deployment target, no external service (C-2; `coding-rules/general.md:234-238`). No dashboard, tunnel, workflow store, or hosted config exists to carry a stale name. | None. |
| **OS-registered state** | **None — verified.** No scheduled task, launchd plist, pm2 process, or systemd unit exists; the only run commands are the npm scripts in `package.json` (`dev`, `build`, `preview`, `lint`, `test`, `test:e2e`, `data:world:check`). | None. |
| **Secrets / env vars** | **None — verified.** `CLAUDE.md` §Stack states there is no `.env.local`, no secrets, no `VERCEL_URL`; `git grep` finds no `import.meta.env` consumption of a project-specific variable. | None. |
| **Build artifacts / installed packages** | `node_modules/` gains `motion` (and possibly `@fontsource-variable/inter`) — a plain install. **`.artifacts/playwright/`** holds downloaded PNGs and traces from prior runs; these are *stale export evidence* the moment D-25 lands and could be mistaken for post-restyle output. The directory is git-ignored (`coding-rules/export.md:501`). **`dist/`** from any prior `npm run build`. | `npm install` for the new dependency. **Clear `.artifacts/playwright/downloads/` before the first post-D-25 export run**, so no pre-restyle PNG can be cited as post-restyle evidence. Rebuild `dist/`. |

**The canonical question — what still holds the old string after every file is updated?**
For this phase the honest answer is: **almost nothing, because the retired names are CSS custom
properties and class names, which have no runtime store.** The two exceptions worth naming:

1. **Browser caches.** A creator (or an agent) running against a warm dev server can see the old
   stylesheet. Vite hashes assets on build, but `npm run dev` serves unhashed. Not a defect —
   worth a line in the plan's verification steps (hard reload before judging a visual change).
2. **The `02-28` acceptance evidence.** This is the one that matters and it is why D-31 exists.
   `git tag --list` returns **empty** and `git cat-file -t fe5f946060707c48c3d9591d368b5f3f8f90dd4d`
   returns `commit` [VERIFIED: run this session]. So the commit is reachable but **currently
   carries no tag** — D-31's first task is genuinely outstanding, and if the commit ever becomes
   unreachable the acceptance matrix loses its subject.

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---|---|---|---|
| Resolving a webfont inside the export clone | A custom "measure text and pick a fallback" heuristic, or reimplementing text layout | A base64 `@font-face` inside the serialised SVG (Pattern 1) — or, if that fails, accept the fallback and descope D-25 | Text metrics differ per family; any heuristic ships a *different* wrong answer per machine |
| Icon hover animation | Hand-rolled `requestAnimationFrame` glyph tweening | The vendored `motion` `useAnimation` + `useImperativeHandle` contract (D-28) | The contract already solves the ref-vs-self-hover conflict via `isControlledRef`; a hand-rolled version reintroduces double-triggering |
| Reduced-motion detection in JS | A bespoke `matchMedia('(prefers-reduced-motion: reduce)')` hook | `useReducedMotion()` from `motion/react` | Already a dependency; handles listener lifecycle and SSR-safety |
| Persisting rail/theme state | A new raw `localStorage` key | `StorageAdapter` (`storage.ts:71-88`), following the `ONBOARDING_DISMISSED_KEY` precedent | The adapter returns typed `storage-unavailable` / `quota-exceeded` reasons instead of throwing (`coding-rules/general.md:440-445`); a raw key crashes in Safari private mode and breaks gate (b) |
| CSS parsing in the contract test | A regex sweep over the stylesheet | The existing brace-walking `parseRules` + `assertParsableStyleSheet` (Pattern 8) | The comment at `phase2CssContract.test.ts:45-57` explains that a flat regex cannot see at-rule nesting — which is exactly where an accidental `--map-*` override hides |
| Contrast checking the new palette | Eyeballing, or a screenshot diff | `contrastRatio` / `relativeLuminance` already in the contract test (`:294-327`) | WCAG 2.2 relative luminance is already implemented and correct; NFR11 requires AA |
| Panel open/close animation | A JS height/width animator with `requestAnimationFrame` | A CSS transition on a registered custom property, or an instant snap | Animating `grid-template-columns` forces a full relayout of a 744-path SVG each frame |
| Subsetting the font | A hand-written glyph filter | A pre-subset latin woff2 (Fontsource ships one) or the full variable file | No subsetting toolchain is installed (§Environment Availability) and adding Python to a Node repo is disproportionate |

**Key insight:** in this repo the expensive mistakes are not missing libraries, they are
*assertions that cannot fail*. Three have already shipped (`coding-rules/general.md:199-210`).
Every "don't hand-roll" above is really "don't hand-roll the *gate*" — reuse the parser, the
contrast function, the `MutationObserver` clone inspection, and the discrimination-control
pattern that `coding-rules/export.md` already mandates.

## Common Pitfalls

### P-1 — The dark-mode switch silently disarms the export-independence gate

**What goes wrong.** `tests/e2e/responsive.spec.ts:1015-1052` — *"preference-independent export /
the PNG is identical across theme, forced colors, and device pixel ratio"* — flips theme with
`page.emulateMedia({ colorScheme: 'dark' })` (`:1048`) and `'light'` (`:1025, 1052`). After D-08
moves the flip to a `.dark` class, that emulation changes **no token at all**. The three exports
become trivially identical, the test passes, and Live Invariant 9 — *"`--map-*` are export
tokens… or the exported PNG starts following the viewer's theme"* — loses its only browser-level
guard.

**Why it happens.** The test's subject is "theme", but its lever is "media query". The switch
changes the lever without changing the assertion, so nothing looks broken.

**How to avoid.** Rewrite the test to toggle `.dark` on the editor mount root **and** keep the
forced-colors / DPR dimensions. Then RED-probe it properly: temporarily add
`--map-surface: #101010` inside the `.dark` block, run, watch the export comparison fail, restore
from a scratchpad copy (never `git checkout --`, per `coding-rules/general.md:380-396`). If it
does **not** fail, the test is still disarmed.

**Warning signs.** The test runs faster than before. The diff for `03-08` touches
`responsive.spec.ts` only in the `emulateMedia` lines. Nobody recorded a RED observation for it.

The same disarming applies, less severely, to
`tests/e2e/responsive.spec.ts:714` (*"dark preference restyles chrome and leaves the composition
square white"*) — its whole premise is the media query.

### P-2 — Re-toning a `--map-*` token inside `.dark`

**What goes wrong.** D-08 says *"tokens flip themselves; no per-component dark overrides"*, and
Themely's Design.md reinforces it. Applied mechanically to `theme.css`, that invites putting
**every** token in both blocks — including `--map-surface`, `--map-fill-default`,
`--map-fixed-text`, `--tooltip-*`, `--swatch-border`. The exported PNG then follows the viewer's
theme, which is precisely Live Invariant 9's failure mode.

**Why it happens.** The Themely rule and the CountriesIRL invariant genuinely conflict on this
one token family, and the Themely rule is the louder of the two in the CONTEXT document.

**How to avoid.** `theme.css`'s existing header comment already states the rule
(`theme.css:3-7`) and the current dark block deliberately contains no `--map-*` token
(`theme.css:108-110` comment: *"Dark changes editor chrome only… the composition square and the
exported PNG stay fixed and opaque"*). Carry both comments forward into the `.dark` block.
The mechanical guard is `phase2CssContract.test.ts:528-545` — carry it forward and confirm by
RED probe that it fires on a `--map-*` declaration inside `.dark`.

**Note the discretion boundary.** `03-CONTEXT.md` §Claude's Discretion explicitly leaves open
*"whether `--map-fixed-text` and the map's own surfaces re-tone onto Themely tokens or stay
fixed — bearing in mind D-25's export consequence."* **Recommendation: keep them fixed.** Any
re-tone changes exported pixels for every existing saved composition, and D-25 already spends
the phase's one deliberate export-pixel change on the legend typeface. Phase 4 owns the map's
visual language (the warm-paper idea is deferred there).

### P-3 — "Tokenize the legend" breaks export theme-independence with no test firing

**What goes wrong.** `LegendOverlay.tsx` hard-codes its colours as TS literals —
`LegendOverlay.tsx:65-74` declares `THEME_COLORS` with `background: '#FFFFFF'`,
`text: '#111827'`, `border: '#CBD5E1'` for the light legend theme (and a dark counterpart), and
`:313-314` gives the swatch `stroke="#9CA3AF" strokeWidth="2"`. A tidy-minded restyle converts
these to `var(--themely-…)`. Because the legend is **inside** the exported composition, the PNG
then follows the viewer's theme.

**Why it happens.** `themeTokens.test.ts:90-101` reads as a blanket "no colour literals" rule —
but it scans **only** two CSS files (`:95-96`) and never touches `.tsx`. So the literals in
`LegendOverlay.tsx` look like an oversight rather than a deliberate export-fixed choice.

**How to avoid.** When adding the new "no hex literal in `.tsx`" assertion (Pattern 8, new
assertion 4), give `LegendOverlay.tsx` an **explicit, commented exemption** naming the reason.
An unexplained exemption is how the next author "fixes" it. Note that the legend's `light`/`dark`
here is a *creator-chosen legend theme*, not the app's colour scheme — a name collision that
makes this confusion likelier once `.dark` exists.

### P-4 — Changing legend typography without changing the line-wrap heuristic

**What goes wrong.** The legend wraps labels by **character count**, not by measured width.
`LegendOverlay.tsx:39-43` declares `LEGEND_CHARACTERS_PER_LINE` as
`{ small: 24, medium: 18, large: 14 }`, and `src/utils/legend.ts:69-73` declares a second copy,
`LABEL_CHARACTERS_PER_LINE`, with the same values. Advance widths are a property of the typeface;
switching from a system fallback to Inter at a new weight and tracking changes them. A label that
fitted becomes one that overflows the legend box — **and legend overflow clipping the PNG is a
defect this project has already shipped once** (`STATE.md:120`).

**Why it happens.** The heuristic is invisible from the styling change; nothing links "font
changed" to "characters per line".

**How to avoid.** Treat the two constants as part of D-25's blast radius. Re-derive them from the
worst-case advance width at the new size/weight, and gate on the *rendered* result:
`resolveLegendRender`'s overflow path already produces `LEGEND_OVERFLOW_MESSAGE`
(`ToastRegion.tsx:2-5` imports it), so an e2e assertion can drive a maximum-length label at
`large` and assert the exported legend region stays inside the safe inset. Also **note the
duplication itself** — two copies of the same table is a drift hazard worth collapsing while the
file is open.

### P-5 — Tailwind recipes copied instead of translated

**What goes wrong.** `themely/Design.md` and `app-sidebar.tsx` express everything as Tailwind
utilities (`bg-themely-porcelain`, `text-body-sm`, `rounded-lg`, `size-5`). CountriesIRL has no
Tailwind. Copied class names produce unstyled elements that *look* wired up.

**Why it happens.** D-01 says "adopt wholesale", and the reference implementations are the most
concrete artifacts in the CONTEXT.

**How to avoid.** `03-01`'s `Design.md` is the translation table: for each Themely recipe, record
the CSS equivalent. E.g. `PrimaryNavRow`'s
`'flex h-9 w-full items-center whitespace-nowrap rounded-lg text-body-sm'` +
`'text-themely-nav-ink hover:bg-themely-porcelain'` + `active && 'bg-themely-powder'`
(`themely/src/components/app-sidebar.tsx:611-614`) becomes a `.tool-rail__row` rule with
`block-size: 36px`, `border-radius: 8px`, the `--text-body-sm` role bundle, `color:
var(--themely-nav-ink)`, and `:hover { background: var(--themely-porcelain) }` **with no
`transition`** (D-29). *Gate:* a test asserting no `.tsx` under `src/` contains a Tailwind-shaped
class token (e.g. `/\b(bg|text|rounded|size)-themely-/`). RED probe: paste one in.

### P-6 — Importing Themely's Google Fonts `@import`

**What goes wrong.** `themely/src/app/globals.css:1` opens with
`@import url('https://fonts.googleapis.com/css2?family=Anton&…&family=Inter:wght@300;400;500;600;700&…')`.
Copying globals.css "verbatim" (D-03 says token *names* verbatim, but the temptation is broader)
imports a cross-origin runtime request.

**Why it happens.** globals.css is named as the authoritative upstream, and line 1 is easy to
carry along.

**How to avoid.** C-1 is absolute: *"No runtime third-party network request… A request to another
origin at runtime is a defect, not an optimization."* Themely's own Inter comes from
`next/font/google`, which self-hosts (`themely/Design.md:87`); the `@import` line is for the
*video-output caption fonts* (Anton, Bebas Neue, Lora, …), which `Design.md:95` explicitly
forbids in chrome anyway. **None of those fonts belong here.** *Gate:* assert no stylesheet
contains `@import url(http`. RED probe: add one.

### P-7 — Two roving-tabindex writers

**What goes wrong.** A tool rail is a natural place to implement arrow-key navigation with a
roving tabindex. A second writer fights the existing one, and focus lands in unpredictable
places after a panel opens.

**Why it happens.** `03-CONTEXT.md` §Established Patterns records the single writer was *restored*
in commit `074173e` — meaning it has already been broken once.

**How to avoid.** The rail's rows should be ordinary tab stops unless there is a strong reason
otherwise. If arrow navigation is wanted, extend the existing writer rather than adding one.
The CONTEXT is explicit that keyboard reachability and focus movement into the opened panel are
covered by this existing invariant and were not re-decided *because they are already binding*.

### P-8 — Re-baselining export fixtures silently

**What goes wrong.** D-25 changes exported pixels. Every export assertion that encodes a measured
value gets "updated" as part of making the suite green, and the deliberate act disappears into a
diff.

**Why it happens.** It is the path of least resistance, and the tests will genuinely be failing.

**How to avoid.** `coding-rules/export.md:452-455` already states the rule: *"Pick thresholds with
a real margin over the measured value, and record the measured value in the same change so the
next author can tell a regression from a threshold that was always tight."* Extend it: the
re-baseline lands as **its own commit** whose message names D-25 and records the before/after
measured values, separate from the styling commit. The known measured references to re-cut are
in `export.md:456-463`: France ≈ 1.1k map pixels, Germany ≈ 1.2k, one legend swatch ≈ 570 corner
pixels at a 1.5× world camera; and the content floors at `export.md:446-449`
(`MIN_NON_WHITE_PIXELS` ≈ 71k actual, `MIN_APPLIED_RED_PIXELS` ≈ 1.1k actual).
**Legend-swatch counts are the ones that move** — swatch geometry is unchanged
(`LegendOverlay.tsx:22-23`: `LEGEND_SWATCH_SIZE = 24`, `LEGEND_SWATCH_LABEL_GAP = 16`), so if the
swatch pixel count changes materially, something other than typography moved and that is a
finding, not a baseline.

### P-9 — Treating `02-28` as satisfiable from a restyled build

**What goes wrong.** The acceptance matrix's automatable cells look re-runnable at HEAD.

**How to avoid.** D-31 plus Immutable Safety Constraint 8. The matrix binds `fe5f946`; it is
performed against the tag, never HEAD, and **no cell may be filled from a restyled build**.
`git tag --list` is currently empty, so the tag genuinely does not exist yet — this is `03-01`
task 1, before any other Phase 3 commit lands.

## Code Examples

### Reference: the Themely nav-row recipe to translate (D-16, D-29)

```tsx
// Source: /Users/matul/claudeprojects/themely/src/components/app-sidebar.tsx:594-628
const iconRef = React.useRef<AnimatedIconHandle>(null)
const reducedMotion = useReducedMotion()
// …
    onMouseEnter={(e) => {
      onMouseEnter?.(e)
      if (!reducedMotion) iconRef.current?.startAnimation()
    }}
    onMouseLeave={(e) => {
      onMouseLeave?.(e)
      iconRef.current?.stopAnimation()
    }}
    className={cn(
      'pointer-events-auto flex h-9 w-full items-center whitespace-nowrap rounded-lg text-body-sm',
      'text-themely-nav-ink hover:bg-themely-porcelain',
      active && 'bg-themely-powder',
      className,
    )}
// …
    <span className="flex h-8 w-8 shrink-0 items-center justify-center">
      {AnimatedIcon ? (
        <AnimatedIcon ref={iconRef} size={20} className="flex items-center justify-center" />
      ) : (
        <Icon className="size-5" strokeWidth={1.5} />
      )}
    </span>
```

Note the three load-bearing details: hooks live in the row component (they cannot live in a
`.map` loop), `startAnimation()` is reduced-motion-gated while `stopAnimation()` is not, and the
animated icon is sized by the `size` **prop** while the static one uses a class.

### Reference: the vendored animated-icon shape (D-28)

```tsx
// Source: /Users/matul/claudeprojects/themely/src/components/ui/square-pen.tsx
export interface SquarePenIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}
// …
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });
// …
        <svg
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          // vendored from lucide-animated; strokeWidth patched 2→1.5 (house icon recipe) — re-running shadcn add overwrites this patch
          strokeWidth="1.5"
          style={{ overflow: "visible" }}
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
```

The marker comment is part of the contract, not decoration — `frontend.md:125` requires it on
every vendored file.

### Reference: the exact `.dark` values to mirror (D-08)

```css
/* Source: /Users/matul/claudeprojects/themely/src/app/globals.css:319-341 */
.dark {
  --themely-apple-blue:       #2997ff;
  --themely-apple-blue-hover: #1a7fd4;
  --themely-platinum:         #000000;
  --themely-porcelain:        #16181c;
  --themely-powder:           #1d1f23;
  --themely-midnight-ink:     #e7e9ea;
  --themely-slate-blue:       #8b9099;
  --themely-nav-ink:          #ffffff;
  --themely-ghost-gray:       #71767b;
  --themely-stone-gray:       #2f3336;
  --themely-red:              #ff6b6b;
  /* Fixed (non-flipping) tokens — 1:1 mirror of :root; values identical by design (27.10-01). */
  --themely-on-accent:        #ffffff;
  --themely-media-backdrop:   #000000;
  --themely-on-media:         #ffffff;
}
```

Light values are `themely/src/app/globals.css:178-199`; both match `Design.md:37-52`. Where
`Design.md` and `globals.css` disagree, `globals.css` wins (03-CONTEXT §Canonical References) —
**they do not disagree on any token this phase adopts.**

### Reference: the elevation model that replaces the shadows (D-06)

```
/* Source: /Users/matul/claudeprojects/themely/Design.md:321-325 (§Elevation) */
Card (default):            hairline only — 0 0 0 1px var(--themely-stone-gray) / 60%
Popover / dropdown:        0 4px 12px -2px rgba(6,27,49,0.10)   — var(--popover-shadow)
Dialog / modal:            0 10px 40px -10px rgba(6,27,49,0.20)
Hovered draggable:         translateY(-1px) + subtle popover-tier shadow
```

Dark counterpart for the popover shadow, since ink-tinted rgba is invisible on near-black —
`themely/src/app/globals.css:357`, verbatim:
`--popover-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.45);`

## State of the Art

| Old approach (Phase 2) | Current approach (Phase 3) | Why it changed | Impact |
|---|---|---|---|
| `@media (prefers-color-scheme: dark)` flips the palette | `.dark` class on the editor mount root | A host must be able to control the theme; an OS listener fights it (D-08/D-30) | Every dark assertion in CSS **and** in `responsive.spec.ts` changes lever — see P-1 |
| Translucent glass chrome behind `@supports (backdrop-filter)`, with four preference blocks restoring opacity | Flat surfaces with Stone Gray hairlines; drop shadow only on floating chrome | Themely's stated model (`Design.md:142`, `:298`) | Deletes ~64 token references and an entire preference matrix; simplifies the contract test substantially |
| Slate/teal accent `#0f766e` | Apple Blue `#0071e3`, **one accent surface per surface** | D-04/D-05 | The rail gets exactly one blue fill (Export, D-13); the theme toggle beside it stays neutral (D-30) |
| Four raw size tokens (`--font-label/body/heading/display`) | Ten role tokens bundling size + line-height + weight + tracking | Themely's type scale (`Design.md:101-113`) | Tuning one role updates every usage; `--weight-*` tokens become redundant |
| Motion values split between CSS vars and TS literals | `--motion-*` CSS vars + a TS mirror pinned by a lockstep test | D-26 | Removes the class of bug where `--motion-camera` was declared, gated by reduced-motion, and read by nothing (`phase2CssContract.test.ts:713-719`) |
| App bar + right inspector column (376px) | Full-bleed canvas + left icon rail (56px) + single flyout (280px) | D-11/D-16/D-19 | Retires the `minmax(0, 1fr) 376px` grid and the 1440px measure; `03-02`'s "collapsible column" is superseded (Amendment 2) |
| Inter named in the font stack, never loaded | Inter Variable self-hosted, and separately embedded in the export clone | D-09/D-25 | **The legend's exported typeface changes for the first time since Phase 1** |

**Deprecated / outdated in this repo after Phase 3:**
- `--glass-*`, `--shadow-inspector`, `--shadow-navigation`, `--border-strong`, `--accent*`,
  `--text-*`, `--surface-*`, `--font-label/body/heading/display`, `--weight-*` — deleted, not
  aliased (D-06/D-10), so stale references fail loudly.
- `phase2CssContract.test.ts` — superseded by `uiContract.test.ts`; its parser survives.
- `CompositionBar` as a component — dissolves (D-11); its exported ids and its live region move
  (D-15).
- The `@import url('https://fonts.googleapis.com/…')` idiom from Themely — never valid here (C-1).

## Assumptions Log

> Every claim in this document tagged `[ASSUMED]`. The planner must not treat any of these as
> settled; each needs confirmation before it becomes a locked plan step.

| # | Claim | Section | Risk if wrong |
|---|---|---|---|
| A1 | A base64 `@font-face` inside a `<style>` in an SVG-as-image **is honoured by Chrome and Edge**. Supported by two secondary sources but **not verified in a real browser this session**. | Pattern 1, OQ-1 | **High.** D-25's entire mechanism fails; exported legend text silently stays in a system fallback while the structural gate passes. Mitigated only by the Part-2 discrimination control. |
| A2 | `@fontsource-variable/inter@5.3.0` ships a latin-subset woff2 at a path resembling `files/inter-latin-wght-normal.woff2`. Package version and existence are verified; **the internal file path is not** — I did not install it. | Standard Stack | Low. An executor lists the directory in seconds. Named here only so the plan does not hard-code a guessed path. |
| A3 | A latin-subset Inter Variable woff2 is roughly 100–200 KB, ~130–270 KB once base64-encoded. **Not measured** — no font file exists in the repo or in either node_modules tree. | Pattern 1 | Low–medium. If the real file is much larger, inlining it into the JS bundle becomes a judgement call rather than an obvious yes. Measure before committing to `?inline`. |
| A4 | `motion@12.43.0` behaves identically to Themely's installed `12.40.0` for `useAnimation` / `useImperativeHandle` / `useReducedMotion`. Peer ranges and the export surface are verified; **the 12.40→12.43 changelog was not read.** | Standard Stack | Low. Pinning `12.40.0` exactly — matching Themely — removes this assumption entirely and is the safer choice. |
| A5 | Transitioning a registered custom property is smoother than transitioning `grid-template-columns` for the panel. Reasoned from how layout works, **not profiled** on this 744-path SVG. | Pattern 3 | Low. Worst case the panel snaps instantly, which D-29's spirit arguably prefers anyway. |
| A6 | Microsoft Edge is not installed on this machine, so `npm run test:e2e` cannot complete its `msedge` project here. Based on `/Applications` having no `Microsoft*.app` and `mdfind` returning nothing. **Contradicts `STATE.md`, which records Edge 150 at 71/71 for `fe5f946`** — so either the machine changed or my probe missed it. | Environment Availability | Medium. If true, every "full gate" claim in Phase 3 is Chrome-only and must say so (C-9). Confirm before the `03-10` gate is planned. |
| A7 | Splitting `Controls.css` along the block-prefix boundaries listed is the natural seam. Derived from counting top-level selector prefixes, **not from reading all 1128 lines.** | Current-State Inventory | Low. Some rules will cross-cut; the split is a starting point, not a specification. |
| A8 | `--easing-control: ease-out` maps most sensibly onto Themely's `--motion-ease-snappy`. A judgement call — the values are **not** byte-equal, unlike the three genuine matches. | Pattern 5 | Low, but it is a visible retime of control micro-feedback. Record it as deliberate rather than letting it read as a rename. |

## Open Questions

### OQ-1 — Does a data-URI `@font-face` actually resolve inside an SVG-as-image in Chrome/Edge? **(blocking for D-25)**

- **What we know.** html2canvas 1.4.1 definitively routes the whole map SVG through
  `data:image/svg+xml` + `<img>` [VERIFIED: source, quoted in Pattern 1]. Browsers block network
  requests from SVG-as-image, so an external font never loads; a base64 data URI inside the SVG
  is the documented workaround, and WebKit is the documented exception
  [CITED: supercodepower.com, oreillymedia.github.io].
- **What's unclear.** Whether current Chromium honours it *in this exact configuration* — a
  `<style>` inside an inline-serialised SVG whose data URL is `encodeURIComponent`-escaped rather
  than base64-escaped (note `export.ts` does not control that escaping; html2canvas does, at
  `:4562`). A very long base64 `src` inside a `encodeURIComponent`'d data URL is an unusual shape
  and could hit a URL-length or parsing limit.
- **Recommendation.** **A throwaway spike before `03-01` locks legend typography.** A single
  Playwright test: build a minimal SVG with an embedded base64 font, serialise it exactly the way
  html2canvas does, rasterise, and compare pixels against the same SVG with the `@font-face`
  removed. ~30 lines, decides the whole of D-25. If it comes back negative, escalate to the owner
  with the two fallbacks from §Alternatives Considered (outline the legend text, or descope D-25
  to chrome-only Inter). **Do not plan the legend restyle in detail before this returns.**

### OQ-2 — What does "full-bleed canvas" mean when the composition is a fixed 1080 square?

- **What we know.** On-screen SVG is `viewBox="0 0 1080 1080"` with
  `preserveAspectRatio="xMidYMid meet"` (`MapCanvas.tsx:839-840`); the container
  `.map-workspace__square` is `aspect-ratio: 1` (`MapCanvas.css:91-103`); the export clone
  re-asserts the same square (`export.ts:277-278`); and the contract test asserts the square's
  `aspect-ratio: 1` / `background: var(--map-surface)` / `overflow: hidden`
  (`phase2CssContract.test.ts:1016-1025`).
- **What's unclear.** D-11 says the canvas is "full-bleed edge to edge" and D-21 puts floating
  controls bottom-right in the Google-Maps idiom — but a 1080 square in a wide viewport under
  `meet` is letterboxed, and switching to `slice` or a non-square viewBox breaks WYSIWYG against
  the exported PNG. CONTEXT.md does not decide this.
- **Recommendation.** Ship **option (a): a full-bleed *surface* with a centred square
  composition.** The rail/panel/controls float over an edge-to-edge neutral field; the square
  itself stays the composition and stays WYSIWYG. It satisfies the Google-Maps *feel* (no top
  chrome, pannable, floating controls) without touching the export contract at all, and it keeps
  `phase2CssContract.test.ts:1016-1025` meaningful. If the owner wants the map itself to bleed,
  that is option (b) and it requires an explicit, visible export-frame guide (`data-editor-only`)
  plus a re-decision on what the camera means — materially more work and a WYSIWYG risk.
  **Surface this in `03-02` as an explicit decision, not an implementation detail.**

### OQ-3 — Where exactly does the `.dark` class live, given `html`/`body` carry the page background?

- **What we know.** `theme.css:227-238` sets `background: var(--surface-page)` on both `html` and
  `body`. Those are outside any editor mount root. D-30 forbids writing the class to
  `document.documentElement`.
- **What's unclear.** Whether the standalone app is allowed to paint its own page background at
  all, or whether the editor root must be `100dvh` and fully opaque.
- **Recommendation.** Make the editor root full-bleed and opaque (D-11 requires this anyway), and
  reduce `html`/`body` to layout-only rules with no themed background. This makes the mount-root
  contract honest: everything the editor paints is inside its own subtree, which is exactly what
  a host needs. Record it as a transition-readiness sub-gate.

### OQ-4 — What is the pinned exact `motion` version?

- **What we know.** D-27 says v12; latest 12.x is `12.43.0`; Themely runs `12.40.0`.
- **Recommendation.** **Pin `12.40.0`** — byte-matching the repo the icons are vendored from
  removes A4 entirely and costs nothing. Either way, pin exactly, never a caret.

### OQ-5 — Do the two duplicated characters-per-line tables get collapsed?

- **What we know.** `LegendOverlay.tsx:39-43` and `src/utils/legend.ts:69-73` hold the same
  `{ small: 24, medium: 18, large: 14 }` mapping under different names.
- **Recommendation.** Collapse to one exported constant while D-25 is already touching legend
  typography (P-4). It is a drift hazard, and drift here clips the PNG.

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|---|---|---|---|---|
| Node | Build, Vitest, scripts | ✓ | `v26.5.0` | — |
| npm | Dependency install | ✓ | `11.17.0` | — |
| Vite | `?inline` font import, build | ✓ | `8.1.5` | — |
| Vitest | Contract tests, motion lockstep | ✓ | `4.1.10` (`package.json`) | — |
| Playwright | E2E, the D-25 pixel gate | ✓ | `1.61.1` | — |
| Google Chrome | `chrome` Playwright project | ✓ | present at `/Applications/Google Chrome.app` (version not probed) | — |
| Microsoft Edge | `msedge` Playwright project (`playwright.config.ts` projects) | **✗** | — | **None.** See below. |
| `motion` | D-27/D-28 | ✗ (not yet installed) | `12.40.0` recommended | — |
| Inter Variable woff2 | D-09/D-25 | **✗** — no font file exists anywhere in the repo | — | System fallback stack (the status quo) |
| `fontTools` / `pyftsubset` | Optional font subsetting | ✗ (`python3` is `3.9.6`; `import fontTools` → `ModuleNotFoundError`) | — | Use a pre-subset woff2; do not add a Python build step |
| `glyphhanger` / `subfont` | Optional font subsetting | ✗ (not on PATH) | — | Same |
| git tag `acceptance-02-28` | D-31 | **✗** — `git tag --list` returns empty | — | None; this is `03-01` task 1. `fe5f946060707c48c3d9591d368b5f3f8f90dd4d` is a valid, reachable commit object. |

**Missing dependencies with no fallback:**
- **Microsoft Edge.** `playwright.config.ts` declares a `msedge` project using `channel: 'msedge'`
  (system Edge, not a Playwright-managed browser). `/Applications` contains no `Microsoft*.app`
  and `mdfind -name "Microsoft Edge.app"` returns nothing; `~/Library/Caches/ms-playwright`
  contains only `ffmpeg-1011`, so no bundled Chromium is downloaded either. **On this machine
  `npm run test:e2e` will run Chrome only and the `msedge` project will fail to launch.**
  This directly contradicts `STATE.md`, which records Edge 150 at 71/71 for `fe5f946` — so treat
  it as *unconfirmed on this machine* rather than as a fact about the project (A6). **The plan
  must either install Edge before `03-10`, or state plainly that the phase gate is Chrome-only.**
  Per C-9, an un-run browser may never be reported as passed.

**Missing dependencies with fallback:**
- **Inter woff2** — the fallback is the current behaviour (system font). That fallback *is* the
  D-25 descope, so choosing it is an owner decision, not an executor's.
- **Subsetting toolchain** — fall back to a pre-subset file or the full variable font.

## Validation Architecture

`.planning/config.json` declares no `workflow.nyquist_validation` key, so validation is enabled.
No numbered REQ IDs were supplied for this phase; the roadmap's plan IDs `03-01`…`03-10` are the
units, and the map below uses those.

### Test Framework

| Property | Value |
|---|---|
| Unit framework | Vitest `4.1.10`, **`node` environment, no DOM** |
| Unit config | `vitest.config.ts` — `environment: 'node'`, `include: ['src/**/*.test.{ts,tsx}']`, `exclude: ['.claude/**']` |
| E2E framework | Playwright `1.61.1`, `testDir: './tests/e2e'`, `fullyParallel: false`, `workers: 1`, `retries: 0` |
| E2E projects | `chrome` (`channel: 'chrome'`), `msedge` (`channel: 'msedge'`) — **see Environment Availability** |
| Quick run | `npm test` |
| Full suite | `npm run lint && npm test && npm run build` then `npm run test:e2e` |
| Current unit baseline | 516/516 across 38 files at `fe5f946` (`STATE.md:8`) |
| Current E2E baseline | Chrome 71/71, Edge 71/71 at `fe5f946` (`STATE.md:8`) |

### Plan → Test Map

| Plan | Behaviour | Test type | Command | File exists? |
|---|---|---|---|---|
| `03-01` | `fe5f946` is annotated-tagged before any Phase 3 commit | manual + `git tag --list` check | `git tag --list \| grep acceptance-02-28` | ❌ Wave 0 |
| `03-01` | **OQ-1 spike**: data-URI font resolves in SVG-as-image | e2e (throwaway) | `npx playwright test tests/e2e/spike-export-font.spec.ts --project=chrome` | ❌ Wave 0 |
| `03-01` | Motion CSS↔TS lockstep | unit | `npx vitest run src/lib/motion/tokens.test.ts` | ❌ Wave 0 |
| `03-02` | Rail/panel structural contract; panel reserves space | unit (CSS contract) + e2e (measured widths) | `npx vitest run src/styles/uiContract.test.ts` | ❌ Wave 0 |
| `03-03` | New palette exact values; **zero retired token names**; namespace allowlist | unit | `npx vitest run src/styles/uiContract.test.ts` | ❌ Wave 0 (replaces `phase2CssContract.test.ts`) |
| `03-03` | No `prefers-color-scheme` in the dark path (D-30) | unit | same | ❌ Wave 0 |
| `03-03` | `:root` ↔ `.dark` token parity; fixed tokens identical in both | unit | same | ❌ Wave 0 |
| `03-04` | `legendSlot`/`navigationSlot` contract preserved; export membership unchanged | unit (`MapWorkspace.test.tsx` exists) + e2e | `npx vitest run src/components/MapWorkspace.test.tsx` | ✅ extend |
| `03-04` | One mountable editor behind a props boundary; no stray `document`/`window` | unit (text + `renderToStaticMarkup`) | `npx vitest run src/components/editor/` | ❌ Wave 0 |
| `03-04` | Single `/data/` config home; `historicalValidation` predicates exempted | unit (grep gate) | `npx vitest run src/config/` | ❌ Wave 0 |
| `03-05` | `Controls` gains a rail variant, never a copy (C-13) | unit (`Controls.test.tsx` exists) | `npx vitest run src/components/Controls.test.tsx` | ✅ extend |
| `03-05` | Colour workflow + keyboard/focus order in the rail | e2e | `npx playwright test tests/e2e/responsive.spec.ts` | ✅ rewrite |
| `03-06` | Period status live region rehomed; `aria-describedby` still resolves (D-15) | unit (markup assertion, mirrors `App.test.tsx:274-276`) | `npx vitest run src/App.test.tsx` | ✅ extend |
| `03-06` | Period control renders manifest options only — no historical label in the DOM (D-14) | e2e | `npx playwright test tests/e2e/history.spec.ts` | ✅ extend |
| `03-06` | Last-open tool + theme persist through `StorageAdapter`; one `localStorage` site | unit (grep gate + `storage.test.ts`) | `npx vitest run src/utils/storage.test.ts` | ✅ extend |
| `03-07` | Kosovo cursor discipline: colorable `pointer`, non-colorable `default`; tooltip states the honest reason (D-23) | e2e | `npx playwright test tests/e2e/navigation.spec.ts` | ✅ extend |
| `03-07` | Floating map controls carry no accent (D-05/D-21) | unit (CSS contract) | `npx vitest run src/styles/uiContract.test.ts` | ❌ Wave 0 |
| `03-08` | 360px containment, 200%-equivalent, reduced-motion, reduced-transparency in the new chrome | e2e | `npx playwright test tests/e2e/responsive.spec.ts` | ✅ rewrite |
| `03-08` | **Export identical across `.dark`, forced-colors, DPR** — rewritten off `emulateMedia` | e2e | `npx playwright test tests/e2e/responsive.spec.ts -g "preference-independent"` | ✅ **rewrite — P-1** |
| `03-09` | Selector inventory shrinks; globbed stylesheet count matches `main.tsx` imports | unit | `npx vitest run src/styles/uiContract.test.ts` | ❌ Wave 0 |
| **D-25** | Export clone contains the embedded `@font-face` (structural) | e2e (`MutationObserver`) | `npx playwright test tests/e2e/export.spec.ts` | ✅ extend |
| **D-25** | **Disabling the embedded font changes legend-region pixels** (discrimination control) | e2e | `npx playwright test tests/e2e/export.spec.ts` | ❌ Wave 0 — **the load-bearing gate** |
| **D-25** | Re-baselined legend pixel counts recorded with measured values | e2e | `npx playwright test tests/e2e/final-integration.spec.ts` | ✅ re-baseline |
| `03-10` | Full gate, independent non-author review | manual + full suite | `npm run lint && npm test && npm run build && npm run test:e2e` | ✅ |

### Sampling Rate

- **Per task commit:** `npm test` (unit only, `node` env, seconds).
- **Per wave merge:** `npm run lint && npm test && npm run build`.
- **Per wave touching render / camera / export / persistence / layout:** add
  `npm run test:e2e` (per `CLAUDE.md` §Commands — which is every wave in this phase).
- **Phase gate:** full suite green on **every configured project**, or an explicit written
  statement of which browser was not run (C-9).

### Wave 0 Gaps

- [ ] `tests/e2e/spike-export-font.spec.ts` — **OQ-1**, throwaway; must run before D-25 is planned
- [ ] `src/lib/motion/tokens.ts` + `src/lib/motion/tokens.test.ts` — D-26 lockstep
- [ ] `src/styles/uiContract.test.ts` — successor to `phase2CssContract.test.ts`; port the parser
      and helpers verbatim (Pattern 8)
- [ ] `src/config/editorConfig.ts` + its grep gate — transition-readiness (c)
- [ ] `src/components/editor/` + boundary gate — transition-readiness (a)
- [ ] Grep gate: exactly one `localStorage` site under `src/` — transition-readiness (b)
- [ ] Grep gate: no `documentElement.classList` under `src/` — transition-readiness (e)
- [ ] Grep gate: no Tailwind-shaped class token in any `.tsx` — P-5
- [ ] Grep gate: no `@import url(http` in any stylesheet — P-6
- [ ] Vendored-icon marker-comment + `strokeWidth="1.5"` assertion — D-28
- [ ] Export discrimination control for the embedded font — **D-25's only real gate**
- [ ] Rewrite of `tests/e2e/responsive.spec.ts` preference blocks off `emulateMedia({colorScheme})`
      onto `.dark` — **P-1**

**Every one of the above must be broken once and observed RED before landing (C-3), and the RED
observation restored by copying from a scratchpad, never `git checkout --`
(`coding-rules/general.md:380-396`).**

## Security Domain

`.planning/config.json` declares no `security_enforcement` key, so it is treated as enabled.
The application is browser-only, localhost-only, with no backend, no auth, and no network origin
other than itself (C-1, C-2).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard control |
|---|---|---|
| V2 Authentication | **no** | No auth exists or is authorized. Adding auth awareness is explicitly the future host's job (`ROADMAP.md:232`). |
| V3 Session Management | **no** | No sessions; state lives in memory and `localStorage`. |
| V4 Access Control | **no** | Single-user, single-origin, no privileged operations. |
| V5 Input Validation | **yes** | Unchanged by this phase but still live: bounded V2 records checked **before** `JSON.parse` (`storage.ts:45-47`), `isSafeStableCountryId`, `normalizeColor`, `validateSnapshotManifest`, and the export filename sanitiser (`export.ts:307-315`, six ordered steps per `coding-rules/export.md:249-257`). **Phase 3 must not route any new user input around these.** The one new input surface is the legend label field moving into the rail — it keeps `MAX_LEGEND_LABEL_LENGTH` (`storage.ts:51`). |
| V6 Cryptography | **partial** | SHA-256 asset integrity for the world data (`world-manifest.json`, `npm run data:world:check`). Never hand-rolled; unchanged by this phase. **If the plan adopts a vendored font file, consider extending the same manifest-hash discipline to it** — the bytes end up in every exported PNG. |
| V12 Files & Resources | **yes** | The exported PNG filename is fully sanitised and the date/suffix are never derived from user input (`export.ts:317-327`). Downloads land under `.artifacts/playwright/` in tests only (`coding-rules/export.md:501`). |
| V14 Configuration | **yes** | The `?inline` font import and the new `motion` dependency are the phase's only supply-chain surface. See §Package Legitimacy Audit. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard mitigation |
|---|---|---|
| Supply-chain: a compromised release of a newly added dependency | Tampering | Pin exact versions (`motion@12.40.0`), no caret; `postinstall` verified absent; `checkpoint:human-verify` before install |
| Cross-origin font/CDN request smuggled in with the design system (P-6) | Information disclosure | C-1 forbids it; add the `@import url(http` grep gate |
| `localStorage` poisoning → oversized or deeply nested JSON | Denial of service | Already mitigated: length/depth/node budgets enforced **before** `JSON.parse` (`storage.ts:45-47`, `hasSafeJsonBudget` at `:176+`). New D-18/D-30 keys must go through the same adapter, not around it. |
| Unbounded string reaching a creator-facing surface (hashes, paths, DOM exception names) | Information disclosure | `ToastRegion`'s allowlist boundary (C-7); every new Phase 3 message must be added to it explicitly |
| Malformed GeoJSON crashing the app | Denial of service | Validate on load, skip malformed entries with a warning, never crash (`CLAUDE.md` §Guardrails) — unchanged |
| A base64 data-URI font enlarging the JS bundle enough to degrade load | Denial of service (self-inflicted) | Measure the real file (A3) before committing to `?inline`; a latin subset, not the full family |

**No new attack surface is introduced by the layout work itself.** The two genuinely new
security-relevant facts are the added npm dependency and the inlined font bytes; both are
addressed above.

## Sources

### Primary (HIGH confidence — read from source this session)

**CountriesIRL (this repo):**
`src/utils/export.ts` (whole file) · `src/styles/phase2CssContract.test.ts` (whole file) ·
`src/styles/theme.css` (whole file) · `src/styles/themeTokens.test.ts` (whole file) ·
`src/components/CompositionBar.tsx` (whole file) · `src/components/MapWorkspace.tsx` (whole file) ·
`src/constants/snapshots.ts` (whole file) · `src/constants/camera.ts` · `src/constants/config.ts` ·
`src/hooks/useResponsiveLayout.ts` · `src/hooks/useSnapshotCatalog.ts:1-80` ·
`src/hooks/useCameraController.ts:295-340` · `src/components/MapCanvas.tsx` (targeted ranges) ·
`src/components/LegendOverlay.tsx` (targeted ranges) · `src/utils/storage.ts:1-180` ·
`src/App.tsx:1000-1063` · `src/main.tsx` · `vitest.config.ts` · `vite.config.ts` ·
`playwright.config.ts` · `package.json` · `index.html` · `public/data/snapshots/index.json` ·
`.planning/coding-rules/general.md` · `.planning/coding-rules/export.md` ·
`.planning/ROADMAP.md:200-310` · `.planning/STATE.md` · `.planning/REQUIREMENTS.md:147-200` ·
`.planning/config.json` · `CLAUDE.md`

**html2canvas 1.4.1 (installed):**
`node_modules/html2canvas/dist/html2canvas.js:4540-4580, 4745-4780, 5420-5475, 5540-5560,
5615-5650, 7743` — the SVG-serialisation and cloner paths quoted in Pattern 1.

**Themely (sibling repo, read-only):**
`Design.md` (whole file) · `src/app/globals.css` (whole file) ·
`src/lib/motion/tokens.ts` (whole file) · `src/lib/motion/__tests__/tokens.test.ts` (whole file) ·
`src/components/app-sidebar.tsx:570-670` · `src/components/ui/square-pen.tsx` ·
`.planning/coding-rules/frontend.md:121-127` · `package.json` · `node_modules/motion/package.json` ·
`node_modules/motion/dist/es/react.mjs` · `node_modules/framer-motion/dist/es/index.mjs:37`

**Registry / tooling (verified by command this session):**
`npm view motion version time.modified dist-tags` → `13.0.0`, modified `2026-08-05T11:38:44.542Z` ·
`npm view motion@12.40.0 peerDependencies` → `react ^18.0.0 || ^19.0.0` ·
`npm view motion versions` → latest 12.x is `12.43.0` ·
`npm view @fontsource-variable/inter version` → `5.3.0` ·
`gsd-tools query package-legitimacy check --ecosystem npm motion @fontsource-variable/inter` ·
`node --version` `v26.5.0` · `npm --version` `11.17.0` · `python3 --version` `3.9.6` ·
`git tag --list` (empty) · `git cat-file -t fe5f946…` → `commit`

### Secondary (MEDIUM confidence)

- https://vite.dev/guide/assets — official Vite docs; the `?inline` / `?no-inline` / `?url` /
  `?raw` suffix contract, quoted in Pattern 1.

### Tertiary (LOW confidence — marked for validation, drives OQ-1)

- https://supercodepower.com/en/svg-img-use-font/ — "browsers do not allow SVGs referenced by
  `img` tags to initiate network requests… embedding the font in base64 solves this."
- https://oreillymedia.github.io/Using_SVG/extras/ch07-dataURI-fonts.html — "the best approach…
  is an OpenType-compatible web font converted to a data URI as the `src` URL in a `@font-face`
  rule" inside a `<style>` in the SVG.
- https://css-tricks.com/lodge/svg/09-svg-data-uris/ — WebKit treats data URIs in SVG-as-image
  as external files (Safari exception; out of certification scope here per C-9).

**These three agree with each other and with the html2canvas source, but none is a browser
vendor's documentation and none was verified against a running Chrome. That is exactly why OQ-1
is a spike and not a plan step.**

## Metadata

**Confidence breakdown:**

| Area | Level | Reason |
|---|---|---|
| In-repo current state (tokens, file:line inventories, live regions, `/data/` literals, `localStorage` sites) | **HIGH** | Every claim produced by grep or by reading the file this session; quoted verbatim |
| Camera / projection immunity to panel reflow | **HIGH** | `extent([[0,0],[1080,1080]])` and the fixed `viewBox` read directly from source; no cached pixel geometry found |
| html2canvas SVG-as-image serialisation | **HIGH** | Read from the installed 1.4.1 bundle and quoted |
| Themely design-system values (palette, type scale, motion, elevation, nav-row recipe, vendoring contract) | **HIGH** | Read from `Design.md` and `globals.css`; the two agree on every token this phase adopts |
| Standard stack (`motion` version, peer ranges, export surface) | **HIGH** | Registry-verified plus sibling-repo source; SUS verdicts explained rather than waved away |
| Contract-test rewrite plan | **HIGH** | Full audit of all 1089 lines with per-block disposition |
| Pitfalls | **HIGH** for P-1 through P-5 (each traced to a specific file:line or a recorded past defect); **MEDIUM** for P-8/P-9 (process risks, not code facts) |
| Font delivery mechanism (`?inline`, `@font-face` placement, sanitize survival) | **MEDIUM–HIGH** | Mechanism verified from Vite docs and `export.ts` source; **whether the browser honours it is OQ-1** |
| **D-25 end-to-end feasibility** | **LOW–MEDIUM** | Three agreeing secondary sources, zero browser verification. Blocking spike required. |
| Environment (Edge availability) | **MEDIUM** | Two independent probes came back negative, but the result contradicts `STATE.md` (A6) |
| Font file size / subset path | **LOW** | Not measured; no font file exists in either repo (A2, A3) |

**Research date:** 2026-08-06
**Valid until:** 2026-09-05 for the in-repo findings (stable — they change only when this repo
changes). **7 days** for the `motion` version guidance: v13.0.0 shipped 2026-08-05 and the 12.x
line is still moving.






