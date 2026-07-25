# Phase 1 — UI Review

**Audited:** 2026-07-22  
**Baseline:** Approved `01-UI-SPEC.md`  
**Implementation:** Local Vite app at `http://127.0.0.1:5173`  
**Screenshots:** Captured in `.planning/ui-reviews/01-20260721-235006/`  
**Automated browser:** Playwright Chromium 149.0.7827.55  
**Quality gate:** `npm run lint`, 106 current tests, deterministic GeoJSON check, and production build passed after evidence capture  
**Product code modified:** No

---

## Review Verdict

**Final approval: NOT READY.** Fixes are required before Phase 1 UI approval.

The implementation is structurally strong: responsive DOM order, light/dark chrome, exact output dimensions, loading/error/storage states, keyboard map operation, reduced motion, modal focus behavior, and export/UI subtree separation were all demonstrated. However, the core map composition is not vertically centered in either preview or downloaded output, which violates the exact export-frame contract and materially weakens the primary user deliverable. Additional direct contract gaps affect right-edge tooltip placement, visible preset names, and reliable selection announcements.

### Evidence Classification

- **Automated evidence:** DOM order and counts, computed styles, viewport overflow, route-injected loading/error/warning states, keyboard focus, modal focus restoration, tooltip rectangles, reduced-motion styles, native PNG download, PNG dimensions, PNG alpha scan, and non-white pixel bounds.
- **Subjective visual judgment:** Map focal quality, perceived whitespace balance, hierarchy, and whether the loading placeholder reads as a map skeleton.
- **Needs human review:** Native browser zoom at exactly 200% was represented by the equivalent 720 CSS-pixel viewport rather than browser UI zoom. Firefox, Safari, Edge, and current/previous version matrices were not available in this automated session.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | Contract copy is largely exact, but success feedback says `1 countries`. |
| 2. Visuals | 2/4 | The primary map/export composition is 114px above vertical center, leaving 228px more whitespace below than above. |
| 3. Color | 3/4 | Light/dark and fixed-white map behavior pass, but 13 component-level color literals bypass theme tokens. |
| 4. Typography | 2/4 | The four-size/two-weight system passes, but required visible preset names truncate to `Mag...` and `Oran...`. |
| 5. Spacing | 3/4 | Declared CSS spacing is consistent, but the tooltip uses an undeclared 12px offset and fails the right viewport margin. |
| 6. Experience Design | 2/4 | State and keyboard coverage are broad, but exact export framing, pointer tooltip placement, and reliable selection announcements remain deficient. |

**Overall: 15/24**

---

## Blocking Findings

### UIR-01 — BLOCKER — Preview and PNG geography are not vertically centered

**Pillars:** Visuals, Experience Design  
**Contract:** UI-SPEC lines 471–479 require the projection to fit the fixed extent, keep geographic content centered, and preserve the same framing between preview and export.

**Automated evidence:**

- SVG geometry bounds in the `0 0 1080 1080` viewBox:
  - left/right: `64 / 1016`
  - top/bottom: `139.58 / 712.42`
  - geographic center: `(540, 426.00)`
  - required frame center: `(540, 540)`
- Downloaded PNG non-white pixel bounds:
  - `(63, 139)` through `(1016, 712)`
  - top margin: `139px`
  - bottom margin: `367px`
  - vertical imbalance: `228px`
- The downloaded image is therefore centered horizontally but approximately `114px` above vertical center.
- Screenshot evidence: `.planning/ui-reviews/01-20260721-235006/CountriesIRL-audit-export.png`.

**Subjective judgment:** The large empty lower half makes the map look unfinished and weakens the map as the primary focal point. This is especially damaging because the PNG is the product's core Instagram deliverable.

**Likely source:** `src/components/MapCanvas.tsx:46-61` and `src/components/MapCanvas.tsx:235-246`. The projection is fitted to `FIXED_EUROPE_VIEW_OBJECT`, but the rendered feature union is not centered within the output extent.

