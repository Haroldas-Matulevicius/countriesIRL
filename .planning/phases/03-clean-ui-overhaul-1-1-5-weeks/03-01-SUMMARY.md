---
phase: 03-clean-ui-overhaul-1-1-5-weeks
plan: 01
subsystem: infra
tags: [git-tag, playwright, html2canvas, woff2, inter, motion, supply-chain, svg-as-image]

requires:
  - phase: 02-region-variants-advanced-features-1-5-2-weeks
    provides: "fe5f946 — the build 02-28-ACCEPTANCE-MATRIX.md binds itself to; the html2canvas 1.4.1 export path the OQ-1 spike probes"
provides:
  - "Annotated git tag `acceptance-02-28` on fe5f946060707c48c3d9591d368b5f3f8f90dd4d (D-31)"
  - "A written, browser-measured answer to OQ-1 — the blocking precondition for D-25"
  - "`tests/e2e/spike-export-font.spec.ts` — a three-assertion probe that goes red on its own subject"
  - "`motion` pinned at exactly 12.40.0, no caret (D-27)"
  - "`src/assets/inter-latin-variable.woff2` — same-origin, byte- and hash-recorded (D-09)"
  - "`src/assets/README.md` — the vendoring provenance record"
  - "`coding-rules/data.md` § Vendored binary assets"
affects: [03-02, 03-04, 03-11, 03-12]

actuals:
  tokens: 9246
  tasks: 4
  commits: 2

tech-stack:
  added: ["motion@12.40.0 (exact pin, unused by any source yet)", "Inter Variable latin-subset woff2 (vendored binary, not yet referenced by any stylesheet)"]
  patterns: ["src/assets/ vs public/data/ — two homes for a bundled asset, chosen by consumer", "a pixel gate with a discrimination control, RED-probed before landing"]

key-files:
  created:
    - tests/e2e/spike-export-font.spec.ts
    - src/assets/inter-latin-variable.woff2
    - src/assets/README.md
  modified:
    - package.json
    - package-lock.json
    - .planning/coding-rules/data.md

key-decisions:
  - "OQ-1 answered POSITIVE from installed Chrome 151 — D-25's mechanism works, so 03-11 builds the font-embedding seam as specced and no owner descope is needed"
  - "Vendored the Google Fonts latin subset (48,432 B) rather than upstream InterVariable.woff2 (352,240 B) — faithful to the plan's 'latin-subset', at the cost of a recorded latin-ext gap"
  - "Did NOT add npm `overrides` to force the transitive framer-motion to 12.40.0 — that is a supply-chain policy change the R-V1 gate did not cover; recorded as a finding for 03-02 instead"

patterns-established:
  - "Every vendored binary carries a row in src/assets/README.md: source URL, subset, byte size, SHA-256, licence"
  - "A subset is a decision with a price — record the coverage gap and the measured cost of closing it, in the same file as the bytes"

requirements-completed: [D-09, D-27, D-31, OQ-1, R-V1]
---

# Phase 3 Plan 01: Irreversible, Safety-Critical, Blocking Summary

Preserved Phase 2's acceptance evidence with an annotated tag, proved from a real browser that an
inline base64 `@font-face` survives html2canvas's SVG-as-image serialisation, and took both
supply-chain surfaces — a pinned `motion` and hand-vendored Inter bytes — through their gates.

Nothing was authored. No stylesheet, no token, no component. That is the plan's point: `03-02` owns
the D-01 commitment.

---

## OQ-1 verdict

POSITIVE

A base64 `@font-face` declared in a `<style>` inside an SVG **does** resolve when that SVG is
rasterised as an `<img>` whose `src` is `"data:image/svg+xml," + encodeURIComponent(XMLSerializer
output)` — the exact shape html2canvas 1.4.1 produces at `html2canvas.js:4562`.

- **Browser:** Google Chrome **151.0.7922.75** (installed; `channel: 'chrome'`), reporting
  `HeadlessChrome/151.0.0.0` in `navigator.userAgent`.
- **Date:** 2026-08-06.
- **Spec:** `tests/e2e/spike-export-font.spec.ts`, run as
  `npx playwright test tests/e2e/spike-export-font.spec.ts --project=chrome`. 3 passed.

