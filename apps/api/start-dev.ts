import { AzureFunctionsDevRunner } from '@cellix/local-dev';

new AzureFunctionsDevRunner({
	localSettings: {
		values: {
			FUNCTIONS_WORKER_RUNTIME: 'node',
			AzureWebJobsFeatureFlags: 'EnableWorkerIndexing',
			AzureWebJobsStorage: 'UseDevelopmentStorage=true',
		},
	},
}).start();
