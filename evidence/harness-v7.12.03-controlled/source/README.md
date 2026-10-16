# OpenAI harness v7.12.03 — controlled amendment

**Objective: reduce measured tokens for accepted work. Output quality and complete accounting are mandatory eligibility gates.** Forecasts never affect efficiency; there is no weighted score that can reward cheaper, failing output.

Read [CONTROLLED_WORKFLOW.md](CONTROLLED_WORKFLOW.md) for commands, the frozen comparison protocol, evidence fields and limits. The version stays v7.12.03; `VERSION.json` identifies revision `controlled-quality-gated`. Initial .03 metadata remains in `parent-v7.12.03-initial/`.

- The adapter's primary agent and actual fresh reviewer use one durable token/call budget. Reservations prevent additional dispatch beyond the cap. Failed, rejected and retried calls remain counted; unknown usage blocks further calls.
- Each controlled trial records executed context bounds, repair checks, fresh review and budget controls. Running validators or generating a handoff alone cannot qualify.
- `finish --execute` runs primary work, all eight mandatory final commands, a fresh structured reviewer, then deterministic reporting. Exhaustion marks the trial incomplete and never weakens its specification or gates.
- `coding_benchmark.py` predeclares at least two paired repetitions, alternates order, freezes inputs/settings/base/tools/accounting, and uses this controlled workflow for every trial. Failures remain in results.
- Comparisons report tokens per accepted task, success rate, model latency and cost separately. Missing metrics stay null. A positive raw reduction is publishable only when every trial has comparable passing quality and complete accounting.

The fixed Task A prompt/specification, independent endpoint verifier, model/generation settings, protected/allowed paths and all eight final commands remain unchanged. No new dependencies were added.

Native Codex `--external` packets and imported JSONL counters remain useful evidence. The desktop host controls its own context and model dispatch, so these runs are **advisory and ineligible for controlled savings claims**. The harness cannot impose its local adapter's hard budget on that host.

No live Task A model comparison was performed for this amendment. Validation uses deterministic fixtures and mocked model responses; test results are in `VALIDATION.json` and `TEST_RESULTS.log`. No savings percentage, new feature quality score or billed cost is inferred.

```sh
HARNESS_TEST_TYPESCRIPT=/absolute/path/to/typescript/lib/typescript.js \
  python3 -B -m unittest discover -v
```

Historical generic teaching and workflow experiments remain available in `QUALITY.md`, `WORKFLOWS.md` and parent snapshots. Their historical results do not establish Task A controlled savings.
