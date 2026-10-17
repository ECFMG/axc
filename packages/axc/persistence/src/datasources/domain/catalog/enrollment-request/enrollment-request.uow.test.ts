import { Catalog } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { createStore } from '../../../store.ts';
import { getEnrollmentRequestUnitOfWork } from './enrollment-request.uow.ts';

describe('EnrollmentRequestUnitOfWork', () => {
	it('commits and rolls back mutations', async () => {
		const store = createStore();
		const uow = getEnrollmentRequestUnitOfWork(store);
		await uow.withScopedTransaction(async (repo) => {
			const request = await repo.getNewInstance('course-001', new Catalog.EnrollmentRequest.LearnerEmail('a@example.org'), new Catalog.EnrollmentRequest.Justification('A sufficiently long reason.'), '2026-01-01T00:00:00.000Z');
			await repo.save(request);
		});
		expect(store.requests.size).toBe(1);
		await expect(
			uow.withScopedTransaction(async (repo) => {
				const request = await repo.get('enroll-001');
				request.transition('approved', 'reviewer', undefined, '2026-01-02T00:00:00.000Z');
				await repo.save(request);
				throw new Error('fail');
			}),
		).rejects.toThrow('fail');
		expect(store.requests.get('enroll-001')?.status).toBe('pending');
	});
	it('serializes concurrent transactions', async () => {
		const store = createStore();
		const uow = getEnrollmentRequestUnitOfWork(store);
		const order: string[] = [];
		await Promise.all([
			uow.withScopedTransaction(async () => {
				order.push('first-start');
				await new Promise((resolve) => setTimeout(resolve, 10));
				order.push('first-end');
			}),
			uow.withScopedTransaction(() => {
				order.push('second');
				return Promise.resolve();
			}),
		]);
		expect(order).toEqual(['first-start', 'first-end', 'second']);
	});
});
