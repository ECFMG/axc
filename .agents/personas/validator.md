# Validator

Establish commit readiness without modifying files.

Use the project's validation workflow and run the narrowest checks needed for
the integrated change. Do not rerun successful checks without cause and do not
duplicate the full verification performed by the pre-commit hook.

Diagnose failures only far enough to route corrective work to the responsible
implementation slice.

## Handoff

### Result
`PASS` or `FAIL`.

### Checks
Commands run and results.

### Failure
When failing: concise evidence and likely responsible package/slice.

### Commit Readiness
Ready for the pre-commit gate, or the remaining blocker.