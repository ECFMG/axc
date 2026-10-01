import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AzureFunctionsLocalSettings } from '@cellix/local-dev';
import { ApiInfrastructure } from '@cellix/serenity-framework/infrastructure/api';
import { ProcessTestServer } from '@cellix/serenity-framework/servers';

const acceptanceDir = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.resolve(acceptanceDir, '../../../../apps/api');
const port = '7071';

export const apiServer = new ProcessTestServer({
	serverName: 'agentCourses-api',
	executable: 'node',
	spawnArgs: ['--experimental-strip-types', 'scripts/start-host.ts'],
	cwd: apiDir,
	readyMarker: /Host lock lease acquired/,
	url: `http://127.0.0.1:${port}/health`,
	startupTimeoutMs: 180_000,
	portsToCloseBeforeStart: [7071],
});

export const infrastructure = ApiInfrastructure.create({
	setupEnvironment: () => {
		new AzureFunctionsLocalSettings({
			appDir: apiDir,
			values: {
				FUNCTIONS_WORKER_RUNTIME: 'node',
				AzureWebJobsFeatureFlags: 'EnableWorkerIndexing',
				AzureWebJobsStorage: 'UseDevelopmentStorage=true',
			},
		}).sync();
	},
})
	.addServer('api', apiServer)
	.finalize();
