import { EnrollmentRequest, type EnrollmentRequestProps, Justification, LearnerEmail } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { InMemoryEnrollmentRequestUnitOfWork } from './enrollment-request.uow.ts';

const make = (id: string) => EnrollmentRequest.getNewInstance(id, 'course-001', new LearnerEmail('a@example.org'), new Justification('A valid reason for this course.'), '2026-01-01T00:00:00.000Z');
describe('in-memory enrollment unit of work', () => {
	it('commits successful writes and rolls back an exception', async () => {
		const records = new Map<string, EnrollmentRequestProps>();
		const uow = new InMemoryEnrollmentRequestUnitOfWork(records);
		await uow.withScopedTransaction(async (repo) => {
			await repo.save(make('one'));
		});
		await expect(
			uow.withScopedTransaction(async (repo) => {
				await repo.save(make('two'));
				throw new Error('rollback');
			}),
		).rejects.toThrow('rollback');
		expect([...records.keys()]).toEqual(['one']);
	});
	it('serializes concurrent transactions and copies saved state', async () => {
		const records = new Map<string, EnrollmentRequestProps>();
		const uow = new InMemoryEnrollmentRequestUnitOfWork(records);
		const order: string[] = [];
		await Promise.all([
			uow.withScopedTransaction(async (repo) => {
				order.push('first-start');
				await new Promise((resolve) => setTimeout(resolve, 10));
				await repo.save(make('one'));
				order.push('first-end');
			}),
			uow.withScopedTransaction(async (repo) => {
				order.push('second-start');
				expect(await repo.getById('one')).not.toBeNull();
				order.push('second-end');
			}),
		]);
		expect(order).toEqual(['first-start', 'first-end', 'second-start', 'second-end']);
		await uow.withScopedTransaction(async (repo) => {
			const loaded = await repo.get('one');
			loaded.props.statusHistory.push({ fromStatus: 'pending', toStatus: 'approved', changedAt: '', changedBy: '', reason: null });
		});
		expect(records.get('one')?.statusHistory).toHaveLength(1);
		await uow.withScopedTransaction(async (repo) => {
			const loaded = await repo.get('one');
			await repo.save(loaded);
			loaded.props.statusHistory.push({ fromStatus: 'pending', toStatus: 'approved', changedAt: '', changedBy: '', reason: null });
		});
		expect(records.get('one')?.statusHistory).toHaveLength(1);
	});
});
