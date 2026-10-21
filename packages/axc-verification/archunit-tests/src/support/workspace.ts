import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Filesystem helpers shared by the axc fitness rules. Rules work on plain { path, content }
// records so each rule can be exercised against inline samples as well as the real workspace.

export interface SourceFile {
	/** Repo-relative POSIX path. */
	path: string;
	content: string;
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');

const skippedDirectories = new Set(['node_modules', 'dist', 'build', 'deploy', 'target', 'coverage', '.turbo', '.docusaurus']);

export function readSourceFiles(relativeDir: string, extensions: readonly string[] = ['.ts']): SourceFile[] {
	const root = path.join(repoRoot, relativeDir);
	if (!existsSync(root)) {
		return [];
	}
	const files: SourceFile[] = [];
	const visit = (directory: string): void => {
		for (const entry of readdirSync(directory, { withFileTypes: true })) {
			const absolute = path.join(directory, entry.name);
			if (entry.isDirectory()) {
				if (!skippedDirectories.has(entry.name)) {
					visit(absolute);
				}
			} else if (extensions.some((extension) => entry.name.endsWith(extension))) {
				files.push({ path: toRepoPath(absolute), content: readFileSync(absolute, 'utf8') });
			}
		}
	};
	visit(root);
	return files.sort((a, b) => a.path.localeCompare(b.path));
}

export function readRepoFile(relativePath: string): SourceFile | undefined {
	const absolute = path.join(repoRoot, relativePath);
	return existsSync(absolute) ? { path: relativePath, content: readFileSync(absolute, 'utf8') } : undefined;
}

export function listRepoFiles(pattern: RegExp): string[] {
	return readdirSync(repoRoot).filter((name) => pattern.test(name));
}

/** Source text without comments, so rules match code rather than prose about code. */
export function codeOf(file: SourceFile): string {
	return file.content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
}

export function isTestFile(filePath: string): boolean {
	return /\.(test|spec)\.ts$/.test(filePath) || filePath.includes('/fixtures/');
}

/** Absolute path of a workspace package directory, for archunit suites that resolve files from the current directory. */
export function packageDirectory(relativeDir: string): string {
	return path.join(repoRoot, relativeDir);
}

function toRepoPath(absolute: string): string {
	return path.relative(repoRoot, absolute).split(path.sep).join('/');
}
