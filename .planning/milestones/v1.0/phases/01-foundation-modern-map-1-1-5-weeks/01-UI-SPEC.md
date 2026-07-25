---
phase: 1
slug: foundation-modern-map-1-1-5-weeks
status: approved
reviewed_at: 2026-07-21T16:03:28-05:00
shadcn_initialized: false
preset: none
created: 2026-07-21
---

# Phase 1 — UI Design Contract

> Visual and interaction source of truth for the CountriesIRL modern-map MVP. This contract is implementation-ready and is subordinate only to locked Phase 1 product decisions in `01-CONTEXT.md` and technical constraints in `01-RESEARCH.md`.

---

## 1. Scope and Product Experience

Phase 1 presents one browser-based workspace where a non-technical creator can:

1. Select one country on the map or multiple countries from the country list.
2. Apply a preset or validated custom color.
3. Undo, redo, reset, save, load, or delete map configurations.
4. Export the current map as an exact 1080×1080 PNG.

The intended first-session path must require no documentation and must allow five countries to be colored in under two minutes.

### In scope

- Modern European borders only.
- Interactive square map preview.
- Single and bulk country selection.
- Preset and custom colors.
- Undo, redo, reset.
- Local save, overwrite, load, and delete.
- First-use onboarding and persistent help access.
- Loading, empty, success, warning, and error states.
- Responsive desktop, tablet, and secondary mobile layouts.
- Keyboard operation, screen-reader labeling, visible focus, reduced-motion support.
- Fixed white 1080×1080 PNG presentation.
- System-preference dark UI that never changes export colors.

### Explicitly out of scope

Do not expose controls, placeholders, or disabled affordances for historical periods, map centering, zoom presets, legends, SVG export, batch export, cloud sync, authentication, sharing URLs, or advanced patterns/hatching.

---

## 2. Design System

| Property | Value |
|----------|-------|
| Tool | Manual project design system using component-scoped CSS and `theme.css` custom properties |
| Preset | Not applicable |
| Component library | None |
| Icon library | None; actions use visible text labels. A simple close glyph may accompany an accessible label. |
| Font | System UI stack: `Inter` when locally available, then `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `Roboto`, `Helvetica`, `Arial`, `sans-serif` |
| Styling | Plain CSS only; no Tailwind, CSS-in-JS, shadcn, or third-party UI registry |
| Theme | Light default plus `prefers-color-scheme: dark` UI variables |

**Source:** Plain CSS and no Tailwind are locked by `01-CONTEXT.md` D-09 and confirmed by `01-RESEARCH.md`. Repository inspection found no product source, `components.json`, Tailwind config, component library, visual assets, or existing UI tokens.

### Design-system gate decision

shadcn is intentionally not initialized. The locked plain-CSS stack answers the initialization question and prevents adding Tailwind or a component registry in this phase.

---

## 3. Visual Direction and Hierarchy

### Character

- Practical creator tool, not a dashboard or marketing page.
- Calm neutral workspace around a bright, white map canvas.
- Crisp borders, restrained shadows, and compact controls.
- No gradients, glass effects, decorative illustrations, flags, emoji icons, or ornamental motion.

### Primary focal point

The white square Europe map preview is the primary visual anchor. It must occupy the largest area of the page. At desktop widths it precedes controls in both DOM and visual order. At tablet and mobile widths, action controls precede the map in both DOM and visual order so file/history actions remain immediately reachable.

### Secondary focal point

The current selection and color controls are second. The selected-country count, current-color preview, and applicable color actions must be visible together.

### Tertiary actions

Undo, redo, reset, save/load, and help are visually quieter than the map and color workflow. `Export PNG` is the only persistent accent-filled action.

### Hierarchy rules

1. Map preview.
2. Selected-country state and color application.
3. Country list for bulk selection.
4. Export action.
5. History, persistence, help, and destructive actions.

Only one filled accent CTA appears in the persistent workspace: `Export PNG`. Onboarding may temporarily use `Start Coloring` as its accent CTA before the user begins editing.

---

## 4. Spacing Scale

Declared values are the only spacing tokens for margins, padding, and gaps.

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | 4px | Inline icon/text separation, compact status gaps |
| `--space-sm` | 8px | Related controls, swatch gaps, compact row padding |
| `--space-md` | 16px | Default component padding and form spacing |
| `--space-lg` | 24px | Card padding, workspace gaps |
| `--space-xl` | 32px | Major panel separation and page gutters |
| `--space-2xl` | 48px | Empty/error state breathing room |
| `--space-3xl` | 64px | Large-screen outer spacing and export-map inset |

### Spacing rules

- Desktop page gutter: 32px.
- Tablet page gutter: 24px.
- Mobile page gutter: 16px.
- Card internal padding: 24px desktop/tablet; 16px mobile.
- Control groups use 8px gaps; sections use 24px separation.
- Form labels sit 8px above their controls.
- No spacing value outside this scale is allowed.

### Exceptions

OS-provided safe-area insets through `env(safe-area-inset-top)`, `env(safe-area-inset-right)`, `env(safe-area-inset-bottom)`, and `env(safe-area-inset-left)` may be added to authored token-based padding. These environment values are device geometry, not project spacing tokens. All authored numeric spacing must still use the declared scale. Touch targets use a 48px minimum dimension, which is already part of the declared scale.

---

## 5. Typography

Use exactly four sizes and exactly two weights throughout the application.

| Role | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| Label | 14px | 600 | 1.4 | Field labels, metadata, helper headings, button labels |
| Body | 16px | 400 | 1.5 | Paragraphs, inputs, country names, status text |
| Heading | 20px | 600 | 1.3 | Panel titles, modal title, error-state title |
| Display | 28px | 600 | 1.2 | App title only |

### Typography rules

- The only weights are regular `400` and semibold `600`.
- Buttons use Label typography except the primary export action, which may use Body size at weight `600`.
- Inputs use Body typography.
- Long map names and country labels truncate visually with an accessible full-name label or title.
- Color values use the system monospace stack at Body size and weight `400`; this does not introduce another font size or weight.
- Do not use all-caps headings. `PNG` may remain uppercase as a file-format abbreviation.

---

## 6. Color Contract

### Light theme: 60/30/10 distribution

| Role | Value | Usage |
|------|-------|-------|
| Dominant surface (60%) | `#F3F4F6` | Page background, workspace gutters, inactive neutral areas |
| Secondary surface (30%) | `#FFFFFF` | Map preview, control cards, modal, inputs, saved-map rows |
| Accent (10%) | `#4338CA` | `Export PNG`, temporary `Start Coloring`, focus rings, onboarding accent bar only |
| Destructive | `#B42318` | `Delete Saved Map`, destructive error text, reset warning emphasis only |

