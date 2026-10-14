# OpenAI harness v7.12

This is a self-contained cumulative iteration of the supplied v7 harness. The comparison reference is no harness.

Read COMPARE.md for the fixed trial protocol and commands. Read CHANGES.md for the additions in this iteration. VALIDATION.json records release verification. There are no new live Task A savings results in this package.

Quick verification:

    python3 -B -m unittest discover -v

Prepare a fresh isolated target checkout, then:

    python3 -B run_task_a.py prepare --repo /path/to/axc --evidence /path/to/new-v7.12-trial
    python3 -B run_task_a.py execute --evidence /path/to/new-v7.12-trial
    python3 -B run_task_a.py check --evidence /path/to/new-v7.12-trial

Both task-set-a-prompt.md and task-set-a-requirements.md preserve the supplied bytes. The original independent course oracle is unchanged. Provider-reported generation usage includes rejected responses, retrieval and repairs. Missing usage remains unknown.

The original teaching modules remain available; see TEACHING_README.md and their existing documentation. Their historical demo reports are not coding-trial measurements for this release. CODING_TASKS.md is retained as original v7 protocol context; the current coding commands and limits are in COMPARE.md.

Live adapter checks passed on Ollama 0.40.0 with gemma4:26b for write, patch, read and validation actions. The native action schema was simplified to a flat required object after an initial composed-schema response omitted required fields. Controller validation still enforces exclusive writes/edits and all path/patch guards. See LIVE_OLLAMA_CHECKS.json and OLLAMA_RETRY_ACCOUNTING.json. Full live Task A comparisons remain unrun.
