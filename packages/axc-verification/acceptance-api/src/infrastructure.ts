import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AzureFunctionsLocalSettings } from '@cellix/local-dev';
import { ApiInfrastructure } from '@cellix/serenity-framework/infrastructure/api';
import { ProcessTestServer } from '@cellix/serenity-framework/servers';
import { resolveAcceptancePort } from './acceptance-port.ts';

const acceptanceDir = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.resolve(acceptanceDir, '../../../../apps/api');
// Per-worktree port so kill-before-start never hits another worktree's host (main checkout stays 7071).
const port = resolveAcceptancePort(acceptanceDir);
// start-host.ts reads PORT; the spawned host inherits this env.
process.env['PORT'] = String(port);

export const apiServer = new ProcessTestServer({
	serverName: 'agentCourses-api',
	executable: 'node',
	spawnArgs: ['--experimental-strip-types', 'scripts/start-host.ts'],
	cwd: apiDir,
	readyMarker: /Host lock lease acquired/,
	url: `http://127.0.0.1:${port}/health`,
	startupTimeoutMs: 180_000,
	portsToCloseBeforeStart: [port],
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
