import type { Dirent } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export function report(file: string, rule: string, found: string, expected: string): string {
	return `${toPosix(file)}\n  Rule: ${rule}\n  Found: ${found}\n  Expected: ${expected}`;
}

export function toPosix(filePath: string): string {
	return filePath.split(path.sep).join('/');
}

export function isTestFile(file: string): boolean {
	return file.endsWith('.test.ts') || file.endsWith('.spec.ts');
}

export function kebabToCamel(value: string): string {
	return value.replace(/-([a-z0-9])/g, (_match, char: string) => char.toUpperCase());
}

export function kebabToPascal(value: string): string {
	const camel = kebabToCamel(value);
	return camel.slice(0, 1).toUpperCase() + camel.slice(1);
}

export function importSpecifiers(content: string): string[] {
	const specifiers: string[] = [];
	const pattern = /(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\)/g;
	for (const match of content.matchAll(pattern)) {
		const specifier = match[1] ?? match[2] ?? match[3];
		if (specifier) specifiers.push(specifier);
	}
	return specifiers;
}

export function relativePosix(file: string, packageSrc: string): string {
	if (!packageSrc) return toPosix(file);
	return toPosix(path.relative(packageSrc, file));
}

export function readText(file: string): Promise<string> {
	return readFile(file, 'utf8');
}

export async function listTypeScript(directory: string): Promise<string[]> {
	const files = await walk(directory);
	return files.filter((file) => file.endsWith('.ts') && !file.endsWith('.d.ts'));
}

export async function listSource(directory: string, extensions: string[]): Promise<string[]> {
	const files = await walk(directory);
	return files.filter((file) => extensions.some((extension) => file.endsWith(extension)));
}

async function walk(directory: string): Promise<string[]> {
	let entries: Dirent[];
	try {
		entries = await readdir(directory, { withFileTypes: true });
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
		throw error;
	}
	const nested = await Promise.all(
		entries.map((entry) => {
			const full = path.join(directory, entry.name);
			if (entry.isDirectory()) {
				if (entry.name === 'node_modules' || entry.name === 'dist') return Promise.resolve([]);
				return walk(full);
			}
			return Promise.resolve(entry.isFile() ? [full] : []);
		}),
	);
	return nested.flat();
}
