### Evaluation Run Record 
Each participant should complete one Evaluation Run Record per harness/model run. 

| Field | Value |
| --- | --- |
| Team | OpenAI / Anthropic / Cursor / xAI / Antigravity |
| Developer / Operator | |
| Reviewer | (leave blank for now) |
| Harness | |
| Model | |
| License / Plan | |
| Codebase | ECFMG/axc |
| Task Set | A / B |
| Run Type | Baseline / Harness Engineering Iteration N / Final |
| Harness Engineering Used | |
| Config / Diff Notes | |
| Branch / Commit | |
| Requirements Completed / Attempted | |
| Acceptance Criteria Passed / Total | |
| Tests Passed / Failed | |
| Static Analysis / Security Findings | |
| Input Tokens | ← `/usage` **Input** (do not invent) |
| Cached Tokens | ← `/usage` **Cached**/cache-read; else `n/a` + reason |
| Output Tokens | ← `/usage` **Output** |
| Total Tokens or Credits Used | ← `/usage` **Total** (or credits if that is what it bills) |
| Estimated Cost | ← `/usage` **Cost**/USD; if tokens only, note dashboard source |
| Elapsed Time | |
| Number of Human Interventions / Redirects | |
| Reviewer Notes | (leave blank for now) |
| Final Rubric Score | (leave blank for now) |
| Recommendation | Continue / Remediate / Stop / Candidate for Pilot |

### Grok Build `/usage` paste checklist (SCORE meter)

Mohit-confirmed path: fresh Grok Build session → unmodified TS-A → run **`/usage`** once before close → fill the five fields above. Do **not** invent numbers. Do **not** use RTK/Headroom/transcript length as substitutes.

| Paste from `/usage` | Into record field |
| --- | --- |
| Input | Input Tokens |
| Cached (or cache-read) | Cached Tokens — if absent: `n/a` + reason only for that field |
| Output | Output Tokens |
| Total | Total Tokens or Credits Used |
| Cost (or credits USD) | Estimated Cost |

Also set Config / Diff Notes: meter source `Grok Build /usage` + session timestamp (America/New_York). Full procedure: [`docs/score-metering.md`](docs/score-metering.md). Operator steps: [`docs/harness-cost-usage.md`](docs/harness-cost-usage.md).
