import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import { trainingFixture } from '../../../training.test-fixture.ts';
import { list } from './list.ts';

const feature = await loadFeature('src/contexts/training/enrollment-request/features/list.feature');
describeFeature(feature, ({ Scenario }) => {
	Scenario('Passes all list criteria to the repository', ({ Given, When, Then }) => {
		let fixture: ReturnType<typeof trainingFixture>;
		let result: unknown;
		Given('typed training data sources', () => {
			fixture = trainingFixture();
		});
		When('the operation is requested', async () => {
			const criteria = { status: 'approved', courseId: 'course-001', learnerEmail: 'learner@example.org' } as const;
			result = await list(fixture.dataSources)(criteria);
			expect(fixture.dataSources.readonlyDataSource.Training.EnrollmentRequest.list).toHaveBeenCalledWith(criteria);
		});
		Then('the result respects the application contract', () => {
			expect(result).toEqual([]);
		});
	});
});
