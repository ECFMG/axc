import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

interface SourceFile {
	path: string;
	relativePath: string;
	content: string;
}

export const isProductionSource = (filePath: string): boolean => filePath.endsWith('.ts') && !filePath.endsWith('.test.ts') && !filePath.endsWith('.d.ts') && !filePath.includes('/archunit-tests/');

/**
 * Recursively lists files under a directory. Unlike archunit's projectFiles(),
 * this is not scoped to the current package's tsconfig, so it works for
 * cross-package rules and for packages that are still empty.
 */
export async function listFiles(root: string, predicate: (filePath: string) => boolean): Promise<SourceFile[]> {
	const found: SourceFile[] = [];
	await walk(root);
	return found;

	async function walk(directory: string): Promise<void> {
		let entries: import('node:fs').Dirent[];
		try {
			entries = await readdir(directory, { withFileTypes: true });
		} catch {
			return;
		}
		for (const entry of entries) {
			if (entry.name === 'node_modules' || entry.name === 'dist') {
				continue;
			}
			const entryPath = path.join(directory, entry.name);
			if (entry.isDirectory()) {
				await walk(entryPath);
			} else if (predicate(entryPath)) {
				found.push({ path: entryPath, relativePath: path.relative(root, entryPath), content: await readFile(entryPath, 'utf8') });
			}
		}
	}
}

export const importedSpecifiers = (content: string): string[] => [...content.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].map((match) => match[1] as string);
