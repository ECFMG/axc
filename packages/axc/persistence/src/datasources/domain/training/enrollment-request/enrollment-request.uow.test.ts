import { Training } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { createStore } from '../../../store.ts';
import { EnrollmentRequestUnitOfWork } from './enrollment-request.uow.ts';

describe('EnrollmentRequestUnitOfWork', () => {
	it('commits successful work and rolls back an exception', async () => {
		const store = createStore();
		const uow = new EnrollmentRequestUnitOfWork(store);
		const create = async (fail: boolean) =>
			uow.withScopedTransaction(async (repo) => {
				await repo.save(await repo.getNewInstance('course-001', new Training.EnrollmentRequest.LearnerEmail('a@example.org'), new Training.EnrollmentRequest.Justification('x'.repeat(20)), 't1'));
				if (fail) throw new Error('rollback');
			});
		await expect(create(true)).rejects.toThrow('rollback');
		expect(store.requests).toHaveLength(0);
		await create(false);
		expect(store.requests).toHaveLength(1);
	});
	it('serializes concurrent duplicate checks', async () => {
		const store = createStore();
		const uow = new EnrollmentRequestUnitOfWork(store);
		const operation = () =>
			uow.withScopedTransaction(async (repo) => {
				if (await repo.hasActive('course-001', 'a@example.org')) throw new Error('duplicate');
				await new Promise((resolve) => setTimeout(resolve, 5));
				await repo.save(await repo.getNewInstance('course-001', new Training.EnrollmentRequest.LearnerEmail('a@example.org'), new Training.EnrollmentRequest.Justification('x'.repeat(20)), 't1'));
			});
		const results = await Promise.allSettled([operation(), operation()]);
		expect(results.map((item) => item.status).sort()).toEqual(['fulfilled', 'rejected']);
		expect(store.requests).toHaveLength(1);
	});
});