**Accent reserved for:** the persistent `Export PNG` button; the temporary onboarding `Start Coloring` button and onboarding accent bar; all `:focus-visible` rings. It is not used for every button, link, selected country, palette swatch, or decorative background.

### Supporting neutral and semantic tokens

| Token | Light value | Usage |
|-------|-------------|-------|
| Primary text | `#111827` | Main text and selected country outlines |
| Secondary text | `#4B5563` | Helper text, timestamps, secondary copy |
| Muted text | `#6B7280` | Disabled descriptions only |
| Border | `#D1D5DB` | Cards, inputs, country rows |
| Strong border | `#111827` | Selected countries and active swatches |
| Hover surface | `#E5E7EB` | Neutral-button and row hover |
| Accent tint | `#EEF2FF` | Onboarding background only |
| Success | `#067647` | Success status icon/text only |
| Success tint | `#ECFDF3` | Success toast background |
| Warning | `#B54708` | Recoverable warning text only |
| Warning tint | `#FFFAEB` | Recoverable warning banner background |
| Destructive tint | `#FEF3F2` | Destructive toast and validation background |
| Map default fill | `#FFFFFF` | Uncolored countries and reset state |
| Map default border | `#9CA3AF` | Country boundaries in preview and export |
| Map selected border | `#111827` | Selected country boundary in editor only |

### Dark-theme UI tokens

| Token | Dark value |
|-------|------------|
| Dominant surface | `#111827` |
| Secondary surface | `#1F2937` |
| Primary text | `#F9FAFB` |
| Secondary text | `#D1D5DB` |
| Muted text | `#9CA3AF` |
| Border | `#4B5563` |
| Hover surface | `#374151` |
| Accent | `#818CF8` |
| Accent tint | `#312E81` |

Dark theme changes application chrome only. The map preview and export frame remain white with fixed map colors and fixed neutral borders.

### User map colors

Preset and custom map colors are content, not design-system accents. The preset palette is exactly:

