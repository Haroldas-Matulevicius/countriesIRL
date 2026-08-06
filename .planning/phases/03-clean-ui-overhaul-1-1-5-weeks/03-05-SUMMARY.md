---
phase: 03-clean-ui-overhaul-1-1-5-weeks
plan: 05
subsystem: editor-boundary
tags: [mountable-component, props-boundary, transition-readiness, storage-adapter, contract-test, red-probe, container-retirement]
status: complete

requires:
  - phase: 03-clean-ui-overhaul-1-1-5-weeks
    plan: 03
    provides: "the `.map-editor` shell grid, the panel track, the D-32 export frame, and `uiContract.test.ts`"
  - phase: 03-clean-ui-overhaul-1-1-5-weeks
    plan: 04
    provides: "the Themely token system and the class-driven dark flip the mount root now carries"
provides:
  - "`src/components/editor/MapEditor.tsx` — the ONE component a host mounts, with an exported `MapEditorProps` carrying the data base path, the storage adapter, and the initial theme mode"
  - "`src/providers/EditorConfigProvider.tsx` — the inside of that boundary; the storage adapter arrives as a FACTORY, not an instance"
  - "`src/config/editorConfig.ts` — the single production home for the data asset base path, with `resolveEditorAssetUrls` deriving all three URLs"
  - "`src/config/editorConfig.test.ts` — four gates: the `/data/` home with its closed two-predicate exemption, the one-production-storage-site rule, and the host-page-root rule"
  - "`src/components/editor/MapEditor.test.tsx` — the boundary gate: one component, one exported props interface, an EMPTY closed host-global set, and a depth-counted single root"
  - "the retirement of the app bar and the inspector column as CONTAINERS (D-11), with every control they held still rendered and each one's receiving plan named"
  - "`MapWorkspace.test.tsx` — the D-24 slot-contract regression guard, including the camera-before-legend order `isPreservedComposition` depends on"
  - "`coding-rules/data.md` § the base path has one home; `coding-rules/storage.md` § Phase 3 Amendments"
affects: [03-06, 03-07, 03-08, 03-09, 03-10, 03-11, 03-12]

actuals:
  tokens: 17500
  tasks: 3
  commits: 4

tech-stack:
  added:
    - "a React context whose storage member is a FACTORY rather than an instance, so the default is not bound at module import"
    - "a context default equal to the standalone app's configuration, so every component rendered outside `MapEditor` behaves exactly as before the boundary existed"
  patterns:
    - "a gate exemption keyed on the predicate's own SOURCE TEXT with the line number carried alongside for a reader — a line-number key drifts and goes red on arrival"
    - "an allowlist that is deliberately EMPTY, asserted as set equality, so the probe reddens it and adding an entry is visibly a contract change"
    - "a fixture element bound back to the component it stands in for, in the same file, so it cannot drift into re-implementing the wiring under test"
    - "a relocated assertion asserted in its new home AND paired with proof it left the old one"

key-files:
  created:
    - src/components/editor/MapEditor.tsx
    - src/components/editor/MapEditor.test.tsx
    - src/config/editorConfig.ts
    - src/config/editorConfig.test.ts
    - src/providers/EditorConfigProvider.tsx
  modified:
    - src/App.tsx
    - src/main.tsx
    - src/components/AppHeader.tsx
    - src/components/MapWorkspace.test.tsx
    - src/constants/snapshots.ts
    - src/hooks/useGeoData.ts
    - src/hooks/useLocalStorage.ts
    - src/hooks/useSnapshotCatalog.ts
    - src/styles/App.css
    - src/styles/editor.css
    - tests/e2e/phase2-composition.spec.ts
    - .planning/coding-rules/data.md
    - .planning/coding-rules/storage.md
    - .planning/phases/03-clean-ui-overhaul-1-1-5-weeks/deferred-items.md
  deleted: []

key-decisions:
  - "`MapEditor` is a WRAPPER that owns the props boundary; `App` still emits the `.map-editor` element and still owns durable state. The plan says this task moves the shell, not the state ownership, and moving the element would have split `data-panel-open`'s single writer across two files — the exact thing `uiContract.test.ts` assertion 10 forbids"
  - "The storage member of the config is a FACTORY. An instance built at module scope would call into browser storage at import time, before a test or a host has installed the environment the editor runs in — and it would have broken every existing `stubWindow` test silently"
  - "The `/data/` exemption is keyed on the predicate's SOURCE TEXT, not on line 1098 / 1190. A line number drifts the moment anything above it moves; a gate that is red on arrival gets loosened rather than obeyed. The line numbers are carried in the exemption for a reader"
  - "The host-global allowlist in `MapEditor.test.tsx` is EMPTY and asserted as set equality. The mount root is the editor's whole world, so there is nothing outside it to reach for"
  - "The app bar and the inspector were retired as CONTAINERS, not as controls. Every control they held is still rendered, in the panel track, with a named receiving plan — the plan forbids deleting a control whose new home is not built"
  - "`initialThemeMode` is wired to the mount root's class NOW rather than landing as an unwired prop. A prop with no consumer is a stub; `03-06` lifts it to state and adds the persistence"
  - "The inspector's `overscroll-behavior: contain` was re-pointed at `.tool-panel__body` rather than kept as a rule on an element that no longer scrolls. One assertion became three"

