---
phase: 2
slug: region-variants-advanced-features-1-5-2-weeks
status: draft
shadcn_initialized: false
preset: none
created: 2026-07-24
---

# Phase 2 — UI Design Contract

> Visual and interaction source of truth for the CountriesIRL unified world composer. This contract is implementation-ready and subordinate only to locked product decisions in `02-CONTEXT.md` and technical constraints in `02-RESEARCH.md`.

---

## 1. Experience Goal and Phase Boundary

Phase 2 turns the fixed-Europe editor into one quiet, map-first world composition workspace. A creator can color countries, directly move and zoom the world, choose a curated historical snapshot, edit and position an in-canvas legend, save the complete composition, and export the exact visible framing as a polished 1080×1080 PNG.

The UI must feel intentionally designed, calm, tactile, and professional. It uses restrained glass influence only on a small number of editor-chrome surfaces. It must not resemble a generic dashboard, AI product, game HUD, or marketing landing page.

### In scope

- One horizontally wrapped full-world canvas; no Europe/World/North America mode selector.
- Direct drag pan, wheel/trackpad zoom, pinch zoom, and pointer-anchored scaling.
- Visible single-pointer and keyboard-accessible alternatives for pan, zoom, Locate, and Reset View.
- A separate Locate workflow that never changes country selection.
- Curated historical snapshot selection with explicit modern-fallback communication.
- Brief complete-state crossfade between snapshots.
- Auto-generated editable legend with ordering, corner presets, direct positioning, themes, text size, opacity, and border controls.
- Complete-composition save/load and Phase 1 save migration messaging.
- Exact current-viewport PNG export including the legend and excluding editor chrome.
- Desktop, tablet, and 360px mobile layouts using one active responsive DOM.
- Light and dark application chrome, reduced motion, reduced transparency, increased contrast, and forced-colors fallbacks.

### Explicitly out of scope

Do not expose controls or placeholders for animation timelines, camera keyframes, video, batch export, geometry morphing, texture/pattern fills, glows, animated borders, images, flags, logos, arrows, multi-scene slideshows, political point-of-view switching, artificial island markers, inset maps, public sharing, accounts, cloud sync, deployment, or backend services.

---

## 2. Design System

| Property | Contract |
|----------|----------|
| Tool | Manual project design system using component-scoped CSS and `theme.css` custom properties |
| Preset | Not applicable |
| Component library | None |
| Icon library | None; use project-owned inline SVG icons only where compact map controls require them |
| Font | System UI stack: `Inter` when locally available, then `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `Roboto`, `Helvetica`, `Arial`, `sans-serif` |
| Styling | Plain CSS only; no Tailwind, CSS-in-JS, shadcn, or third-party UI registry |
| Theme | Light default plus `prefers-color-scheme: dark`; map/export remains fixed and opaque |

**Source:** Phase 1 uses a manual token system and component CSS. `02-RESEARCH.md` explicitly preserves plain component-scoped CSS and CSS custom properties. Repository inspection found no `components.json`, Tailwind config, postcss config, component library, or icon package.

### Design-system gate decision

shadcn remains intentionally uninitialized. The established plain-CSS stack and the Phase 2 research decision not to add Tailwind answer the initialization gate. Registry safety is therefore not applicable.

### Inline icon rules

- Persistent workflow actions use visible text labels.
- Compact canvas navigation may use project-owned 20×20 inline SVG icons inside 44×44 buttons.
- Icons use `fill="none"`, `stroke="currentColor"`, `stroke-width="2"`, and rounded caps/joins.
- No emoji, flags, decorative illustrations, icon font, or downloaded icon set.
- Every icon-only button has an exact `aria-label`, an accessible tooltip on hover/focus, and a 44×44px target.

---

## 3. Visual Direction

### Character

- Quiet world-composition studio rather than a conventional settings dashboard.
- White map square as the dominant focal point.
- Neutral application chrome with a deep teal accent used sparingly and intentionally.
- Crisp translucent surfaces only for the sticky app bar, the unified inspector shell, and the compact map-navigation cluster.
- Hairline borders provide structure before shadows do.
- Generous but efficient spacing; related controls are grouped without nesting card inside card.
- Timeless system typography, sentence case, restrained radii, and short creator-safe copy.

### Prohibited visual treatments

- No stacked glass cards.
- No glass or blur inside the exportable map/legend composition.
- No full-screen gradients, gradient borders, gradient text, neon glows, bloom, colored shadows, or purple/blue AI styling.
- No excessive pills, floating decorative badges, oversized empty hero areas, or ornamental charts.
- No blur, filter, `box-shadow`, or unsupported CSS transform on exported legend content.
- No decoration without interaction or information value.

### Hierarchy

1. Current world framing and map colors.
2. Current selection and color application.
3. Historical snapshot and fallback status.
4. Legend content and placement.
5. Export.
6. Country browsing, Locate, save/load, history, help, and reset actions.

`Export PNG` is the only persistent filled accent CTA. The onboarding CTA may also use the accent while onboarding is visible. All other persistent actions are neutral, outlined, or text treatments.

---

## 4. Design Tokens

### 4.1 Spacing scale

These are the only application spacing values for margins, padding, and gaps.

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | 4px | Inline metadata gap, icon/text micro-gap |
| `--space-sm` | 8px | Related controls, row gaps, compact padding |
| `--space-md` | 16px | Default control padding, panel inset, mobile gutter |
| `--space-lg` | 24px | Desktop panel padding and workspace gap |
| `--space-xl` | 32px | Desktop page gutter and major separation |
| `--space-2xl` | 48px | Standard control height and empty-state spacing |
| `--space-3xl` | 64px | Large composition breathing room |

#### Spacing rules

- Desktop page gutter: 32px.
- Tablet page gutter: 24px.
- Mobile page gutter: 16px.
- Unified inspector padding: 24px desktop, 16px compact/mobile.
- Inspector section separation: 24px with a 1px divider; do not place each section in another card.
- Control groups: 8px gap.
- Form fields: 8px label-to-control gap and 16px between field groups.
- Canvas overlay inset: 16px desktop/tablet; 8px at 360–767px.
- No authored application spacing outside this scale.

#### Exceptions

- Compact icon-only map controls are exactly 44×44px. This is a deliberate touch-target exception and remains a multiple of 4.
- OS safe-area values may augment token spacing through `env(safe-area-inset-*)`.
- SVG legend geometry uses canonical 1080-viewBox values declared in Section 13; those are export coordinates, not CSS layout spacing.

### 4.2 Typography

Use exactly four application font sizes and exactly two weights.

| Role | Size | Weight | Line height | Usage |
|------|------|--------|-------------|-------|
| Label | 14px | 600 | 1.4 | Buttons, field labels, metadata, compact status |
| Body | 16px | 400 | 1.5 | Inputs, rows, explanatory copy, toasts |
| Heading | 20px | 600 | 1.3 | Inspector sections, modal headings, error titles |
| Display | 28px | 600 | 1.2 | Product title only |

Rules:

- Only weights `400` and `600` are allowed.
- Buttons use Label typography; `Export PNG` may use Body size at weight `600`.
- Inputs use Body typography.
- Hex values and camera/debug-free numeric metadata use the existing system monospace stack at an existing declared size.
- Do not introduce 12px helper text. Use 14px.
- Do not use all caps except recognized abbreviations such as `PNG`.

### 4.3 Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-control` | 8px | Buttons, inputs, rows, toasts, swatches |
| `--radius-large` | 16px | Map shell, inspector shell, dialogs |

- No pill-shaped primary actions.
- A small status lozenge is permitted only when it carries a short semantic state such as `Modern fallback`; it uses 8px radius, not a full capsule.

### 4.4 Motion

