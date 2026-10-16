import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll } from 'vitest';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');

export const axcPackageDir = (name: string): string => path.join(repositoryRoot, 'packages/axc', name);

/**
 * The vendored @cellix/archunit-tests suites call archunit's projectFiles()
 * with no tsconfig argument, so archunit discovers the tsconfig from the
 * process working directory. Running those suites for a package therefore
 * means running them with that package as cwd. Each vitest test file runs in
 * its own worker, so the change does not leak into other files.
 */
export function runFromPackage(packageDir: string): void {
	const previous = process.cwd();
	beforeAll(() => {
		process.chdir(packageDir);
	});
	afterAll(() => {
		process.chdir(previous);
	});
}
