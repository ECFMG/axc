import { configure } from '@serenity-js/core';

configure({
	crew: [
		['@serenity-js/serenity-bdd', { specDirectory: 'src/features' }],
		['@serenity-js/core:ArtifactArchiver', { outputDirectory: 'target/site/serenity' }],
		['@serenity-js/console-reporter', { theme: 'auto' }],
	],
});
