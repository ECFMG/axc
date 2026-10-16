import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const applicationContextsDir = path.resolve(packageDir, '../../axc/application-services/src/contexts');
const domainContextsDir = path.resolve(packageDir, '../../axc/domain/src/domain/contexts');
const freeMutationPattern = /export\s+(?:function|const)\s+(?:create|transition|change|update|approve|reject|cancel|delete|archive|restore|assign|submit|complete|close|reopen|request)\w*/;

interface CommandSlice {
	readonly relativePath: string;
	readonly operationFiles: readonly string[];
}

describe('Cellix command-side domain modeling', () => {
	it('requires command workflows to have the complete aggregate file shape', async () => {
		const slices = await findCommandSlices(applicationContextsDir);
		const violations: string[] = [];

		for (const slice of slices) {
			const domainDir = path.join(domainContextsDir, slice.relativePath);
			if (!(await exists(domainDir))) {
				violations.push(`${slice.relativePath}: command operations ${slice.operationFiles.join(', ')} have no matching domain slice`);
				continue;
			}

			const files = await readdir(domainDir);
			const aggregate = files.find((file) => file.endsWith('.aggregate.ts'));
			const valueObjects = files.find((file) => file.endsWith('.value-objects.ts'));
			const repository = files.find((file) => file.endsWith('.repository.ts'));
			const unitOfWork = files.find((file) => file.endsWith('.uow.ts'));
			const requiredFiles: ReadonlyArray<[string, string | undefined]> = [
				['aggregate (*.aggregate.ts)', aggregate],
				['value objects (*.value-objects.ts)', valueObjects],
				['mutation repository (*.repository.ts)', repository],
				['unit of work (*.uow.ts)', unitOfWork],
				['aggregate tests (*.aggregate.test.ts)', files.find((file) => file.endsWith('.aggregate.test.ts'))],
				['value-object tests (*.value-objects.test.ts)', files.find((file) => file.endsWith('.value-objects.test.ts'))],
				['public exports (index.ts)', files.find((file) => file === 'index.ts')],
			];

			for (const [responsibility, file] of requiredFiles) {
				if (file === undefined) {
					violations.push(`${slice.relativePath}: missing ${responsibility}`);
				}
			}

			if (aggregate !== undefined) {
				const source = await readFile(path.join(domainDir, aggregate), 'utf8');
				if (!source.includes("from '@cellix/domain-seedwork/aggregate-root'") || !/extends\s+AggregateRoot\s*</.test(source)) {
					violations.push(`${slice.relativePath}/${aggregate}: aggregate must extend the Cellix AggregateRoot`);
				}
				if (!/export\s+interface\s+\w+Props\s+extends\s+DomainEntityProps/.test(source)) {
					violations.push(`${slice.relativePath}/${aggregate}: aggregate must define props extending DomainEntityProps`);
				}
				if (!/export\s+interface\s+\w+EntityReference\s+extends\s+/.test(source) || !/implements\s+\w+EntityReference/.test(source)) {
					violations.push(`${slice.relativePath}/${aggregate}: aggregate must expose and implement an entity reference`);
				}
			}

			if (valueObjects !== undefined) {
				const source = await readFile(path.join(domainDir, valueObjects), 'utf8');
				if (!/export\s+class\s+\w+\s+extends\s+/.test(source)) {
					violations.push(`${slice.relativePath}/${valueObjects}: constrained values must be exported value-object classes`);
				}
			}

			if (repository !== undefined) {
				const source = await readFile(path.join(domainDir, repository), 'utf8');
				if (!source.includes("from '@cellix/domain-seedwork/repository'") || !/extends\s+(?:\w+\.)?Repository\s*</.test(source)) {
					violations.push(`${slice.relativePath}/${repository}: mutation repository must extend the Cellix Repository contract`);
				}
			}

			if (unitOfWork !== undefined) {
				const source = await readFile(path.join(domainDir, unitOfWork), 'utf8');
				const importsSeedwork = source.includes("from '@cellix/domain-seedwork/unit-of-work'");
				const extendsUnitOfWork = /extends[\s\S]*\bUnitOfWork\s*</.test(source);
				const extendsInitializedUnitOfWork = /extends[\s\S]*\bInitializedUnitOfWork\s*</.test(source);
				if (!importsSeedwork || !extendsUnitOfWork || !extendsInitializedUnitOfWork) {
					violations.push(`${slice.relativePath}/${unitOfWork}: unit of work must extend Cellix UnitOfWork and InitializedUnitOfWork`);
				}
			}

			const index = files.find((file) => file === 'index.ts');
			if (index !== undefined) {
				const source = await readFile(path.join(domainDir, index), 'utf8');
				for (const publicFile of [aggregate, valueObjects, repository, unitOfWork]) {
					if (publicFile !== undefined && !source.includes(`./${publicFile}`)) {
						violations.push(`${slice.relativePath}/index.ts: does not export ${publicFile}`);
					}
				}
			}

			for (const file of files.filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts'))) {
				const source = await readFile(path.join(domainDir, file), 'utf8');
				if (freeMutationPattern.test(source)) {
					violations.push(`${slice.relativePath}/${file}: domain mutations must be aggregate or child-entity methods, not exported free functions`);
				}
			}
		}

		expect(violations, 'command workflows must follow the Cellix aggregate pattern').toStrictEqual([]);
	});
});

async function findCommandSlices(root: string, relativePath = ''): Promise<CommandSlice[]> {
	const directory = path.join(root, relativePath);
	const entries = await readdir(directory, { withFileTypes: true });
	const sourceFiles = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts'));
	const operationFiles = (
		await Promise.all(
			sourceFiles.map(async (entry) => {
				const source = await readFile(path.join(directory, entry.name), 'utf8');
				return source.includes('domainDataSource') || source.includes('withScopedTransaction') ? entry.name : undefined;
			}),
		)
	).filter((file): file is string => file !== undefined);
	const nestedSlices = await Promise.all(entries.filter((entry) => entry.isDirectory()).map((entry) => findCommandSlices(root, path.join(relativePath, entry.name))));
	const currentSlice = operationFiles.length > 0 ? [{ relativePath, operationFiles }] : [];
	return [...currentSlice, ...nestedSlices.flat()];
}

async function exists(target: string): Promise<boolean> {
	try {
		await access(target);
		return true;
	} catch {
		return false;
	}
}
