import { describe, expect, it } from 'vitest';
import { Persistence } from './index.ts';

describe('in-memory transaction isolation', () => {
	it('copies reads and writes and rolls back failed transactions', async () => {
		const sources = Persistence().withSystemPassport();
		const uow = sources.domainDataSource.Catalog.EnrollmentRequest;
		let id = '';
		await uow.withScopedTransaction(async (repo) => {
			const entity = await repo.getNewInstance({ courseId: 'course-001', learnerEmail: 'a@example.org', justification: 'Training needed for upcoming work.' });
			id = entity.id;
			await repo.save(entity);
			entity.props.justification = 'mutated';
		});
		const reader = sources.readonlyDataSource.Catalog.EnrollmentRequest;
		const first = await reader.getById(id);
		expect(first?.justification).toBe('Training needed for upcoming work.');
		if (!first) throw new Error('Missing request');
		first.statusHistory.length = 0;
		expect((await reader.getById(id))?.statusHistory).toHaveLength(1);
		await expect(
			uow.withScopedTransaction(async (repo) => {
				const entity = await repo.get(id);
				entity.changeStatus({ status: 'approved', changedBy: 'reviewer' });
				await repo.save(entity);
				throw new Error('rollback');
			}),
		).rejects.toThrow('rollback');
		expect((await reader.getById(id))?.status).toBe('pending');
		expect((await reader.getById(id))?.statusHistory).toHaveLength(1);
	});
	it('copies course fixtures', async () => {
		const repo = Persistence().withSystemPassport().readonlyDataSource.Catalog.Course.CourseReadRepo;
		const c = await repo.getById('course-001');
		if (!c) throw new Error('Missing course');
		c.tags.length = 0;
		expect((await repo.getById(c.id))?.tags).toEqual(['ai', 'security']);
	});
});