**Remediation:** Revise the fixed projection/framing constants so the complete rendered feature union is centered within the declared extent without depending on selection. Preserve identical projection parameters for editor and export. Add a browser assertion that path-union center is within a small tolerance of `(540, 540)` and that top/bottom margins are approximately equal.

---

## Top 3 Priority Fixes

1. **Recenter the fixed map composition** — The exported Instagram asset is visibly top-heavy and violates the exact frame contract. Adjust the fixed projection/framing and add a path-bounds regression assertion.
2. **Fix right-edge pointer tooltip measurement** — At 360px, a native pointer hover on the rightmost Russian Federation path produced a tooltip ending at `x=360`, not the required 8px viewport margin. Measure intrinsic width away from the pointer edge or use `width: max-content` before clamping.
3. **Show complete preset names at all breakpoints** — `Magenta` and `Orange` truncate in the 360px and 360px-wide desktop control column. Allow two-line labels or change swatch layout while retaining the five-column mobile grid.

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

#### UIR-05 — WARNING — Singular color feedback uses plural grammar

**Automated evidence:** Applying Red to one selected country rendered:

`Success: Applied Red to 1 countries.`

**Source:** `src/components/ColorPicker.tsx:27-29` always formats `countries`, regardless of count.

**Impact:** The primary success feedback sounds mechanically generated and reduces polish in the first-use flow.

**Remediation:** Pluralize by count: `Applied Red to 1 country.` and `Applied Red to 2 countries.` Update `ToastRegion`'s approved regex at `src/components/ToastRegion.tsx:28-29` accordingly.

#### Passing evidence

- Product title, subtitle, onboarding, empty state, fatal error, modal, reset, export, and persistence labels match the approved contract.
- No generic `Submit`, `OK`, `Cancel`, `No data`, or native alert copy was found in product UI.
- Invalid custom color copy exactly matched the contract during runtime testing.

---

### Pillar 2: Visuals (2/4)

#### UIR-01 — BLOCKER — Core map geography is vertically off-center

See Blocking Findings. This affects both the primary editor focal point and downloaded output.

#### UIR-06 — WARNING — Loading placeholder is not a recognizable map skeleton

**Automated evidence:** The loading state preserves the square, includes `Loading Europe map…`, disables all five actions, and renders three skeleton bars.

**Subjective judgment:** Three horizontal bars do not represent the future Europe map and leave the square looking mostly blank. UI-SPEC lines 513–518 require a neutral skeleton representation rather than a blank/spinner treatment.

**Source:** `src/components/MapWorkspace.tsx:42-54`; `src/styles/MapCanvas.css:102-121`.

**Remediation:** Replace the bars with a static neutral map-like silhouette or several geographic placeholder blocks inside the square. Keep it non-animated under reduced motion.

#### Passing evidence

- Desktop map shell measured `992×992`; tablet `720×720`; mobile `328×328`.
- One workspace and one map are mounted at every tested breakpoint.
- The map remains the largest component after onboarding is dismissed.
- Modal and fatal-error hierarchy are clear in settled screenshots.

---

### Pillar 3: Color (3/4)

#### UIR-07 — WARNING — Component styles bypass the theme token source of truth

**Automated source scan:** There are 13 hardcoded hex occurrences outside `theme.css`:

- `src/styles/MapCanvas.css`: 6 occurrences, including `#111827`, `#E5E7EB`, `#D1D5DB`, and `#F9FAFB`.
- `src/styles/Controls.css`: 7 occurrences, including `#FFFFFF`, `#9CA3AF`, `#6B7280`, and `#111827`.

**Examples:** `src/styles/MapCanvas.css:23,92,113,155-158`; `src/styles/Controls.css:131,136,180,203-206,350`.

**Impact:** The current values match the contract, but bypassing the declared custom-property design system makes dark-theme and semantic-color drift more likely.

**Remediation:** Add explicit fixed-map, tooltip, swatch-border, and active-check tokens to `theme.css`, then replace component literals with those tokens. Keep fixed export/map tokens outside dark overrides.

#### Passing evidence

