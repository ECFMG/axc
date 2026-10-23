import path from 'node:path';
import { recordSession } from '@cellix/guardrails';
import type { GeneratedFile, GenerateFeatureOptions } from './types.ts';

/** Writes .cellix/sessions/<CELLIX_AGENT_ID>.json. No agent id means no session file. */
export function recordAgentSession(options: GenerateFeatureOptions, written: GeneratedFile[]): void {
	// biome-ignore lint/complexity/useLiteralKeys: CELLIX_AGENT_ID is an index signature under noPropertyAccessFromIndexSignature
	const agentId = process.env['CELLIX_AGENT_ID'];
	if (!agentId) return;
	recordSession(options.root, agentId, [...sessionPrefixes(options), ...written.map((file) => relativePosix(options.root, file.path))]);
}

/** Directories the same agent may keep editing after this generate. A trailing slash is a directory. */
function sessionPrefixes(options: GenerateFeatureOptions): string[] {
	const { lint, context, entity } = options;
	const directory = (layer: string, ...parts: string[]) => `${[layer, ...parts].join('/')}/`;
	return [
		directory(lint.layers.domain, 'domain/contexts', context),
		directory(lint.layers.persistence, 'datasources/domain', context),
		directory(lint.layers.persistence, 'datasources/readonly', context),
		directory(lint.layers.applicationServices, 'contexts', context),
		directory(lint.layers.models, 'models', entity),
		`apps/docs/docs/${context}/`,
		'apps/docs/sidebars.ts',
	];
}

function relativePosix(root: string, file: string): string {
	return path.relative(root, file).split(path.sep).join('/');
}
