import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { Domain } from '@axc/domain';
import { expect, vi } from 'vitest';
import { fakeDataSources } from '../../../test-data-sources.ts';
import { create } from './create.ts';

const feature = await loadFeature(new URL('./features/create.feature', import.meta.url).pathname);
const E = Domain.Contexts.Training.EnrollmentRequest;
const input = { courseId: 'course-001', learnerEmail: 'learner@example.org', justification: 'I need this course for my work.' };
describeFeature(feature, ({ Scenario }) => {
	Scenario('Delegate typed input and propagate results and errors', ({ Then }) => {
		Then('the operation uses its required repositories and preserves domain outcomes', async () => {
			const data = fakeDataSources();
			const repo = data.readonlyDataSource.Training.Course.CourseReadRepo;
			const course = { id: 'course-001', title: 'Course', summary: 'Summary', modality: 'online', status: 'active', tags: [], createdAt: '', updatedAt: '' } as const;
			vi.mocked(repo.getById).mockResolvedValue({ ...course, tags: [] });
			const save = vi.fn((item: Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequest) => Promise.resolve(item));
			vi.mocked(data.domainDataSource.Training.EnrollmentRequest.EnrollmentRequestUnitOfWork.withTransaction).mockImplementation(async (_passport, callback) => {
				await callback({ get: vi.fn(), save });
			});
			const result = await create(data)(input);
			expect(result).toMatchObject({ ...input, status: 'pending' });
			expect(result.id).toBeTruthy();
			expect(result.statusHistory).toHaveLength(1);
			expect(save).toHaveBeenCalledOnce();
			for (const status of ['draft', 'retired'] as const) {
				vi.mocked(repo.getById).mockResolvedValue({ ...course, status, tags: [] });
				await expect(create(data)(input)).rejects.toMatchObject({ code: 'COURSE_NOT_ACTIVE' });
			}
			vi.mocked(repo.getById).mockResolvedValue(null);
			await expect(create(data)(input)).rejects.toMatchObject({ code: 'COURSE_NOT_FOUND' });
			vi.mocked(repo.getById).mockResolvedValue({ ...course, tags: [] });
			vi.mocked(data.domainDataSource.Training.EnrollmentRequest.EnrollmentRequestUnitOfWork.withTransaction).mockRejectedValue(new E.EnrollmentError('DUPLICATE_ACTIVE_REQUEST'));
			await expect(create(data)(input)).rejects.toMatchObject({ code: 'DUPLICATE_ACTIVE_REQUEST' });
		});
	});
});