| Token | Value | Usage |
|-------|-------|-------|
| `--motion-fast` | 150ms | Hover, focus, button and row state |
| `--motion-scene` | 160ms | Historical complete-state crossfade |
| `--motion-camera` | 240ms | Locate and Reset View camera motion |

- Easing: `cubic-bezier(0.22, 1, 0.36, 1)` for camera and scene completion; standard `ease-out` for controls.
- Direct pan, wheel, trackpad, and pinch follow input with no authored easing.
- No elastic overscroll, bounce, parallax, looping animation, or decorative floating motion.
- Under `prefers-reduced-motion: reduce`, all three durations become `0ms`; Locate and Reset View jump to the target and snapshot changes swap complete states without a fade.

---

## 5. Color Contract

### 5.1 Light UI: 60/30/10 distribution

| Role | Value | Usage |
|------|-------|-------|
| Dominant surface (60%) | `#EEF1F3` | Page background, workspace gutters, inactive surrounding space |
| Secondary surface (30%) | `#FFFFFF` | Opaque fallback for inspector, modal, inputs, rows, map shell |
| Accent (10%) | `#0F766E` | `Export PNG`, onboarding CTA/accent, focus rings, active disclosure marker |
| Destructive | `#B42318` | Confirmed delete, destructive text, blocking validation only |

**Accent reserved for:** `Export PNG`; temporary onboarding CTA/accent; `:focus-visible` rings; the active period/inspector disclosure marker; selected radio/check controls where a native accent is required. It is not used on every button, every selected country, legend swatches, map colors, or decorative backgrounds.

### 5.2 Supporting light tokens

| Token | Value | Usage |
|-------|-------|-------|
| Primary text | `#111827` | Main copy and headings |
| Secondary text | `#475569` | Helper copy and metadata |
| Muted text | `#64748B` | Disabled descriptions only |
| Hairline border | `#CBD5E1` | Inspector, controls, dividers, rows |
| Strong border | `#1F2937` | Selected/active neutral state |
| Hover surface | `#E2E8F0` | Neutral hover |
| Pressed surface | `#CBD5E1` | Neutral pressed state |
| Accent tint | `#CCFBF1` | Onboarding and selected disclosure background only |
| Success | `#067647` | Success text/border |
| Success tint | `#ECFDF3` | Success feedback background |
| Warning | `#B54708` | Historical fallback and recoverable warning text |
| Warning tint | `#FFFAEB` | Recoverable warning background |
| Destructive tint | `#FEF3F2` | Error/confirmation background |
| Overlay | `rgba(15, 23, 42, 0.72)` | Modal scrim |

### 5.3 Dark UI chrome

| Token | Value |
|-------|-------|
| Dominant surface | `#0B0F12` |
| Secondary surface | `#151B20` |
| Primary text | `#F8FAFC` |
| Secondary text | `#CBD5E1` |
| Muted text | `#94A3B8` |
| Hairline border | `#334155` |
| Hover surface | `#1E293B` |
| Pressed surface | `#334155` |
| Accent | `#5EEAD4` |
| Accent contrast | `#042F2E` |
| Accent tint | `#134E4A` |

Dark mode changes editor chrome only. The square composition remains a fixed opaque white in preview and export.

### 5.4 Export/map fixed tokens

| Token | Value | Usage |
|-------|-------|-------|
| Map background | `#FFFFFF` | Entire composition square |
| Default country fill | `#FFFFFF` | Uncolored entities |
| Modern boundary | `#9CA3AF` | Standard boundary stroke |
| Historical boundary | `#4B5563` | Historical overlay boundary stroke |
| Selection boundary | `#111827` | Editor-only selection |
| Focus boundary | `#0F766E` | Editor-only focused country |
| Non-selectable neutral | `#F3F4F6` | Indeterminate/disputed units without a color owner |

Map colors chosen by creators are content, not UI accents. Preserve the Phase 1 preset palette and uppercase custom `#RRGGBB` storage contract.

### 5.5 Glass surfaces

Opaque fallback is the default. Glass is progressive enhancement only.

| Surface | Opaque fallback | Enhanced value | Blur |
|---------|-----------------|----------------|------|
| Sticky app bar | `#F8FAFC` | `rgba(248, 250, 252, 0.86)` | 16px |
| Inspector shell | `#FFFFFF` | `rgba(255, 255, 255, 0.88)` | 18px |
| Map navigation cluster | `#FFFFFF` | `rgba(255, 255, 255, 0.90)` | 14px |

- Apply enhanced values only under `@supports (backdrop-filter: blur(1px))`.
- Never apply glass to the map square, country geometry, exported legend, modal body, toast, loading/error overlay, or nested inspector sections.
- Under `prefers-reduced-transparency: reduce`, `prefers-contrast: more`, or `forced-colors: active`, use opaque surfaces and no blur.
- Readability must not depend on content behind a translucent surface.

---

## 6. Shape, Borders, Elevation, and States

### Surfaces

- App bar: one bottom hairline and no default shadow.
- Inspector: one 1px hairline, 16px radius, and one restrained shadow: `0 16px 48px rgba(15, 23, 42, 0.10)`.
- Map shell: one 1px border and one restrained shadow: `0 12px 36px rgba(15, 23, 42, 0.12)`.
- Navigation cluster: one 1px border and `0 8px 24px rgba(15, 23, 42, 0.12)`.
- Internal inspector sections are transparent and divided by hairlines; no card-on-card shadows.

### Control states

| State | Visual contract |
|-------|-----------------|
| Default | Secondary surface, 1px hairline, primary text |
| Hover | Hover surface; no translation or scaling |
| Pressed | Pressed surface and strong border |
| Selected/toggled | Strong border plus checkmark/text state; never color alone |
| Focus-visible | 2px accent outline, 2px offset |
| Disabled | Muted text, 56% opacity, native `disabled`, no hover treatment |
| Busy | Label changes to an active verb and `aria-busy="true"`; static progress mark under reduced motion |
| Error | Destructive border and inline problem/next-step copy |

### Map-path states

- Default boundary: 1px final-output-equivalent stroke with `vector-effect="non-scaling-stroke"`.
- Hover: darker 1px boundary; no glow or filter.
- Selected: editor-only 2px black boundary.
- Focused: editor-only 3px teal dashed boundary, superseding hover/selection styling.
- Visual wrapped copies use identical fills but no duplicate focus rings, titles, roles, IDs, or tab stops.

---

## 7. Responsive Composition and Breakpoints

The existing one-active-DOM contract is mandatory. React conditionally mounts one viewport-correct workspace. Do not render duplicate desktop/mobile workspaces and hide one with CSS. Map, color, camera, snapshot, legend, persistence, export, toast, and dialog state live above the responsive presentation branch.

### Breakpoints

| Range | Active composition |
|-------|--------------------|
| `>= 1200px` | Desktop workspace |
| `900–1199px` | Compact two-column lower workspace |
| `768–899px` | Compact single-column workspace |
| `< 768px` | Mobile single-column workspace |

The React branch changes only at 1200px, preserving the existing `matchMedia('(min-width: 1200px)')` pattern. CSS controls the compact sub-layout at 900px and 768px.

### 7.1 Desktop (`>=1200px`)

- Maximum content width: 1440px, centered.
- Sticky app bar spans the viewport and keeps global actions visible.
- Main grid: `minmax(0, 1fr) 376px` with a 24px gap.
- DOM/focus order: map/composition column first, inspector second.
- Map square remains the largest visual element.
- Inspector is one shell, not a stack of cards.
- Inspector maximum height: viewport minus app bar and 32px bottom breathing room; its content may scroll independently with `overscroll-behavior: contain`.
- The map column may remain sticky beneath the app bar when viewport height permits; never crop the square to force stickiness.

### 7.2 Compact tablet (`900–1199px`)

