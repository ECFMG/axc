# OpenAI harness v7.12.1 — reference structure and baseline commit fix

This patch fixes the supplied v7.12 coding controller. It follows the package responsibilities and recorded commit workflow of `ECFMG/axc` branch `hac-oai-0-a-out` at `509326658517e3b94482415a0bdd7469db702fc8`. It does not inject that branch's implementation into model requests or replace the task's independent acceptance checks.

Use a **fresh isolated named Git branch** starting before Task A, with the normal repository dependencies installed. Keep this harness and its evidence directory outside that checkout. Set your Git identity before committing.

```sh
python3 -B run_task_a.py prepare --repo /path/to/fresh-axc-checkout --evidence /path/to/new-v7.12.1-trial
python3 -B run_task_a.py execute --evidence /path/to/new-v7.12.1-trial
python3 -B run_task_a.py check --evidence /path/to/new-v7.12.1-trial
python3 -B run_task_a.py commit --evidence /path/to/new-v7.12.1-trial
```

Always run `check` even if `execute` fails. Normal commit requires passing task validation and repository checks. The commit command attempts both frozen-lockfile installation and full repository verification, retaining each exit code and log.

To preserve a measured failed baseline, as the reference operator did:

```sh
python3 -B run_task_a.py commit --evidence /path/to/new-v7.12.1-trial --preserve-failed-baseline
```

This explicit mode commits in-scope measured output with a **failed validation** commit subject. It never turns failed validation or comparison records into passes. Scope violations, changed specifications, missing validation, changed branch/HEAD, stale source snapshots and Git filters that alter measured bytes still prevent a commit. Hooks are disabled for this one commit after recorded checks, preventing lint-staged from changing the validated files. Nothing is pushed automatically. Inspect `run/commit.json`, `run/commit-checks.json`, the logs and the actual patch before publishing.

Changes:

- Domain owns Course contracts; persistence owns fixture storage; application services use an injected repository; REST validates input; the API wires dependencies.
- Existing `@axc` workspace dependencies may be added. Existing dependency versions, scripts, exports and protected configuration remain guarded. The controller refreshes workspace links without writing the root lockfile; frozen-lockfile failure remains visible at commit time and requires separate operator maintenance.
- Controller-selected writes use complete-file content and an empty edits array. Legacy patch decoding remains available for compatibility.
- Written files with diagnosed failures are repaired before the next planned file. Formatting runs during construction; full builds wait for the planned implementation wiring to exist.
- The original invalid `theTag: const ...` declaration is rejected before writing.
- There are 40 allowed model calls instead of 20; the run ceiling remains **300,000 tokens**, output cap 4,000 and context cap 98,304. Rejected calls remain counted. Forty calls are a ceiling, not a promise the token budget will permit all of them. Use these same limits in all fresh matched comparison trials.

The original prompt, requirements and independent course oracle are byte-for-byte unchanged. Existing v7.12 trial evidence cannot be resumed under modified frozen code. This is a new patch release, not a rewrite of the original failed run.

Verification:

```sh
python3 -B -m unittest discover -v
```

For installed TypeScript AST checks, set `HARNESS_TEST_TYPESCRIPT` to the absolute path of an installed `typescript/lib/typescript.js`. Without it, those tests report explicit skips. `TEST_RESULTS.log` and `VALIDATION.json` describe this patch's actual verification. `*-v7.12.*`, `LIVE_OLLAMA_CHECKS.json` and retry-accounting files retain historical results; they are not proof of a live v7.12.1 run. No new model inference, Task A success, token savings or hosted cost is claimed for this patch.

See `COMPARE.md` for the comparison protocol. Original teaching workflows are unchanged.
