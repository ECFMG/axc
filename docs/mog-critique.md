<!-- Not a discoverable skill. Open by path for harness prep or verify/acceptance fail-repair only — never on a clean SCORE. -->
# Skill: Mog Critique

Structured adversarial self-critique to raise accuracy on risky or failing work.
Stay inside the write boundary in `AGENTS.md`.

## When to load

| Trigger | Load? |
| --- | --- |
| Default SCORE (clean) | **No** — `mog-repo-map` + `run-validation` only; **no** mandatory 3–10 rounds |
| Acceptance / verify fail → repair | **Yes** |
| Harness prep / contract hardening | **Yes** |

Critique = **harness prep + fail/repair only**. Never force 3–10 rounds on clean SCORE (token bomb vs lean path).

## Loop (min 3 / max 10)

Each round, attack the pending change as an adversary:

1. **Defect hunt** — AC miss, missing edge, boundary leak, weak/assert-free test, docs drift, silent skip / weakened gate.
2. **Fix or dismiss** — concrete fix, or one-line why not a defect.
3. **Stop early** — if a round finds **no new defects**, end (even before 10). Complete ≥3 rounds unless the change is abandoned.

## Lenses (rotate; do not dump all every round)

- Spec miss vs numbered ACs
- Boundary / arch (`domain` free of infra; write paths)
- Happy-path-only tests; missing 400 / empty / sort / pagination
- Silent SKIP / weakened `verify` / husky bypass
- Invalid input / security at boundaries

## Output (agent-to-agent)

- **New defects:** severity + path + one-line issue + fix. Spend tokens.
- **Clean round / done:** silent or `critique OK (N rounds)`. No play-by-play.
- Never paste Adversary-bot chat, prior critique transcripts, or full diffs into context.
- Align with AGENTS “Agent-to-agent output”: errors verbose, success silent.