requirements-completed: [D-11, D-24, TR-a, TR-b, TR-c, TR-e]
---

# Phase 3 Plan 05: The Mountable Editor Summary

`src/components/editor/MapEditor.tsx` is now the one component a host mounts, and everything the
editor needs from a host — where the assets live, how to persist, which mode to open in — crosses
an exported props interface. The app bar and the inspector column are retired as *containers* with
every control they held still rendered and each one's destination named. Four transition-readiness
points stopped being prose and became gates, each proven able to fail on its own subject.

**The plan's own objective said three of the four points were already largely discharged in the
codebase and that what was missing was the gate that keeps them true. That was accurate, and it is
why this plan's realized diff is about a fifth of its estimate.** The `StorageAdapter` already
existed with exactly one browser-storage site; `documentElement` was already untouched; the
hard-coded path literals already numbered three. What did not exist was anything that would notice
the fourth one.

---

## What the boundary actually is

```
host places ONE element
  └── <MapEditor dataBasePath? storage? initialThemeMode? />      ← the whole contract
        └── EditorConfigProvider          assetUrls · createStorage · initialThemeMode
              └── MapStateProvider
                    └── CompositionStateProvider
                          └── App  →  <div class="map-editor [dark]" data-panel-open="…">
```

- **`MapEditor.tsx` names no host global at all.** The allowed set is empty, asserted as set
  equality, and RED-proven. Page reload stays in `main.tsx`, because reloading the page is the
  host's decision and an editor that took it would be assuming it owns the page.
- **`App` still emits the `.map-editor` element and still owns durable state.** That is deliberate
  and it is the plan's own instruction (*"this task moves the shell, not the state ownership"*).
  Moving the element into `MapEditor` would have split `data-panel-open`'s writer across two files,
  and `uiContract.test.ts` assertion 10 requires exactly one. The theme class reaches the element
  through the config, so the mount root carries `.dark` either way — which is the property `03-06`
  needs.
- **Nothing was added that crosses the localhost-only line.** No backend, no auth, no entitlement
  prop, no network call, no deployment config, no environment variable, no Themely import. The
  props gate asserts that `token`, `apiKey`, `auth`, `entitlement`, `baseUrl`, and `endpoint` are
  not props, because embedding ends the localhost-only constraint and needs a new explicit owner
  decision rather than a prop.
- **The context default is the standalone app's configuration**, so every component rendered
  outside `MapEditor` — which is every existing unit test — behaves exactly as it did before the
  boundary existed. 578 pre-existing tests were green without one edit.

---

## Relocated controls → receiving plan

**Nothing was deleted.** T-03-20 is the deleted-inspector-landmark class of defect, and the rule
this plan works under is that a control whose new home is not built stays rendered where it is.

| Control | Was | Is now | Receiving plan |
|---|---|---|---|
| Product identity (`h1` + tagline) | app-bar container, `.app-bar__identity` | `.panel-header__identity`, in the tool panel | `03-06` |
| `Show Help` | app-bar container | `.panel-header__actions` | `03-06` |
| Undo / Redo / Save or Load Maps / Export PNG (desktop, `Controls variant="app-bar"`) | app-bar container | `.panel-header__actions` | `03-06` (rail footer takes Export and the theme toggle) |
| The same four as the compact action strip (`variant="strip"`) | first workspace section | unchanged | `03-09` |
| Selection panel · Color picker · `Reset All Colors` | inspector card — 376px sticky column with its own border, radius, surface | the same `aside`, now an unstyled stack in the panel track | `03-06` |
| Legend disclosure + editor | inspector card | as above | `03-06` |
| Country list + Locate | inspector card | as above | `03-06` |
| Onboarding banner | page-measure card above the workspace | panel body, at the panel's own measure | `03-06` |
| Period selector · `Reset View` · period status live region (`CompositionBar`) | absolutely placed in the canvas region (`03-03` interim) | unchanged | `03-07` |
| Camera cluster (`MapNavigation`) | `navigationSlot`, after the canvas region | unchanged | `03-08` |

**What was actually retired is container styling and container naming**, not markup that holds a
control:

- `.app` and every `.app > header` rule — dead selectors since `03-03` removed the `.app` wrapper.
  The sticky viewport-spanning bar, its 1440px inline measure, and its three media variants.
- `.app-bar__identity` / `.app-bar__actions` → `.panel-header__identity` / `.panel-header__actions`.
- `.workspace` 1440px measure and page padding; `.workspace--desktop`'s `minmax(0,1fr) 376px` grid;
  `.workspace--compact`'s two-column grid and its two media variants.
