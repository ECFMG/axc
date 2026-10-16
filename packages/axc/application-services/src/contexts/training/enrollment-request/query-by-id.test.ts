import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { Domain } from '@axc/domain';
import { expect, vi } from 'vitest';
import { fakeDataSources } from '../../../test-data-sources.ts';
import { queryById } from './query-by-id.ts';

const feature = await loadFeature(new URL('./features/query-by-id.feature', import.meta.url).pathname);
const E = Domain.Contexts.Training.EnrollmentRequest;
const input = { courseId: 'course-001', learnerEmail: 'learner@example.org', justification: 'I need this course for my work.' };
describeFeature(feature, ({ Scenario }) => {
	Scenario('Delegate typed input and propagate results and errors', ({ Then }) => {
		Then('the operation uses its required repositories and preserves domain outcomes', async () => {
			const data = fakeDataSources();
			const repo = data.readonlyDataSource.Training.EnrollmentRequest.EnrollmentRequestReadRepo;
			const item = E.EnrollmentRequest.create('id', input, { status: 'active' }, new Date().toISOString()).toSnapshot();
			vi.mocked(repo.getById).mockResolvedValue(item);
			expect(await queryById(data)('id')).toBe(item);
			expect(repo.getById).toHaveBeenCalledWith('id');
			vi.mocked(repo.getById).mockResolvedValue(null);
			await expect(queryById(data)('missing')).rejects.toMatchObject({ code: 'ENROLLMENT_REQUEST_NOT_FOUND' });
		});
	});
});
