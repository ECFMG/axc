# Harness installation verification

These files record the current installation checks. They are outside the default agent-guidance path.

- `agent-loaded-instructions.txt`: root AGENTS.md content automatically injected into the fresh native Codex session.
- `agent-task-transcript.jsonl`: selected actual completed commands reading the repository skill, root guidance/task specification and referenced harness files, plus the probe response and completion event. This is a focused excerpt; the full local transcript is retained in the integration workspace.
- `agent-task-usage.json`: separately measured native loading-probe usage including its final response. It is not original Task B usage or a complete integration-task cost.
- `regression-tests.log`: all 299 extracted-harness regression tests passed.
- `skill-validation.log` and `cli-help.log`: official skill validation and CLI smoke results.
- `validation.json`: source integrity, installed entrypoints, validation scope and limitations.

The probe was a read-only readiness task. It observed the uncommitted installation state at the time of the test and correctly refused to call that a clean measured baseline. It did not implement Task A/B, validate application runtime readiness or demonstrate efficiency improvement. Archived upstream test logs under the extracted harness remain historical and are not substituted for these checks.
