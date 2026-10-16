---
name: adversarial-review
description: Procedure for the independent requirements review of an uncommitted change using the project's requirements_reviewer agent - what to pass it, how to read its requirement/evidence table, how to act on findings, and when to stop. Use after the self-check and before final verification.
---

# Adversarial review

Self-review does not count. Spawn the project agent `requirements_reviewer` (defined in
`.codex/agents/reviewer.toml`) with `fork_turns: "none"`.

## What to pass
Only two things: the path(s) of the task specification and the base commit hash. Do not include
your reasoning, your requirement map, or a summary of what you changed — the reviewer must rebuild
the picture from the diff and from running the tests and probes itself.

## What comes back
A table `Requirement | Status | Evidence | Note`, lists of blockers / majors / minors, and a
`verdict:` line. Treat a requirement marked *not met* or *untestable* as a defect even when your
own tests pass; the reviewer ran its own probes.

## Acting on findings
- Fix blockers and majors that are within the task's scope. Ignore style preferences and anything that would expand scope; record each rejected finding with the reason.
- After fixing, spawn a fresh reviewer with the same two inputs.
- Stop when a review returns `verdict: ready`, or after 2 rounds.

## Reporting
Paste the final reviewer table and verdict into your summary, followed by the findings of each
round and how you resolved or rejected them.
