import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { GeneratedFile, GenerateFeatureOptions } from '../types.ts';

/** Writes files that do not exist yet. Shared files that already exist are left for the composition step. */
export async function writeNewFiles(options: GenerateFeatureOptions, files: GeneratedFile[]): Promise<GeneratedFile[]> {
	const passport = path.join(options.root, options.lint.layers.domain, 'domain/contexts/passport.ts');
	const readonlyRoot = path.join(options.root, options.lint.layers.persistence, 'datasources/readonly');
	const shared = new Set([passport, path.join(readonlyRoot, 'mongo-data-source.ts'), path.join(readonlyRoot, 'index.ts'), path.join(readonlyRoot, options.context, 'index.ts')]);
	const collisions: string[] = [];
	const writes: GeneratedFile[] = [];
	for (const file of files) {
		if (await exists(file.path)) {
			if (shared.has(file.path)) continue;
			collisions.push(file.path);
			continue;
		}
		writes.push(file);
	}
	if (collisions.length > 0) throw new Error(`Refusing to overwrite:\n${collisions.join('\n')}`);
	for (const file of writes) {
		assertInsideLayers(file.path, options);
		await mkdir(path.dirname(file.path), { recursive: true });
		await writeFile(file.path, file.contents);
	}
	return writes;
}

function assertInsideLayers(file: string, options: GenerateFeatureOptions): void {
	const relative = path.relative(options.root, file).split(path.sep).join('/');
	if (relative.startsWith('packages/axc-verification/acceptance-api/src/')) return;
	const roots = Object.values(options.lint.layers).map((layer) => path.join(options.root, layer));
	const posix = file.split(path.sep).join('/');
	const allowed = roots.some((layer) => posix.startsWith(layer.split(path.sep).join('/')));
	if (!allowed) throw new Error(`Generator refused to write outside a configured layer: ${posix}`);
}

async function exists(file: string): Promise<boolean> {
	try {
		await access(file);
		return true;
	} catch {
		return false;
	}
}