| Name | Value |
|------|-------|
| Red | `#DC2626` |
| Green | `#16A34A` |
| Blue | `#2563EB` |
| Yellow | `#FACC15` |
| Magenta | `#C026D3` |
| Cyan | `#0891B2` |
| Orange | `#EA580C` |
| Violet | `#7C3AED` |
| White | `#FFFFFF` |
| Gray | `#6B7280` |

Every preset control shows its color name as visible text beside or below the swatch and uses `aria-label="Apply {color name}"`. Every swatch has a visible border. White remains distinguishable against the white card by the standard border. Active swatches use a black outline plus a checkmark; selection is never indicated by color alone.

---

## 7. Shape, Elevation, and Motion

### Shape

- Cards, inputs, buttons, banners, and toasts use an 8px radius.
- Modal and map shell use a 16px radius.
- Color swatches are square with an 8px radius.
- Do not use pill-shaped primary buttons. A pill is permitted only for the selected-count status badge.

### Borders and shadows

- Cards use a 1px neutral border and no shadow by default.
- The map shell may use one subtle shadow to separate the white square from the page background.
- Inputs use a 1px border; focus uses a 2px accent ring with visible offset.
- Selected map paths use a 2px black boundary in the editor.
- Focused map paths use a 3px dashed accent boundary, which temporarily supersedes hover styling.
- Hovered map paths use a 1px darker boundary and a slight brightness change.

### Motion

- Country fill changes: 150ms ease-out.
- Button, border, and surface changes: 150ms ease-out.
- Modal appearance: 150ms opacity and translate transition.
- No looping animation.
- Export spinner is the only continuous animation and stops immediately on completion or failure.
- Under `prefers-reduced-motion: reduce`, remove transforms and transitions and replace the spinner rotation with a static progress indicator plus `Exporting PNG…` text.

---

## 8. Information Architecture and Component Inventory

| Component | Responsibility | Required states |
|-----------|----------------|-----------------|
| `AppHeader` | Product title, subtitle, `Show Help` action | Default, compact mobile |
| `OnboardingBanner` | First-use three-step guidance | Visible, dismissed |
| `MapWorkspace` | Map preview shell, size label, loading/error placement | Loading, ready, warning, fatal error |
| `MapCanvas` | SVG paths, hover/focus tooltip, click/tap selection | Default, hovered, focused, selected, multi-selected |
| `MapTooltip` | Country name and current color | Pointer hover, keyboard focus, hidden |
| `SelectionPanel` | Selected count, current color, clear selection | No selection, single selection, multi-selection, mixed colors |
| `ColorPicker` | Presets, custom input, preview, apply action | Disabled, valid, invalid, applying |
| `CountryList` | Alphabetical bulk selection list | Ready, filtered only by selection state, empty only if map unusable |
| `Controls` | Undo, redo, reset, save/load, export | Enabled, disabled, exporting |
| `SaveLoad` | Save form and saved-map list | Empty, populated, overwrite warning, storage error |
| `ConfirmationDialog` | Reset confirmation only if reset cannot be immediately undone | Normally unused because reset is undoable |
| `ToastRegion` | Success, warning, and error feedback | Polite status, assertive error |
| `FatalErrorState` | Unusable map-data recovery | Load failure, unusable collection |

No global navigation, sidebar navigation, tabs, account menu, footer navigation, or marketing hero is part of Phase 1.

---

## 9. Desktop Layout

### Viewports at 1200px and wider

- Header spans the page and is visually compact.
- Main workspace has a maximum content width of 1440px and is centered.
- Workspace grid: flexible map column plus fixed 360px control column.
- Desktop source/DOM order is map column first, then control column; keyboard focus follows that same order.
- Grid gap: 24px.
- The map column must remain the wider column.
- The visible map preview is a square and scales to available width while preserving the 1:1 ratio.
- The control column is composed of stacked cards in this order:
  1. History and file actions.
  2. Selection and color controls.
  3. Country list.
- If viewport height is constrained, the control column scrolls independently; the map remains visible.
- The `Export PNG` button remains within the first action card and is visible without scrolling at a typical laptop viewport.

### Header

- Left: `CountriesIRL Map Generator`.
- Under or beside title according to available width: `Color countries and export an Instagram-ready map.`
- Right: neutral text button `Show Help`.
- No logo asset is required in Phase 1.

### Map shell

