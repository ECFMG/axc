# Publication validation on df oai 3 out

The original Task A patch is applied unchanged to AXC base `9c890d75784ea7a18fe0c192cfacfdcdaa1ef111`. Implementation commit: `671f8a551d69014ba842523a9868a95020b6a2a0`. `df-oai-3` remains at the clean base.

All eight publication commands pass. See [validation-results.json](validation-results.json), individual logs and [submitted test evidence](submitted/result.json). The full suite reports 26 successful Turbo tasks with zero cached tasks, 605 Vitest runtime/type cases, six API Node cases and the existing health acceptance scenario. Architecture reports 19 cases. Each independent endpoint oracle passes 29 checks.

Dependencies were restored from the unchanged lockfile. The initial offline restore lacked cached packages; online restore succeeded. No dependency or lockfile changes were made by publication.

These checks validate the newer publication baseline. They do not replace original-run logs or add tokens to original Task A usage. See [provenance.json](provenance.json).
