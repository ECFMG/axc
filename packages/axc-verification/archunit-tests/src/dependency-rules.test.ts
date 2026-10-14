import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type DependencyRulesTestsConfig, describeDependencyRulesTests } from '@cellix/archunit-tests/general';
import { projectFiles } from 'archunit';
import { describe, expect, it } from 'vitest';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const config: DependencyRulesTestsConfig = {
	appsGlob: '../../../apps/**',
	packagesGlob: '../../**',
	domainFolder: '../../axc/domain',
	persistenceFolder: '../../axc/persistence',
	applicationServicesFolder: '../../axc/application-services',
	restFolder: '../../axc/rest',
	infrastructurePattern: '../../axc/service-mongoose/**',
	restInfrastructurePattern: '../../axc/service-mongoose/**',
};

describeDependencyRulesTests(config);

const forbiddenDomainImports = ['hono', '@azure/', 'mongoose', 'mongodb', '@axc/rest', '@axc/persistence', '@axc/service-mongoose', '@axc/application-services'];

describe('domain import boundary', () => {
	it('domain sources do not import delivery or persistence implementations', async () => {
		const domainSrc = path.resolve(packageDir, '../../axc/domain/src');
		const files = await listTypeScriptFiles(domainSrc);
		expect(files.length).toBeGreaterThan(0);
		for (const file of files) {
			const text = await readFile(file, 'utf8');
			for (const specifier of forbiddenDomainImports) {
				expect(text.includes(`'${specifier}`) || text.includes(`"${specifier}`), `${path.basename(file)} imports ${specifier}`).toBe(false);
			}
		}
	});

	it('domain does not depend on the rest package', async () => {
		await projectFiles().inFolder(path.resolve(packageDir, '../../axc/domain')).shouldNot().dependOnFiles().inFolder(path.resolve(packageDir, '../../axc/rest')).check();
	});
});

const concreteStorageSpecifiers = ['@axc/persistence', '@axc/service-mongoose'] as const;
const concreteStorageRoots = [path.resolve(packageDir, '../../axc/persistence'), path.resolve(packageDir, '../../axc/service-mongoose')];

describe('concrete storage boundary', () => {
	it('application services do not import concrete storage', async () => {
		await expectNoConcreteStorageImports(path.resolve(packageDir, '../../axc/application-services/src'));
	});

	it('rest does not import concrete storage', async () => {
		await expectNoConcreteStorageImports(path.resolve(packageDir, '../../axc/rest/src'));
	});
});

async function expectNoConcreteStorageImports(directory: string): Promise<void> {
	const files = await listTypeScriptFiles(directory);
	expect(files.length).toBeGreaterThan(0);
	for (const file of files) {
		const text = await readFile(file, 'utf8');
		for (const specifier of moduleSpecifiers(text)) {
			expect(forbiddenStorageTarget(file, specifier), `${path.relative(packageDir, file)} imports ${specifier}`).toBeUndefined();
		}
	}
}

function moduleSpecifiers(text: string): string[] {
	const specifiers: string[] = [];
	for (const match of text.matchAll(/(?:^|\n)\s*(?:import|export)\b[^'"\n]*['"]([^'"]+)['"]/g)) {
		const specifier = match[1];
		if (specifier !== undefined) {
			specifiers.push(specifier);
		}
	}
	for (const match of text.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)) {
		const specifier = match[1];
		if (specifier !== undefined) {
			specifiers.push(specifier);
		}
	}
	return specifiers;
}

function forbiddenStorageTarget(file: string, specifier: string): string | undefined {
	const packageTarget = concreteStorageSpecifiers.find((candidate) => specifier === candidate || specifier.startsWith(`${candidate}/`));
	if (packageTarget !== undefined) {
		return packageTarget;
	}
	if (!specifier.startsWith('.')) {
		return undefined;
	}
	const resolved = path.resolve(path.dirname(file), specifier);
	return concreteStorageRoots.find((root) => {
		const relative = path.relative(root, resolved);
		return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
	});
}

async function listTypeScriptFiles(directory: string): Promise<string[]> {
	const entries = await readdir(directory, { withFileTypes: true });
	const files = await Promise.all(
		entries.map(async (entry) => {
			const entryPath = path.join(directory, entry.name);
			if (entry.isDirectory()) {
				return await listTypeScriptFiles(entryPath);
			}
			return entry.name.endsWith('.ts') ? [entryPath] : [];
		}),
	);
	return files.flat();
}