- A small label above the square reads `1080 × 1080 PNG preview`.
- The label is outside the exportable square.
- The map square is white in both light and dark UI themes.
- No editor chrome overlays the map except the transient tooltip.

---

## 10. Tablet Layout

### Viewports from 768px through 1199px

- Use one page column.
- Header remains horizontal when space permits and wraps without clipping.
- Tablet source/DOM order is action controls, map preview, selection/color controls, then country list; do not use CSS visual reordering that disagrees with focus order.
- Action controls appear first as a full-width card.
- Map preview appears second and spans the available width.
- Selection/color and country-list cards appear below the map in a two-column grid when each column can remain usable; otherwise stack them.
- No panel uses a fixed viewport height.
- The page scrolls normally; do not create nested scrolling except inside the country-list results area.
- All controls have at least a 48px interactive height.
- Map click/tap targets remain the SVG country shapes. Small countries must also be selectable from the country list.

---

## 11. Mobile Layout

### Viewports below 768px

Mobile is supported as a secondary web layout, not as a separate app.

- Header stacks title, subtitle, and `Show Help`.
- Mobile source/DOM order and visual order are identical.
- Workspace order:
  1. Onboarding or status banner.
  2. Action controls.
  3. Map preview.
  4. Selection and color controls.
  5. Country list.
- Action controls use a two-column grid. `Export PNG` spans both columns.
- Undo and redo remain adjacent.
- Save/load and reset use visible labels; no icon-only action is allowed.
- The map preview fills the content width and remains square.
- Color swatches use a five-column grid when space permits and wrap without horizontal scrolling.
- Country rows use one column.
- Save/load modal becomes a full-height sheet with its own header, close action, and safe-area padding.
- The application must work at a 360px viewport without page-level horizontal scrolling.

---

## 12. Core Interaction Contract

### 12.1 Selecting countries

#### Map selection

- Click or tap a country to replace the current selection with that single country.
- The selected path receives a 2px black border.
- The selection panel announces the country name and count.
- Clicking empty map background clears the map selection only after an explicit empty-background hit; it must not trigger accidentally while panning is absent.

#### Country-list bulk selection

- Each row contains a checkbox, country name, and current-color swatch.
- Checking a row adds it to the current bulk selection.
- Unchecking a row removes it.
- `Select All Countries` and `Clear Selection` are available above the list as neutral text actions.
- `Select All Countries` affects only valid rendered countries.
- Map-click single selection and country-list bulk selection share one visible selected set; the UI never displays contradictory selected states.

#### Selection display

- No selection: heading `Select countries to color`.
- One selection: show the country name and `1 country selected`.
- Multiple selection: show `{count} countries selected` and up to the first three country names, followed by `and {remaining} more` when needed.
- If selected countries have different colors, the current-color preview displays a neutral diagonal split and the text `Mixed colors`.
- Selection is conveyed through border weight, checkbox/checkmark, count text, and `aria-selected`, not color alone.

### 12.2 Applying preset colors

- Preset swatches are disabled until at least one country is selected.
- Each preset displays its visible color name and exposes `aria-label="Apply {color name}"`.
- Clicking a preset applies it immediately to the complete selected set as one reducer action.
- The active swatch receives a checkmark and strong outline only when every selected country has that exact color.
- After application, keep the same countries selected so the user can compare or revise them.
- Announce `Applied {color name} to {count} countries.` in the polite live region.

### 12.3 Applying a custom color

- Field label: `Custom color`.
- Placeholder: `#RRGGBB or rgb(0, 0, 0)`.
- Accepted forms: `#RGB`, `#RRGGBB`, and `rgb(r,g,b)` where every channel is from 0 through 255.
- Input edits remain a local draft and never create history entries.
- A valid draft updates the preview but does not change the map until `Apply Custom Color` is activated.
- Invalid drafts show the exact inline error: `Enter #RGB, #RRGGBB, or rgb values from 0 to 255.`
- Invalid input uses `aria-invalid="true"` and references the inline message with `aria-describedby`.
- `Apply Custom Color` is disabled when there is no selection, the draft is empty, or the draft is invalid.
- Successful application is one history action regardless of selection count.
- Normalize every accepted custom input to uppercase `#RRGGBB` before storing or announcing it. Custom-color success copy is `Applied {normalized hex} to {count} countries.`; for example, `Applied #1A2B3C to 3 countries.`

### 12.4 Undo and redo

