import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { report } from './files.js';

const EXTENDS = '@cellix/lint/biome';

export async function checkCellixBiomeConfig(input: { root: string }): Promise<string[]> {
	const file = path.join(input.root, 'biome.json');
	let parsed: { extends?: unknown };
	try {
		parsed = JSON.parse(await readFile(file, 'utf8')) as { extends?: unknown };
	} catch {
		return [];
	}
	const extendsList = Array.isArray(parsed.extends) ? parsed.extends : [];
	if (!extendsList.includes(EXTENDS)) {
		return [report(file, 'cellix/biome-extends', extendsList.join(', ') || 'no extends', `extends ${EXTENDS}`)];
	}
	return [];
}
