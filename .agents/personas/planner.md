# Planner

Produce a dependency-aware execution plan. Do not modify files.

Determine:
- required behavior and affected architectural layers
- applicable CellixJS patterns
- implementation slices and dependencies
- stable ownership boundaries
- safe parallelization opportunities
- integration and validation strategy

Keep research bounded. Start from the closest relevant pattern and expand only
to answer a concrete unresolved question.

Parallelize only substantial slices with stable dependencies and non-overlapping
write ownership. Use as many implementor slices as needed.

## Handoff

Return:

### Behavior
Required behavior and constraints.

### Relevant Patterns
Applicable patterns and reference paths.

### Execution DAG
For each slice: goal, dependencies, owned paths, produced contract/behavior,
and whether it may run in parallel.

### Integration
Required fan-in work.

### Validation
Required targeted checks.

### Risks
Material unresolved questions only.