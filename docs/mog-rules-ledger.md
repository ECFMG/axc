# mog rules ledger

Not auto-loaded (harness only). Maps each always-loaded rule or hint to the sink or run it addresses, so stale rules can be pruned.

Trimming is AI-driven with no human step: when `scripts/trim-guard.mjs` fails during harness work, trim in a harness round — never inside a SCORE run (the guard only reports). Order: 1) duplicates, 2) rules whose row shows no matching sink in recent runs, 3) wording, 4) move detail on-demand. Never drop a rule whose sink was seen in the last TRIM_PROTECT_RUNS (`scripts/trim-guard.config.json`, now 20) runs. Log every trim in `.agents/harness-trim-log.md`.

`rule` is a literal substring of `file`; the guard fails when it disappears (drop or update the row). `runs` = run records naming the sink (— = harness prep, no recorded sink yet). Window today: a-out-3 … a-out-20, b-out-2 … b-out-5 (22 runs).

| rule | file | sink addressed | runs | origin |
| --- | --- | --- | --- | --- |
| `ONE orientation round` | AGENTS.md | orientation read rounds | b-out-4, b-out-5, b-out-6 | 7b81611 |
| `Write all files in ≤2 calls` | AGENTS.md | write phase, 5 write calls ~444k | b-out-5 | this round |
| `Then stop` | AGENTS.md | gate repair loops / self-run verify | a-out-18, b-out-3, b-out-4 | this round |
| `is outside: no` | AGENTS.md | lockfile churn | a-out-18, a-out-20, b-out-5 | ddb92c5 |
| `re-export from it every type/value` | .agents/skills/mog-repo-map/SKILL.md | TS2305 / TS2459 / TS2724 | a-out-18, a-out-20 | 440bbcd |
| `else TS2883` | .agents/skills/mog-repo-map/SKILL.md | TS2883 | a-out-20, b-out-3, b-out-4, b-out-5 | 923c731 |
| `TS18048` | .agents/skills/mog-repo-map/SKILL.md | TS18048 | b-out-5 | this round |
| `useImportType` | .agents/skills/mog-repo-map/SKILL.md | biome useImportType | b-out-5 | this round |
| `useAwait` | .agents/skills/mog-repo-map/SKILL.md | biome useAwait | b-out-3, b-out-4, b-out-6 | ad5f324 |
| `noUnusedLocals/Parameters` | .agents/skills/mog-repo-map/SKILL.md | TS6133 | b-out-3 | 04b6945 |
| `Unused exported types` | .agents/skills/mog-repo-map/SKILL.md | knip unused exported types | b-out-4, b-out-6 | 923c731 |
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
| `Read in ONE parallel turn, nothing after` | .agents/skills/mog-repo-map/SKILL.md | orientation rounds (6 in b-out-5 and b-out-6) | b-out-5, b-out-6 | this round |
| `Never read (the map answers them)` | AGENTS.md | one-file orientation follow-ups (knip.json, package.json, docs, .feature) | b-out-6 | this round |
| `Tool with a Stop hook` | AGENTS.md | self-check loop (13 calls ~1.33M) | b-out-6 | this round |
| `Only a tool with no Stop hook` | AGENTS.md | no-hook fallback run under Grok | b-out-6 | this round |
| `Stop hook verifies; just stop.` | .github/hooks/write-boundary.json | ad-hoc vitest/biome/knip/typecheck calls | b-out-6 | this round |
| `or add a real await` | scripts/check-summary.mjs | biome useAwait one-pass fix | b-out-6 | this round |
| `"dependsOn": ["^build"]` | turbo.json | stale-dist TS2305 | b-out-6 | cd4bc93 |
| `task-set-a-requirements.md` | .agents/skills/mog-repo-map/SKILL.md | orientation round 3 (requirements file not in the read list) | b-out-8 | this round |
| `**Serenity imports**: static` | .agents/skills/mog-repo-map/SKILL.md | orientation round 3 (Serenity import form) | b-out-8 | this round |