- Labels: `Undo Color Change` and `Redo Color Change`.
- Disabled state is visually clear and uses native `disabled` semantics.
- Hover/focus helper text may show `Ctrl/Cmd+Z` and `Ctrl/Cmd+Shift+Z`; shortcuts are supplemental and not required for discoverability.
- Selection-only changes do not affect history.
- New color changes after undo make redo unavailable immediately.

### 12.5 Reset

- Label: `Reset All Colors`.
- Reset returns every country to white and is recorded as one undoable color action.
- Because reset is immediately undoable, do not interrupt with a confirmation modal.
- Show the status: `All colors reset. Use Undo Color Change to restore them.`
- If all countries are already white, disable the control and do not create history.

### 12.6 Save and load

- Workspace action label: `Save or Load Maps`.
- Opens a modal titled `Save or load maps`.
- Modal sections:
  1. `Save current map`.
  2. `Saved maps`.
- Map-name field label: `Map name`.
- Placeholder: `Example: Europe summer map`.
- Maximum map-name length: 100 characters.
- Primary form action: `Save Current Map`.
- Empty-name error: `Enter a map name before saving.`
- On exact trimmed-name match, show inline notice: `A saved map already uses this name. Saving will replace it.` and change CTA to `Replace Saved Map`.
- Save success: `Map saved to this browser.`
- Replace success: `Saved map replaced.`
- Saved rows show name, `DD MMM YYYY` date, `Load This Map`, and `Delete Saved Map`.
- Loading replaces current colors, resets history, closes the modal, and announces `Saved map loaded.`
- Deleting removes the saved record immediately with no confirmation dialog, as locked by the Phase 1 storage rules. The current working map is unchanged. Announce `Saved map deleted.`
- Delete is styled as destructive text, not a large filled red button.
- The modal footer includes `Close Saved Maps`, never a generic `Cancel` label.

### 12.7 Export

- Primary CTA: `Export PNG`.
- While active: `Exporting PNG…`; button disabled; repeated activation prevented.
- Export remains available when no country has been colored; this produces the default white map with visible country boundaries.
- Success message: `PNG downloaded at 1080 × 1080.`
- Failure message: `The PNG could not be created. Refresh the page and try Export PNG again.`
- The failure toast may include the action `Try Export Again` only after the current export promise has settled.
- Filename: `CountriesIRL_<YYYY-MM-DD>.png`.

---

## 13. Exact Export-Frame Presentation

The export frame is a rendering contract, not a screenshot of the full application.

### Dimensions and capture

- Offscreen HTML export frame: exactly 540×540 CSS pixels.
- html2canvas scale: exactly `2`.
- Required output canvas: exactly 1080×1080 physical pixels.
- Fail the export visibly if the generated canvas dimensions are not exactly 1080×1080.
- Device pixel ratio must not affect output size.

### Frame contents

- Background: solid `#FFFFFF` across the full square.
- Content: the Europe SVG map only.
- No app header, preview label, controls, tooltip, toast, modal, onboarding, selection count, focus ring, hover style, selected-country outline, title, legend, attribution, watermark, date, or filename text appears inside the image.
- User-assigned country fills are preserved exactly.
- Uncolored countries use `#FFFFFF`.
- Country borders use `#9CA3AF` at a uniform 1px final-output stroke.
- The SVG logical viewBox is `0 0 1080 1080` and is rendered with `preserveAspectRatio="xMidYMid meet"`.
- Projection fits the fixed Europe view within logical extent `[[64, 64], [1016, 1016]]`.
- Geographic content remains centered in that extent. Do not fit dynamically to selected countries.
- The export contains no transparent pixels.
- The export subtree uses fixed light values and must not inherit dark-theme UI variables.
- No external image or font resource may appear in the frame.

### Preview relationship

The visible editor map is a responsive preview of this square composition. It uses the same viewBox, projection extent, fills, and default boundaries, but may additionally show editor-only hover, focus, and selection styling. Users should not see geographic repositioning or cropping between preview and export.

---

## 14. Onboarding and Help

### First-use banner

Display above the workspace on the first visit for the browser origin.

- Heading: `Start your map`.
- Body: `Select countries, choose a color, then export a square PNG for Instagram.`
- Steps:
  1. `Select one country on the map or several from the list.`
  2. `Choose a preset or enter a custom color.`
  3. `Export PNG when the map is ready.`