DOM/focus order:

1. Global action strip.
2. Composition bar and map square.
3. Selection/color inspector.
4. Country browser.
5. Legend disclosure.

- Map spans both columns.
- Below the map, selection/color and country browser may use two equal columns.
- Legend spans both columns.
- Page scrolls normally; only country results and open modal content may have nested scrolling.

### 7.3 Tablet (`768–899px`)

- One page column.
- Global actions appear before the map.
- Map remains square and fills available content width.
- Inspector sections stack in the same semantic order.
- Advanced Legend controls remain collapsed by default.

### 7.4 Mobile (`<768px`)

- Header stacks title/subtitle and `Show Help`.
- Global actions use a two-column grid; `Export PNG` spans both columns.
- Map and all panels use full content width.
- The composition bar stacks period control, status, and Reset View.
- Navigation overlay remains within the map square and uses 8px inset.
- The inspector uses opaque surfaces; disable glass at mobile widths to reduce visual noise and paint cost.
- Save/load is a full-height edge-to-edge sheet with safe-area padding and sticky header.
- The complete UI must contain at 360px with no page-level horizontal scrolling.

---

## 8. App Bar and Global Actions

### Product copy

- Title: `CountriesIRL Map Generator`.
- Subtitle: `Color the world, frame your view, and export a polished map.`
- Help action: `Show Help`.

### Desktop actions

From left to right on the app bar action group:

1. `Undo Color Change`.
2. `Redo Color Change`.
3. `Save or Load Maps`.
4. `Export PNG`.

`Reset All Colors` is not placed beside `Reset View`; it remains in the selection/color inspector to prevent confusion between content reset and camera reset.

### Compact/mobile action strip

- Row one: `Undo Color Change`, `Redo Color Change`.
- Row two: `Save or Load Maps`, `Reset All Colors`.
- Row three: `Export PNG` spanning the full width.
- All controls remain at least 48px high.

### Action behavior

- Undo/Redo affects color history only.
- Pan, zoom, Locate, Reset View, period selection, and legend edits never appear in the color Undo/Redo stack.
- Disabled states are truthful and native.
- Export is the only filled action.

---

## 9. Composition Bar and Historical Snapshot Contract

The composition bar sits directly above the map square and remains outside the export subtree.

### Layout

- Left: `1080 × 1080 composition preview`.
- Center: native/select-only `Map period` control.
- Right: neutral text button `Reset View`.
- A full-width status line sits beneath the control row when a historical snapshot, warning, or loading state requires explanation.

### Period options

Only manifest entries with `reviewStatus: 'historian-reviewed'` appear in the normal selector. The intended catalog and exact visible labels are:

1. `Modern — current borders`.
2. `1492 — Early modern Europe`.
3. `1700 — Post-Westphalia Europe`.
4. `1815 — Congress of Vienna`.
5. `1914 — Before World War I`.

If a historical asset has not passed source, license, and historical review, omit it entirely from the production selector. Do not show disabled teaser options or `Coming soon` rows.

### Snapshot status copy

- Modern: `Modern borders worldwide.`
- Historical: `Historical borders: {coverage list}. Modern borders remain elsewhere.`
- Loading: `Loading {period} borders…`
- Failure: `We couldn't load {period}. The previous map period is still shown. Try again.`
- Partial asset warning: `Some historical shapes are unavailable. Modern borders remain in those areas.`

The historical status is persistent while a partial snapshot is active. It is not a transient toast only.

### Snapshot switch behavior

1. Selecting a new period starts loading while the current completed scene remains visible.
2. Disable only the period control and actions that require a settled scene; keep camera controls and the current map visible.
3. When ready, crossfade outgoing and incoming complete scene groups for 160ms.
4. At completion, remove the outgoing scene and announce `Showing {period}.`
5. Under reduced motion, swap immediately.
6. If loading fails, restore the previous selected option, keep the previous scene, and show the failure copy above.
7. Export during a crossfade finalizes the selected incoming scene at full opacity and removes the outgoing scene.

### Color continuity

- Matching stable identities preserve colors.
- Newly appearing or differently identified historical entities start white.
- Never imply that modern colors were automatically assigned to predecessor territories.
- After a switch that introduces white entities, no warning toast is required; tooltip and selection state truthfully show their current color.

---

## 10. World Camera and Navigation Contract

### Initial view

A new composition opens at a centered whole-world fit with semantic camera state:

- Zoom: `1`.
- Center longitude: `0`.
- Center latitude: `0`.

Horizontal navigation wraps continuously. Vertical movement is clamped to the Mercator north/south limits. More than one complete world may never be visible at once.

### Direct manipulation

- Mouse/pen primary-button drag pans.
- Mouse wheel and trackpad scroll zoom around the pointer.
- Touch one-finger drag pans.
- Touch pinch zooms around the pinch midpoint.
- Drag/click threshold: 4px. A completed pan must not select the country under the release point.
- Minimum zoom: `1`.
- Maximum zoom: `24` pending browser acceptance; UI and persistence clamp to this range.
- `touch-action: none` applies only to the interactive square, never the page, workspace, or ancestor panels.
- Stop legend pointer events from reaching the map camera.

### Map navigation cluster

Position: editor-only overlay at the top-left of the square.

The cluster contains exactly:

1. `Zoom In` — 44×44 icon-only button with plus icon.
2. `Zoom Out` — 44×44 icon-only button with minus icon.
3. `Move Map` — 44×44 icon-only button with four-direction icon; toggles the pan popover.

- Zoom button step: multiply/divide zoom by `1.5`, clamped to `1–24` and anchored at the viewport center.
- Disable Zoom In at max and Zoom Out at min.
- The cluster is one glass surface, not three floating pills.

### Move Map popover

- Opens adjacent to the navigation cluster.
- Label: `Move map`.
- Contains four 44×44 buttons: `Pan Up`, `Pan Right`, `Pan Down`, `Pan Left`.
- Each activation moves the camera by 12.5% of the current visible viewport in that direction.
- Repeated activation supports continuous stepwise movement.
- Escape closes the popover and restores focus to `Move Map`.
- Clicking outside closes it; outside click is not the sole close method.
- The popover is editor-only and excluded from export.

### Keyboard relationship with country navigation

Do not assign Arrow keys on focused country paths to camera panning. Preserve Phase 1 roving country navigation:

- Arrow keys move country focus in stable alphabetical order.
- Home/End move to first/last country.
- Enter/Space toggles selection.
- Escape clears selection.

Camera keyboard access is provided through the semantic Zoom and Pan buttons, Reset View, and Locate controls. This prevents keyboard-command collisions.

### Wrapped-country accessibility and focus ownership

Use one stable logical country node plus decorative repeats; do not promote/demote three cloned nodes or let React and D3 compete for the same path DOM.

