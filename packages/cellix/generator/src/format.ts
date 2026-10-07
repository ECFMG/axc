import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function formatGeneratedFiles(files: { path: string; contents: string }[]): void {
	if (files.length === 0) return;
	const repo = findRepo(path.dirname(fileURLToPath(import.meta.url)));
	const biome = path.join(repo, 'node_modules', '.bin', 'biome');
	const config = path.join(repo, 'biome.json');
	if (!existsSync(biome) || !existsSync(config)) {
		throw new Error('Biome is not available to format generated files');
	}
	const result = spawnSync(biome, ['check', '--write', `--config-path=${config}`, ...files.map((file) => file.path)], {
		cwd: repo,
		encoding: 'utf8',
	});
	if (result.status !== 0) {
		const detail = `${result.stdout ?? ''}\n${result.stderr ?? ''}`.trim();
		throw new Error(`Biome rejected generated files:\n${detail}`);
	}
}

function findRepo(start: string): string {
	let current = path.resolve(start);
	for (;;) {
		if (existsSync(path.join(current, 'biome.json')) && existsSync(path.join(current, 'cellix-lint.config.json'))) return current;
		const parent = path.dirname(current);
		if (parent === current) throw new Error('Could not find the repository Biome config');
		current = parent;
	}
}