- CTA: `Start Coloring`.
- Secondary action: `Dismiss Help`.
- Do not auto-dismiss on a timer.
- Dismissing does not alter map state.
- Focus moves to the map when `Start Coloring` is used.

### Returning users

- Header action `Show Help` reopens the same guidance.
- Help appears as a non-modal banner, not a blocking tour.
- Do not use spotlight overlays, coach marks attached to moving targets, or multi-step modal tours in Phase 1.

---

## 15. Loading, Empty, Warning, Error, and Success States

### 15.1 Initial map loading

- Preserve the full application shell.
- Map square shows a neutral skeleton representation, not a spinner over blank white.
- Text: `Loading Europe map…`
- All map-dependent selection, color, reset, save, and export controls are disabled.
- `aria-live="polite"` announces loading once.
- Avoid animated shimmer under reduced-motion preference.

### 15.2 No country selected

- Heading: `Select countries to color`.
- Body: `Choose a country on the map, or use the country list to select several.`
- Color controls remain visible but disabled so the next step is discoverable.
- This is the primary editor empty state; do not hide the entire color panel.

### 15.3 No saved maps

- Heading: `No saved maps yet`.
- Body: `Name the current map above to keep it in this browser and load it later.`
- Do not use generic `No data` or `Nothing here` copy.

### 15.4 Partial GeoJSON warning

If malformed features are skipped but a usable map remains:

- Non-blocking warning banner: `Some country shapes could not be loaded. You can continue with the available map.`
- The banner does not prevent coloring or export.
- Do not expose raw parse details to users.

### 15.5 Fatal map-load error

If the asset cannot be fetched or the collection is unusable:

- Heading: `We couldn't load the Europe map`.
- Body: `Refresh the page to try the bundled map data again. Your saved maps will stay in this browser.`
- Action: `Reload Map`.
- Keep `Show Help` and save/load unavailable because there is no valid working map.
- Do not show raw URLs, stack traces, or exception messages.

### 15.6 Invalid custom color

- Inline field error: `Enter #RGB, #RRGGBB, or rgb values from 0 to 255.`
- Keep the previous valid map colors unchanged.
- Do not show a global toast for every invalid keystroke.

### 15.7 Storage unavailable

- Error copy: `This browser blocked local saves. You can keep editing and export a PNG, but maps cannot be saved here.`
- Keep the modal open and preserve the entered map name.

### 15.8 Storage quota exceeded

- Error copy: `Browser storage is full. Delete an older saved map, then save this map again.`
- Keep the modal open and bring the saved-map list into view.

### 15.9 Corrupt saved data

- Warning copy: `Some saved maps could not be read and were left out of the list. Your current map is unchanged.`
- Valid records remain available.
- Corrupt content must never be rendered as HTML.

### 15.10 Export failure

- Error copy: `The PNG could not be created. Refresh the page and try Export PNG again.`
- Restore the enabled button after failure.
- Preserve the current map and selection.

### 15.11 Success feedback

Use toasts or an equivalent status region for:

- Preset color: `Applied {color name} to {count} countries.`
- Custom color: `Applied {normalized hex} to {count} countries.`, where the value is uppercase `#RRGGBB`.
- `Map saved to this browser.`
- `Saved map replaced.`
- `Saved map loaded.`
- `Saved map deleted.`
- `PNG downloaded at 1080 × 1080.`

Success feedback must not use blocking browser alerts.

---

## 16. Toast and Status Contract

- Toast region is fixed near the bottom center on desktop/tablet and above the safe area on mobile.
- Only one toast is visible at a time; later messages replace earlier success messages.
- Success and informational messages use `role="status"` with polite announcement.
- Export, storage, and fatal-operation errors use `role="alert"`.
- Success toasts remain visible long enough to read and may dismiss automatically; error toasts remain until dismissed or replaced by a retry action.
- Toast dismiss action label: `Dismiss Message`.
- Toast color is always paired with text and a semantic status label.

---

## 17. Save/Load Modal Contract

### Desktop and tablet

- Maximum width: 560px.
- Maximum height: 80vh.
- Modal body scrolls when the saved-map list exceeds available height.
- Overlay uses a dark translucent neutral.
- First focus lands on `Map name` when saving is the likely task; if opened after a load-related keyboard action, first focus may land on the modal heading.

### Mobile

- Full-height sheet, edge-to-edge horizontally.
- Sticky modal header contains title and `Close Saved Maps`.
- Save form precedes list.

