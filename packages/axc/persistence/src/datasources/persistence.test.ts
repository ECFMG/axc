import { describe, expect, it } from 'vitest';
import { Persistence } from '../index.ts';

describe('in-memory persistence', () => {
	it('B7 serializes writes, rolls back failures, and copies records', async () => {
		const sources = Persistence().withSystemPassport();
		const uow = sources.domainDataSource.Catalog.EnrollmentRequest.EnrollmentRequestUow;
		const read = sources.readonlyDataSource.Catalog.EnrollmentRequest.EnrollmentRequestReadRepo;
		const input = { courseId: 'course-001', learnerEmail: 'learner@example.org', justification: 'A sufficiently long justification for this course.' };
		let id = '';
		await uow.withScopedTransaction(async (repo) => {
			const entity = await repo.getNewInstance(input);
			id = entity.id;
			await repo.save(entity);
			entity.props.statusHistory.length = 0;
		});
		const item = await read.getById(id);
		expect(item?.statusHistory).toHaveLength(1);
		if (item) {
			item.status = 'rejected';
			item.statusHistory.length = 0;
		}
		expect((await read.getById(id))?.status).toBe('pending');
		expect((await read.list({}))[0]?.statusHistory).toHaveLength(1);
		await expect(
			uow.withScopedTransaction(async (repo) => {
				const entity = await repo.getById(id);
				entity.changeStatus({ status: 'approved', changedBy: 'reviewer' });
				await repo.save(entity);
				throw new Error('rollback');
			}),
		).rejects.toThrow('rollback');
		expect((await read.getById(id))?.status).toBe('pending');
		expect((await read.getById(id))?.statusHistory).toHaveLength(1);
		await expect(
			uow.withScopedTransaction(async (repo) => {
				await repo.getById('missing');
			}),
		).rejects.toThrow('not found');
		await uow.withTransaction({}, async (repo) => {
			const entity = await repo.get(id);
			entity.changeStatus({ status: 'approved', changedBy: 'reviewer' });
			await repo.save(entity);
		});
		expect((await read.getById(id))?.status).toBe('approved');
		await uow.withScopedTransactionById(id, async (repo) => {
			const entity = await repo.getById(id);
			entity.changeStatus({ status: 'cancelled', changedBy: 'reviewer' });
			await repo.save(entity);
		});
		expect((await read.getById(id))?.status).toBe('cancelled');
		expect(await read.getById('missing')).toBeUndefined();
		expect(await read.list({ status: 'rejected' })).toEqual([]);
	});
	it('A2 returns copies of seed courses', async () => {
		const repo = Persistence().withSystemPassport().readonlyDataSource.Catalog.Course.CourseReadRepo;
		const course = await repo.getById('course-001');
		if (course) {
			course.tags.length = 0;
			course.status = 'retired';
		}
		expect((await repo.getById('course-001'))?.tags).toEqual(['ai', 'security']);
		expect((await repo.getById('course-001'))?.status).toBe('active');
	});
});