- Light page/card/map surfaces matched the approved palette.
- Dark mode changed application chrome while both map shell and canvas remained `rgb(255, 255, 255)`.
- Export stayed white and opaque.
- Accent usage remained concentrated on Export PNG, onboarding, and focus states.
- Destructive reset and semantic warning/error/success treatments were text-supported, not color-only.

---

### Pillar 4: Typography (2/4)

#### UIR-03 — WARNING — Required visible color names are truncated

**Visual evidence:** At 360px and in the desktop 360px control column, `Magenta` appears as `Mag...` and `Orange` as `Oran...`.

**Contract:** UI-SPEC lines 205–220 and 379–385 require every preset to show its color name as visible text. The accessible `aria-label` does not replace the visible-label requirement.

**Source:** `src/styles/Controls.css:184-189` applies single-line ellipsis to preset labels; the five-column grid at `src/styles/Controls.css:156-160` leaves insufficient width.

**Impact:** Sighted users cannot read all palette names, and color identification becomes less accessible.

**Remediation:** Permit labels to wrap to two lines, remove the nowrap/ellipsis rule, or use a compact two-row label area with a fixed minimum height. Verify all ten full names at 360px without horizontal scrolling.

#### Passing evidence

- Exactly four font sizes are declared: `14px`, `16px`, `20px`, `28px`.
- Exactly two weights are declared: `400`, `600`.
- Inputs and color values use the required body/monospace treatment.
- Heading hierarchy remains legible across tested breakpoints.

---

### Pillar 5: Spacing (3/4)

#### UIR-08 — WARNING — Tooltip uses an undeclared 12px positioning offset

**Source:** `src/components/Tooltip.tsx:6-7` defines `TOOLTIP_OFFSET = 12` and `VIEWPORT_MARGIN = 8`.

**Contract:** The spacing scale permits `4, 8, 16, 24, 32, 48, 64px`; 12px is outside it.

**Impact:** This creates a one-off positioning rhythm and complicates exact breakpoint auditing.

**Remediation:** Use the 8px or 16px token value, expose it through a shared constant/CSS custom property, and keep tooltip calculations synchronized with CSS.

#### Passing evidence

- The seven approved spacing tokens are declared exactly.
- Desktop/tablet/mobile gutters measured correctly through the responsive layouts.
- No page-level horizontal overflow occurred at 1440, 768, 720, or 360 CSS pixels.
- Buttons measured at least 48px high; Export measured exactly 48px high in all tested layouts.

---

### Pillar 6: Experience Design (2/4)

#### UIR-02 — WARNING — Pointer tooltip violates the right viewport margin at 360px

**Automated native-pointer evidence:** After scrolling the mobile map into view, the audit found the rightmost rendered point on the Russian Federation path and moved the native pointer to it. The tooltip rectangle was:

- left: `140.67`
- right: `360`
- viewport width: `360`
- required margin: `8px`

It remained technically visible but ended flush against the viewport rather than at or before `x=352`.

**Screenshot:** `.planning/ui-reviews/01-20260721-235006/mobile-native-pointer-right-edge.png`.

**Likely source:** `src/components/Tooltip.tsx:181-232`. The hidden first render is placed at the raw pointer coordinate, so shrink-to-fit width is measured while constrained by the viewport edge; after repositioning, the tooltip expands and invalidates the original clamp calculation.

**Remediation:** Measure from a stable hidden position such as `{ left: 8, top: 8 }`, set `width: max-content` with the existing max-width, or perform a second measurement after applying the clamped position. Add native pointer tests for top/right/bottom/right-bottom map points at 360px.

#### UIR-04 — WARNING — Selection announcements are not routed through a stable live region

**Source evidence:**

- Map selection at `src/App.tsx:177-184` only updates state.
- Country-list selection at `src/components/CountryList.tsx:54-63` only updates state.
- `SelectionPanel` adds `aria-live="polite"` only after selection becomes nonempty at `src/components/SelectionPanel.tsx:78-95`.
- `TOAST_MESSAGES.selectionCount` exists at `src/components/ToastRegion.tsx:31-35` but is not invoked from selection handlers.