- `.workspace__control-column`'s sticky position, viewport-height cap, own overflow, and the
  `--desktop` card (border, radius, Porcelain surface). The hairline section separators survive,
  because the separator is the part that was doing real work.
- The three transitional neutralisers `03-03` put in `editor.css` to fight the page measure inside
  a 280px track. `editor.css` said they were *"removed with the containers, not carried forward"*
  and they were.

`App.css` went from 336 lines to 155.

**The `--desktop` / `--compact` modifier classes stay on the element.** `03-09` still keys the
responsive suite on them and owns their replacement; retiring the container is the change,
renaming the hook it hangs on is not.

---

## RED probes (6 executed, with output)

Immutable Safety Constraint 10: *a gate must be able to fail on the bug it covers.* Every probe
used the scratchpad copy-and-restore protocol from `coding-rules/general.md` § Git safety.
**`git checkout --` was not run at any point in this plan, on any file.** Every restore is
confirmed by a SHA-256 match against the pre-probe value.

The plan called for four. Six were run: probe 1 twice, because its first form failed for the wrong
reason, and two for D-24 because placement and layer order are different claims.

### Probe 1a — the host-global scan, module scope (the form the plan specifies)

**Break:** `document.body.classList.add('x');` at module scope in `MapEditor.tsx`.

```
 FAIL  src/components/editor/MapEditor.test.tsx [ src/components/editor/MapEditor.test.tsx ]
ReferenceError: document is not defined
 ❯ src/components/editor/MapEditor.tsx:53:1
 Test Files  1 failed (1)
      Tests  no tests
```

**Red, but for the wrong reason, and it is worth saying so.** The suite failed at *import*, so the
text gate never ran and would have proved nothing about itself. A module-scope reference in a
`node` environment blows up before any assertion executes; this probe demonstrates the environment,
not the gate.

### Probe 1b — the host-global scan, inside the component (the form that tests the gate)

**Break:** `const hostRoot = document.getElementById('root');` inside `MapEditor`.

```
 ❯ src/components/editor/MapEditor.test.tsx (6 tests | 4 failed) 6ms
     × makes no host global reference outside the closed allowed set 2ms

AssertionError: the editor never reaches outside its own mount point for chrome. A host
global here is the editor assuming it owns the page it is mounted into, which is the one
assumption that makes embedding a rewrite instead of a mount.: expected [ 'document.' ] to
strictly equal []

- []
+ [ "document." ]
```

The text gate failed **on its own assertion**. **Restore:** `cp "$SP/MapEditor.tsx.pre" …`. SHA-256
before and after: `9d183f95751d1a9183de0c3898b03ba79ec06ecb14a7e7ba42e4550cd2ad0b33`,
byte-identical. Re-run: 6 passed.

### Probe 2 — the `/data/` home, the world-data literal comes back

**Break:** `export const WORLD_DATA_URL = '/data/world-modern.geojson';` re-added to `useGeoData.ts`.

```
 ❯ src/config/editorConfig.test.ts (5 tests | 1 failed) 14ms
     × leaves no other production /data/ literal outside the two exempt predicates 4ms

AssertionError: a production /data/ literal outside the config home. The base path is a
parameter; a literal here is a fetch site a host cannot move.: expected [ Array(1) ] to
strictly equal []

+ [ "hooks/useGeoData.ts:23 export const WORLD_DATA_URL = '/data/world-modern.geojson';" ]
```

**Restore:** copied back. SHA-256 `252694716e4532a9e1fec20b6c31423a6f504b030084517fd6bbbbb9b39e1437`,
byte-identical.

### Probe 3 — the host-page-root gate (transition-readiness e)

**Break:** `document.documentElement.classList.add('dark');` in `App.tsx` — the exact defect
T-03-19 names, in the file most likely to acquire it when `03-06` builds the toggle.

```
 ❯ src/config/editorConfig.test.ts (5 tests | 1 failed) 14ms
     × touches the host page root element nowhere under src/ 5ms

AssertionError: the .dark class lands on the editor mount root only. Above it, a host cannot
override the theme it is supposed to own.: expected [ Array(1) ] to strictly equal []

+ [ "App.tsx:172 document.documentElement.classList.add('dark');" ]
```

**Restore:** copied back. SHA-256 `2a5bdb267fd9a957ec2d43a6027586a70fb5f33752fc21047e46a680178fc765`.

### Probe 4 — the one-storage-site gate (transition-readiness b)

**Break:** `localStorage.setItem('countriesirl-help-seen', 'true');` in `AppHeader.tsx` — a
component, not a utility, because that is where a convenience write actually appears.

