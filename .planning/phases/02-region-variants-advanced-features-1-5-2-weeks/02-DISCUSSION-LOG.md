# Phase 2: Region Variants & Advanced Features - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-24
**Phase:** 02-region-variants-advanced-features-1-5-2-weeks
**Areas discussed:** Navigation and wrap, Exact viewport export, Country coverage, Views and history, Historical world states, Legend composition

---

## Navigation and Wrap

### Horizontal looping appearance

| Option | Description | Selected |
|--------|-------------|----------|
| Repeat continuously | Render neighboring world copies when needed; viewport/export may show parts of multiple copies. | |
| Limit minimum zoom | Loop horizontally but prevent zooming out far enough to show more than one complete world. | ✓ |
| Blank beyond one copy | Wrap position while leaving unused space blank. | |

**User's choice:** Limit minimum zoom.

### Vertical boundaries

| Option | Description | Selected |
|--------|-------------|----------|
| Clamp at poles | Stop vertical movement before exposing empty space beyond the projected world. | ✓ |
| Elastic edge | Allow slight overscroll and spring back. | |
| Allow white space | Permit deliberate panning beyond the poles. | |

**User's choice:** Clamp at poles.

### Zoom anchor

| Option | Description | Selected |
|--------|-------------|----------|
| Pointer or pinch point | Keep the cursor location or pinch midpoint anchored. | ✓ |
| Canvas center | Always zoom toward the square's center. | |
| Selected country | Zoom toward the selection when available. | |

**User's choice:** Pointer or pinch point.

### Initial view

| Option | Description | Selected |
|--------|-------------|----------|
| Whole world fit | Open a new map with the complete world centered. | ✓ |
| Europe first | Open near the existing Europe composition. | |
| Last used view | Restore the browser's last camera state. | |

**User's choice:** Whole world fit.

---

## Exact Viewport Export

### Editor indicators

| Option | Description | Selected |
|--------|-------------|----------|
| Clean composition | Preserve camera/geography/colors while removing temporary editor state. | ✓ |
| Literal screenshot | Include selection, focus, and tooltips. | |
| Optional indicators | Default clean with an inclusion setting. | |

**User's choice:** Clean composition.

### Date-line composition

| Option | Description | Selected |
|--------|-------------|----------|
| Preserve exact view | Export the seam-spanning composition exactly as shown. | ✓ |
| Normalize before export | Reposition to a conventional world layout. | |
| Warn before export | Ask for confirmation when crossing the seam. | |

**User's choice:** Preserve exact view.

### Legend relationship

| Option | Description | Selected |
|--------|-------------|----------|
| Overlay inside canvas | Place the legend over the map and export it at that position. | ✓ |
| Reserve map space | Reduce the map viewport to make dedicated legend room. | |
| Export without legend | Keep legend editor-only. | |

**User's choice:** Overlay inside canvas.

### Export during camera movement

| Option | Description | Selected |
|--------|-------------|----------|
| Freeze immediately | Stop movement and capture the current frame. | ✓ |
| Wait until settled | Export the final inertial resting position. | |
| Disable while moving | Require a stationary map. | |

**User's choice:** Freeze immediately.

---

## Country Coverage

### Selectable world set

| Option | Description | Selected |
|--------|-------------|----------|
| Countries plus territories | Include sovereign states, dependencies, territories, and disputed units. | |
| 195-state core | Use the broadly recognized state set as primary selectable entities. | ✓ |
| States primary, territories optional | Add a control to reveal secondary units. | |

**User's choice:** 195-state core.

### Dependencies and territories

| Option | Description | Selected |
|--------|-------------|----------|
| Follow parent state | Render and color them through their responsible sovereign state. | ✓ |
| Neutral unselectable | Show them in a neutral style. | |
| Omit them | Do not render them. | |

**User's choice:** Follow parent state.

### Disputed geography

| Option | Description | Selected |
|--------|-------------|----------|
| Natural Earth default | Use the source dataset's default point of view consistently. | ✓ |
| Neutral disputed areas | Show disputed units without state assignment. | |
| Choose point of view | Let creators switch claim representations. | |

**User's choice:** Natural Earth default. The user initially selected neutral disputed areas, then immediately corrected the answer to option 1.

### Small island usability

| Option | Description | Selected |
|--------|-------------|----------|
| Search/list plus true shape | Preserve geographic size and use Locate for access. | ✓ |
| Add map markers | Use clickable low-zoom symbols. | |
| Use inset maps | Add atlas-style panels. | |

**User's choice:** Search/list plus true shape.

---

## Views and History

### Locating countries

