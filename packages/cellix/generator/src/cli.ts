#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { type CellixLintConfig, checkCellixLint, defaultCellixLintConfig } from '@cellix/lint';
import { generateFeature } from './generate.js';
import { parseArgv, parseField, parseFieldsFile, parseNested, parsePermission } from './spec.js';

const args = parseArgv(process.argv.slice(2));
const root = await findRoot(process.cwd());
const lint = await loadConfig(root);
const transport = args.get('transport');
const fieldsFile = args.get('fields');
const fromFile = fieldsFile ? parseFieldsFile(await readFile(path.resolve(fieldsFile), 'utf8')) : { fields: [], permissions: [], nested: [] };
const fields = [...fromFile.fields, ...args.list('field').map((token) => parseField(token))];
const permissions = [...fromFile.permissions, ...args.list('permission').map((token) => parsePermission(token))];
const nested = [...fromFile.nested, ...args.list('nested').map((token) => parseNested(token))];
const files = await generateFeature({
	root,
	lint,
	context: required(args),
	entity: required(args, 'entity'),
	action: required(args, 'action'),
	...(transport === 'rest' || transport === 'graphql' ? { transport } : {}),
	...(fields.length > 0 ? { fields } : {}),
	...(permissions.length > 0 ? { permissions } : {}),
	...(nested.length > 0 ? { nested } : {}),
	...(args.has('resolver') ? { resolver: true } : {}),
});
const violations = (await checkCellixLint({ root, lint })).filter((violation) => files.some((file) => violation.includes(file.path.split(path.sep).join('/'))));
if (violations.length > 0) {
	console.error(violations.join('\n\n'));
	process.exit(1);
}
for (const file of files) console.log(path.relative(root, file.path));
console.log(`Cellix generator: wrote ${files.length} files`);

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