- Inside the D3-owned camera subtree, each selectable entity has exactly one stable logical `<path>` keyed by `entityId` and two decorative repeat `<path>` nodes. The logical node supplies one of the three visible wrap positions; the decorative nodes supply the other two.
- On the same animation frame that applies a camera transform, the camera controller chooses the wrap offset `-1080`, `0`, or `+1080` whose transformed country bounds intersect the viewport; if more than one intersects, choose the one whose visible bounds center is closest to the viewport center. If none intersects, choose the transformed bounds center closest to the viewport center. Apply that local x-offset to the stable logical node and assign the remaining offsets to its two decorative repeats. Update transform attributes only; never regenerate `d` geometry during camera movement.
- The stable logical node alone carries `role="option"`, its accessible name, `aria-selected`, and roving `tabindex`. The current logical roving ID has `tabindex="0"`; every other logical country has `tabindex="-1"`.
- Both decorative repeat nodes remain `aria-hidden="true"`, `focusable="false"`, and `tabindex="-1"` at all times. They have no role, accessible name, `<title>`, or duplicated DOM ID. Pointer handlers may map them back to `entityId`, but they never become accessibility instances.
- React owns `focusedCountryId`, selection, and semantic camera state. D3 exclusively creates and updates the country-path subtree, including wrap-offset transforms and semantic attributes. `MapCanvas` exposes a narrow imperative `focusCountry(entityId)` adapter; React calls that adapter after roving-ID changes, but never renders or mutates D3-owned paths. D3 never owns application state.
- Arrow/Home/End navigation changes only the logical roving ID, then `focusCountry` focuses the stable logical node with `preventScroll: true`. Because the same focused DOM node changes only its local wrap transform, horizontal panning never destroys or transfers DOM focus.
- Reconcile the focused logical node's wrap offset before the frame is painted, then derive the 3px dashed focus indicator and keyboard tooltip anchor from that node's transformed bounds/centroid. The focus indicator and tooltip/label therefore move to the nearest visible wrapped copy after every horizontal pan without duplicating focus or announcements.
- Pointer hover may anchor a tooltip to the decorative copy actually under the pointer. Pointer activation still resolves to the same logical `entityId`; if focus moves to the map, focus the stable logical node at its reconciled nearest-visible offset.
- Wrap copy index is rendering-only. It never enters selection, alphabetical roving order, persistence, history, accessible names, or status copy.

### Reset View

- Visible label: `Reset View`.
- Returns to whole-world fit without changing colors, country selection, period, legend, or save state.
- Uses 240ms camera motion; immediate under reduced motion.
- Does not create an Undo/Redo entry.
- Status: `Map view reset.`
- If already at the initial view, disable the action and do not announce a no-op.

### Locate

Locate is separate from selection and available in the country browser.

- Search label: `Find a country`.
- Placeholder: `Search by country name`.
- Use an editable combobox with a listbox popup of the 195 selectable core states.
- Down/Up moves through suggestions; Enter commits; Escape closes without changing the current value.
- A typed value is draft-only and is not a valid Locate target until a country option is explicitly committed.
- When the Locate draft has no matching option, show this state inside the Locate combobox popup/subsection only; do not reuse the separate Country browser no-results state:
  - Heading: `No country matches “{query}”.`
  - Body: `Try a different country name.`
  - Action: `Clear Locate Search`.
- `Clear Locate Search` empties the Locate draft, clears any stale committed Locate target, closes the no-match popup state, and returns focus to the `Find a country` combobox.
- `Locate Country` remains natively disabled until a valid country is committed. Editing the draft after a commit invalidates that committed target and disables the action until another valid option is committed.
- Activating Locate fits the nearest wrapped copy of the country with 12% viewport padding and clamps zoom to `2–24`.
- Locate uses 240ms camera motion; immediate under reduced motion.
- Locate never selects, colors, or changes history.
- Keep focus on `Locate Country` after activation.
- Status: `Centered on {country}.`
- Small island states use the same Locate path; never add artificial markers or insets.

---

## 11. Country Selection, Search, and Coloring

### Selection model

Preserve the Phase 1 shared selected-ID set.

- Clicking/tapping a country without a completed drag replaces selection with that country.
- Country-list checkboxes add/remove countries for bulk coloring.
- Locate does not modify selection.
- Clicking empty map background clears selection only when no pan gesture occurred.
- Selection never changes camera framing automatically.

### Country browser

The desktop inspector contains a `Countries` section. Compact/mobile places the same section after selection/color controls.

Required structure:

1. Heading `Countries`.
2. Search field label `Search countries` and placeholder `Type a country name`.
3. Bulk actions `Select Visible` and `Clear Selection`.
4. Filtered list rows.
5. Separate `Find a country` Locate combobox below the list header or in a `Locate` subsection.

Country row:

- 24×24 checkbox.
- Country name, wrapping to two lines.
- 32×32 current-color swatch with border and accessible color label.
- No camera movement on row/checkbox activation.

Search behavior:

- Filters by case-insensitive display name as the user types.
- `Select Visible` selects only the currently filtered valid results.
- Search draft does not change selection.
- No-results heading: `No countries match “{query}”.`
- No-results body: `Try a different country name.`
- Clear-search button label: `Clear Country Search`.

### Selection/color empty state

- Heading: `Select countries to color`.
- Body: `Choose a country on the map, or use the country list to select several.`
- Color controls stay visible but disabled.

### Color controls

Preserve Phase 1 behavior and visible preset names.

- Preset controls show the full color name at every breakpoint; two-line labels are allowed.
- Active color is shown with outline and checkmark and is natively disabled when applying it would be a no-op.
- Effective white remains canonical.
- Applying a preset or custom color preserves selection.
- Custom input accepts and normalizes existing supported formats to uppercase `#RRGGBB`.
- No-op color attempts create no history, success message, or timing mark.

### Reset All Colors

- Label: `Reset All Colors`.
- Lives in the selection/color section on desktop and the action strip on compact/mobile.
- Remains one undoable color action.
- No confirmation dialog because Undo immediately restores the colors.
- Status: `All colors reset. Use Undo Color Change to restore them.`
- Does not reset camera, period, legend labels/order/style/position, or save name.

---

## 12. Legend Editor and Progressive Disclosure

### General behavior

- One active legend entry exists for every unique non-white effective map color.
- White never creates an entry.
- A new entry label defaults to its uppercase hex value.
- Entries use first-use order.
- When a color becomes unused, hide its entry but retain its label/order in dormant metadata.
- If the color returns, restore the previous label/order.
- The visible legend is an SVG overlay outside the camera group and is included in export.

### Disclosure

- Inspector trigger label: `Legend`.
- Trigger summary when empty: `Appears after you add color`.
- Trigger summary when populated: `{count} entries · {position label}`.
- Use a native button with `aria-expanded` and `aria-controls`.
- The panel is collapsed by default to protect the coloring workflow.
- When the first non-white color creates the first entry, keep the panel collapsed and announce: `Legend added. Open Legend to edit labels.`
- Do not auto-scroll or auto-open the panel.

### Empty legend state

- Heading: `Your legend will appear here`.
- Body: `Color at least one country to create the first legend entry.`
- Style and position controls are disabled until an entry exists.

### Entry rows

Each active row contains:

1. 32×32 color swatch with visible border.
2. Text input labeled `Legend label for {hex}`.
3. Character count `{count}/32` shown at 14px.
4. `Move Up` and `Move Down` 44×44 buttons.
5. Optional drag handle for pointer reordering, with accessible name `Drag {label} to reorder`.

Rules:

- Maximum label length: 32 characters.
- Empty draft is invalid; keep the previous committed label in the canvas until valid commit.
- Commit on blur or Enter.
- Escape restores the previous committed label.
- Inline error: `Enter a legend label.`
- Reordering updates immediately and announces `Moved {label} to position {position} of {count}.`
- Keyboard shortcut when a row has focus: `Alt+Up Arrow` and `Alt+Down Arrow`; expose through `aria-keyshortcuts`.
- After reordering, focus stays on the moved row.
- Pointer drag is optional convenience; Up/Down buttons remain visible and fully equivalent.

### Legend themes

Theme control is a radio group labeled `Legend theme` with exactly three options:

| Theme | Background | Text | Default border |
|-------|------------|------|----------------|
| `Light` | `#FFFFFF` | `#111827` | `#CBD5E1` |
| `Dark` | `#111827` | `#FFFFFF` | `rgba(255,255,255,0.28)` |
| `Soft` | `#F3F4F6` | `#111827` | None |

Default: `Light`.

### Legend text size

Radio group label: `Legend text size`.

| Option | Canonical SVG size | Approximate 540px preview size |
|--------|--------------------|--------------------------------|
| `Small` | 24 units | 12px |
| `Medium` | 32 units | 16px |
| `Large` | 40 units | 20px |

