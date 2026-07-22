# CountriesIRL Map Generator

CountriesIRL is a browser-only modern European choropleth editor for non-technical Instagram creators. Phase 1 provides an interactive SVG map, browser-local persistence, and exact square PNG export without a backend, account, or required environment variables.

## Implemented Phase 1 workflow

1. Open the app and select one country directly on the map, or select multiple countries from the alphabetical country list.
2. Apply one of ten named color presets, or enter a validated custom color in `#RGB`, `#RRGGBB`, or `rgb(r,g,b)` form.
3. Continue editing with bounded 50-action undo/redo history. Resetting all colors is also undoable.
4. Save, replace, load, and delete up to 10 named maps in the current browser's localStorage.
5. Dismiss the first-use onboarding guidance and reopen it later with **Show Help**; the dismissal is persisted in the browser.
6. Export the current map as an exact 1080×1080 PNG with a fixed white background, ready for Instagram.

The responsive editor supports map and list selection, single- and multi-country color application, visible operation feedback, keyboard-operable controls, light/dark application chrome, and a map surface whose colors remain consistent in previews and exports.

## Data and offline boundary

Phase 1 bundles a normalized Europe-focused GeoJSON asset from Natural Earth 5.1.1 (1:10m Admin 0 Countries). The data is committed under `public/data/` and served from the same origin, so the app does not require a third-party map request at runtime. See [the data provenance and normalization notes](public/data/README.md) for the source version, approved checksum, inclusion policy, geopolitical point of view, and regeneration command.

All required runtime assets are bundled or same-origin. After the app has loaded, the current session can continue editing, saving, and exporting while offline. A fresh disconnected reload is not a Phase 1 requirement, and the app does not include a service worker.

Saved maps and onboarding state remain local to the current browser and origin. Phase 1 has no backend, authentication, cloud sync, or mandatory login.

## Pinned stack

- React 18.3.1 and React DOM 18.3.1
- TypeScript 6.0.2 in strict mode
- Vite 8.1.5
- D3 7.9.0 for projection, interactive SVG rendering, and map interactions
- html2canvas 1.4.1 for deterministic PNG capture
- Browser localStorage for saved maps and onboarding state
- Bundled same-origin Natural Earth 5.1.1 boundary data
- Vercel as the locked deployment target

Production deployment and shareable-URL verification are assigned to Plans 01-16 and 01-17. This README does not claim a production URL before those gates complete.

## Developer setup

Requirements: a current Node.js release compatible with the pinned toolchain and npm.

```bash
npm install
npm run dev
```

Available project commands:

```bash
npm run lint
npm run test:run
npm run build
npm run preview
```

The development server is provided by Vite. `npm run preview` serves the completed production build locally.

## Deferred to Phase 2

The following capabilities are intentionally not part of the implemented Phase 1 editor:

- historical borders and time-period controls
- flexible centering and reprojection
- EU and other regional zoom presets
- automatic and editable legends

These deferrals preserve the Phase 1 scope around the modern European coloring, persistence, and PNG-export workflow.

## Project documentation

- [Project vision](.planning/PROJECT.md)
- [Requirements](.planning/REQUIREMENTS.md)
- [Roadmap](.planning/ROADMAP.md)
- [Current GSD state](.planning/STATE.md)

## Repository

<https://github.com/Haroldas-Matulevicius/countriesIRL>