### Accessibility

- `role="dialog"`, `aria-modal="true"`, labeled by the modal heading.
- Focus is trapped while open.
- Escape closes the modal.
- Closing restores focus to `Save or Load Maps`.
- Clicking the overlay may close the modal only when no save operation is active and must not be the sole close method.

---

## 18. Accessibility Contract

### Semantics

- Use native `button`, `input`, `label`, and checkbox elements.
- Every action has a visible text label; no persistent icon-only controls.
- The map SVG has `role="listbox"`, `aria-label="Interactive map of modern Europe"`, and `aria-multiselectable="true"`.
- Country paths have `role="option"`, an accessible name, current color text, and `aria-selected`.
- Each path also contains a `<title>` with `{country name}, {current color}`.

### Keyboard map operation

Use a roving-tabindex model so the map is one Tab stop rather than dozens.

- Tab enters the last focused country path.
- Left/Up moves to the previous valid country in stable alphabetical order.
- Right/Down moves to the next valid country.
- Home moves to the first country; End moves to the last.
- Enter or Space selects the focused country as the single current selection.
- Escape clears the current selection when focus is inside the map.
- Country-list checkboxes provide the accessible bulk-selection path.

### Focus

- All interactive elements show the accent focus ring only for `:focus-visible`.
- Focus is never removed without a replacement.
- Dismissing onboarding moves focus to the map.
- Loading a map returns focus to the map preview and announces completion.
- Deleting a saved row moves focus to the next saved row, previous row, or `Map name` if the list becomes empty.

### Contrast and non-color cues

- Normal text meets WCAG AA contrast against its surface.
- Controls and focus indicators meet at least 3:1 contrast against adjacent colors.
- Selected countries use increased boundary width and list checkmarks in addition to color.
- Active preset swatches use an outline and checkmark.
- User-chosen map fills are not required to meet text contrast because no text is placed inside countries; accessible names provide equivalent information.

### Pointer and touch

- Controls and swatches use a minimum 48×48px target.
- Do not require hover to discover an action.
- Country tooltip also appears on keyboard focus.
- Small or narrow countries remain selectable through the country list.

### Live announcements

Announce selection count, color application, undo/redo result, reset, load, save, delete, and export result without moving focus.

---

## 19. Responsive and Content Stress Rules

- Country names may wrap to two lines in rows; after two lines, truncate visually and preserve the full accessible name.
- Saved map names may wrap to two lines; actions remain aligned and reachable.
- At 200% browser zoom, core controls remain usable without two-dimensional scrolling.
- The map remains square and may scale down; do not crop it to preserve sidebar width.
- At narrow heights, favor page scrolling over shrinking buttons or typography.
- System text enlargement must not overlap map labels because no visible text is placed inside the SVG paths.

---

## 20. Copywriting Contract

| Element | Exact copy |
|---------|------------|
| Product title | `CountriesIRL Map Generator` |
| Product subtitle | `Color countries and export an Instagram-ready map.` |
| Primary CTA | `Export PNG` |
| Export loading | `Exporting PNG…` |
| Onboarding heading | `Start your map` |
| Onboarding CTA | `Start Coloring` |
| Main empty-state heading | `Select countries to color` |
| Main empty-state body | `Choose a country on the map, or use the country list to select several.` |
| Saved-list empty heading | `No saved maps yet` |
| Saved-list empty body | `Name the current map above to keep it in this browser and load it later.` |
| Fatal error heading | `We couldn't load the Europe map` |
| Fatal error body | `Refresh the page to try the bundled map data again. Your saved maps will stay in this browser.` |
| Fatal error action | `Reload Map` |
| Save action | `Save Current Map` |
| Overwrite action | `Replace Saved Map` |
| Modal close | `Close Saved Maps` |
| Load row action | `Load This Map` |
| Delete row action | `Delete Saved Map` |
| Reset action | `Reset All Colors` |
| Custom apply | `Apply Custom Color` |
| Invalid color | `Enter #RGB, #RRGGBB, or rgb values from 0 to 255.` |
| Export error | `The PNG could not be created. Refresh the page and try Export PNG again.` |

### Destructive confirmation approaches