Default: `Medium`.

### Background opacity

- Label: `Background opacity`.
- Native range input from `70` to `100`, step `5`.
- Default: `90`.
- Show value as `{value}%`.
- Apply alpha to the theme background only; never apply `opacity` to the entire legend group.
- Do not permit less than 70%, preserving readability over arbitrary creator colors.

### Border style

Radio group label: `Legend border` with exactly:

- `None` — 0 units.
- `Hairline` — 2 canonical units.
- `Strong` — 4 canonical units.

Default: `Hairline` for Light and Dark; `None` for Soft until the user overrides it.

### Legend position

Radio group label: `Legend position` with a 2×2 control showing:

- `Top left`.
- `Top right`.
- `Bottom left`.
- `Bottom right`.

Default: `Top right`.

Corner preset inset: 32 canonical units from each map edge after legend bounds are measured.

Direct positioning:

- Dragging the visible legend moves it and changes position state to `Custom`.
- The whole legend hit area is draggable in edit mode; the map camera must not receive that gesture.
- Clamp the entire legend within a 32-unit safe inset.
- A focused editor-only legend move target supports Arrow keys to nudge by 8 units and Shift+Arrow to nudge by 32 units.
- Inspector also exposes four 44×44 `Nudge Up/Right/Down/Left` buttons whenever position is Custom.
- Announce `Legend moved to {position}.` for corner presets and `Legend position updated.` after a custom nudge/drag.

### Legend capacity and deterministic overflow

The UI must never silently omit active colors from the legend.

- 1–8 entries: one column.
- 9–16 entries: two columns.
- 17–30 entries: three columns and force Small text if Medium/Large would exceed bounds.
- More than 30 active colors: keep all map coloring intact, show a blocking inline legend error, and disable Export until the count is reduced.
- Exact error: `This map uses more than 30 legend colors. Reduce the number of colors so every label stays readable in the export.`
- For the current column count, validate the committed labels against deterministic two-line wrapping. If a label cannot fit at its chosen size, show: `Shorten this label so it fits in the exported legend.` Export remains disabled until resolved.

### Export-safe legend styling

- Use SVG `rect`, `text`, and swatch primitives only.
- Use solid or RGBA fills and strokes.
- No `filter`, `backdrop-filter`, CSS blur, `box-shadow`, text shadow, external font, embedded HTML, or foreignObject.
- Visible editor drag targets, handles, focus outlines, and nudge affordances carry `data-editor-only` and are removed from export.

---

## 13. Canonical Legend Geometry in the 1080 ViewBox

These dimensions are export-space coordinates and must be identical in preview and export.

| Element | Value |
|---------|-------|
| Outer safe inset | 32 units |
| Legend internal padding | 24 units |
| Legend corner radius | 16 units |
| Column gap | 24 units |
| Entry row minimum height | 48 units |
| Two-line entry row height | 64 units |
| Swatch | 24×24 units |
| Swatch-to-label gap | 16 units |
| Entry vertical gap | 8 units |
| Light/Dark hairline border | 2 units |
| Strong border | 4 units |

- Legend position is stored as top-left `{x, y}` in canonical units.
- Measure bounds before applying corner presets or clamping custom movement.
- Map zoom/pan does not scale or move the legend.
- The legend stays visually above country geometry and below editor-only hit targets.

---

## 14. Exact Map and Export Presentation

### Visible composition

- Square aspect ratio at every viewport.
- Canonical viewBox: `0 0 1080 1080`.
- Opaque `#FFFFFF` background.
- Geography camera group contains the wrapped world copies.
- Legend group is outside the camera transform.
- Editor navigation, status text, tooltip, selection/focus treatment, and drag handles are visually over or around the square but marked editor-only.

### Export transaction

When `Export PNG` is activated:

1. Acquire the existing synchronous export lock.
2. Freeze camera input, transitions, RAF work, and momentum immediately.
3. Capture the last painted camera transform visible at activation time.
4. Finalize the selected historical scene at full opacity.
5. Commit current legend measurement and position.
6. Clone the canonical SVG.
7. Remove all `[data-editor-only]` elements, outgoing scenes, hover/focus/selection classes, tooltips, navigation controls, status overlays, and duplicate accessibility copies.
8. Preserve geography, inherited dependency colors, current camera framing, snapshot/fallback geometry, background, and legend.
9. Capture the existing 540×540 HTML frame at scale 2.
10. Reject output not exactly 1080×1080.
11. Complete the connected-anchor handoff and nested `finally` cleanup from Phase 1.

### Export content

Included:

- Exact current camera framing and zoom.
- Date-line-spanning geography from adjacent wrapped copies.
- Current country colors and dependency inheritance.
- Selected historical boundaries and modern fallback.
- Opaque white background.
- Legend at its exact visible position and style.

Excluded:

- App bar, inspector, composition bar, period status, map navigation, Locate controls.
- Hover, focus, selection, tooltip, live-region text.
- Editor legend handles, hit area, nudge controls, validation states.
- Toasts, dialogs, onboarding, warnings, loading overlays, and filename text.

### Export button and copy

- Default: `Export PNG`.
- Busy: `Exporting PNG…` and `aria-busy="true"`.
- Success: `PNG downloaded at 1080 × 1080.`
- Failure: `The PNG could not be created. Your map is unchanged. Try Export PNG again.`
- Retry action: `Try Export Again`.
- If legend validation blocks export, focus the first legend error and do not start the export transaction.

### Filename

- Unnamed composition: `CountriesIRL_<YYYY-MM-DD>.png`.
- Named composition: `<sanitized-map-name>_<YYYY-MM-DD>.png`.
- Replace whitespace with `_`, remove unsupported filesystem characters, collapse repeated underscores, cap the name token at 60 characters, and preserve the `.png` suffix.

---

## 15. Save and Load Complete Compositions

### Workspace action

- Label remains `Save or Load Maps`.
- Modal title remains `Save or load maps`.
- Save form heading: `Save current map`.
- Field label: `Map name`.
- Placeholder: `Example: 1815 Europe map`.
- Default CTA: `Save Current Map`.
- Existing-name CTA: `Replace Saved Map`.

### Dialog/sheet close, dismissal, and focus restoration

- The desktop dialog, compact dialog, and compact/mobile full-height sheet each expose a visible header button labeled exactly `Close Saved Maps`. On mobile, this control remains visible in the sticky sheet header while the body scrolls.
- `Escape` dismisses Save/Load from anywhere inside the active dialog or sheet and remains available alongside the visible close control.
- Scrim dismissal is supported on desktop and compact dialog layouts when a pointer activation begins and ends on the scrim itself; child-content activation must not dismiss the dialog. Scrim dismissal is disabled while a save transaction is active. The edge-to-edge mobile sheet exposes no tappable scrim, so scrim dismissal is not available there.
- The visible `Close Saved Maps` control and Escape are always the primary dismissal paths; scrim dismissal is never the only close method.
- Every ordinary dismissal path—header close, Escape, or supported scrim dismissal—restores focus to the `Save or Load Maps` opener that launched the surface. If a responsive remount replaced that node, focus its currently mounted `[data-save-load-control="true"]` equivalent. If neither exists, focus the logical map fallback.
- Successful `Load This Map` remains the intentional exception: close Save/Load and focus the logical map rather than the opener.
- The close control participates in the existing modal focus trap. A duplicate footer `Close Saved Maps` action may remain, but it does not replace the required visible header control.

### Saved row content

Each row shows:

- Map name.
- Save date as `DD MMM YYYY`.
- Metadata line: `{period short label} · {legend entry count} · {Whole world view | Custom view}`.
- `Load This Map`.
- `Delete Saved Map`.

