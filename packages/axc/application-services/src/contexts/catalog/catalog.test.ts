import { DataSourcesFactoryImpl } from '@axc/persistence';
import { describe, expect, it } from 'vitest';
import { ApplicationError } from './errors.ts';
import { Catalog } from './index.ts';

const setup = () => Catalog(DataSourcesFactoryImpl().forRequest());
const valid = { courseId: 'course-001', learnerEmail: 'learner@example.org', justification: 'I need this course for secure development work.' };
async function errorCode(operation: () => Promise<unknown>, code: string) {
	await expect(operation()).rejects.toMatchObject({ code });
}
describe('catalog application services', () => {
	it('searches courses with filters, paging, sort and rejects bad queries', async () => {
		const catalog = setup();
		const first = await catalog.Course.list();
		expect(first.page).toBe(1);
		expect(first.pageSize).toBe(10);
		expect(first.totalItems).toBe(12);
		const found = await catalog.Course.list({ q: 'SECURITY', modality: 'online', status: 'active', tag: 'AI' });
		expect(found.items.map((item) => item.id)).toEqual(['course-001']);
		const page = await catalog.Course.list({ page: 2, pageSize: 5, sort: 'createdAt' });
		expect(page.items.map((item) => item.id)).toEqual(['course-006', 'course-007', 'course-008', 'course-009', 'course-010']);
		expect((await catalog.Course.list({ q: 'not in catalog' })).items).toEqual([]);
		expect((await catalog.Course.list({ q: 'ARCHITECTURE' })).items.map((item) => item.id)).toEqual(['course-002']);
		expect((await catalog.Course.list({ q: 'MENTORSHIP' })).items.map((item) => item.id)).toEqual(['course-004']);
		expect((await catalog.Course.list({ tag: 'BUSINESS' })).items.every((item) => item.tags.includes('business'))).toBe(true);
		await errorCode(() => catalog.Course.list({ pageSize: 51 }), 'INVALID_QUERY_PARAMETER');
		await errorCode(() => catalog.Course.list({ modality: 'virtual' }), 'INVALID_QUERY_PARAMETER');
		await errorCode(() => catalog.Course.list({ status: 'unknown' }), 'INVALID_QUERY_PARAMETER');
		await errorCode(() => catalog.Course.list({ page: 0 }), 'INVALID_QUERY_PARAMETER');
		await errorCode(() => catalog.Course.list({ sort: 'other' }), 'INVALID_QUERY_PARAMETER');
	});
	it('validates course and learner before creation and leaves state unchanged', async () => {
		const catalog = setup();
		await errorCode(() => catalog.EnrollmentRequest.create({ ...valid, courseId: 'missing' }), 'COURSE_NOT_FOUND');
		await errorCode(() => catalog.EnrollmentRequest.create({ ...valid, courseId: 'course-002' }), 'COURSE_NOT_ACTIVE');
		await errorCode(() => catalog.EnrollmentRequest.create({ ...valid, courseId: 'course-003' }), 'COURSE_NOT_ACTIVE');
		await errorCode(() => catalog.EnrollmentRequest.create({ ...valid, learnerEmail: 'bad' }), 'INVALID_REQUEST');
		await errorCode(() => catalog.EnrollmentRequest.create({ ...valid, justification: 'short' }), 'INVALID_REQUEST');
		expect(await catalog.EnrollmentRequest.list()).toEqual([]);
	});
	it('creates, retrieves, filters, prevents duplicates, transitions and audits', async () => {
		const catalog = setup();
		const created = await catalog.EnrollmentRequest.create(valid);
		expect(created).toMatchObject({ id: 'enroll-001', status: 'pending', courseId: valid.courseId, learnerEmail: valid.learnerEmail });
		expect(created.statusHistory).toMatchObject([{ fromStatus: null, toStatus: 'pending', changedBy: 'system', reason: null }]);
		await errorCode(() => catalog.EnrollmentRequest.create({ ...valid, learnerEmail: 'LEARNER@example.org' }), 'DUPLICATE_ACTIVE_REQUEST');
		expect((await catalog.EnrollmentRequest.getById(created.id)).statusHistory).toHaveLength(1);
		expect((await catalog.EnrollmentRequest.list({ status: 'pending', courseId: valid.courseId, learnerEmail: valid.learnerEmail })).map((item) => item.id)).toEqual([created.id]);
		expect(await catalog.EnrollmentRequest.list({ status: 'approved' })).toEqual([]);
		const approved = await catalog.EnrollmentRequest.updateStatus({ id: created.id, status: 'approved', changedBy: 'reviewer' });
		expect(approved.statusHistory[1]).toMatchObject({ fromStatus: 'pending', toStatus: 'approved', changedBy: 'reviewer' });
		await errorCode(() => catalog.EnrollmentRequest.create(valid), 'DUPLICATE_ACTIVE_REQUEST');
		await errorCode(() => catalog.EnrollmentRequest.updateStatus({ id: created.id, status: 'rejected', changedBy: 'reviewer', reason: 'No' }), 'INVALID_STATUS_TRANSITION');
		expect((await catalog.EnrollmentRequest.getById(created.id)).statusHistory).toHaveLength(2);
		const cancelled = await catalog.EnrollmentRequest.updateStatus({ id: created.id, status: 'cancelled', changedBy: 'reviewer' });
		expect(cancelled.statusHistory[2]).toMatchObject({ fromStatus: 'approved', toStatus: 'cancelled' });
		expect((await catalog.EnrollmentRequest.create(valid)).id).toBe('enroll-002');
	});
	it('applies each enrollment list filter independently', async () => {
		const catalog = setup();
		const matching = await catalog.EnrollmentRequest.create(valid);
		const anotherLearner = await catalog.EnrollmentRequest.create({ ...valid, learnerEmail: 'other@example.org' });
		const anotherCourse = await catalog.EnrollmentRequest.create({ ...valid, courseId: 'course-004' });
		await catalog.EnrollmentRequest.updateStatus({ id: anotherCourse.id, status: 'approved', changedBy: 'reviewer' });
		expect((await catalog.EnrollmentRequest.list({ status: 'pending' })).map((item) => item.id)).toEqual([matching.id, anotherLearner.id]);
		expect((await catalog.EnrollmentRequest.list({ courseId: 'course-001' })).map((item) => item.id)).toEqual([matching.id, anotherLearner.id]);
		expect((await catalog.EnrollmentRequest.list({ learnerEmail: valid.learnerEmail })).map((item) => item.id)).toEqual([matching.id, anotherCourse.id]);
		expect((await catalog.EnrollmentRequest.list({ status: 'pending', courseId: valid.courseId, learnerEmail: valid.learnerEmail })).map((item) => item.id)).toEqual([matching.id]);
		await errorCode(() => catalog.EnrollmentRequest.list({ status: 'unknown' }), 'INVALID_QUERY_PARAMETER');
	});
	it('requires rejection reason and supports pending rejection and cancellation', async () => {
		const catalog = setup();
		const first = await catalog.EnrollmentRequest.create(valid);
		await errorCode(() => catalog.EnrollmentRequest.updateStatus({ id: first.id, status: 'rejected', changedBy: 'reviewer' }), 'INVALID_REQUEST');
		expect((await catalog.EnrollmentRequest.getById(first.id)).status).toBe('pending');
		const rejected = await catalog.EnrollmentRequest.updateStatus({ id: first.id, status: 'rejected', changedBy: 'reviewer', reason: 'Prerequisite missing' });
		expect(rejected.statusHistory[1]).toMatchObject({ fromStatus: 'pending', toStatus: 'rejected', reason: 'Prerequisite missing' });
		const second = await catalog.EnrollmentRequest.create(valid);
		expect((await catalog.EnrollmentRequest.updateStatus({ id: second.id, status: 'cancelled', changedBy: 'learner' })).status).toBe('cancelled');
		await errorCode(() => catalog.EnrollmentRequest.getById('missing'), 'ENROLLMENT_REQUEST_NOT_FOUND');
		await errorCode(() => catalog.EnrollmentRequest.updateStatus({ id: 'missing', status: 'approved', changedBy: 'reviewer' }), 'ENROLLMENT_REQUEST_NOT_FOUND');
		await errorCode(() => catalog.EnrollmentRequest.updateStatus({ id: second.id, status: 'invalid', changedBy: 'reviewer' }), 'INVALID_REQUEST');
		expect(ApplicationError).toBeDefined();
	});
});
