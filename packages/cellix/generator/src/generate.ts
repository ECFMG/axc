import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
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
	if (!KEBAB.test(options.context) || !KEBAB.test(options.entity) || (options.action !== undefined && !KEBAB.test(options.action))) {
		throw new Error('context, subdomain, and action must be kebab-case');
	}
	if (options.operation && !options.action) throw new Error('Missing --name');
	if (options.operation === 'query' && ((options.fields?.length ?? 0) > 0 || (options.nested?.length ?? 0) > 0 || (options.permissions?.length ?? 0) > 0)) {
		throw new Error('Pass --field on generate, not on query.');
	}
	if (options.operation) {
		if (options.transport !== 'rest' && options.transport !== 'graphql') throw new Error('Pass --transport rest or --transport graphql.');
		if (options.transport === 'rest' && !options.route) throw new Error('Pass --route for rest.');
		await requireSubdomain(options);
	}
	if (options.operation && options.action) assertOperationName(camel(options.action), options.operation);
	if (options.route !== undefined && !/^[A-Za-z][A-Za-z0-9-]*$/.test(options.route)) throw new Error(`Route must be a name, received ${options.route}`);
	if (options.result !== undefined && !/^[A-Za-z0-9_|&[\]'". ,:{}<>]+$/.test(options.result)) throw new Error(`Return type must be a type, received ${options.result}`);
	const writes = await writeNewFiles(options, plan(options));
	const composed = await wireComposition(options);
	formatGeneratedFiles([...writes, ...composed]);
	for (const file of writes) file.contents = await readFile(file.path, 'utf8');
	recordAgentSession(options, [...writes, ...composed]);
	return writes;
}

async function requireSubdomain(options: GenerateFeatureOptions): Promise<void> {
	const aggregate = path.join(options.root, options.lint.layers.domain, 'domain/contexts', options.context, options.entity, `${options.entity}.aggregate.ts`);
	try {
		await access(aggregate);
	} catch {
		throw new Error(`Generate the subdomain before ${options.operation}. ${options.operation} adds a function. It does not build the subdomain.`);
	}
}