Raw numbers, both probe fonts, canvas 1024×96, label `Wig 111 fjord` at 56px:

| Measurement | Inter Variable (the production bytes) | Iosevka Light (control font) |
|---|---|---|
| woff2 bytes | 48,432 | 100,276 |
| base64 chars | 64,576 | 133,704 |
| data URL chars, font mode | 69,249 | 142,625 |
| **diff: font-present vs font-absent** | **6,696 px** | **6,644 px** |
| ink, font-present | 4,891 px | 3,795 px |
| ink, font-absent | 3,876 px | 3,876 px |
| ink, blank control | 0 px | 0 px |
| diff: blank vs font-present | 5,326 px | 4,032 px |
| diff: blank vs font-absent | 4,230 px | 4,230 px |

The `encodeURIComponent`-escaped data URL carried a 64,576-character base64 `src` without hitting a
length or parsing limit — the specific doubt OQ-1 raised.

**Consequence for `03-11`:** D-25's mechanism is real. Build the `injectExportFontFace` seam as
`03-RESEARCH.md` § Pattern 1 specifies. **No owner descope is required**, and neither recorded
fallback (outline the legend text; chrome-only Inter) needs to be taken.

**Scope, stated honestly.** This is a **Chrome-only** result. Edge is not installed on this machine
(D-33) and was not run — `grep -c 'msedge' tests/e2e/spike-export-font.spec.ts` returns 0. WebKit /
Safari is the documented exception for this technique, treating data URIs in SVG-as-image as
external files; it is outside this project's certification scope and was not tested. Firefox was
not tested. This technique is **not** claimed to work outside installed Chrome 151.

### The gate can fail — three RED probes, performed

`coding-rules/general.md` Immutable Safety Constraint 10 and this repo's history of three tests
that could not fail. Each probe used the scratchpad copy-and-restore protocol (§Git safety); the
spec's SHA-256 was `bb62e246869c6feefcbb1a8b88561ffff0f6be1e7ceb1df4d5a9dc842ed85875` before and
after every probe.

| Probe | Break applied | Result |
|---|---|---|
| **A — the bug it covers** | Suppress the `@font-face` in the font-present variant, i.e. simulate Chrome ignoring the data-URI font | `diffPresentVsAbsent` fell to **exactly 0**; assertion 1 **FAILED** |
| **B — the blank control** | Render text into the deliberately-blank control | `inkBlank` became **3,876**; assertion 3 (`toBe(0)`) **FAILED** |
| **C — the vacuous pass** | Paint the font-absent text white so it rasterises blank while still differing | `diffPresentVsAbsent` = **4,032, still green**, `inkAbsent` = **0**; assertion 2 **FAILED** |

Probe C is the important one. It reproduces exactly the defect shape this repo already shipped — a
difference assertion reading green over an empty raster — and the discrimination control caught it.
A one-assertion version of this spike would have passed probe C silently.

---

## R-V1 owner response (verbatim)

The response on file is the session-start authorization, quoted verbatim:

> "I am going to sleep, so if something comes up, find best solution."

and

> "I want you to complete this fully."

**Date of authorization: 2026-08-06.** The plan's `resume-signal` asked for
`approved: motion@12.40.0 exact`. **That exact string was not given.** What is held is the blanket
authorization above.

---

## Checkpoint: Task 3 — R-V1 motion@12.40.0 owner gate

**Gate:** `checkpoint:human-verify`, `gate="blocking-human"`, `autonomous: false` — the SUS
`too-new` verdict on `motion`, placed before the install.

**What kind of approval is actually held.** A **BLANKET, IN-ADVANCE, SIGHT-UNSEEN
PROCEED-AUTHORIZATION.** Per `coding-rules/general.md` § Immutable Safety Constraints, constraint
8, that authorizes **proceeding**. It is **NOT a content review** and it is **NOT hash-bound**. The
owner did not review the package, its diff, its version list, or these numbers. Recorded here
because constraint 8 requires recording which one is actually held.

