#!/usr/bin/env python3
"""Stop hook + self-check CLI: do not finish while the acceptance feature covers
fewer scenarios than the task defines acceptance criteria.

Iteration 5 proved the count check (12/12 scenarios in 3/3 runs vs a 5-17 swing
without it) but blocked twice every run at +22% cost: the message said how many
scenarios were missing, not which criteria, so the agent guessed. This version
names the uncovered criteria - a criterion counts as covered once its id
(e.g. A-AC7) appears in a non-healthcheck feature file - and tells the agent to
tag each scenario with its criterion id, so the next check is exact.

Also runnable by the agent as `python3 .claude/hooks/coverage_gate.py --check`
to list uncovered criteria before stopping (read-only, exit 0).

Blocks at most MAX_BLOCKS times per session, then lets the agent stop (and says
so), so a stubborn mismatch can never deadlock a run. Fail-open on any error.
Wire to: Stop.
"""
import glob, json, os, re, sys

MAX_BLOCKS = 2

def scan(root):
    """criteria from the requirements table of ONE task (the one the features
    address); which ids the features mention; scenario count (healthcheck excluded).

    The repo root holds a requirements file per task set. Summing them makes the
    gate unsatisfiable for an agent working one task, so criteria are read per
    file and the gate scores the file the work matches best: the one with the
    most ids named in the features, falling back to the fewest missing."""
    tables = []  # one {id: description} per requirements file
    for req in sorted(glob.glob(os.path.join(root, "task-set-*-requirements.md"))):
        t = dict(re.findall(r"^\|\s*([AB]-AC\d+)\s*\|\s*(.*?)\s*\|\s*$",
                            open(req, errors="replace").read(), re.M))
        if t:
            tables.append(t)
    if not tables:
        return {}, [], 0
    text, n = "", 0
    for f in glob.glob(os.path.join(root, "packages/axc-verification/acceptance-api/src/features/*.feature")):
        if os.path.basename(f) == "healthcheck.feature":
            continue
        body = open(f, errors="replace").read()
        text += "\n" + body
        n += len(re.findall(r"^\s*Scenario(?: Outline)?:", body, re.M))
    def hit(c):
        return bool(re.search(r"\b%s\b" % re.escape(c), text, re.I))
    crit = max(tables, key=lambda t: (sum(hit(c) for c in t), -len(t)))
    missing = [c for c in sorted(crit, key=lambda s: int(re.sub(r"\D", "", s))) if not hit(c)]
    return crit, missing, n

def main():
    try:
        ev = json.loads(sys.stdin.read() or "{}")
    except Exception:
        return
    # stop_hook_active is true on every re-stop after a block. Returning early
    # here would make the gate fire once and then pass a still-short feature;
    # the per-session MAX_BLOCKS counter below is what prevents an endless loop.
    root = os.environ.get("CLAUDE_PROJECT_DIR") or ev.get("cwd") or os.getcwd()
    crit, missing, n = scan(root)
    if not crit:
        return
    # pass bar unchanged from the proven version: one scenario per criterion.
    if n >= len(crit):
        return

    state = os.path.join(os.path.expanduser("~"), ".claude", "metrics", "coverage-gate.json")
    try:
        os.makedirs(os.path.dirname(state), exist_ok=True)
        st = json.load(open(state)) if os.path.exists(state) else {}
    except Exception:
        st = {}
    sid = ev.get("session_id", "?")
    blocks = int(st.get(sid, 0))
    if blocks >= MAX_BLOCKS:
        print(json.dumps({"hookSpecificOutput": {"hookEventName": "Stop", "additionalContext":
              f"Coverage gate: {n} acceptance scenario(s) for {len(crit)} criteria; limit of {MAX_BLOCKS} blocks reached, "
              f"allowing stop. State the gap explicitly in your summary."}}))
        return
    st[sid] = blocks + 1
    try:
        json.dump(st, open(state, "w"))
    except Exception:
        pass
    gaps = "\n".join(f"- {c}: {crit[c]}" for c in missing) or "(all ids mentioned; scenario count is still short)"
    print(json.dumps({"decision": "block", "reason":
        f"Acceptance coverage is incomplete: {n} scenario(s) in packages/axc-verification/acceptance-api/src/features "
        f"against {len(crit)} acceptance criteria in the task requirements file. Criteria not yet covered "
        f"(no scenario names their id):\n{gaps}\n"
        f"Add one scenario per criterion above using the existing step-definition pattern and put the criterion id "
        f"in the scenario name (e.g. `Scenario: A-AC8 invalid query parameters return 400`). Verify with "
        f"`python3 .claude/hooks/coverage_gate.py --check`, run "
        f"`corepack pnpm --filter @axc-verification/acceptance-api run test:acceptance`, then finish. "
        f"(Block {blocks + 1} of {MAX_BLOCKS}.)"}))

if __name__ == "__main__":
    if "--check" in sys.argv:
        crit, missing, n = scan(os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd())
        print(f"{n} scenario(s), {len(crit)} criteria.")
        print("Uncovered (id not named in any scenario): " + (", ".join(missing) or "none"))
        sys.exit(0)
    try:
        main()
    except Exception:
        pass
    sys.exit(0)
