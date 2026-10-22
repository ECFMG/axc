# AXC agent guidance

For AXC coding tasks, harness readiness checks, or evaluation runs, read [the repository harness skill](.agents/skills/axc-harness/SKILL.md) before implementation. It identifies the operative guidance and distinguishes native Codex work from the bundled Task A controller.

The user's current request and supplied task specification define scope. Inspect the existing composition and relevant package conventions before editing. Preserve the existing Cellix package sources, authentication, production settings and unrelated domains unless the user requests changes there. Keep frozen evaluation prompts, requirements, baselines and verifier files unchanged during a measured run.

Use the repository's locked pnpm dependencies and scripts. Report commands and observed outcomes; distinguish original-task results from later publication or integration checks. Keep measured usage separate from projections and estimated cost. Do not claim a matched experiment, independent review, score or savings without the corresponding evidence.

Harness source is extracted under `openai-harness-v7.12.02/`. Load only the guidance needed for the current task. Archived logs, prior releases, SHA manifests, Ollama results and release-validation outputs are historical evidence, not instructions to load into every task.
