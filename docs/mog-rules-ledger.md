# mog rules ledger

Not auto-loaded (harness only). Maps each always-loaded rule or hint to the sink or run it addresses, so stale rules can be pruned.

Trimming is AI-driven with no human step: when `scripts/trim-guard.mjs` fails during harness work, trim in a harness round — never inside a SCORE run (the guard only reports). Order: 1) duplicates, 2) rules whose row shows no matching sink in recent runs, 3) wording, 4) move detail on-demand. Never drop a rule whose sink was seen in the last TRIM_PROTECT_RUNS (`scripts/trim-guard.config.json`, now 20) runs. Log every trim in `.agents/harness-trim-log.md`.

`rule` is a literal substring of `file`; the guard fails when it disappears (drop or update the row). `runs` = run records naming the sink (— = harness prep, no recorded sink yet). Window today: a-out-3 … a-out-20, b-out-2 … b-out-5 (22 runs).

| rule | file | sink addressed | runs | origin |
| --- | --- | --- | --- | --- |
| `≤2 orientation rounds` | AGENTS.md | orientation read rounds | b-out-4, b-out-5 | 7b81611 |
| `Write all files in ≤2 calls` | AGENTS.md | write phase, 5 write calls ~444k | b-out-5 | this round |
| `Then stop` | AGENTS.md | gate repair loops / self-run verify | a-out-18, b-out-3, b-out-4 | this round |
| `is outside: no` | AGENTS.md | lockfile churn | a-out-18, a-out-20, b-out-5 | ddb92c5 |
| `re-export from it every type/value` | .agents/skills/mog-repo-map/SKILL.md | TS2305 / TS2459 / TS2724 | a-out-18, a-out-20 | 440bbcd |
| `else TS2883` | .agents/skills/mog-repo-map/SKILL.md | TS2883 | a-out-20, b-out-3, b-out-4, b-out-5 | 923c731 |
| `TS18048` | .agents/skills/mog-repo-map/SKILL.md | TS18048 | b-out-5 | this round |
| `useImportType` | .agents/skills/mog-repo-map/SKILL.md | biome useImportType | b-out-5 | this round |
| `useAwait` | .agents/skills/mog-repo-map/SKILL.md | biome useAwait | b-out-3, b-out-4 | ad5f324 |
| `noUnusedLocals/Parameters` | .agents/skills/mog-repo-map/SKILL.md | TS6133 | b-out-3 | 04b6945 |
| `Unused exported types` | .agents/skills/mog-repo-map/SKILL.md | knip unused exported types | b-out-4 | 923c731 |
| `Layering (test:arch` | .agents/skills/mog-repo-map/SKILL.md | arch / domain import bans | — | 04b6945 |
| `State persists across scenarios` | .agents/skills/mog-repo-map/SKILL.md | acceptance own-step failure | b-out-4 | da13ecc |
| `Step patterns are global` | .agents/skills/mog-repo-map/SKILL.md | ambiguous steps | — | da13ecc |
| `src/step-definitions/<feature>.steps.ts` | .agents/skills/mog-repo-map/SKILL.md | undefined steps | — | 8edc2da |
| `per route template` | .agents/skills/mog-repo-map/SKILL.md | route 404 / duplicate handler | — | cb0ccc8 |
| `no new folders under ` | .agents/skills/mog-repo-map/SKILL.md | arch: new dirs under packages/axc | — | a252090 |
| `Number.isSafeInteger` | .agents/skills/mog-repo-map/SKILL.md | huge integers → Infinity | — | f40c8f8 |
| `exactOptionalPropertyTypes` | .agents/skills/mog-repo-map/SKILL.md | TS2375 / TS2379 | — | 04b6945 |
| `TS2345` | .agents/skills/mog-repo-map/SKILL.md | TS2345 Expectation<Promise> | — | 460482e |
| `# ac-meta:` | .agents/skills/mog-repo-map/SKILL.md | AC coverage gate | — | e076ca2 |
| `useLiteralKeys` | .agents/skills/mog-repo-map/SKILL.md | TS4111 vs biome useLiteralKeys | — | 04b6945 |
| `Stop blocked` | scripts/stop-gate.mjs | terse failure reason on Stop | this round | 9e64af8 |