Legacy Phase 1 record metadata:

- `Legacy map · Opens with modern borders and whole-world view`.
- Loading it uses its valid colors, Modern period, initial world camera, and a default generated legend.
- After load, warning toast: `Older saved map loaded with a modern world view. Save it again to keep the full composition.`
- Do not rewrite the legacy record until an explicit save/replace.

### Save behavior

Save and restore:

- Colors.
- Semantic camera center and zoom.
- Historical snapshot.
- Legend labels, dormant metadata, order, theme, text size, opacity, border, and position.
- Visible composition settings.

Do not save selection, hover, focus, tooltip, open panels, open dialogs, loading scene, outgoing crossfade, or transient error state.

### Load behavior

- Validate the complete record before changing the visible composition.
- Resolve the snapshot before committing the load.
- Apply colors, period, legend, and camera as one coordinated intent.
- Loading resets color Undo/Redo history.
- Camera and legend edits do not become history entries.
- After a successful load, close the modal, restore focus to the map, and announce `Saved map loaded.`
- Partial repair warning: `Saved map loaded, but some unavailable settings were restored to safe defaults.`
- Snapshot unavailable error: `This saved map uses a period that is not available. Choose another saved map or close this window.`

### Replace confirmation

Existing-name replacement uses inline pre-action warning:

- `A saved map already uses this name. Saving will replace its colors, view, period, and legend.`
- CTA: `Replace Saved Map`.
- No additional modal.

### Delete confirmation

Deleting is no longer one-click.

1. First activation changes the row to an inline confirmation.
2. Copy: `Delete “{map name}”? This saved map cannot be recovered.`
3. Destructive action: `Delete Map`.
4. Safe action: `Keep Map`.
5. On delete, working composition remains unchanged and status is `Saved map deleted.`
6. Focus moves to the next row, previous row, or Map name field.

### Dirty load confirmation

If the current composition differs from its last explicit save/load baseline, activating `Load This Map` opens a compact confirmation dialog:

- Heading: `Replace the current map?`
- Body: `Loading “{map name}” will replace unsaved colors, view, period, and legend changes.`
- Primary neutral action: `Load Saved Map`.
- Safe action: `Keep Editing`.
- Do not use a filled destructive red button because loading is replacement, not deletion.

If the current composition is clean, load immediately without this confirmation.

---

## 16. Onboarding and Help

### First-use banner

- Heading: `Create your map`.
- Body: `Color countries, move the world to frame your view, and export a square PNG with a polished legend.`
- Steps:
  1. `Select countries and apply colors.`
  2. `Move the map or choose a historical period.`
  3. `Edit the legend, then export the exact view.`
- CTA: `Start Creating`.
- Secondary: `Dismiss Help`.

Behavior:

- Non-modal banner above the workspace.
- Never auto-dismiss.
- `Start Creating` dismisses and moves focus to the first logical country path.
- `Show Help` reopens the same banner without changing composition state.
- No spotlight tour, coach-mark sequence, modal walkthrough, or forced tutorial.

---

## 17. Loading, Empty, Warning, Error, and Success States

### Initial world loading

- Preserve the full shell and square.
- Show a recognizable neutral world silhouette skeleton.
- Copy: `Loading world map…`
- Disable map-dependent color, period, save, Locate, Reset View, legend, and export controls.
- Announce once through a polite live region.

### No selection

- Heading: `Select countries to color`.
- Body: `Choose a country on the map, or use the country list to select several.`

### No legend entries

- Heading: `Your legend will appear here`.
- Body: `Color at least one country to create the first legend entry.`

### No saved maps

- Heading: `No saved maps yet`.
- Body: `Name the current map above to keep its colors, view, period, and legend in this browser.`

### No country search results

- Heading: `No countries match “{query}”.`
- Body: `Try a different country name.`

### No Locate results

This state is scoped only to the `Find a country` Locate combobox; it must not replace or share copy with the Country browser filter.

- Heading: `No country matches “{query}”.`
- Body: `Try a different country name.`
- Action: `Clear Locate Search`.
- `Locate Country` remains disabled until a valid country option is committed.
- Clearing empties the Locate draft and returns focus to the Locate combobox.

### Partial modern-world data

- `Some country shapes could not be loaded. You can continue with the available map.`
- Coloring, camera movement, and export remain available for valid geometry.

### Fatal world-load error

- Heading: `We couldn't load the world map`.
- Body: `Refresh the page to try the bundled map data again. Your saved maps will stay in this browser.`
- Action: `Reload Map`.

### Historical fallback

- Persistent, not toast-only: `Historical borders: {coverage list}. Modern borders remain elsewhere.`

### Historical load failure

- `We couldn't load {period}. The previous map period is still shown. Try again.`
- Action: `Try Period Again`.

### Legend overflow

- `This map uses more than 30 legend colors. Reduce the number of colors so every label stays readable in the export.`

### Storage unavailable

- Preserve existing creator-safe behavior and update scope:
- `This browser blocked local saves. You can keep editing and export a PNG, but maps cannot be saved here.`

### Storage full

- `Browser storage is full. Delete an older saved map, then save this map again.`

### Export failure

- `The PNG could not be created. Your map is unchanged. Try Export PNG again.`

### Success/status messages

Approved messages include:

- `Centered on {country}.`
- `Map view reset.`
- `Showing {period}.`
- `Legend added. Open Legend to edit labels.`
- `Legend moved to {position}.`
- `Legend position updated.`
- `Legend order updated.`
- `Map saved to this browser.`
- `Saved map replaced.`
- `Saved map loaded.`
- `Saved map deleted.`
- `PNG downloaded at 1080 × 1080.`

Do not expose source filenames, hashes, projection terminology, schema versions, stack traces, raw errors, or storage exception names to creators.

---

## 18. Toast and Status Contract

- Keep one stable global status region mounted.
- Success/information uses `role="status"` and polite announcements.
- Operation-blocking errors use `role="alert"` and assertive announcements.
- Persistent historical fallback belongs near the period control and is referenced with `aria-describedby`; do not repeat it on every pan/zoom.
- Selection-count updates remain in the existing stable polite live region.
- Only one toast is visible at once; later success replaces earlier success.
- Error toasts remain until dismissed or successfully retried.
- Dismiss label: `Dismiss Message`.
- Toasts remain opaque, bordered, and readable; no glass treatment.

---

## 19. Tooltip Contract

Country tooltip appears on pointer hover and keyboard focus.

Exact content order:

1. Country/entity display name.
2. `Current color: {uppercase hex}`.
3. One boundary line:
   - `Modern boundary` in Modern.
   - `Historical boundary · {period}` for curated geometry.
   - `Modern fallback · {period} composition` where fallback is active.

Rules:

- Maximum width: min(360px, viewport width minus 16px).
- Keep at least 8px from every viewport edge.
- Measure from a stable hidden 8px/8px position before clamping; never measure while constrained against the pointer edge.
- Reposition on scroll, resize, camera movement, and focused-path geometry movement.
- Tooltip is pointer-events none and excluded from export.
- No raw IDs or provenance source names in the creator tooltip.

---

## 20. Accessibility Contract

### Semantics

- Use native `button`, `input`, `select`, `label`, checkbox, radio, and range elements where available.
- The map remains a single logical listbox with one accessible country copy.
- Map label: `Interactive world map, {period label}`.
- Logical country paths use `role="option"`, `aria-selected`, current color, and boundary context in the accessible name.
- Visual wrapped copies are `aria-hidden="true"`, non-focusable, and use no duplicate DOM IDs or titles.
- SVG legend text is `aria-hidden` in editor mode because the semantic Legend panel provides the accessible entry list; do not announce duplicate legend content.

### Focus order

