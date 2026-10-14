---
name: axc-development
description: Implements and validates agentCourses features with repository layering, minimal context, focused tests, documentation, and final verification. Use when adding or changing application behavior in apps/api, packages/axc, packages/axc-verification, or apps/docs.
---

# agentCourses development

## Workflow

1. Read the task prompt and requirements once. Keep the completion checklist internal.
2. Inspect the affected package, its public exports, and its direct dependencies. Search before opening broad directories.
3. Reuse the nearest existing implementation and test pattern.
4. Change only the layers required to satisfy the task.
5. Keep domain contracts inward. Construct and inject concrete infrastructure in `apps/api`.
6. Complete one pass across code, exports, project references, focused tests, and required documentation.
7. Run the narrowest relevant test after the implementation settles.
8. Run `pnpm run verify` once as the final gate.
9. Review the diff and remove unrelated or speculative edits.
10. Report changes, commands, results, limitations, any dependency justification, and security findings.

## One pass

- Read each file once. Search once per question.
- Run each targeted test once. Run `pnpm run verify` once.
- A passing command is final. Do not repeat it.
- On failure, change the reported cause and rerun only the failed command. One full verification may follow that fix.
- Do not start a second exploration pass, review pass, or subagent.
- Ponytail and Caveman still apply in full. This section limits repeated tool calls, not the solution or the reply.
