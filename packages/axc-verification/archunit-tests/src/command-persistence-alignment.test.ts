import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const domainDataSources = path.join(projectRoot, 'packages/axc/persistence/src/datasources/domain');

describe('Cellix command persistence alignment', () => {
	it('requires adapter/converter, repository factory, unit-of-work wiring, and focused companions for each command slice', async () => {
		const violations: string[] = [];
		for (const directory of await commandSlices(domainDataSources)) {
			const slice = path.relative(domainDataSources, directory);
			const files = await readdir(directory);
			const uow = files.find((file) => file.endsWith('.uow.ts'));
			if (!uow) continue;
			const entity = uow.slice(0, -'.uow.ts'.length);
			const adapterFile = `${entity}.domain-adapter.ts`;
			const repositoryFile = `${entity}.repository.ts`;
			const required = [adapterFile, repositoryFile, uow, 'index.ts', `${entity}.domain-adapter.test.ts`, `${entity}.repository.test.ts`, `${entity}.uow.test.ts`, 'index.test.ts'];
			for (const file of required) if (!files.includes(file)) violations.push(`${slice}: missing ${file}`);
			if (files.includes(adapterFile)) {
				const source = await readFile(path.join(directory, adapterFile), 'utf8');
				if (!/class\s+\w+DomainAdapter\b/.test(source) || !/implements\s+[\s\S]*?Props\b/.test(source)) violations.push(`${slice}/${adapterFile}: define a stored-record adapter implementing aggregate props`);
				if (!/class\s+\w+Converter\b/.test(source)) violations.push(`${slice}/${adapterFile}: define a converter for new adapters and stored-aggregate reconstruction`);
			}
			if (files.includes(repositoryFile)) {
				const source = await readFile(path.join(directory, repositoryFile), 'utf8');
				if (!/\bgetNewInstance\b/.test(source)) violations.push(`${slice}/${repositoryFile}: create aggregates through the repository factory`);
				if (!/\b(?:typeConverter|converter)\b/i.test(source)) violations.push(`${slice}/${repositoryFile}: use the adapter/converter boundary for creation, retrieval, and save`);
			}
			const uowSource = await readFile(path.join(directory, uow), 'utf8');
			if (!/\w+Converter\b/.test(uowSource) || !/\w+Repository\b/.test(uowSource)) violations.push(`${slice}/${uow}: compose the converter and repository in the unit of work`);
			if (files.includes('index.ts')) {
				const source = await readFile(path.join(directory, 'index.ts'), 'utf8');
				if (!/\b\w+Persistence\b/.test(source) || !/\b\w+UnitOfWork\b/.test(source)) violations.push(`${slice}/index.ts: expose an initialized unit of work from the entity persistence factory`);
			}
		}
		expect(violations, 'compare each command persistence slice with Cellix case/service-ticket-v1; an in-memory store does not replace the adapter/converter').toStrictEqual([]);
	});
});

async function commandSlices(directory: string): Promise<string[]> {
	if (!(await exists(directory))) return [];
	const entries = await readdir(directory, { withFileTypes: true });
	const nested = await Promise.all(entries.filter((entry) => entry.isDirectory()).map((entry) => commandSlices(path.join(directory, entry.name))));
	return [directory, ...nested.flat()].filter((candidate) => candidate !== domainDataSources);
}

async function exists(target: string): Promise<boolean> {
	try {
		await access(target);
		return true;
	} catch {
		return false;
	}
}
