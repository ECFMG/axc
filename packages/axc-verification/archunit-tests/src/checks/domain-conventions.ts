import { getFilesMatching, getRelativeSegmentsAfter } from '../utils/source-files.ts';

export function checkAxcDomainStructure(config: { domainAllGlob: string }): string[] {
	const violations: string[] = [];

	for (const filePath of getFilesMatching(config.domainAllGlob, '.ts')) {
		const segments = getRelativeSegmentsAfter(filePath, '/src/');

		if (segments.length === 0) {
			continue;
		}

		const root = segments[0];
		if (!root) {
			continue;
		}

		const isRootIndex = segments.length === 1 && root === 'index.ts';
		const isInDomain = root === 'domain';
		const isArchunitTest = root === 'archunit-tests';
		const isTestFile = filePath.endsWith('.test.ts') || filePath.endsWith('.spec.ts');

		if (isRootIndex || isInDomain || isArchunitTest || isTestFile) {
			continue;
		}

		violations.push(`[${filePath}] Domain implementation files must live under src/domain/**`);
	}

	return violations;
}
