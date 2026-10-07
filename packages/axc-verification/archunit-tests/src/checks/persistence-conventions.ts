import { getFilesMatching, getRelativeSegmentsAfter, readFile } from '../utils/source-files.ts';

export function checkAxcPersistenceStructure(config: { persistenceAllGlob: string }): string[] {
	const violations: string[] = [];

	for (const filePath of getFilesMatching(config.persistenceAllGlob, '.ts')) {
		const segments = getRelativeSegmentsAfter(filePath, '/src/');

		if (segments.length === 0) {
			continue;
		}

		const root = segments[0];
		if (!root) {
			continue;
		}

		const isRootIndex = segments.length === 1 && root === 'index.ts';
		const isRootTest = segments.length === 1 && (root.endsWith('.test.ts') || root.endsWith('.spec.ts'));
		const isInDatasources = root === 'datasources';
		const isInModels = root === 'models';
		const isArchunitTest = root === 'archunit-tests';
		const isTestFile = filePath.endsWith('.test.ts') || filePath.endsWith('.spec.ts');

		if (isRootIndex || isRootTest || isInDatasources || isInModels || isArchunitTest || isTestFile) {
			continue;
		}

		violations.push(`[${filePath}] Persistence implementation files must live under src/datasources/** or src/models/**`);
	}

	return violations;
}

export function checkAxcPersistenceFactoryExports(config: { persistenceDomainGlob: string; persistenceReadonlyGlob: string }): string[] {
	const violations: string[] = [];

	for (const filePath of getFilesMatching(config.persistenceDomainGlob, 'index.ts')) {
		const segments = getRelativeSegmentsAfter(filePath, '/datasources/domain/');
		if (segments.length !== 3) {
			continue;
		}

		const content = readFile(filePath);
		if (!content.includes('export const')) {
			continue;
		}
		const unitOfWorkMatch = content.match(/get(\w+)UnitOfWork/);
		if (!unitOfWorkMatch) {
			continue;
		}

		const expectedFactoryName = `${unitOfWorkMatch[1]}Persistence`;
		const exportPattern = new RegExp(`export\\s+const\\s+${expectedFactoryName}\\s*=\\s*\\(`);
		if (!exportPattern.test(content)) {
			violations.push(`[${filePath}] Domain persistence index must export const ${expectedFactoryName}`);
		}
	}

	for (const filePath of getFilesMatching(config.persistenceReadonlyGlob, 'index.ts')) {
		const segments = getRelativeSegmentsAfter(filePath, '/datasources/readonly/');
		if (segments.length !== 3) {
			continue;
		}

		const content = readFile(filePath);
		if (!content.includes('export const')) {
			continue;
		}
		const readRepositoryMatch = content.match(/get(\w+)ReadRepository/);
		if (!readRepositoryMatch) {
			continue;
		}

		const expectedFactoryName = `${readRepositoryMatch[1]}ReadRepositoryImpl`;
		const exportPattern = new RegExp(`export\\s+const\\s+${expectedFactoryName}\\s*=\\s*\\(`);
		if (!exportPattern.test(content)) {
			violations.push(`[${filePath}] Readonly persistence index must export const ${expectedFactoryName}`);
		}
	}

	return violations;
}

export function checkAxcPersistenceForbiddenImports(config: { persistenceAllGlob: string }): string[] {
	const violations: string[] = [];
	const forbiddenSpecifiers = ['@axc/application-services', '@axc/rest'];

	for (const filePath of getFilesMatching(config.persistenceAllGlob, '.ts')) {
		if (filePath.endsWith('.test.ts') || filePath.endsWith('.spec.ts') || filePath.includes('/archunit-tests/')) {
			continue;
		}

		const content = readFile(filePath);
		for (const specifier of forbiddenSpecifiers) {
			if (content.includes(`'${specifier}`) || content.includes(`"${specifier}`)) {
				violations.push(`[${filePath}] Persistence must not import ${specifier}`);
			}
		}
	}

	return violations;
}
