import type { SourceFile } from '../support/workspace.ts';

// Each task-set requirements file lists acceptance criteria as table rows (`| X-AC3 | ... |`).
// Once any criterion of a task set is referenced by a test (a Cucumber tag such as @X-AC3, or
// the ID in a vitest test name), every testable criterion of that task set must be referenced.

interface TaskSetCriteria {
	taskSetId: string;
	source: string;
	criteria: Array<{ id: string; text: string }>;
}

const criterionRow = /^\| ?([A-Z]+-AC\d+) ?\|([^|\n]*)\|/gm;
const taskSetIdRow = /^\| ?Task Set ID ?\|([^|\n]*)\|/m;
const notTestable = /^Existing tests still pass/i;

export function parseTaskSetCriteria(file: SourceFile): TaskSetCriteria {
	return {
		taskSetId: taskSetIdRow.exec(file.content)?.[1]?.trim() ?? file.path,
		source: file.path,
		criteria: [...file.content.matchAll(criterionRow)].map((match) => ({ id: match[1] ?? '', text: (match[2] ?? '').trim() })).filter((criterion) => !notTestable.test(criterion.text)),
	};
}

export function referencedCriteria(testFiles: readonly SourceFile[]): Set<string> {
	const referenced = new Set<string>();
	for (const file of testFiles) {
		for (const match of file.content.matchAll(/(?<![\w-])@?([A-Z]+-AC\d+)\b/g)) {
			referenced.add(match[1] ?? '');
		}
	}
	return referenced;
}

/** Returns missing criteria for task sets that have started being traced; untouched task sets are not required. */
export function traceabilityViolations(taskSet: TaskSetCriteria, referenced: ReadonlySet<string>): string[] {
	const ids = taskSet.criteria.map((criterion) => criterion.id);
	if (!ids.some((id) => referenced.has(id))) {
		return [];
	}
	return taskSet.criteria
		.filter((criterion) => !referenced.has(criterion.id))
		.map((criterion) => `[${taskSet.source}] ${taskSet.taskSetId} ${criterion.id} ("${criterion.text}") has no test referencing it. Tag the Cucumber scenario @${criterion.id} or put ${criterion.id} in the vitest test name.`);
}
