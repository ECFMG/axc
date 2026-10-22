import { ServiceMongoose } from '@axc/service-mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type DataSources, Persistence } from './index.ts';

// Runs the persistence layer against the same seeded in-process replica set the API uses locally,
// so Mongo filters, sorting, transactions, and indexes are exercised for real.

const service = new ServiceMongoose({ connectionString: undefined, dbName: 'persistence-integration', allowInMemory: true });
let dataSources: DataSources;

beforeAll(async () => {
	await service.startUp();
	dataSources = Persistence(service).withSystemPassport();
}, 120_000);

afterAll(async () => {
	await service.shutDown();
});

const courses = () => dataSources.readonlyDataSource.Catalog.Course.CourseReadRepo;
const requests = () => dataSources.readonlyDataSource.Enrollment.EnrollmentRequest.EnrollmentRequestReadRepo;
const unitOfWork = () => dataSources.domainDataSource.Enrollment.EnrollmentRequest.EnrollmentRequestUnitOfWork;
const search = (criteria: Partial<Parameters<ReturnType<typeof courses>['search']>[0]> = {}) => courses().search({ page: 1, pageSize: 50, sort: 'title', ...criteria });

const SECURITY_COURSE_ID = '650000000000000000000001';
const DRAFT_COURSE_ID = '650000000000000000000010';
const justification = 'I need this course to prepare for upcoming secure development work.';

async function createRequest(courseId: string, learnerEmail: string): Promise<string> {
	const course = await courses().getById(courseId);
	if (!course) {
		throw new Error(`seed course ${courseId} missing`);
	}
	let id = '';
	await unitOfWork().withScopedTransaction(async (repo) => {
		id = (await repo.save(await repo.getNewInstance({ course, learnerEmail, justification }))).id;
	});
	return id;
}

describe('course read repository (seeded catalog)', () => {
	it('B-AC1 seeds at least 12 courses with every modality and status', async () => {
		const { items, totalItems } = await search();
		expect(totalItems).toBeGreaterThanOrEqual(12);
		expect(new Set(items.map((course) => course.modality))).toStrictEqual(new Set(['online', 'in-person', 'hybrid']));
		expect(new Set(items.map((course) => course.status))).toStrictEqual(new Set(['draft', 'active', 'retired']));
	});

	it('B-AC1 matches q case-insensitively across title, summary, and tags', async () => {
		const { items } = await search({ q: 'SECURITY' });
		expect(items.length).toBeGreaterThan(0);
		for (const course of items) {
			expect(`${course.title} ${course.summary} ${course.tags.join(' ')}`.toLowerCase()).toContain('security');
		}
		// "Threat Modeling for Teams" mentions security only through its tags.
		expect(items.map((course) => course.title)).toContain('Threat Modeling for Teams');
		// Regex metacharacters are matched literally.
		expect((await search({ q: '.*' })).totalItems).toBe(0);
	});

	it('B-AC1 filters by modality, status, and tag (case-insensitive), alone and combined', async () => {
		expect((await search({ modality: 'online' })).items.every((course) => course.modality === 'online')).toBe(true);
		expect((await search({ status: 'active' })).items.every((course) => course.status === 'active')).toBe(true);
		const tagged = await search({ tag: 'AI' });
		expect(tagged.items.length).toBeGreaterThan(0);
		expect(tagged.items.every((course) => course.tags.includes('ai'))).toBe(true);

		const combined = await search({ q: 'security', modality: 'online', status: 'active' });
		expect(combined.items.map((course) => course.title)).toStrictEqual(['AI Security Foundations', 'Secure Coding in TypeScript']);
		expect((await search({ q: 'no-such-course-keyword' })).items).toStrictEqual([]);
	});

	it('B-AC1 pages and sorts', async () => {
		const all = await search();
		const firstPage = await search({ page: 1, pageSize: 5 });
		const thirdPage = await search({ page: 3, pageSize: 5 });
		expect(firstPage.items).toHaveLength(5);
		expect(firstPage.totalItems).toBe(all.totalItems);
		expect(thirdPage.items.map((course) => course.id)).toStrictEqual(all.items.slice(10, 15).map((course) => course.id));

		const titles = all.items.map((course) => course.title);
		expect(titles).toStrictEqual([...titles].sort((a, b) => a.localeCompare(b)));
		const created = (await search({ sort: 'createdAt' })).items.map((course) => course.createdAt.getTime());
		expect(created).toStrictEqual([...created].sort((a, b) => a - b));
		const updated = (await search({ sort: 'updatedAt' })).items.map((course) => course.updatedAt.getTime());
		expect(updated).toStrictEqual([...updated].sort((a, b) => a - b));
	});

	it('keeps seeded timestamps and resolves courses by id', async () => {
		const course = await courses().getById(SECURITY_COURSE_ID);
		expect(course).toMatchObject({ title: 'AI Security Foundations', status: 'active', createdAt: new Date('2026-01-15T00:00:00.000Z'), updatedAt: new Date('2026-06-01T00:00:00.000Z') });
		expect(await courses().getById('650000000000000000000999')).toBeNull();
		expect(await courses().getById('course-001')).toBeNull();
	});
});