| Option | Description | Selected |
|--------|-------------|----------|
| Separate Locate action | Keep coloring selection separate from camera movement. | ✓ |
| Selection auto-centers | Move the camera on every list selection. | |
| Search centers only | Center only from search results. | |

**User's choice:** Separate Locate action.

### Reset View

| Option | Description | Selected |
|--------|-------------|----------|
| Whole world only | Restore the initial camera without changing the composition. | ✓ |
| Restore saved view | Return to the loaded saved-map camera. | |
| Reset entire map | Also clear colors and settings. | |

**User's choice:** Whole world only.

### Saved-map contents

| Option | Description | Selected |
|--------|-------------|----------|
| Entire composition | Save colors, camera, snapshot, legend, and visible settings. | ✓ |
| Colors and camera | Omit legend and period settings. | |
| Colors only | Preserve the Phase 1 schema. | |

**User's choice:** Entire composition.

### Camera in Undo/Redo

| Option | Description | Selected |
|--------|-------------|----------|
| Keep camera out | Keep Undo/Redo focused on intentional map edits. | ✓ |
| Separate view history | Add independent Back/Forward View controls. | |
| One combined history | Mix camera and content edits chronologically. | |

**User's choice:** Keep camera out.

---

## Historical World States

### Unsupported regions

| Option | Description | Selected |
|--------|-------------|----------|
| Modern elsewhere | Use historical boundaries where available and modern boundaries elsewhere. | ✓ |
| Gray no-data regions | Keep unsupported geography neutral and non-editable. | |
| Hide unsupported world | Show only historical coverage. | |

**User's choice:** Modern elsewhere.

### Time selection

| Option | Description | Selected |
|--------|-------------|----------|
| Curated snapshots | Offer verified named years or eras. | ✓ |
| Continuous year slider | Resolve any year to an available state. | |
| Period by region | Give each region an independent control. | |

**User's choice:** Curated snapshots.

### Color persistence

| Option | Description | Selected |
|--------|-------------|----------|
| Preserve matching entities | Keep colors for stable matching identities; new entities start white. | ✓ |
| Project modern colors backward | Transfer colors to predecessor territories. | |
| Reset on every snapshot | Give each snapshot independent color state. | |

**User's choice:** Preserve matching entities.

### Snapshot transition

| Option | Description | Selected |
|--------|-------------|----------|
| Brief crossfade | Fade between complete boundary states without geometry morphing. | ✓ |
| Immediate redraw | Replace boundaries without animation. | |
| Morph boundaries | Animate shapes transforming between periods. | |

**User's choice:** Brief crossfade.

---

## Legend Composition

### Automatic entries

| Option | Description | Selected |
|--------|-------------|----------|
| Used non-white colors | One entry per unique assigned non-default color. | ✓ |
| Include default white | Also include uncolored/default regions. | |
| Manual entries only | Never infer entries from map colors. | |

**User's choice:** Used non-white colors.

### Initial labels

| Option | Description | Selected |
|--------|-------------|----------|
| Editable color value | Start with the hex color as an editable placeholder. | ✓ |
| List country names | Generate labels from countries using the color. | |
| Blank label | Require the creator to type every label. | |

**User's choice:** Editable color value.

### Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Corner presets plus drag | Four quick positions plus custom direct placement. | ✓ |
| Automatic placement | Continuously avoid visible geography. | |
| Corner presets only | Limit to four deterministic positions. | |

**User's choice:** Corner presets plus drag.

### Styling depth

| Option | Description | Selected |
|--------|-------------|----------|
| Presets plus basics | Polished themes plus text size, opacity, and border controls. | ✓ |
| Full freeform styling | Expose detailed design-editor controls. | |
| One fixed style | Provide only labels and position. | |

**User's choice:** Presets plus basics.

---

## Claude's Discretion

- Exact projection and camera implementation.
- Exact zoom limits, gesture sensitivity, control layout, and reduced-motion mechanics.
- Canonical 195-state IDs, parent-territory mapping, data resolution, and preprocessing after research.
- Exact curated historical snapshot years and data sources after research.
- Legend ordering, unused-entry lifecycle, overflow, theme design, and persistence migration details.

## Deferred Ideas

- Timeline map-animation clips and camera moves inspired by AnimateMyMap.
- Animated country outlines, fill reveals, glow, emphasis, and complex transition effects.
- Pattern/texture fills and richer base-map visual styling.
- Timed text, flags, images, GIFs, logos, and arrows.
- Multi-scene slideshow transitions, PNG sequences, and MP4/video output.
- Geometry morphing between historical periods.
- Political point-of-view switching, artificial island markers, and inset maps.
- Vercel deployment, public URLs, cloud sync, authentication, and backend services.
