import path from 'node:path';
import { agentIdForRecord, recordSession } from '@cellix/guardrails';
import type { GeneratedFile, GenerateFeatureOptions } from './types.ts';

/** Writes .cellix/sessions/<id>.json. No session on disk means nothing is recorded. */
export function recordAgentSession(options: GenerateFeatureOptions, written: GeneratedFile[]): void {
	const agentId = agentIdForRecord(options.root);
	if (!agentId) return;
	recordSession(options.root, agentId, [...sessionPrefixes(options), ...written.map((file) => relativePosix(options.root, file.path))]);
}

/** Directories the same agent may keep editing after this generate. A trailing slash is a directory. */
function sessionPrefixes(options: GenerateFeatureOptions): string[] {
	const { lint, context, entity } = options;
	const directory = (layer: string, ...parts: string[]) => `${[layer, ...parts].join('/')}/`;
	const acceptance = options.lint.acceptance.replace(/\/$/, '');
	const modelsPackage = path.posix.dirname(options.lint.layers.models);
	return [
		directory(lint.layers.domain, 'domain/contexts', context),
		directory(lint.layers.persistence, 'datasources/domain', context),
		directory(lint.layers.persistence, 'datasources/readonly', context),
		directory(lint.layers.applicationServices, 'contexts', context),
		directory(lint.layers.models, 'models', entity),
		`${acceptance}/`,
		'apps/docs/',
		`${modelsPackage}/package.json`,
		`${modelsPackage}/tsconfig.json`,
		`${lint.layers.serviceMongoose}/index.ts`,
	];
}

function relativePosix(root: string, file: string): string {
	return path.relative(root, file).split(path.sep).join('/');
}
