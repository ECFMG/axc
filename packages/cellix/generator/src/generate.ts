import { readFile } from 'node:fs/promises';
import { wireComposition } from './compose.ts';
import { formatGeneratedFiles } from './format.ts';
import { camel } from './names.ts';
import { plan } from './plan.ts';
import { recordAgentSession } from './session-files.ts';
import { assertOperationName } from './text.ts';
import type { GeneratedFile, GenerateFeatureOptions } from './types.ts';
import { writeNewFiles } from './write/new-files.ts';

export { plan } from './plan.ts';
export type { GeneratedFile, GenerateFeatureOptions } from './types.ts';

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function generateFeature(options: GenerateFeatureOptions): Promise<GeneratedFile[]> {
	if (!KEBAB.test(options.context) || !KEBAB.test(options.entity) || !KEBAB.test(options.action)) {
		throw new Error('context, entity, and action must be kebab-case');
	}
	if (options.operation) assertOperationName(camel(options.action), options.operation);
	const writes = await writeNewFiles(options, plan(options));
	const composed = await wireComposition(options);
	formatGeneratedFiles([...writes, ...composed]);
	for (const file of writes) file.contents = await readFile(file.path, 'utf8');
	recordAgentSession(options, [...writes, ...composed]);
	return writes;
}
