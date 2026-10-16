import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import { testSources } from '../../../test-support.ts';
import { queryRequests } from './query-requests.ts';

const feature = await loadFeature(new URL('./features/query-requests.feature', import.meta.url).pathname);
describeFeature(feature, ({ Scenario }) => {
	Scenario('Delegates all list filters', ({ Given, When, Then }) => {
		let data: ReturnType<typeof testSources>;
		let action: () => Promise<void>;
		Given('typed training data sources', () => {
			data = testSources();
		});
		When('pending requests for a learner and course are listed', () => {
			action = async () => {
				const { dataSources } = data;
				const criteria = { status: 'pending' as const, courseId: 'course-001', learnerEmail: 'learner@example.org' };
				await queryRequests(dataSources)(criteria);
				expect(dataSources.readonlyDataSource.Training.EnrollmentRequest.list).toHaveBeenCalledWith(criteria);
			};
		});
		Then('the read repository receives all 3 filters', async () => {
			await action();
		});
	});
});
