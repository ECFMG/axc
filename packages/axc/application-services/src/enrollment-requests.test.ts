import { InMemoryCourseRepository, InMemoryEnrollmentRequestRepository } from '@axc/persistence';
import { describe, expect, it } from 'vitest';
import { enrollmentRequestServices } from './enrollment-requests.ts';

const justification = 'I need this course to prepare for secure development work.';
const fresh = () => enrollmentRequestServices(new InMemoryCourseRepository(), new InMemoryEnrollmentRequestRepository());
const body = (overrides: Record<string, unknown> = {}) => ({ courseId: 'course-001', learnerEmail: 'learner@example.org', justification, ...overrides });

describe('enrollment requests', () => {
	it('creates a pending request with a creation history entry', async () => {
		const created = await fresh().create(body());
		expect(created).toMatchObject({ id: 'enroll-001', courseId: 'course-001', status: 'pending', statusHistory: [{ fromStatus: null, toStatus: 'pending', changedBy: 'system', reason: null }] });
	});

	it.each([
		[{ courseId: 'course-999' }, 'COURSE_NOT_FOUND'],
		[{ courseId: 'course-006' }, 'COURSE_NOT_ACTIVE'],
		[{ courseId: 'course-005' }, 'COURSE_NOT_ACTIVE'],
		[{ learnerEmail: 'not-an-email' }, 'INVALID_REQUEST'],
		[{ justification: 'too short' }, 'INVALID_REQUEST'],
		[{ courseId: undefined }, 'INVALID_REQUEST'],
	])('rejects %o with %s', async (overrides, code) => {
		await expect(fresh().create(body(overrides))).rejects.toMatchObject({ code });
	});

	it('rejects non-object bodies', async () => {
		await expect(fresh().create(null)).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
	});

	it('prevents duplicate pending and approved requests, allows after cancel/reject', async () => {
		const svc = fresh();
		const first = await svc.create(body());
		await expect(svc.create(body({ learnerEmail: 'LEARNER@example.org' }))).rejects.toMatchObject({ code: 'DUPLICATE_ACTIVE_REQUEST' });
		await svc.changeStatus(first.id, { status: 'approved', changedBy: 'rev' });
		await expect(svc.create(body())).rejects.toMatchObject({ code: 'DUPLICATE_ACTIVE_REQUEST' });
		await svc.changeStatus(first.id, { status: 'cancelled', changedBy: 'rev' });
		const second = await svc.create(body());
		await svc.changeStatus(second.id, { status: 'rejected', changedBy: 'rev', reason: 'No prerequisite.' });
		await expect(svc.create(body())).resolves.toMatchObject({ status: 'pending' });
	});

	it('retrieves by id with status history and 404s on unknown ids', async () => {
		const svc = fresh();
		const created = await svc.create(body());
		await expect(svc.getById(created.id)).resolves.toEqual(created);
		await expect(svc.getById('enroll-999')).rejects.toMatchObject({ code: 'ENROLLMENT_REQUEST_NOT_FOUND' });
		await expect(svc.changeStatus('enroll-999', { status: 'approved', changedBy: 'rev' })).rejects.toMatchObject({ code: 'ENROLLMENT_REQUEST_NOT_FOUND' });
	});

	it('lists with status, courseId and learnerEmail filters', async () => {
		const svc = fresh();
		const a = await svc.create(body());
		const b = await svc.create(body({ courseId: 'course-002' }));
		const c = await svc.create(body({ learnerEmail: 'other@example.org' }));
		await svc.changeStatus(b.id, { status: 'approved', changedBy: 'rev' });
		const ids = async (q: Record<string, string>) => (await svc.list(q)).map((r) => r.id);
		expect(await ids({})).toEqual([a.id, b.id, c.id]);
		expect(await ids({ status: 'approved' })).toEqual([b.id]);
		expect(await ids({ courseId: 'course-001' })).toEqual([a.id, c.id]);
		expect(await ids({ learnerEmail: 'other@example.org' })).toEqual([c.id]);
		expect(await ids({ status: 'pending', courseId: 'course-001', learnerEmail: 'learner@example.org' })).toEqual([a.id]);
		await expect(svc.list({ status: 'bogus' })).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
	});

	it('applies transitions, appends audit history, and enforces rules', async () => {
		const svc = fresh();
		const { id } = await svc.create(body());
		await expect(svc.changeStatus(id, { status: 'rejected', changedBy: 'rev' })).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
		await expect(svc.changeStatus(id, { status: 'done', changedBy: 'rev' })).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
		const approved = await svc.changeStatus(id, { status: 'approved', changedBy: 'reviewer@example.org' });
		expect(approved.statusHistory.map((h) => [h.fromStatus, h.toStatus, h.changedBy])).toEqual([
			[null, 'pending', 'system'],
			['pending', 'approved', 'reviewer@example.org'],
		]);
		await expect(svc.changeStatus(id, { status: 'pending', changedBy: 'rev' })).rejects.toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
		const cancelled = await svc.changeStatus(id, { status: 'cancelled', changedBy: 'rev' });
		expect(cancelled.statusHistory).toHaveLength(3);
		await expect(svc.changeStatus(id, { status: 'approved', changedBy: 'rev' })).rejects.toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
	});
});
