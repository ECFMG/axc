import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect, vi } from 'vitest';
import { fakeDataSources } from '../../../test-data-sources.ts';
import { queryRequests } from './query-requests.ts';

const feature = await loadFeature(new URL('./features/query-requests.feature', import.meta.url).pathname);
describeFeature(feature, ({ Scenario }) => {
	Scenario('Delegate typed input and propagate results and errors', ({ Then }) => {
		Then('the operation uses its required repositories and preserves domain outcomes', async () => {
			const data = fakeDataSources();
			const criteria = { status: 'pending', courseId: 'course-001', learnerEmail: 'learner@example.org' } as const;
			vi.mocked(data.readonlyDataSource.Training.EnrollmentRequest.EnrollmentRequestReadRepo.list).mockResolvedValue([]);
			expect(await queryRequests(data)(criteria)).toEqual([]);
			expect(data.readonlyDataSource.Training.EnrollmentRequest.EnrollmentRequestReadRepo.list).toHaveBeenCalledWith(criteria);
		});
	});
});
