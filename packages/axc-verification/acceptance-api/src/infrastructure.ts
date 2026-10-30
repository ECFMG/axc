import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMemoryMongoServer } from '@axc/service-mongoose';
import { AzureFunctionsLocalSettings } from '@cellix/local-dev';
import { ApiInfrastructure } from '@cellix/serenity-framework/infrastructure/api';
import { ProcessTestServer } from '@cellix/serenity-framework/servers';

const acceptanceDir = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.resolve(acceptanceDir, '../../../../apps/api');
const port = '7071';

/**
 * A catalog scenario needs Mongo. In setupEnvironment, start createMemoryMongoServer from
 * @axc/service-mongoose, set process.env.MONGODB_URI to getUri(), and stop the server in afterAll.
 * The API process inherits the variable. Do not start that server in apps/api/src/index.ts.
 */

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

let memoryMongo: ReturnType<typeof createMemoryMongoServer> | undefined;

export async function stopMemoryMongo(): Promise<void> {
	if (memoryMongo !== undefined) {
		await memoryMongo.stop();
		memoryMongo = undefined;
	}
}

export const infrastructure = ApiInfrastructure.create({
	setupEnvironment: async () => {
		memoryMongo = createMemoryMongoServer();
		await memoryMongo.start();
		const uri = memoryMongo.getUri();
		// biome-ignore lint/complexity/useLiteralKeys: ProcessEnv.MONGODB_URI is an index signature under noPropertyAccessFromIndexSignature
		process.env['MONGODB_URI'] = uri;
		new AzureFunctionsLocalSettings({
			appDir: apiDir,
			values: {
				FUNCTIONS_WORKER_RUNTIME: 'node',
				AzureWebJobsFeatureFlags: 'EnableWorkerIndexing',
				MONGODB_URI: uri,
			},
		}).sync();
	},
})
	.addServer('api', apiServer)
	.finalize();
