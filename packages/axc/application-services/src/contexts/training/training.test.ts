import { createDataSourcesFactory } from '@axc/persistence';
import { describe, expect, it } from 'vitest';
import { Training } from './index.ts';

const service = () => Training(createDataSourcesFactory().withPassport());
const command = { courseId: 'course-001', learnerEmail: 'A@Example.org', justification: 'I need this course for secure development work.' };
describe('training application services', () => {
	it('searches two distinct combined course filters with exact results', async () => {
		const courses = service().Course;
		expect((await courses.search({ q: 'SECURITY', modality: 'online', status: 'active' })).items.map((x) => x.id)).toEqual(['course-001']);
		expect((await courses.search({ q: 'cloud', modality: 'in-person', status: 'active', tag: 'security' })).items.map((x) => x.id)).toEqual(['course-002']);
	});
	it('paginates, sorts, and rejects invalid search directly', async () => {
		const courses = service().Course;
		const page = await courses.search({ page: 2, pageSize: 5, sort: 'createdAt' });
		expect(page.items.map((x) => x.id)).toEqual(['course-006', 'course-007', 'course-008', 'course-009', 'course-010']);
		expect(page.totalItems).toBe(12);
		await expect(courses.search({ pageSize: 51 })).rejects.toMatchObject({ code: 'INVALID_QUERY_PARAMETER' });
	});
	it('creates a pending request with audit and retrieves it', async () => {
		const enroll = service().EnrollmentRequest;
		const created = await enroll.create(command);
		expect(created).toMatchObject({ courseId: 'course-001', learnerEmail: 'a@example.org', status: 'pending' });
		expect(created.statusHistory).toEqual([{ fromStatus: null, toStatus: 'pending', changedAt: created.createdAt, changedBy: 'system', reason: null }]);
		expect(await enroll.getById({ id: created.id })).toEqual(created);
	});
	it('rejects missing, draft and retired courses', async () => {
		const enroll = service().EnrollmentRequest;
		await expect(enroll.create({ ...command, courseId: 'missing' })).rejects.toMatchObject({ code: 'COURSE_NOT_FOUND' });
		await expect(enroll.create({ ...command, courseId: 'course-003' })).rejects.toMatchObject({ code: 'COURSE_NOT_ACTIVE' });
		await expect(enroll.create({ ...command, courseId: 'course-006' })).rejects.toMatchObject({ code: 'COURSE_NOT_ACTIVE' });
		expect(await enroll.list({})).toEqual([]);
	});
	it('rejects invalid email and justification without writes', async () => {
		const enroll = service().EnrollmentRequest;
		await expect(enroll.create({ ...command, learnerEmail: 'bad@' })).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
		await expect(enroll.create({ ...command, justification: 'too short' })).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
		expect(await enroll.list({})).toEqual([]);
	});
	it('prevents duplicates while pending and approved, allowing a new request after cancellation', async () => {
		const enroll = service().EnrollmentRequest;
		const first = await enroll.create(command);
		await expect(enroll.create(command)).rejects.toMatchObject({ code: 'DUPLICATE_ACTIVE_REQUEST' });
		await enroll.updateStatus({ id: first.id, status: 'approved', changedBy: 'reviewer' });
		await expect(enroll.create(command)).rejects.toMatchObject({ code: 'DUPLICATE_ACTIVE_REQUEST' });
		await enroll.updateStatus({ id: first.id, status: 'cancelled', changedBy: 'reviewer' });
		expect((await enroll.create(command)).status).toBe('pending');
	});
	it('filters each field and combines all filters', async () => {
		const enroll = service().EnrollmentRequest;
		const first = await enroll.create(command);
		const second = await enroll.create({ ...command, courseId: 'course-002', learnerEmail: 'b@example.org' });
		await enroll.updateStatus({ id: second.id, status: 'rejected', changedBy: 'reviewer', reason: 'No prerequisite' });
		expect((await enroll.list({ status: 'pending' })).map((x) => x.id)).toEqual([first.id]);
		expect((await enroll.list({ courseId: 'course-002' })).map((x) => x.id)).toEqual([second.id]);
		expect((await enroll.list({ learnerEmail: 'A@EXAMPLE.ORG' })).map((x) => x.id)).toEqual([first.id]);
		expect((await enroll.list({ status: 'pending', courseId: 'course-001', learnerEmail: 'a@example.org' })).map((x) => x.id)).toEqual([first.id]);
	});
	it('maps missing and invalid transitions to application failures without state change', async () => {
		const enroll = service().EnrollmentRequest;
		await expect(enroll.getById({ id: 'missing' })).rejects.toMatchObject({ code: 'ENROLLMENT_REQUEST_NOT_FOUND' });
		const created = await enroll.create(command);
		await expect(enroll.updateStatus({ id: created.id, status: 'pending', changedBy: 'reviewer' })).rejects.toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
		await expect(enroll.updateStatus({ id: created.id, status: 'rejected', changedBy: 'reviewer' })).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
		expect(await enroll.getById({ id: created.id })).toEqual(created);
	});
});
