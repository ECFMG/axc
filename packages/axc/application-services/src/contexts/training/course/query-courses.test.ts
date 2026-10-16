import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import { testSources } from '../../../test-support.ts';
import { queryCourses } from './query-courses.ts';

const feature = await loadFeature(new URL('./features/query-courses.feature', import.meta.url).pathname);
describeFeature(feature, ({ Scenario }) => {
	Scenario('Delegates typed course criteria', ({ Given, When, Then }) => {
		let data: ReturnType<typeof testSources>;
		let action: () => Promise<void>;
		Given('typed training data sources', () => {
			data = testSources();
		});
		When('courses are searched', () => {
			action = async () => {
				const { dataSources } = data;
				const criteria = { page: 2, pageSize: 5, sort: 'title' as const };
				await queryCourses(dataSources)(criteria);
				expect(dataSources.readonlyDataSource.Training.Course.search).toHaveBeenCalledWith(criteria);
			};
		});
		Then('the read repository receives page 2', async () => {
			await action();
		});
	});
});