**Step 1 of the gate's `how-to-verify` was NOT performed by a human.** Nobody opened
`https://www.npmjs.com/package/motion` in a browser, and nobody inspected a diff. The owner
performed **no physical check of any kind** for this gate. Substituted below is the registry-API
equivalent of steps 1–2, run by the executor, with its real output. An automated result is not a
substitute for a physical claim — so no physical claim is made here.

### Verification commands and their actual output, 2026-08-06

**Step 3 — install script:**
```
$ npm view motion@12.40.0 scripts.postinstall
(no output; exit 0 — the field is undefined)
```

**Step 4 — peer dependencies:**
```
$ npm view motion@12.40.0 peerDependencies
{
  react: '^18.0.0 || ^19.0.0',
  'react-dom': '^18.0.0 || ^19.0.0',
  '@emotion/is-prop-valid': '*'
}
```
This repo's React:
```
$ node -p "require('./package.json').dependencies.react"
18.3.1
```
`18.3.1` satisfies `^18.0.0`. Confirmed, not assumed.

**Step 5 — the sibling repo's own declaration, first-hand:**
```
$ grep '"motion"' /Users/matul/claudeprojects/themely/package.json
    "motion": "^12.40.0",

$ node -p "require('/Users/matul/claudeprojects/themely/node_modules/motion/package.json').version"
12.40.0
```

**Steps 1–2, registry-API substitute for the browser check nobody performed:**
```
$ npm view motion@12.40.0 name version repository.url homepage --json
  name            : motion
  version         : 12.40.0
  repository.url  : git+https://github.com/motiondivision/motion.git
  homepage        : https://github.com/motiondivision/motion#readme

$ npm view motion dist-tags.latest
13.0.0

  12.40.0 published : 2026-05-21T12:00:11.274Z
  13.0.0  published : 2026-08-05T11:38:44.372Z   <- one day before this session

$ curl -s https://api.npmjs.org/downloads/point/last-week/motion
{"downloads":17553114,"start":"2026-07-29","end":"2026-08-04","package":"motion"}

$ npm view motion@12.40.0 dist.integrity dist.shasum license
  dist.integrity = 'sha512-yjrHUrBFW6kQvjJwRsoiPSAhC5tRwRqNGJWmiJ4CrGnbKp0V88AdzkhBmDoqIsIPfarOe0Uddd37Xq43/gIocA=='
  dist.shasum    = 'e993e9a3cba2d455163cd16138ee463a5de0537c'
  license        = 'MIT'
```

Every claim in `03-UI-SPEC.md` § Vendoring Safety checks out: 17.5M weekly downloads
(17,553,114 measured), source repo `github.com/motiondivision/motion`, `postinstall: null`,
sibling-repo provenance. The SUS `too-new` signal is confirmed to be about publish cadence, not the
package: `12.40.0` itself is 77 days old, while the package's most recent publish is `13.0.0` from
one day ago.

**Extra check the UI-SPEC flagged as unchecked.** It said `13.0.0`'s React peer range "was not
checked". It is `{ react: '^18.0.0 || ^19.0.0', 'react-dom': '^18.0.0 || ^19.0.0' }` — same range.
Recorded for completeness; it does **not** change the decision. `12.40.0` remains the version to
install, because the reason for 12.40.0 is matching the repo the icons are vendored from, not the
peer range.

**Outcome:** proceeded. `npm install --save-exact motion@12.40.0`. `package.json` records
`"motion": "12.40.0"` — `grep -c '"motion": "\^' package.json` returns 0. `motion@latest` was never
run.

---

## Font bytes (raw / base64 / SHA-256)

| Field | Value |
|---|---|
| Path | `src/assets/inter-latin-variable.woff2` |
| **Raw bytes** | **48,432** |
| **Base64-inflated** | **64,576** (`ceil(48432 / 3) * 4`) |
| **SHA-256** | **`c940764593d0fe5d596be327ca7558855e018039fb78509aa21921fd3644c3e4`** |
| Typeface / axis | Inter, variable `wght` 100–900, normal |
| Subset | latin — `U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD` |
| Licence | SIL Open Font License 1.1, `Copyright (c) 2016 The Inter Project Authors` |

