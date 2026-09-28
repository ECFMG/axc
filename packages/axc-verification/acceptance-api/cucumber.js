export default {
	paths: ['src/features/**/*.feature'],
	import: ['src/serenity.ts', 'src/world.ts', 'src/step-definitions/healthcheck.steps.ts', 'src/step-definitions/courses.steps.ts'],
	format: ['progress-bar', 'json:./target/cucumber-report-api.json', 'html:./target/cucumber-report-api.html'],
	formatOptions: {
		snippetInterface: 'async-await',
	},
	parallel: 1,
};