**Impact:** A newly mounted live region is not reliably announced across assistive technologies, and clearing the selection removes the region. This falls short of UI-SPEC line 680's requirement to announce selection-count changes.

**Remediation:** Keep a stable live region mounted for the entire workspace or call the existing selection-count toast/status helper after map, checkbox, select-all, and clear actions. Avoid duplicate announcements.

#### UIR-06 — WARNING — Loading representation is weak

See Pillar 2. State logic passes, but its visual communication does not meet the intended map-skeleton quality.

#### Passing automated evidence

- **Onboarding:** Exact copy displayed; Start Coloring moved focus to a map `role="option"` path.
- **Responsive order:** Desktop was map then controls; tablet/mobile were actions, map, selection/color, country list.
- **Keyboard map:** Roving tabindex, Arrow navigation, Enter selection, focus tooltip, roles, `aria-selected`, and dashed focus styling were observed.
- **Modal:** `role="dialog"`, `aria-modal="true"`, initial Map name focus, Escape close, opener restoration, 560px desktop width, and full-height 360px sheet passed.
- **Loading:** Full shell preserved, skeleton/text present, all map-dependent actions disabled.
- **Fatal error:** Exact copy and Reload Map rendered; help and all map actions disabled.
- **Partial warning:** Exact nonblocking warning rendered with 56 valid paths; export remained available.
- **Storage unavailable:** Assertive exact error rendered; save disabled while export remained enabled.
- **Reduced motion:** Country transitions computed to `0s`; export spinner animation computed to `none`.
- **Tooltip keyboard placement:** Four sampled focused paths remained inside the 8px viewport margin.
- **Export:** Native download completed; button returned to `Export PNG`; success status appeared.

---

## Exact Map/Export Separation Audit

| Check | Result | Evidence |
|------|--------|----------|
| Export source contains SVG only | PASS | `.map-export-source` had one `svg` child and no buttons, tooltip, label, or header. |
| Preview label outside square/export subtree | PASS | DOM containment check returned false. |
| ViewBox | PASS | `0 0 1080 1080`. |
| Preserve aspect ratio | PASS | `xMidYMid meet`. |
| PNG dimensions | PASS | `1080×1080`, 8-bit RGBA. |
| PNG opacity | PASS | Pixel scan found alpha min/max `255/255` and zero transparent pixels. |
| White background | PASS | Export background and empty pixels were `#FFFFFF`. |
| UI/editor chrome excluded | PASS | Visual inspection and source sanitization showed no labels, controls, tooltip, focus, toast, or modal. |
| Preview/export geographic framing match | PASS | Both use the live SVG projection and same path geometry. |
| Geographic content centered | **FAIL — BLOCKER** | Content center `y=425.5–426`, required `y=540`; top/bottom margins `139/367px`. |

---

## Responsive, Theme, State, and Accessibility Matrix

| Condition | Result | Automated Evidence |
|-----------|--------|--------------------|
| Desktop 1440 light | PASS with framing defect | One desktop workspace; map `992×992`; no horizontal overflow. |
| Desktop 1440 dark | PASS with framing defect | Dark page/card chrome; map/canvas remained white. |
| Tablet 768 | PASS | Compact DOM order; map `720×720`; no overflow. |
| Mobile 360 | PASS with tooltip/label defects | Compact DOM order; map `328×328`; no page overflow; 48px Export target. |
| 200% zoom equivalent | PASS with evidence limitation | 720 CSS-pixel layout had one-dimensional page scrolling only and no horizontal overflow. Native browser zoom still needs human confirmation. |
| Reduced motion | PASS | Transitions `0s`; spinner animation `none`. |
| Loading | PASS with skeleton warning | Shell and square preserved; all five actions disabled. |
| Fatal error | PASS | Exact safe copy and Reload Map; unavailable actions disabled. |
| Partial data warning | PASS | Exact warning, valid map retained, export enabled. |
| Storage unavailable | PASS | Assertive error; save disabled; editing/export retained. |
| Desktop modal | PASS | 560px dialog, focus on Map name, Escape/opener restore. |
| Mobile modal | PASS | `360×800`, edge-to-edge, sticky header. |
| Keyboard focus | PASS | Map option focus, visible dashed cue, keyboard tooltip. |
| Pointer tooltip placement | FAIL at right edge | Native pointer tooltip ended at viewport `x=360` instead of respecting 8px margin. |
| Export isolation and dimensions | PASS except centering | Map-only, opaque, exact 1080×1080; framing not vertically centered. |

