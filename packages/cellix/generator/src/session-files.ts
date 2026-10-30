import { recordingAgentId, recordSession } from '@cellix/guardrails';
import { readsForEdit, writesForEdit } from './edit-targets.ts';
import type { GeneratedFile, GenerateFeatureOptions } from './types.ts';

/** Narrow reads and writes to the files this slice edits. No agent id: leave the tree open. */
export function recordAgentSession(options: GenerateFeatureOptions, _written: GeneratedFile[]): void {
	const id = recordingAgentId(options.root);
	if (!id) return;
	recordSession(options.root, id, { read: readsForEdit(options), write: writesForEdit(options) });
}
