# Deferred Items

- **Pre-existing strict TypeScript/build failure at required base `54846a57b460ee71d2126412a75d3c070cc16a82`:** `src/utils/historicalPreparationCli.test.ts` lines 56-61 access nullable `child.stdout` and `child.stderr`. The file is unchanged by Plan 02-07, so the executor left it untouched under the parallel-worktree scope boundary. `npm test` and `npm run lint` pass; `npm run build` and `npm exec tsc -- -p tsconfig.app.json --noEmit` stop on these four existing TS18047 diagnostics.