---

## Evidence Limitations

1. Automated browser coverage was Chromium 149 only. This is valid implementation evidence but not a substitute for the planned Chrome/Firefox/Edge/Safari current/previous matrix.
2. Browser UI zoom could not be controlled directly through the screenshot CLI. The audit used a 720 CSS-pixel viewport as the 1440px-at-200%-zoom reflow equivalent.
3. Pointer tooltip failure was reproduced with a real mouse move to a sampled point on the rightmost SVG path. Native touch behavior was not separately exercised.
4. Subjective map balance and skeleton quality are marked as visual judgment; all numeric framing and overflow findings are automated.

---

## Registry Safety

Skipped. `components.json` is absent, shadcn is not initialized, and the approved UI-SPEC permits no third-party registry blocks.

---

## Files Audited

### Design and planning

- `.planning/phases/01-foundation-modern-map-1-1-5-weeks/01-UI-SPEC.md`
- `.planning/phases/01-foundation-modern-map-1-1-5-weeks/01-CONTEXT.md`
- Phase 1 PLAN and SUMMARY files
- `CLAUDE.md`
- `.planning/coding-rules/general.md`
- `.planning/coding-rules/frontend.md`
- `.planning/coding-rules/data.md`
- `.planning/coding-rules/export.md`
- `.planning/coding-rules/storage.md`

### Product UI and styles

- `src/App.tsx`
- `src/main.tsx`
- `src/components/AppHeader.tsx`
- `src/components/OnboardingBanner.tsx`
- `src/components/MapWorkspace.tsx`
- `src/components/MapCanvas.tsx`
- `src/components/Tooltip.tsx`
- `src/components/FatalErrorState.tsx`
- `src/components/Controls.tsx`
- `src/components/SelectionPanel.tsx`
- `src/components/ColorPicker.tsx`
- `src/components/CountryList.tsx`
- `src/components/SaveLoad.tsx`
- `src/components/ToastRegion.tsx`
- `src/styles/theme.css`
- `src/styles/App.css`
- `src/styles/MapCanvas.css`
- `src/styles/Controls.css`
- `src/utils/export.ts`

### Runtime evidence

- `.planning/ui-reviews/01-20260721-235006/automated-evidence.json`
- `.planning/ui-reviews/01-20260721-235006/desktop-light.png`
- `.planning/ui-reviews/01-20260721-235006/desktop-dark.png`
- `.planning/ui-reviews/01-20260721-235006/tablet-light.png`
- `.planning/ui-reviews/01-20260721-235006/mobile-360-light.png`
- `.planning/ui-reviews/01-20260721-235006/zoom-200-light.png`
- `.planning/ui-reviews/01-20260721-235006/desktop-modal-settled.png`
- `.planning/ui-reviews/01-20260721-235006/mobile-modal-settled.png`
- `.planning/ui-reviews/01-20260721-235006/tablet-loading.png`
- `.planning/ui-reviews/01-20260721-235006/tablet-fatal-error.png`
- `.planning/ui-reviews/01-20260721-235006/tablet-partial-warning.png`
- `.planning/ui-reviews/01-20260721-235006/tablet-storage-unavailable.png`
- `.planning/ui-reviews/01-20260721-235006/mobile-native-pointer-right-edge.png`
- `.planning/ui-reviews/01-20260721-235006/CountriesIRL-audit-export.png`

---

## Recommendation Count

- **Blockers:** 1
- **Priority fixes:** 3
- **Additional warnings:** 5
- **Evidence limitations requiring human confirmation:** 2