**Where the bytes came from.** Google Fonts CSS2 API, fetched 2026-08-06 with a woff2-capable
Chrome user agent (the UA changes the URLs returned, so it is part of the provenance):

```
GET https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36
```

then the `/* latin */` block's `src`, verbatim:

```
https://fonts.gstatic.com/s/inter/v20/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7W0Q5nw.woff2
```

Upstream identity checked against `rsms/inter` release **v4.1** (2024-11-16), `Inter-4.1.zip`:
`LICENSE.txt` → `262481e844521b326f5ecd053e59b98c8b2da78c8ee1bdbb6e8174305e54935a`;
`web/InterVariable.woff2` (352,240 B, full charset, **not** vendored) →
`693b77d4f32ee9b8bfc995589b5fad5e99adf2832738661f5402f9978429a8e3`.

**It is genuinely variable, not a static instance mislabelled.** Parsed from the WOFF2 table
directory:
```
tables    : GDEF GPOS GSUB HVAR MVAR OS/2 STAT avar cmap fvar gasp glyf loca gvar head hhea hmtx maxp name post
variation : fvar gvar avar HVAR MVAR STAT
```
And it renders: the OQ-1 spike loads this exact file and rasterises it through the html2canvas
serialisation shape (numbers in the table above).

`@fontsource-variable/inter` was **not** installed — `grep -c fontsource package.json` returns 0.
No `@import` of any http(s) URL exists in `src/` or `index.html`.

---

## Task-by-task

| # | Task | Type | Commit | Result |
|---|---|---|---|---|
| 1 | Tag `fe5f946` (D-31) | tracer | *(git object — no file change, nothing to commit)* | `acceptance-02-28`, annotated |
| 2 | OQ-1 spike | tracer | `a16ea39` | POSITIVE, 3 RED probes performed |
| 3 | R-V1 owner gate | checkpoint:human-verify | *(no file change)* | proceeded on a blanket authorization; recorded above |
| 4 | Install + vendor | auto | `b44fe73` | motion `12.40.0`, 48,432 B of Inter |

### Task 1 — the tag

```
$ git cat-file -t fe5f946060707c48c3d9591d368b5f3f8f90dd4d
commit
$ git tag --list
acceptance-02-28
$ git rev-list -n 1 acceptance-02-28
fe5f946060707c48c3d9591d368b5f3f8f90dd4d
$ git cat-file -t acceptance-02-28
tag            <- annotated, not lightweight
$ git status --porcelain -- .planning/phases/02-region-variants-advanced-features-1-5-2-weeks/
               <- empty
```

The message states in plain words that this is the pre-Phase-3 build the matrix describes, that the
matrix is performed against this commit and never against a restyled HEAD, and that the tag does
not close the gate.

**`02-28` remains OPEN.** This tag is a safeguard on evidence, not a resolution of the gate.
`02-28-ACCEPTANCE-MATRIX.md` is byte-unchanged — no cell was filled, annotated, or pre-approved.
Its SHA binding at line 67 is untouched. The tag was created **before** any Phase 3 commit in this
plan (`a16ea39` and `b44fe73` both postdate it), so `git diff acceptance-02-28..HEAD` is a
well-defined review range for `03-12`. The tag was not pushed — this repo has no remote workflow in
scope.

---

## Deviations and findings

No deviation rule 1/2/3 auto-fix was needed; nothing was broken. Four things are recorded because
they change what a later plan should believe.

### FINDING 1 — the exact pin does NOT byte-match the sibling repo. Flagged for `03-02`.

`03-UI-SPEC.md` § Vendoring Safety chose `12.40.0` over research's `12.43.0` explicitly for
"byte-matching the repo the icons are vendored from, which removes research assumption A4
entirely." Measured, that is only true one level deep.

`motion@12.40.0` declares `{ tslib: '^2.4.0', 'framer-motion': '^12.40.0' }` — a **caret** range on
the package that holds the actual animation runtime. What resolved here versus in Themely:

| Package | This repo | Themely |
|---|---|---|
| `motion` | **12.40.0** | **12.40.0** |
| `framer-motion` | **12.43.0** | **12.40.0** |
| `motion-dom` | **12.43.0** | **12.40.0** |
| `motion-utils` | 12.39.0 | 12.39.0 |