```
 ❯ src/config/editorConfig.test.ts (7 tests | 1 failed) 16ms
     × is reached from src/utils/storage.ts and nowhere else 4ms

AssertionError: browser storage is an implementation detail of the adapter. A second
production file here is a write that skips the bounded V2 limits and that a host cannot
substitute.: expected [ 'components/AppHeader.tsx', …(1) ] to strictly equal
[ 'utils/storage.ts' ]

+ [ "components/AppHeader.tsx", "utils/storage.ts" ]
```

**Restore:** copied back. SHA-256 `75aa9bb17b8dc7c54c1f295c1931959ded0e6a776ec129b09557befa9a579823`.

### Probe 5 — D-24, the navigation slot moved inside the canonical SVG

**Break:** `legendSlot={<>{legendSlot}{navigationSlot}</>}` in `MapWorkspace.tsx`, with the sibling
render removed — the camera cluster inside `svg.map-canvas`, which is what the export clones.

```
 ❯ src/components/MapWorkspace.test.tsx (18 tests | 3 failed) 13ms
     × renders the navigation slot after the square, outside the export source 4ms
     × still renders both slots into their documented positions 0ms
     × keeps the navigation slot outside the canonical SVG entirely 1ms

AssertionError: the camera cluster is editor-only chrome. Inside the canonical SVG it is
cloned into every exported PNG, on top of a top-left legend.: expected true to be false
```

Three assertions caught it, the new one among them. **Restore:** copied back. SHA-256
`81089bf2065bcbc3572d3aaf7102ffa7930d387a535543229983af5217a6fe8b` — byte-identical, and the same
value `03-03` recorded for this file.

### Probe 6 — D-24, the legend layer hoisted above the camera layer

Not required by the plan; run because *inside the SVG* and *after the camera layer* are different
claims, and only the second is the shape `isPreservedComposition` reads. A legend hoisted above the
camera layer satisfies every containment check and still fails the export.

**Break:** `{legendSlot}` moved before `<g data-layer="camera">` in `MapCanvas.tsx`.

```
 ❯ src/components/MapWorkspace.test.tsx (18 tests | 1 failed) 13ms
     × puts the legend layer inside the canonical SVG, after the camera layer 1ms

AssertionError: the camera layer precedes the legend layer; that order is the shape the
export refusal check reads.: expected 932 to be less than 881
```

**Restore:** copied back. SHA-256
`189d75321f70616071c4c84f7f8a2ad103e52b9c3bf625c55391607dde613db3` — byte-identical, and the same
value `03-03` recorded.

### Two live catches during authoring, recorded because they are the discipline working

Neither was a planned probe; both were the gate firing on prose rather than on code, and in both
cases **the comment was reworded, not the gate loosened** — the rule `03-03` recorded after its
`grep -rn "transition[^;]*grid-template-columns"` fired on a comment.

1. The base-path-home gate went red on `` `/data/` `` inside `editorConfig.ts`'s own doc comment.
2. The one-storage-site gate went red on the phrase *"reads `window.localStorage`"* inside
   `EditorConfigProvider.tsx`'s doc comment.

Both files now carry an explicit comment-discipline note saying the gate is a plain text scan with
no parser between the rule and the file.

---

## What shipped

### Task 1 — the mountable editor (commit `eaf945a`)

`MapEditor.tsx` (79 lines) exports exactly one component and one exported props interface. The
config it builds is memoised on the three props and provided through `EditorConfigProvider`.
`main.tsx` mounts one `MapEditor` inside the host's error boundary and imports the five
stylesheets; it no longer knows about `App` or the state providers.

`MapEditor.test.tsx` lands 6 assertions:

| Assertion | What it would catch |
|---|---|
| exports exactly one PascalCase value, and it is `MapEditor` | a second thing to mount |
| `export interface MapEditorProps {` present | a props type a host cannot name |
| host globals ⊆ the empty allowed set | the editor assuming it owns the page |
| the props block declares the three, and none of six auth-shaped names | embedding arriving as a prop instead of as an owner decision |
| exactly one root element, **depth-counted** | two sibling roots satisfying "starts with a div" |
| the theme class on the root, from the prop, light *and* dark | a hard-coded mode |

The root counter is checked against a two-root string in the same test, so `1` is a measurement
rather than a value the helper can only ever return.

The persistence assertion is a real substitution: a counting adapter is passed as the `storage`
prop and observed to receive `getOnboardingDismissed`. That is what makes "the adapter arrives
through the boundary" a fact rather than a description.

```
NO_DOCUMENT_ELEMENT_WRITE
$ npx playwright test tests/e2e/export.spec.ts tests/e2e/shell.spec.ts --project=chrome
  12 passed (19.4s)
```

### Task 2 — the `/data/` config home (commit `6a29b4e`)

`editorConfig.ts` holds `DATA_BASE_PATH` once and derives `worldManifestUrl`, `worldDataUrl`, and
`snapshotManifestUrl` from it. `normalizeDataBasePath` means a host can pass a directory with or
without its trailing separator and get identical URLs, instead of one spelling silently producing
`…irlworld-manifest.json`.

