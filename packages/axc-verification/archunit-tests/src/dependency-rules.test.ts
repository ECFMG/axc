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

describe('application-services persistence import boundary', () => {
	it('imports only types from @axc/persistence', async () => {
		const servicesSrc = path.resolve(packageDir, '../../axc/application-services/src');
		const files = (await listTypeScriptFiles(servicesSrc)).filter((file) => !file.endsWith('.test.ts'));
		expect(files.length).toBeGreaterThan(0);
		for (const file of files) {
			const text = await readFile(file, 'utf8');
			const violation = persistenceValueImport(text);
			expect(violation, `${path.basename(file)} imports @axc/persistence as a value`).toBeUndefined();
		}
	});
});

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

function persistenceValueImport(source: string): string | undefined {
	const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
	const fromPattern = /(?:^|[;\n])\s*(import|export)\s+([^;]*?)\s+from\s+['"]@axc\/persistence['"]/g;
	for (const match of withoutComments.matchAll(fromPattern)) {
		const kind = match[1] ?? '';
		const rest = match[2]?.trim() ?? '';
		if (rest.startsWith('type ') || rest.startsWith('type{')) {
			continue;
		}
		return `${kind} ${rest} from '@axc/persistence'`;
	}
	const sideEffect = /(?:^|[;\n])\s*import\s+['"]@axc\/persistence['"]/.exec(withoutComments);
	if (sideEffect) {
		return "import '@axc/persistence'";
	}
	const dynamicImport = /\bimport\s*\(\s*['"]@axc\/persistence['"]\s*\)/.exec(withoutComments);
	if (dynamicImport) {
		return dynamicImport[0];
	}
	return undefined;
}