**The security goal is fully met**: `^12.40.0` cannot reach `13.x`, so the unreviewed `13.0.0` is
structurally out of reach, and `package-lock.json` pins all four exactly so `npm ci` is
deterministic. **The byte-match claim is what is weaker than written** — research assumption A4 is
not removed, it moved one level down and became invisible.

**Not fixed here, deliberately.** Adding an npm `overrides` block to force `framer-motion` and
`motion-dom` to `12.40.0` is a supply-chain policy change that the R-V1 gate did not cover and that
this plan's acceptance criteria do not check (deviation Rule 4 — ask, do not assume). It is cheap
and low-risk if wanted: `12.40.0` satisfies `motion`'s own declared `^12.40.0`, so forcing it
violates nothing. **`03-02` should decide this before vendoring the animated icons**, since D-28's
icons ARE `motion` components and byte-match is the stated reason they are safe to copy.

### FINDING 2 — the vendored subset is latin-only; latin-ext falls back. Flagged for `03-04` / `03-11`.

The subset stops at `U+00FF`. Characters in latin-ext (`U+0100-024F`) fall back to `system-ui`
mid-string, in the editor **and inside the exported PNG**: `Ł ł ą ę ś ż ź ć ń` (Polish),
`ą č ę ė į š ų ū ž` (Lithuanian), `ő ű` (Hungarian), `č ć đ š ž` (Balkan), `ā ē ī ū ģ ķ ļ ņ`
(Latvian), `ě ď ř ů` (Czech), `ș ț` (Romanian).

`PROJECT.md` names Poland, Lithuania, Hungary, the Balkans, Iberia, and Scandinavia as focus
regions, so this is worth stating loudly — but the real exposure is narrower than that list
suggests. **Iberia and Scandinavia are unaffected** (`á é í ó ú ñ ü ö ä å ø æ` are all latin-1), and
the bundled geometry is unaffected (Natural Earth `properties.name` values are English ASCII:
`Poland`, `Lithuania`, `Czechia`). The exposure is **creator-typed legend labels in a native
orthography** — `Magyarország` renders fine, `Košice` and `Łódź` do not.

Measured cost of closing it, so the decision rests on numbers:

| Option | Raw | Base64 | Coverage |
|---|---|---|---|
| **Vendored today** — Google `latin` | 48,432 | 64,576 | latin-1 + common punctuation |
| Add Google `latin-ext` as a second file | +85,272 | +113,696 | `U+0100-02BA`, `U+1E00-1E9F`, `U+2C60-2C7F`, … |
| Replace with upstream `InterVariable.woff2` | 352,240 | 469,654 | full — also Greek, Cyrillic, Vietnamese (unwanted) |

Google Fonts always splits by unicode-range, so a **single** file covering latin *and* latin-ext is
not obtainable from it; producing one needs a subsetting toolchain (`fonttools` / `pyftsubset`),
which is not installed and was **not** added — installing a package manager dependency to work
around a blocker is explicitly excluded from auto-fix. `03-01` shipped exactly what its Task 4B
specifies, a latin-subset variable woff2, and priced the gap.

### FINDING 3 — the font is well UNDER the plan's size backstop.

The plan's backstop expected "a latin subset in the 100-300KB range", so that base64-inlining it is
"a proportionate cost rather than a load regression". The real file is **48,432 B raw / 64,576 B
base64** — under the stated floor, not over it. The backstop's *purpose* holds with room to spare,
and `03-11`'s `?inline` decision can now be made on a measured number. Being outside the written
range is still a deviation from the written number, so it is recorded rather than quietly absorbed.

### FINDING 4 — installed Chrome is 151, not the 150 recorded elsewhere.

`Google Chrome 151.0.7922.75`. Project docs describe acceptance as scoped to "installed Chrome 150
+ Edge 150". The OQ-1 result is reported against **151**, the version actually present. Edge is
**not installed at all** on this machine (D-33) — `/Applications` contains only `Google Chrome.app`
— so no Edge claim of any kind is made here, and none should be inherited from the Phase 2 wording.

---

## Coding-rules update

