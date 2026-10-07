import { getFilesMatching, getRelativeSegmentsAfter, readFile } from '../utils/source-files.ts';

export function checkAxcApplicationServicesStructure(config: { applicationServicesAllGlob: string }): string[] {
	const violations: string[] = [];

	for (const filePath of getFilesMatching(config.applicationServicesAllGlob, '.ts')) {
		const segments = getRelativeSegmentsAfter(filePath, '/src/');

		if (segments.length === 0) {
			continue;
		}

		const isRootIndex = segments.length === 1 && segments[0] === 'index.ts';
		const isInContexts = segments[0] === 'contexts';
		const isArchunitTest = segments[0] === 'archunit-tests';
		const isTestFile = filePath.endsWith('.test.ts') || filePath.endsWith('.spec.ts');

		if (isRootIndex || isInContexts || isArchunitTest || isTestFile) {
			continue;
		}

		violations.push(`[${filePath}] Application-service implementation files must live under src/contexts/**`);
	}

	return violations;
}

export function checkAxcApplicationServicesFactoryExports(config: { applicationServicesGlob: string }): string[] {
	const violations: string[] = [];

	for (const filePath of getFilesMatching(config.applicationServicesGlob, 'index.ts')) {
		const segments = getRelativeSegmentsAfter(filePath, '/contexts/');
		if (segments.length !== 3) {
			continue;
		}

		const content = readFile(filePath);
		const interfaceMatch = content.match(/export\s+interface\s+(\w+)ApplicationService\b/);
		if (!interfaceMatch) {
			continue;
		}

		const expectedFactoryName = interfaceMatch[1];
		const exportPattern = new RegExp(`export\\s+const\\s+${expectedFactoryName}\\s*=\\s*\\(`);
		if (!exportPattern.test(content)) {
			violations.push(`[${filePath}] Entity application-service index must export const ${expectedFactoryName}`);
		}
	}

	return violations;
}
