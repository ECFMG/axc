import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const applicationServicesEntry = path.resolve(packageDir, '../../axc/application-services/src/index.ts');
const restEntry = path.resolve(packageDir, '../../axc/rest/src/index.ts');

describe('Cellix alignment', () => {
	it('keeps feature data and collection-processing behavior out of the application-services entry point', async () => {
		const source = await readFile(applicationServicesEntry, 'utf8');
		const violations: string[] = [];

		if (/\b\w*(?:fixture|fixtures|seed|sample|mock)\w*\s*(?::[^=]+)?=\s*\[\s*\{/i.test(source)) {
			violations.push('move fixture or seed record collections behind a data-source boundary');
		}

		const collectionOperations = ['filter', 'sort', 'slice'];
		for (const operation of collectionOperations) {
			if (source.includes(`.${operation}(`)) {
				violations.push(`move .${operation}() feature behavior into a context operation`);
			}
		}

		expect(violations, 'packages/axc/application-services/src/index.ts must remain a composition entry point').toStrictEqual([]);
	});

	it('keeps non-health route definitions out of the REST entry point', async () => {
		const source = await readFile(restEntry, 'utf8');
		const routePattern = /\bapp\.(?:get|post|put|patch|delete|options|all)\(\s*['"]([^'"]+)['"]/g;
		const entryPointRoutes = [...source.matchAll(routePattern)].map((match) => match[1]).filter((route) => route !== '/health');

		expect(entryPointRoutes, 'register non-health routes from packages/axc/rest/src/features modules').toStrictEqual([]);
	});
});