`.planning/coding-rules/data.md` gained **§ Vendored binary assets (`src/assets/`)** in the same
commit that landed the bytes (`b44fe73`), per the documentation-as-you-build rule:

- `public/data/` vs `src/assets/` — the two homes are chosen by **who reads the bytes** (the app via
  `fetch`, or the bundler via `import`), not by taste, and a file in the wrong home silently breaks
  its consumer.
- Every vendored binary carries a row in `src/assets/README.md`: source URL, subset, byte size,
  SHA-256, licence — the same discipline `world-manifest.json` applies, with a stronger reason,
  because these bytes are creator-visible output.
- Never satisfy a font or icon with a network request. This is the failure that arrives by accident:
  a design system copied from a host project usually brings its font `@import` with it, and
  Themely's `globals.css:1` has exactly one.
- A subset is a decision with a price — record the coverage gap and the cost of closing it.

Footer hygiene applied: the two oldest `Last updated:` entries were merged into one line in the
same edit, leaving two.

---

## What is NOT done

- **`02-28` acceptance matrix — still OPEN.** Physical touch, screen-reader, and visual cells remain
  `⬜ PENDING`. Nothing here closes them, and the tag explicitly says so.
- **Nothing is authored.** No `@font-face` rule, no token, no icon, no component. `03-02` writes the
  design contract; `03-04` lands the stylesheet declaration; `03-11` builds the export seam.
- **`motion` is installed but unimported.** It does not appear in the built bundle
  (`dist/assets/index-*.js` is 546.79 kB, unchanged in character from before). `03-02` is where it
  starts being used.
- **The spike is throwaway.** `03-11` re-runs it as a real gate or promotes it; either way it does
  not stay as-is.
- **Firefox, Safari, and Edge are unverified.** Never reported as passing.
- **Historical geometry is unchanged.** The approved catalog still holds exactly `Modern`; the
  1492/1700/1815/1914 packets remain deferred for missing rights-cleared source material.

---

## Verification

```
$ npm run lint      -> clean
$ npm test          -> Test Files 38 passed (38) · Tests 513 passed (513)
$ npm run build     -> built in 71ms
$ npx playwright test tests/e2e/spike-export-font.spec.ts --project=chrome
                    -> 3 passed
```

Plan gates:

```
PIN_OK 12.40.0
FONT_BYTES 48432
NO_REMOTE_IMPORT              (grep for @import url(http…) in src/ and index.html)
NO_HTTP_IMPORT_ANYWHERE       (broader grep: any @import touching http(s))
HASH_RECORDED                 (shasum output found verbatim in src/assets/README.md)
grep -c 'fontsource' package.json   -> 0
grep -c '"motion": "\^' package.json -> 0
grep -c 'msedge' tests/e2e/spike-export-font.spec.ts -> 0
TAG_OK
MATRIX_UNTOUCHED
```

`.planning/STATE.md` and `.planning/ROADMAP.md` are untouched — `git status --porcelain` on both is
empty. The orchestrator owns those writes by hand. None of `state.advance-plan`,
`state.update-progress`, or `roadmap.update-plan-progress` was run.

---

## Commits

| Hash | Message |
|---|---|
| — | *(Task 1: annotated tag `acceptance-02-28`; a git object, not a commit)* |
| `a16ea39` | `test(3-01): answer OQ-1 with a Chrome spike on inline base64 @font-face` |
| `b44fe73` | `feat(3-01): pin motion@12.40.0 exact and vendor the Inter Variable latin subset` |

---

## Self-Check: PASSED

| Claim | Check |
|---|---|
| `tests/e2e/spike-export-font.spec.ts` | FOUND |
| `src/assets/inter-latin-variable.woff2` | FOUND, 48,432 B, SHA-256 matches the row above |
| `src/assets/README.md` | FOUND |
| commit `a16ea39` | FOUND in `git log` |
| commit `b44fe73` | FOUND in `git log` |
| tag `acceptance-02-28` | FOUND, annotated, → `fe5f946060707c48c3d9591d368b5f3f8f90dd4d` |
| `02-28-ACCEPTANCE-MATRIX.md` | byte-unchanged |
| `.planning/STATE.md`, `.planning/ROADMAP.md` | untouched |
