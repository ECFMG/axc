import { AzureFunctionsDevRunner, buildAzuriteConnectionString, getAzuritePorts } from '@cellix/local-dev';

// Azurite well-known dev account (public emulator credentials, not a secret).
const devAccount = {
	accountName: 'devstoreaccount1',
	accountKey: 'Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==',
};

// In a worktree, Azurite runs on offset ports; UseDevelopmentStorage=true would still hit 10000.
const storage = process.env.WORKTREE_NAME ? buildAzuriteConnectionString({ ...devAccount, ports: getAzuritePorts() }) : 'UseDevelopmentStorage=true';

new AzureFunctionsDevRunner({
	localSettings: {
		values: {
			FUNCTIONS_WORKER_RUNTIME: 'node',
			AzureWebJobsFeatureFlags: 'EnableWorkerIndexing',
			AzureWebJobsStorage: storage,
		},
	},
}).start();
