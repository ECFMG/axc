import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { type DependencyRulesTestsConfig, describeDependencyRulesTests } from '@cellix/archunit-tests/general';
import { projectFiles } from 'archunit';
import { describe, expect, it } from 'vitest';

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

describe('dependency-rule targets exist', () => {
	for (const folder of [config.domainFolder, config.persistenceFolder, config.applicationServicesFolder, config.restFolder, '../../axc/service-mongoose', '../../../apps/api']) {
		it(`${folder} has TypeScript sources`, () => {
			const files = existsSync(path.join(folder ?? '', 'src')) ? readdirSync(path.join(folder ?? '', 'src'), { recursive: true }).filter((name) => String(name).endsWith('.ts')) : [];
			expect(files.length, `${folder}/src: dependency rules matched 0 files — fix: update the folder in dependency-rules.test.ts`).toBeGreaterThan(0);
		});
	}
});

it('domain does not depend on rest files (relative imports included)', async () => {
	await projectFiles().inFolder(path.resolve('../../axc/domain')).shouldNot().dependOnFiles().inFolder(path.resolve('../../axc/rest')).check();
});
