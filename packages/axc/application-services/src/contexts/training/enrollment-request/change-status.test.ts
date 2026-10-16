import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { Domain } from '@axc/domain';
import { expect, vi } from 'vitest';
import { fakeDataSources } from '../../../test-data-sources.ts';
import { changeStatus } from './change-status.ts';

const feature = await loadFeature(new URL('./features/change-status.feature', import.meta.url).pathname);
const E = Domain.Contexts.Training.EnrollmentRequest;
const input = { courseId: 'course-001', learnerEmail: 'learner@example.org', justification: 'I need this course for my work.' };
describeFeature(feature, ({ Scenario }) => {
	Scenario('Delegate typed input and propagate results and errors', ({ Then }) => {
		Then('the operation uses its required repositories and preserves domain outcomes', async () => {
			const data = fakeDataSources();
			const item = E.EnrollmentRequest.create('id', input, { status: 'active' }, new Date().toISOString());
			const save = vi.fn((value: Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequest) => Promise.resolve(value));
			const get = vi.fn(() => Promise.resolve(item));
			vi.mocked(data.domainDataSource.Training.EnrollmentRequest.EnrollmentRequestUnitOfWork.withTransaction).mockImplementation(async (_passport, callback) => {
				await callback({ get, save });
			});
			const result = await changeStatus(data)('id', { status: 'approved', changedBy: 'reviewer' });
			expect(result.status).toBe('approved');
			expect(result.statusHistory).toHaveLength(2);
			expect(get).toHaveBeenCalledWith('id');
			expect(save).toHaveBeenCalledOnce();
			await expect(changeStatus(data)('id', { status: 'rejected', changedBy: 'reviewer', reason: 'Not eligible' })).rejects.toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
			vi.mocked(data.domainDataSource.Training.EnrollmentRequest.EnrollmentRequestUnitOfWork.withTransaction).mockRejectedValue(new E.EnrollmentError('ENROLLMENT_REQUEST_NOT_FOUND'));
			await expect(changeStatus(data)('missing', { status: 'approved', changedBy: 'reviewer' })).rejects.toMatchObject({ code: 'ENROLLMENT_REQUEST_NOT_FOUND' });
			vi.mocked(data.domainDataSource.Training.EnrollmentRequest.EnrollmentRequestUnitOfWork.withTransaction).mockResolvedValue(undefined);
			await expect(changeStatus(data)('id', { status: 'approved', changedBy: 'reviewer' })).rejects.toThrow('did not produce a result');
		});
	});
});