- Desktop: app/global actions, map composition bar, map countries, map navigation, inspector controls.
- Compact/mobile: action strip, composition bar, map, map navigation, selection/color, countries/Locate, legend.
- Opening a disclosure moves no focus.
- Closing a popover/dialog restores focus to its opener or the current responsive equivalent after a 1200px remount. For Save/Load, this applies to `Close Saved Maps`, Escape, and supported desktop/compact scrim dismissal.
- Loading a composition returns focus to the logical map copy.

### Focus visibility

- 2px accent outline with 2px offset for HTML controls.
- Focused country uses 3px dashed accent stroke.
- Focus is never conveyed by a shadow alone.
- Under forced colors, use system-color outlines/borders and preserve text/icon/checkmark cues.

### Drag and multipoint alternatives

- Map drag pan has Pan Up/Right/Down/Left buttons.
- Pinch zoom has Zoom In/Zoom Out buttons.
- Legend drag has corner presets, nudge buttons, and keyboard nudges.
- Legend reorder drag has Move Up/Move Down buttons and Alt+Arrow shortcuts.
- Keyboard support alone is not treated as the only pointer alternative.

### Targets

- Standard controls: minimum 48px height.
- Icon-only map and legend nudge controls: 44×44px.
- Checkboxes: 24×24px with a row hit area at least 48px high.
- No interaction requires a target below 24×24px.

### Contrast and non-color cues

- Normal text meets WCAG AA against every supported surface.
- Control boundaries and focus indicators meet at least 3:1 against adjacent colors.
- Historical/fallback state uses explicit text, not boundary color alone.
- Selected countries use stroke weight, list checkbox, count text, and `aria-selected`.
- Active legend options use radio/check state plus border.
- User map fills are never the sole accessible identification of a country.

### Reduced motion

- Snapshot crossfade, Locate, Reset View, and modal transitions become immediate.
- Busy controls retain clear text when spinner animation is removed.

### Reduced transparency and high contrast

- Opaque is the baseline.
- Disable all `backdrop-filter` under reduced transparency, increased contrast, and forced colors.
- Under `prefers-contrast: more`, strengthen boundaries to 2px and focus outlines to 3px.
- Under `forced-colors: active`, use native elements and system colors such as `Canvas`, `CanvasText`, `ButtonText`, and `Highlight`; do not depend on box-shadow, gradients, or authored fill colors for state.
- Use `forced-color-adjust: none` only for the map-content square if necessary to preserve creator-selected colors, and pair it with accessible textual state outside the map.

### 200% zoom and 360px containment

- At 200% browser zoom, core controls remain usable without two-dimensional page scrolling.
- The map may scale down; controls and typography do not shrink.
- Long country and map names wrap or truncate with their full accessible name preserved.
- No fixed-width inspector or popover may exceed `calc(100vw - 32px)` on mobile.

---

## 21. Component Inventory

| Component | Responsibility | Required states |
|-----------|----------------|-----------------|
| `AppHeader` | Product title, subtitle, help, desktop global actions | Default, sticky, compact |
| `GlobalActions` | Undo/redo, reset colors, save/load, export | Enabled, disabled, exporting |
| `CompositionBar` | Preview label, period selector, fallback status, Reset View | Modern, historical, loading, warning, error |
| `MapWorkspace` | Square shell, loading/error layers, map and editor overlays | Loading, ready, partial warning, fatal error |
| `MapCanvas` | Wrapped world scene, logical accessible countries, camera group | Default, panning, zooming, snapshot switch, export-frozen |
| `MapNavigation` | Zoom, Move Map popover, pan alternatives | Default, min/max zoom, open popover |
| `CountryTooltip` | Name, color, period/boundary context | Pointer, keyboard, hidden |
| `SelectionPanel` | Selected count/current color/reset entry point | Empty, single, multi, mixed |
| `ColorPicker` | Presets and custom color | Disabled, active/no-op, valid, invalid |
| `CountryBrowser` | Search, filtered bulk selection, list | Default, filtered, no results |
| `LocateCountry` | Country combobox and separate Locate action | Empty, suggested, committed, locating, not found |
| `LegendDisclosure` | Progressive entry to advanced legend controls | Empty, populated, collapsed, expanded, invalid |
| `LegendEditor` | Labels, ordering, theme, size, opacity, border, position | Valid, label error, overflow error, custom position |
| `LegendOverlay` | Export-safe SVG legend and editor-only move target | Empty, corner, custom, dragging, export |
| `SaveLoad` | Versioned complete composition persistence | Empty, populated, legacy, warning, error, confirm load/delete |
| `ToastRegion` | Creator-safe operation feedback | Polite status, warning, assertive error |
| `OnboardingBanner` | First-use guidance | Visible, dismissed |
| `FatalErrorState` | World-data recovery | Fatal load error |

---

## 22. Copywriting Contract

| Element | Exact copy |
|---------|------------|
| Product title | `CountriesIRL Map Generator` |
| Product subtitle | `Color the world, frame your view, and export a polished map.` |
| Primary CTA | `Export PNG` |
| Export busy | `Exporting PNG…` |
| Preview label | `1080 × 1080 composition preview` |
| Period label | `Map period` |
| Reset camera | `Reset View` |
| Locate search label | `Find a country` |
| Locate search placeholder | `Search by country name` |
| Locate action | `Locate Country` |
| Locate no-match heading | `No country matches “{query}”.` |
| Locate no-match body | `Try a different country name.` |
| Locate no-match action | `Clear Locate Search` |
| Save/Load close | `Close Saved Maps` |
| Country search label | `Search countries` |
| Country search placeholder | `Type a country name` |
| Main empty heading | `Select countries to color` |
| Main empty body | `Choose a country on the map, or use the country list to select several.` |
| Legend disclosure | `Legend` |
| Legend empty heading | `Your legend will appear here` |
| Legend empty body | `Color at least one country to create the first legend entry.` |
| Saved empty heading | `No saved maps yet` |
| Saved empty body | `Name the current map above to keep its colors, view, period, and legend in this browser.` |
| Fatal heading | `We couldn't load the world map` |
| Fatal body | `Refresh the page to try the bundled map data again. Your saved maps will stay in this browser.` |
| Fatal action | `Reload Map` |
| Save action | `Save Current Map` |
| Replace action | `Replace Saved Map` |
| Load action | `Load This Map` |
| Delete initial action | `Delete Saved Map` |
| Delete confirmed action | `Delete Map` |
| Delete safe action | `Keep Map` |
| Dirty-load heading | `Replace the current map?` |
| Dirty-load primary | `Load Saved Map` |
| Dirty-load safe | `Keep Editing` |
| Reset colors | `Reset All Colors` |
| Custom color | `Apply Custom Color` |
| Export failure | `The PNG could not be created. Your map is unchanged. Try Export PNG again.` |

### Destructive and replacement behavior

| Action | Confirmation approach |
|--------|-----------------------|
| `Reset All Colors` | No modal; undoable. Announce restoration path. |
| `Reset View` | No confirmation; changes camera only and preserves composition content. |
| `Replace Saved Map` | Inline warning naming colors, view, period, and legend; explicit replacement CTA. |
| `Delete Saved Map` | Inline two-step confirmation with `Delete Map` and `Keep Map`. |
| `Load This Map` over dirty work | Compact confirmation dialog with `Load Saved Map` and `Keep Editing`. |

Do not use generic `Submit`, `OK`, `Cancel`, `No data`, `Something went wrong`, or technical error copy.

---

## 23. Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | None | Not applicable — shadcn is not initialized |
| Third-party registries | None | No third-party UI blocks are permitted in this phase |

No registry vetting is required.

---

## 24. Implementation Acceptance Checklist

### Visual system

