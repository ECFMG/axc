import { recordingAgentId, recordSession } from '@cellix/guardrails';
import { readsForEdit } from './edit-targets.ts';
import type { GeneratedFile, GenerateFeatureOptions } from './types.ts';

/** Narrow reads to the files this slice edits. Writes stay on ocom-write.config.json. No agent id: leave the tree open. */
export function recordAgentSession(options: GenerateFeatureOptions, _written: GeneratedFile[]): void {
	const id = recordingAgentId(options.root);
	if (!id) return;
	recordSession(options.root, id, { read: readsForEdit(options) });
}