| Action | Approach |
|--------|----------|
| `Reset All Colors` | No modal because reset is one undoable action. Show `All colors reset. Use Undo Color Change to restore them.` |
| `Delete Saved Map` | No confirmation dialog, per locked Phase 1 storage rules. Delete only the saved record, leave the working map unchanged, then announce `Saved map deleted.` |
| `Replace Saved Map` | Inline pre-action warning and explicit `Replace Saved Map` CTA; no generic save label |

---

## 21. Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | None | Not applicable — shadcn is not initialized |
| Third-party registries | None | No third-party code or blocks permitted in Phase 1 |

No registry vetting is required because no registry or component block is included in the contract.

---

## 22. Implementation Acceptance Checklist

### Visual and responsive

- [ ] The map square is the largest visual element at desktop, tablet, and mobile widths.
- [ ] Desktop source/visual order is map then controls; tablet/mobile source/visual order is action controls then map, with no focus-order mismatch.
- [ ] Desktop uses map plus 360px controls; tablet and mobile use the defined single-column flow.
- [ ] The app works at 360px without page-level horizontal scrolling.
- [ ] Light and dark UI themes preserve a white map square.
- [ ] Exactly four font sizes and two weights are used.
- [ ] All margins, padding, and gaps use the declared spacing scale.
- [ ] Accent appears only on reserved elements.
- [ ] OS safe-area insets may augment token spacing, but all authored numeric spacing uses the declared scale.

### Interaction

- [ ] Map click creates a single selection; country-list checkboxes support bulk selection.
- [ ] Every preset shows a visible color name and `aria-label="Apply {color name}"`.
- [ ] Preset click applies immediately as one action.
- [ ] Custom input applies only after valid explicit submission and announces the normalized uppercase `#RRGGBB` value.
- [ ] Undo, redo, and reset disabled states are truthful.
- [ ] Reset is undoable and does not show a confirmation modal.
- [ ] Save, overwrite, load, and delete use the exact labels and feedback specified.
- [ ] Export prevents duplicate activation and restores state after success or failure.

### States and copy

- [ ] Loading, no-selection, no-saves, partial-data warning, fatal load error, invalid color, storage unavailable, quota, corrupt storage, export failure, and success states are implemented.
- [ ] No native browser alert is used for normal feedback.
- [ ] No generic `Submit`, `Save`, `OK`, `Cancel`, or `No data` copy appears.

### Accessibility

- [ ] Every action is keyboard operable with a visible focus state.
- [ ] Map keyboard navigation follows the specified roving-tabindex contract.
- [ ] Country selection is not communicated by color alone.
- [ ] Tooltips appear on focus as well as hover.
- [ ] Modal focus is trapped and restored.
- [ ] Live regions announce state-changing operations.
- [ ] Reduced motion removes nonessential animation.

### Export

- [ ] Export frame is exactly 540×540 CSS pixels captured at scale 2.
- [ ] Downloaded PNG is asserted and manually verified at exactly 1080×1080 pixels.
- [ ] Export is white, opaque, map-only, and contains no editor selection/focus/hover state.
- [ ] Export uses the fixed logical extent `[[64, 64], [1016, 1016]]`.
- [ ] Preview and export use the same geographic viewBox and do not reframe selected countries.
- [ ] Filename is `CountriesIRL_<YYYY-MM-DD>.png`.
- [ ] Dark-theme variables do not leak into export.

---

## 23. Source Traceability

| Source | Decisions used |
|--------|----------------|
| `01-CONTEXT.md` | Locked stack, plain CSS, map SVG behavior, colors, selection, bulk flow, history, persistence, export, responsive, accessibility, theme, transitions, performance |
| `01-RESEARCH.md` | Greenfield design-system state, deterministic 540×540 scale-2 export frame, stable D3 view, storage/error boundaries, implementation risks |
| `.planning/CODEX_PROMPT.md` | Product title/subtitle, component inventory, palette direction, save/load modal, first-use help, responsive goals |
| `.planning/PHASE1_CODEX_BRIEF.md` | Creator workflow, hover/current-color tooltip, multi-select intent, smoothness target, dark-theme requirement |
| `.planning/REQUIREMENTS.md` | Non-technical usability, tablet/mobile support, WCAG AA target, exact square PNG |
| `.planning/coding-rules/*.md` | Semantic controls, keyboard map access, no color-only selection, component-scoped CSS, save/delete behavior, export filename and feedback |
| Repository inspection | No current product UI, assets, package manifest, components, styles, shadcn, Tailwind, or registries |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-07-21T16:03:28-05:00