- [ ] White map square is the largest visual element at every breakpoint.
- [ ] Glass appears only on app bar, inspector shell, and map-navigation cluster.
- [ ] Opaque fallback is complete and readable without `backdrop-filter`.
- [ ] No stacked cards, gradients, neon glows, excessive pills, or purple/blue AI styling.
- [ ] Exactly four application font sizes and two weights are used.
- [ ] Application spacing uses only 4/8/16/24/32/48/64, plus the declared 44px control exception.
- [ ] Accent is confined to reserved elements.
- [ ] Map and export remain opaque and independent of dark mode.

### Responsive structure

- [ ] One active workspace DOM exists at every viewport.
- [ ] React changes desktop/compact composition at 1200px only.
- [ ] Desktop DOM/focus order is map then inspector.
- [ ] Compact/mobile DOM/focus order follows the declared workflow.
- [ ] UI contains at 360px without horizontal page scrolling.
- [ ] 200% zoom does not create two-dimensional page scrolling for core controls.

### Camera and map

- [ ] New maps open at whole-world fit.
- [ ] Horizontal wrap is continuous and no more than one whole world is visible at minimum zoom.
- [ ] Vertical movement cannot reveal empty space beyond projected limits.
- [ ] Drag, wheel/trackpad, one-finger pan, and pinch are pointer-anchored and do not regenerate geometry per frame.
- [ ] Dragging does not select a country on release.
- [ ] Zoom, pan, Locate, and Reset View have semantic single-pointer alternatives.
- [ ] Locate never changes selection or color history.
- [ ] Locate no-match uses the exact scoped heading/body/action copy, and `Locate Country` stays disabled until a valid option is committed.
- [ ] Reset View preserves colors, selection, period, and legend.
- [ ] Each entity has one stable D3-owned logical path; decorative repeated paths remain `aria-hidden` and unfocusable.
- [ ] After horizontal panning, roving DOM focus remains on the same logical node while its focus indicator and keyboard tooltip anchor reconcile to the nearest visible wrapped copy.

### Historical state

- [ ] Production period selector includes only historian-reviewed assets.
- [ ] Historical coverage and modern fallback are persistently explained.
- [ ] Snapshot switches use complete-state crossfade or immediate reduced-motion swap.
- [ ] Matching identities preserve color; new/different entities begin white.
- [ ] Export during crossfade captures only the selected finished scene.

### Legend

- [ ] Every active non-white effective color has one legend entry.
- [ ] New entries use uppercase hex labels and first-use order.
- [ ] Dormant labels/order return when a color becomes active again.
- [ ] Label editing, Up/Down ordering, Alt+Arrow ordering, drag convenience, and live announcements work.
- [ ] Corner presets, direct drag, nudge buttons, and keyboard nudges are equivalent.
- [ ] Theme, text size, opacity, border, and position use only declared values.
- [ ] Legend remains inside the 32-unit safe inset.
- [ ] Exported legend uses only SVG primitives and solid/RGBA values.
- [ ] More than 30 colors or non-fitting labels visibly block export; no entry is silently omitted.

### Persistence

- [ ] V2 saves restore color, camera, period, legend, and visible composition settings.
- [ ] Phase 1 saves load with modern/whole-world defaults and explicit migration feedback.
- [ ] Legacy records are not rewritten until explicit save/replace.
- [ ] Dirty composition load uses the declared confirmation.
- [ ] Delete uses inline confirmation and preserves working composition.
- [ ] Desktop dialog and compact/mobile sheet expose `Close Saved Maps`; Escape remains supported and scrim dismissal follows the declared breakpoint behavior.
- [ ] Modal focus trap and opener/current-responsive-equivalent restoration remain correct for every ordinary dismissal path.

### Accessibility and preferences

- [ ] All controls are semantic, keyboard operable, and visibly focused.
- [ ] Drag and pinch have click/tap alternatives.
- [ ] Targets meet 48px or declared 44px dimensions.
- [ ] Selection, history, fallback, errors, and legend state never rely on color alone.
- [ ] Reduced motion removes scene/camera transitions.
- [ ] Reduced transparency, increased contrast, and forced colors receive opaque, bordered fallbacks.
- [ ] Tooltip remains at least 8px inside every viewport edge.

### Export

- [ ] Activation freezes the exact last painted camera frame synchronously.
- [ ] Pacific/date-line framing exports without seams or gaps.
- [ ] Current historical/fallback scene and legend are preserved.
- [ ] Editor chrome, selection, focus, hover, tooltip, handles, and status are removed.
- [ ] Output is exactly 1080×1080, fully opaque, white-backed, and device-pixel-ratio independent.
- [ ] Existing connected-anchor handoff and complete resource cleanup remain intact.
- [ ] Named and unnamed filename contracts are followed.

---

## 25. Research Basis and Primary Guidance

The contract uses established map-editor conventions without copying any product branding:

- Direct drag, wheel, touch pan, pinch, configurable interaction handlers, and separate navigation controls align with [Mapbox GL JS gesture guidance](https://docs.mapbox.com/mapbox-gl-js/guides/user-interactions/gestures/).
- Every authored drag interaction has a clickable/tappable alternative per [WCAG 2.2 Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements).
- Pinch zoom has plus/minus controls per [WCAG 2.2 Pointer Gestures](https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html).
- 44×44 compact controls exceed the [WCAG 2.2 24×24 minimum target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum).
- Legend keyboard reordering follows the focus retention, Alt+Arrow, and live-announcement behavior in the [WAI-ARIA rearrangeable listbox example](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/examples/listbox-rearrangeable/).
- Locate autocomplete follows the [WAI-ARIA Combobox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/).
- Advanced Legend controls use a disclosure because accordions/disclosures are appropriate for progressive disclosure in narrow side panels, consistent with [Carbon accordion usage guidance](https://carbondesignsystem.com/components/accordion/usage/).
- Opaque fallbacks and system-color corrections follow MDN guidance for [`prefers-reduced-transparency`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-transparency), [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-contrast), and [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/forced-colors).

---

## 26. Source Traceability

| Source | Decisions used |
|--------|----------------|
| `02-CONTEXT.md` | Unified canvas, direct navigation, wrapping/clamping, exact visible export, separate Locate/Reset View, full composition saves, curated snapshots/fallback, legend generation/position/style, local-only boundary |
| `02-RESEARCH.md` | Mercator camera constraints, transform-only rendering, wrapped-copy accessibility, 195-state scope, snapshot status, SVG legend/export limitations, persistence migration, reduced-transparency strategy |
| `.planning/REQUIREMENTS.md` | Historical selector/redraw/fallback/tooltips, centering intent, legend editing/placement/style, legend in export, WCAG and responsive requirements |
| `.planning/STATE.md` | Phase 1 verified contracts, one-active-DOM pattern, exact PNG, creator-safe feedback, current browser boundary |
| Phase 1 UI source/styles | Existing spacing/type scales, 8/16 radius system, responsive breakpoints, semantic controls, map/list selection, stable live region, modal focus, tooltip containment, toast patterns |
| `01-UI-SPEC.md` and Phase 1 UI review | Proven hierarchy, exact copy/state patterns, token discipline, full visible preset names, stable tooltip measurement, export isolation |
| Coding rules | Plain CSS, React/D3 ownership, stable IDs, typed boundaries, exact export cleanup, local persistence behavior |
| Primary platform guidance | Map gestures, dragging/pinch alternatives, target size, combobox/reordering semantics, contrast/transparency fallbacks |

### Pre-population count

- `02-CONTEXT.md`: 29 locked product decisions plus 5 discretion areas resolved here.
- `02-RESEARCH.md`: camera, data, legend, export, storage, accessibility, and visual fallback recommendations.
- Existing design system: detected and preserved; `components.json` absent.
- User visual direction: map-first, minimal, organized, restrained liquid glass, export-safe, accessible, and non-generic.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