describe('enrollment request persistence', () => {
	it('B-AC2 B-AC7 B-AC12 saves a pending request with its creation history and reads it back', async () => {
		const id = await createRequest(SECURITY_COURSE_ID, 'Persisted@Example.org');
		const stored = await requests().getById(id);

		expect(stored).toMatchObject({ id, courseId: SECURITY_COURSE_ID, learnerEmail: 'persisted@example.org', justification, status: 'pending' });
		expect(stored?.statusHistory).toStrictEqual([{ fromStatus: null, toStatus: 'pending', changedAt: expect.any(Date), changedBy: 'system', reason: null }]);
		expect(await requests().getById('not-an-object-id')).toBeNull();
	});

	it('B-AC6 detects active requests and the unique index refuses a second active one', async () => {
		await createRequest(SECURITY_COURSE_ID, 'dup@example.org');
		expect(await requests().hasActiveRequest(SECURITY_COURSE_ID, 'DUP@example.org')).toBe(true);
		expect(await requests().hasActiveRequest(SECURITY_COURSE_ID, 'other@example.org')).toBe(false);

		await expect(createRequest(SECURITY_COURSE_ID, 'dup@example.org')).rejects.toMatchObject({ code: 11000 });
	});

	it('B-AC4 refuses a draft course inside the aggregate', async () => {
		await expect(createRequest(DRAFT_COURSE_ID, 'draft@example.org')).rejects.toThrow('not active');
	});

	it('B-AC9 B-AC12 persists status changes and their history; a rejected request frees the learner to apply again', async () => {
		const id = await createRequest(SECURITY_COURSE_ID, 'reviewed@example.org');
		await unitOfWork().withScopedTransaction(async (repo) => {
			const request = await repo.get(id);
			request.changeStatus({ status: 'rejected', changedBy: 'reviewer@example.org', reason: 'Prerequisite missing.' });
			await repo.save(request);
		});

		const stored = await requests().getById(id);
		expect(stored?.status).toBe('rejected');
		expect(stored?.statusHistory.map((entry) => [entry.fromStatus, entry.toStatus, entry.changedBy, entry.reason])).toStrictEqual([
			[null, 'pending', 'system', null],
			['pending', 'rejected', 'reviewer@example.org', 'Prerequisite missing.'],
		]);
		expect(await requests().hasActiveRequest(SECURITY_COURSE_ID, 'reviewed@example.org')).toBe(false);
		await expect(createRequest(SECURITY_COURSE_ID, 'reviewed@example.org')).resolves.toMatch(/^[a-f\d]{24}$/);
	});

	it('B-AC8 filters requests by status, courseId, and learnerEmail', async () => {
		const otherCourse = '650000000000000000000002';
		await createRequest(otherCourse, 'filter-a@example.org');
		await createRequest(otherCourse, 'filter-b@example.org');

		const byCourse = await requests().search({ courseId: otherCourse, page: 1, pageSize: 50 });
		expect(byCourse.items.map((item) => item.learnerEmail)).toStrictEqual(['filter-a@example.org', 'filter-b@example.org']);
		const byEmail = await requests().search({ learnerEmail: 'FILTER-B@example.org', page: 1, pageSize: 50 });
		expect(byEmail.items.map((item) => item.courseId)).toStrictEqual([otherCourse]);
		expect((await requests().search({ status: 'rejected', page: 1, pageSize: 50 })).items.every((item) => item.status === 'rejected')).toBe(true);
		expect((await requests().search({ status: 'approved', courseId: otherCourse, page: 1, pageSize: 50 })).totalItems).toBe(0);
	});
});
