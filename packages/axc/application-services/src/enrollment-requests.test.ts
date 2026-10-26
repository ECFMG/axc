import { describe, expect, it } from 'vitest';
import { buildApplicationServicesFactory } from './index.ts';

const services = () => buildApplicationServicesFactory({ environment: 'test' }).forRequest();
const valid = { courseId: 'course-001', learnerEmail: 'learner@example.org', justification: 'I need this course for secure development work.' };
const code = (promise: Promise<unknown>) =>
	promise.then(
		() => 'OK',
		(error: { code: string }) => error.code,
	);

describe('enrollment request service', () => {
	it('creates a pending request with an audit entry, retrievable by id', async () => {
		const { enrollmentRequests } = await services();
		const created = await enrollmentRequests.create(valid);
		expect(created).toMatchObject({ id: 'enroll-001', status: 'pending', statusHistory: [{ fromStatus: null, toStatus: 'pending', changedBy: 'system' }] });
		expect(await enrollmentRequests.getById(created.id)).toEqual(created);
	});

	it('maps course and input failures to error codes', async () => {
		const { enrollmentRequests } = await services();
		expect(await code(enrollmentRequests.create({ ...valid, courseId: 'course-999' }))).toBe('COURSE_NOT_FOUND');
		expect(await code(enrollmentRequests.create({ ...valid, courseId: 'course-005' }))).toBe('COURSE_NOT_ACTIVE');
		expect(await code(enrollmentRequests.create({ ...valid, courseId: 'course-006' }))).toBe('COURSE_NOT_ACTIVE');
		expect(await code(enrollmentRequests.create({ ...valid, learnerEmail: 'bad' }))).toBe('INVALID_REQUEST');
		expect(await code(enrollmentRequests.create({ ...valid, justification: 'too short' }))).toBe('INVALID_REQUEST');
		expect(await code(enrollmentRequests.create({ ...valid, courseId: undefined }))).toBe('INVALID_REQUEST');
		expect(await code(enrollmentRequests.create(null))).toBe('INVALID_REQUEST');
		expect(await code(enrollmentRequests.getById('enroll-404'))).toBe('ENROLLMENT_REQUEST_NOT_FOUND');
		expect(await code(enrollmentRequests.list({ status: 'nope' }))).toBe('INVALID_REQUEST');
	});

	it('blocks duplicates while pending or approved, allows a new request after cancellation', async () => {
		const { enrollmentRequests } = await services();
		const first = await enrollmentRequests.create(valid);
		expect(await code(enrollmentRequests.create({ ...valid, learnerEmail: 'LEARNER@example.org' }))).toBe('DUPLICATE_ACTIVE_REQUEST');
		await enrollmentRequests.changeStatus(first.id, { status: 'approved', changedBy: 'reviewer@example.org' });
		expect(await code(enrollmentRequests.create(valid))).toBe('DUPLICATE_ACTIVE_REQUEST');
		const cancelled = await enrollmentRequests.changeStatus(first.id, { status: 'cancelled', changedBy: 'reviewer@example.org' });
		expect(cancelled.statusHistory.map((e) => e.toStatus)).toEqual(['pending', 'approved', 'cancelled']);
		expect(await code(enrollmentRequests.changeStatus(first.id, { status: 'approved', changedBy: 'r' }))).toBe('INVALID_STATUS_TRANSITION');
		expect((await enrollmentRequests.create(valid)).status).toBe('pending');
	});

	it('filters the list', async () => {
		const { enrollmentRequests } = await services();
		await enrollmentRequests.create(valid);
		const other = await enrollmentRequests.create({ ...valid, courseId: 'course-002', learnerEmail: 'other@example.org' });
		await enrollmentRequests.changeStatus(other.id, { status: 'rejected', changedBy: 'r', reason: 'Missing prerequisite.' });
		expect((await enrollmentRequests.list({})).length).toBe(2);
		expect((await enrollmentRequests.list({ status: 'rejected' })).map((r) => r.id)).toEqual([other.id]);
		expect((await enrollmentRequests.list({ courseId: 'course-001' })).map((r) => r.courseId)).toEqual(['course-001']);
		expect((await enrollmentRequests.list({ learnerEmail: 'other@example.org', status: 'pending' })).length).toBe(0);
	});
});
