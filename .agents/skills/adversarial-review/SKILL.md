---
name: adversarial-review
description: Procedure for an independent sub-agent review of an uncommitted change - how to spawn the reviewer, the reviewer brief, how to act on findings, and when to stop. Use after the self-check and before final verification of any code change.
---

# Adversarial review

Get an independent review of your change from a sub-agent. Self-review does not count.

## Spawning the reviewer

- Spawn it with `fork_turns: "none"`, `model: "gpt-6.1-sol"`, `reasoning_effort: "medium"`.
- Give it the original task instructions verbatim, the paths of any spec files they reference, and the base commit.
- Do not include your own reasoning or a summary of the change.

## Reviewer brief

Find defects in the uncommitted change (`git diff <base>` plus untracked files) against the task instructions, the spec and `AGENTS.md`. Look for:

- unmet or misread requirements and incorrect edge-case behaviour;
- missing or weak tests;
- layering, single-source-of-truth and CellixJS layout violations (see `.agents/skills/cellix-feature-layout/SKILL.md`);
- out-of-scope changes.

Report each finding with severity (blocker / major / minor), file and line, and evidence. Do not edit files or run commands that need network. Say "no blocking findings" if there are none. Report findings only, without restating the change.

## Acting on findings

- Fix blocker and major findings that are within the task's scope. Ignore style preferences and suggestions that would expand scope. If you reject a finding, record why.
- After fixing, spawn a fresh reviewer with the same brief.
- Stop when a review returns no blocker or major findings, or after 3 review rounds.
- In your final summary, list each round's findings and how you resolved them.
