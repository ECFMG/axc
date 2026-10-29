#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { agentIdForRecord } from '@cellix/guardrails';
import { type CellixLintConfig, checkCellixLint, defaultCellixLintConfig } from '@cellix/lint';
import { filesToEdit } from './edit-targets.js';
import { generateFeature } from './generate.js';
import { parseArgv, parseField, parseFieldsFile, parseNested, parsePermission } from './spec.js';

const argv = process.argv.slice(2);
const operation = argv[0] === 'query' || argv[0] === 'update' ? argv[0] : undefined;
const args = parseArgv(operation ? argv.slice(1) : argv);
const root = await findRoot(process.cwd());
const lint = await loadConfig(root);
const transport = args.get('transport');
const fieldsFile = args.get('fields');
const fromFile = fieldsFile ? parseFieldsFile(await readFile(path.resolve(fieldsFile), 'utf8')) : { fields: [], permissions: [], nested: [] };
const fields = [...fromFile.fields, ...args.list('field').map((token) => parseField(token))];
const params = args.list('param').map((token) => parseField(token));
const permissions = [...fromFile.permissions, ...args.list('permission').map((token) => parsePermission(token))];
const nested = [...fromFile.nested, ...args.list('nested').map((token) => parseNested(token))];
const result = args.get('return');
const route = args.get('route');
if (argv.includes('--help') || argv.includes('-h') || (!operation && !args.get('action'))) {
	const context = args.get('context') ?? '<context>';
	const entity = args.get('entity') ?? context;
	console.log('A search or list endpoint is a query. generate with no --action writes nothing.');
	console.log(`pnpm --filter @cellix/generator query -- --context ${context} --entity ${entity} --name <name> --field <field>:<type> --param <param>:<type> --route <route> --transport rest`);
	process.exit(0);
}
const files = await generateFeature({
	root,
	lint,
	context: required(args),
	entity: required(args, 'entity'),
	action: operation ? required(args, 'name') : required(args, 'action'),
	...(operation ? { operation, params } : {}),
	...(transport === 'rest' || transport === 'graphql' ? { transport } : {}),
	...(fields.length > 0 ? { fields } : {}),
	...(permissions.length > 0 ? { permissions } : {}),
	...(nested.length > 0 ? { nested } : {}),
	...(args.has('resolver') ? { resolver: true } : {}),
	...(result !== undefined ? { result } : {}),
	...(route !== undefined ? { route } : {}),
});
const violations = (await checkCellixLint({ root, lint })).filter((violation) => files.some((file) => violation.includes(file.path.split(path.sep).join('/'))));
if (violations.length > 0) {
	console.error(violations.join('\n\n'));
	process.exit(1);
}
for (const file of filesToEdit({
	root,
	lint,
	context: required(args),
	entity: required(args, 'entity'),
	action: operation ? required(args, 'name') : required(args, 'action'),
	...(operation ? { operation, params } : {}),
	...(transport === 'rest' || transport === 'graphql' ? { transport } : {}),
	...(args.has('resolver') ? { resolver: true } : {}),
})) {
	console.log(file);
}
const agentId = agentIdForRecord(root);
if (agentId) console.log(`Session write list: .cellix/sessions/${agentId}.json`);
console.log('Edit these. The barrels are already wired. Read the session file once. Do not list the tree.');
console.log('While editing, run pnpm run agent-check -- pnpm run check. Do not pipe it to tail. The Expected line is the next edit.');
console.log('Run pnpm run agent-check -- pnpm run verify once before you stop.');

function required(args: ReturnType<typeof parseArgv>, key = 'context'): string {
	const value = args.get(key);
	if (!value) throw new Error(`Missing --${key}`);
	return value;
}

async function findRoot(start: string): Promise<string> {
	let current = path.resolve(start);
	for (;;) {
		try {
			await readFile(path.join(current, 'cellix-lint.config.json'), 'utf8');
			return current;
		} catch {
			const parent = path.dirname(current);
			if (parent === current) return path.resolve(start);
			current = parent;
		}
	}
}

async function loadConfig(root: string): Promise<CellixLintConfig> {
	try {
		const parsed = JSON.parse(await readFile(path.join(root, 'cellix-lint.config.json'), 'utf8')) as CellixLintConfig;
		return { ...defaultCellixLintConfig(), ...parsed, layers: { ...defaultCellixLintConfig().layers, ...parsed.layers } };
	} catch {
		return defaultCellixLintConfig();
	}
}
