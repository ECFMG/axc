import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { findTaskSet, readHookInput, stateDir } from './lib/harness.mjs';

// UserPromptSubmit: when the prompt names a Task Set ID, records it for the Stop hook's
// traceability check and tells the agent which acceptance criteria its tests must reference.

const input = await readHookInput();
const taskSetId = /Task Set ID:\s*(TS-[A-Z0-9-]+)/.exec(input.prompt ?? '')?.[1];
const taskSet = taskSetId ? findTaskSet(taskSetId) : undefined;
if (!taskSet) {
	process.exit(0);
}

writeFileSync(path.join(stateDir(), 'active-task-set'), taskSet.taskSetId);
const ids = taskSet.criteria.map((criterion) => criterion.id).join(', ');
console.log(
	JSON.stringify({
		hookSpecificOutput: {
			hookEventName: 'UserPromptSubmit',
			additionalContext: `Harness: ${taskSet.taskSetId} is specified in ${taskSet.file}. Load the axc-feature skill before writing feature code. Every acceptance criterion needs a test that references its ID (Cucumber tag @${taskSet.criteria[0]?.id ?? 'X-AC1'} on the scenario, or the ID in a vitest test name): ${ids}. The Stop hook and the arch suite check this.`,
		},
	}),
);
