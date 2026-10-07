#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { checkCellixLint } from './check.js';
import { type CellixLintConfig, defaultCellixLintConfig } from './config.js';

const root = await findRoot(process.cwd());
const lint = await loadConfig(root);
const violations = await checkCellixLint({ root, lint });
if (violations.length > 0) {
	console.error(violations.join('\n\n'));
	console.error(`\nCellix lint: ${violations.length} violation${violations.length === 1 ? '' : 's'}`);
	process.exit(1);
}
console.log('Cellix lint: ok');

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