Re-pointed: `useGeoData.ts` (both exports, plus `loadWorldGeoData` and `startWorldGeoDataLoad`
taking the URLs as a parameter and `useGeoData` reading the mounted config's), `constants/
snapshots.ts`, and `useSnapshotCatalog.ts`.

**The two `historicalValidation.ts` literals stay literals** and are exempted with the reason
inline. They are safety predicates on manifest-declared asset paths, not fetch URLs; parameterising
them would let a host-configured base path widen what counts as an acceptable asset path.
`coding-rules/data.md` records the condition under which they would have to change — validate
against the *configured* base, resolved once at the mount boundary, never a wildcard or an
`endsWith`.

```
DATA_PATH_HOME_OK 3        (editorConfig.ts + the two cited predicates)
$ npm run data:world:check -> World GeoJSON check passed: 248 units, 195 selectable core states
```

**`SNAPSHOT_CATALOG` is untouched** — still the same five ids and five labels, byte for byte.
Reachability is still decided by the approved manifest at `public/data/snapshots/index.json`, which
holds exactly one entry. Nothing here promotes geometry, makes a deferred snapshot nameable, or
widens what the manifest validator admits.

### Task 3 — the storage gate and the slot guard (commit `f117ce8`)

The storage gate asserts the *set* of production files naming browser storage is exactly
`utils/storage.ts`, and separately that the same file still carries the three bounded V2 limit
names — a one-site rule is only worth having if the one site is the safe one.

The D-24 guard adds four assertions to `MapWorkspace.test.tsx`, taking it from 14 to 18:

- the legend layer is inside `svg.map-canvas` **and after** `g[data-layer="camera"]`;
- the legend fixture is **bound back** to `LegendOverlay.tsx` source, so a marker that dropped
  `data-layer="legend"` could not keep the guard green (a fixture that re-implements the wiring
  under test can only make claims about the fixture);
- the navigation slot is outside the canonical SVG entirely, asserted as a boolean that can be
  `true`, not only as an index comparison;
- the frame is a depth-walked sibling of the export source, `data-editor-only`, and rendered by the
  component rather than handed in.

```
ONE_STORAGE_SITE_OK
EXPORT_TS_UNTOUCHED        (git diff --stat 5c556b5..HEAD -- src/utils/export.ts is empty)
$ npx playwright test tests/e2e/export.spec.ts tests/e2e/transactions.spec.ts --project=chrome
  12 passed (47.1s)
```

All three export refusal reasons are exercised by that slice: `invalid-composition` (a legend
rendered beside the canonical SVG, refused before capture), `capture-failed` (blocked canvas
context), and `encoding-failed` (null blob) — plus the lease-release path for every refusal class
in `transactions.spec.ts`.

### Task 3b — the relocated scroll-containment claim (commit `162e14e`)

See § Deviations.

---

## Deviations from plan

### [Rule 2 — Correctness] The plan's own Task 1 RED probe fails for the wrong reason

Covered under **Probe 1a**. A module-scope host-global reference in the `node` environment throws
at import, so the suite dies before any assertion runs. The probe as specified proves the
environment, not the gate. Run again inside the component, the text assertion fails on its own
subject, which is what the constraint asks for. Both runs are recorded rather than only the useful
one.

### [Rule 1 — Bug] A line-number-keyed exemption would be red on arrival

The plan asks for the two `historicalValidation.ts` predicates to be exempted *"by file and line"*
and calls for a *"closed, line-cited set"*. Implemented literally — expected line 1098 and expected
line 1190 — that gate breaks the first time anything above line 1098 changes, for a reason that has
nothing to do with the rule. **A gate that is red on arrival gets deleted rather than obeyed**, and
this repository has already recorded one instance of exactly that (`03-03`'s ResizeObserver gate).

The landed exemption is keyed on the **predicate's own source text**, which is a *stricter* key than
a line number, not a looser one: a line number matches whatever happens to be on that line, while
the text matches only that predicate. The line numbers are carried inside the exemption record and
printed in the failure message, so the citation the plan wants is present for a reader. The
exemption is checked in **both directions** — an exemption matching zero lines fails as loudly as a
third literal, because a stale exemption is a standing licence for the next thing that resembles it.

### [Rule 2 — Correctness] `MapEditor` is a wrapper; `App` still emits the mount root element

The plan's Task 1B says *"the mount root is the editor root"* and could be read as requiring
`MapEditor.tsx` to emit `<div class="map-editor">` itself. It does not, and the reason is a
conflict with a landed gate: the panel-open state lives in `App`, `uiContract.test.ts` assertion 10
requires `data-panel-open` to have **exactly one writer**, and that attribute is on the same
element. Emitting the element from `MapEditor` would have meant either two writers or lifting the
panel state and the rail out of the composition root — which is the state ownership the plan's own
Task 1 preamble says this task does not move.

Everything the requirement is *for* holds: a host places one element and mounts one component; the
render produces exactly one root; the theme class lands on `.map-editor` and nowhere above it; and
`MapEditor.tsx` names no host global. `03-06`, which lifts the theme to state and builds the rail,
is the natural place to move the element if it is ever worth moving.

### [Rule 2 — Correctness] `initialThemeMode` was wired rather than landed unwired

The plan lists the initial theme mode as a prop the boundary must carry, and `03-04` assigns the
`.dark` class write to `03-06`. A prop that nothing reads is a stub, and this plan's own gate would
have had nothing to assert. `App` now derives the mount root's class from the config value, so the
prop is real and testable in both modes. `03-06` lifts it to state, adds the control, and adds the
storage-adapter persistence with light as the absent-key default — none of which this changes.

### [Rule 3 — Blocking] `files_modified` omits eight files the change requires

The plan lists twelve files. Also created or modified: `src/providers/EditorConfigProvider.tsx`
(the inside of the boundary), `src/hooks/useLocalStorage.ts` and `src/hooks/useSnapshotCatalog.ts`
(they consume the config), `src/components/AppHeader.tsx` (it *is* the app bar's remains, and D-11
retires its container classes), `tests/e2e/phase2-composition.spec.ts` (below), and
`.planning/coding-rules/storage.md` plus `deferred-items.md` (records the plan asks for by name in
its own task text). Each is listed in `key-files`.

### [Rule 1 — Bug] One green e2e test was made red by the container retirement, and repaired here

`phase2-composition.spec.ts` → *the inspector keeps its in-progress UI state across the 1200px
transition* asserted `overscroll-behavior: contain` on the inspector. Retiring the inspector's
sticky card removed its own overflow, so it stopped being a scroll container and the property
stopped applying.

Keeping the CSS rule would have been a declaration that does nothing on an element that scrolls
nothing — a rule that reads as a guarantee it no longer provides. The claim (*a flick inside the
tools does not chain out and scroll something else*) is true and is asserted where it now lives:
`.tool-panel__body`, with `overflow-y: auto` and `overscroll-behavior: contain`. Paired with an
assertion that the inspector's `overflow-y` is now `visible`, **so the relocated pair cannot both
hold of an element that scrolls nothing.** One assertion became three. Commit `162e14e`.

### [Scope — recorded, not fixed] `responsive.spec.ts` is still red, and one row changed owner

12 tests, re-measured rather than assumed. See § Legacy e2e.

---

## Legacy e2e — the honest number

```
$ npx playwright test --project=chrome
  66 passed, 13 failed     (before the scroll-containment repair)
  67 passed, 12 failed     (after; the 12 re-confirmed by a targeted re-run)
```

**The 12 are exactly the 12 `03-03` recorded and `03-04` re-measured**, itemised with owners in
`deferred-items.md` § D-1. One row changed owner in this plan: *the app bar stays pinned while the
responsive workspace scrolls* named `03-05`, and now names `03-09`. This plan finished retiring the
bar as a container, which makes "stays pinned" a claim about something that does not exist — the
test has to be rewritten against the rail and panel, and that rewrite is `03-09`'s scope. Same
reasoning that moved two rows from `03-04` to `03-09`.

**The hazard `03-03` stated still stands:** a suite that is red for several plans stops being read,
and `03-12`'s full-gate evidence is not honest until it is clear.

---

## Carry-forward for later plans

- **`03-06`:** the boundary is yours to consume, not to redesign. Lift `initialThemeMode` into
  state inside `App`, keep the class on `.map-editor`, and persist through
  `useEditorConfig().createStorage()` — `coding-rules/storage.md` § Phase 3 Amendments records the
  exact shape both new keys must follow (separate small key, bounded V2, absent-tolerant, panel
  **closed** and theme **light**). The rail trigger is still the single writer of
  `data-panel-open`; a second writer fails assertion 10. Every control in the relocation table
  above with `03-06` beside it is waiting for you, and `.panel-header` is where they currently sit.
- **`03-07`:** `CompositionBar` and its live region are untouched and still absolutely placed in
  the canvas region. `MapWorkspace`'s slot contract is now guarded four ways — build the
  `.period-hud` outside `svg.map-canvas` or the guard fires.
- **`03-08`:** the cluster is still in `navigationSlot`, still outside the canonical SVG, and the
  new guard asserts that as a boolean rather than only as an index comparison.
- **`03-09`:** `deferred-items.md` § D-1 is your worklist and it is still 12, re-measured. The
  `app bar stays pinned` row is now yours. `.workspace--desktop` / `--compact` still exist as class
  hooks with **no container styling behind them** — they are a naming hook you own, not a layout.
- **`03-10`:** `App.css` is 336 → 155 lines. Assertion 20's count comparison against `main.tsx`'s
  import list is unchanged at five stylesheets.
- **`03-11`:** `src/utils/export.ts` is byte-unchanged by this plan and still yours. CF-2 is
  untouched.
- **Anyone adding a fetch:** `src/config/editorConfig.ts` is the only place a data path may be
  written. The gate's exemption set is closed at two, keyed on source text, and checked in both
  directions.
- **Anyone touching `MapEditor.tsx`:** the host-global allowed set is **empty**, and that is the
  contract. Adding an entry is a change to the boundary, not a test fix.

---

## What is NOT done

- **No visual, touch, or screen-reader claim is made anywhere in this plan.** Every result here is
  a `node` assertion, a file read, or a measured browser geometry. **PENDING: a human look at the
  editor with the app bar and inspector containers gone.** In particular nobody has seen the panel
  header, the unstyled tool stack in the 280px track, or the onboarding banner at the panel's
  measure. An automated result may never be substituted for a physical check (Immutable Safety
  Constraint 8).
- **`Design.md` § 7 is still `[FOR REVIEW]`.** The owner has reviewed none of it. This plan added
  nothing to it.
- **The owner authorization in force is a blanket, in-advance, sight-unseen PROCEED-authorization,
  given before this session began.** It is **not** a content review and **not** hash-bound. Nothing
  here was reviewed by the owner and no diff was inspected by them.
- **Embedding is not authorized and was not approached.** This plan builds the seam and does not
  cross it: no backend, auth, network call, deployment config, environment variable, or Themely
  import was added. Embedding ends the localhost-only constraint and needs a **new explicit owner
  decision**.
- **`snapshotScene.ts` still resolves the DEFAULT snapshot manifest URL, not the mounted one.**
  `resolveEffectiveSnapshotScene` is a module function called with a fetcher rather than a hook, so
  it reads `SNAPSHOT_MANIFEST_URL` — which is now derived from the config home, so no literal
  escaped, but a host-configured base path would not reach it. It is reached only when a
  **historical** snapshot is selected, and none is reachable: the approved catalog holds exactly
  `Modern`. Recorded rather than fixed, and listed under Known Stubs.
- **Chrome 151 is the only browser with evidence.** Edge is **not installed on this machine**
  (D-33) and no Edge result is reported. Firefox, Safari, and previous-version certification have
  never been run here and are not claimed.
- **`responsive.spec.ts` is red** — 12 tests, re-measured, itemised, owned by `03-09`.
- **Historical geometry is unchanged.** The approved catalog still holds exactly `Modern`; the
  1492 / 1700 / 1815 / 1914 packets remain **deferred for missing rights-cleared source material**.
  Nothing here makes a deferred snapshot nameable or reachable, and `SNAPSHOT_CATALOG` is byte-
  identical apart from a comment above it.
- **`.planning/STATE.md` and `.planning/ROADMAP.md` are UNTOUCHED.** `git status --porcelain` on
  both is empty. Neither `state.advance-plan`, `state.update-progress`, nor
  `roadmap.update-plan-progress` was run.

---

## Known Stubs

| Stub | File | Why it is intentional | Resolved by |
|---|---|---|---|
| `snapshotScene.ts` resolves the default snapshot manifest URL rather than the mounted config's | `src/utils/snapshotScene.ts` | It is a module function taking a fetcher, not a hook, so it has no access to the mount config. No path literal escaped — the URL is derived from the config home. It is reached only by a historical snapshot, and none is reachable while the approved catalog holds exactly `Modern` | a plan that makes an approved historical snapshot reachable, which requires the approval chain first |
| The panel holds the panel header and the flat tool stack instead of the rail's four tool panels | `src/App.tsx` | `03-03`'s interim state, deliberately preserved: the plan forbids deleting a control whose new home is not built. Every one is listed in the relocation table with its receiving plan | `03-06` / `03-07` |
| `.workspace--desktop` / `--compact` remain as class hooks with no container styling | `src/App.tsx`, `src/styles/App.css` | `03-09` still keys the responsive suite on them and owns their replacement. Retiring the container is the change; renaming the hook is not | `03-09` |

No file created or modified by this plan renders a hardcoded empty value, a placeholder string, or
an unwired data source. `initialThemeMode` was deliberately wired rather than landed unwired for
exactly this reason.

---

## Threat Flags

None new. The five threats the plan's register names were all exercised:

| Threat ID | Disposition | Evidence |
|---|---|---|
| T-03-16 (parameterising the `historicalValidation` predicates) | mitigated | Both left as literals, exempted by file and by predicate text with the reason inline and the lines cited; the set is closed at two and checked in both directions; RED-proven by Probe 2. The condition for changing them is recorded in `data.md` |
| T-03-17 (a raw storage write bypassing bounded V2) | mitigated | The one-site gate, plus a second assertion that the one site still carries all three limit names; RED-proven by Probe 4. The gate also fired live on a comment during authoring and the comment was reworded |
| T-03-18 (a control moved across the composition boundary) | mitigated | Four new `MapWorkspace.test.tsx` assertions covering placement AND layer order, with the legend fixture bound back to `LegendOverlay.tsx`; RED-proven by Probes 5 and 6. `export.ts` byte-unchanged; the export e2e slice exercises all three refusal reasons |
| T-03-19 (a theme class on the host page root) | mitigated | Source-scan gate over every non-test file under `src/`; RED-proven by Probe 3 in the file most likely to acquire the defect |
| T-03-20 (losing a control between two plans) | mitigated | Nothing was deleted; the relocation table names all ten controls and their receiving plan, and the retirement is of container styling and container naming only |

---

## Verification

```
$ npm run lint      -> clean
$ npm test          -> Test Files 42 passed (42) · Tests 584 passed (584)
$ npm run build     -> tsc -b clean; built in 87ms
$ npm run data:world:check
                    -> World GeoJSON check passed: 248 units and 195 selectable core states

$ npx vitest run src/components/editor/MapEditor.test.tsx   -> 6 passed
$ npx vitest run src/config/editorConfig.test.ts            -> 7 passed
$ npx vitest run src/components/MapWorkspace.test.tsx       -> 18 passed

$ npx playwright test tests/e2e/export.spec.ts tests/e2e/shell.spec.ts --project=chrome
                    -> 12 passed
$ npx playwright test tests/e2e/export.spec.ts tests/e2e/transactions.spec.ts --project=chrome
                    -> 12 passed
$ npx playwright test tests/e2e/phase2-composition.spec.ts --project=chrome
                    -> 11 passed
$ npx playwright test --project=chrome
                    -> 67 passed, 12 failed  (all responsive.spec.ts, itemised and owned)
```

Plan gates:

```
NO_DOCUMENT_ELEMENT_WRITE   (grep -rn "documentElement.classList" src/ -> no output)
DATA_PATH_HOME_OK 3         (editorConfig.ts + historicalValidation.ts:1098 and :1190)
ONE_STORAGE_SITE_OK         (exactly src/utils/storage.ts)
EXPORT_TS_UNTOUCHED         (git diff --stat 5c556b5..HEAD -- src/utils/export.ts is empty)
LAST_UPDATED_OK 2           (data.md, storage.md each at exactly 2)
SNAPSHOT_CATALOG            five entries, ids and labels byte-identical
```

Before this plan (578 tests) → after (584): **+6**, all new, plus 4 added to
`MapWorkspace.test.tsx` and 1 removed-and-replaced-by-3 in `phase2-composition.spec.ts`. **No
existing test was deleted, skipped, or weakened.**

**Chrome only. Chrome 151 is the only browser with evidence.** Edge is not installed on this
machine (D-33). Firefox, Safari, and previous-version certification have never been run here and
are not claimed.

---

## Commits

| Hash | Message |
|---|---|
| `eaf945a` | `feat(3-05): assemble one mountable editor behind an explicit props boundary` |
| `6a29b4e` | `refactor(3-05): give the /data/ base path one config home, exempting two predicates` |
| `f117ce8` | `test(3-05): gate the one storage site and guard the slot contract` |
| `162e14e` | `test(3-05): re-point the inspector scroll-containment claim at the panel body` |

---

## Self-Check: PASSED

| Claim | Check |
|---|---|
| `src/components/editor/MapEditor.tsx` | FOUND, SHA `9d183f95…0b33` matches the pre-probe value |
| `src/components/editor/MapEditor.test.tsx` | FOUND, 6 tests green |
| `src/config/editorConfig.ts` | FOUND |
| `src/config/editorConfig.test.ts` | FOUND, 7 tests green |
| `src/providers/EditorConfigProvider.tsx` | FOUND |
| `src/App.tsx` | FOUND, SHA `2a5bdb26…c765` matches the pre-probe value |
| `src/components/AppHeader.tsx` | FOUND, SHA `75aa9bb1…9823` matches the pre-probe value |
| `src/components/MapWorkspace.tsx` | FOUND, SHA `81089bf2…6fe8b` matches the pre-probe value |
| `src/components/MapCanvas.tsx` | FOUND, SHA `189d7532…13db3` matches the pre-probe value |
| `src/hooks/useGeoData.ts` | FOUND, SHA `25269471…1437` matches the pre-probe value |
| `src/utils/export.ts` | byte-unchanged by this plan |
| `.planning/coding-rules/data.md` § the base path has one home | FOUND, 2 `Last updated` entries |
| `.planning/coding-rules/storage.md` § Phase 3 Amendments | FOUND, 2 `Last updated` entries |
| `deferred-items.md` re-measured after `03-05` | FOUND, still 12, one row's owner moved |
| commits `eaf945a` `6a29b4e` `f117ce8` `162e14e` | all FOUND in `git log` |
| `.planning/STATE.md`, `.planning/ROADMAP.md` | untouched — `git status --porcelain` empty on both |
| `git checkout --` usage | **none, on any file, at any point** |
