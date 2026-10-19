import type { Course, EnrollmentRequest } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { type ApiContext, buildApplicationServicesFactory, CatalogError } from './index.ts';

const justification = 'I need this course to prepare for upcoming secure development work.';

function course(overrides: Partial<Course> = {}): Course {
	return {
		id: 'course-001',
		title: 'AI Security Foundations',
		summary: 'Introductory course on secure AI-assisted development.',
		modality: 'online',
		status: 'active',
		tags: ['ai', 'security'],
		createdAt: '2026-01-15T00:00:00.000Z',
		updatedAt: '2026-06-01T00:00:00.000Z',
		...overrides,
	};
}

function enrollmentBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return { courseId: 'course-001', learnerEmail: 'learner@example.org', justification, ...overrides };
}

function memoryContext(courses: readonly Course[]): ApiContext {
	const storedCourses = courses.map((item) => ({ ...item, tags: [...item.tags] }));
	const requests: EnrollmentRequest[] = [];
	let sequence = 1;
	return {
		environment: 'test',
		courses: {
			list: () => Promise.resolve(storedCourses.map((item) => ({ ...item, tags: [...item.tags] }))),
			findById: (id) => {
				const found = storedCourses.find((item) => item.id === id);
				return Promise.resolve(found === undefined ? undefined : { ...found, tags: [...found.tags] });
			},
		},
		enrollmentRequests: {
			list: () => Promise.resolve(requests.map(cloneRequest)),
			findById: (id) => {
				const found = requests.find((item) => item.id === id);
				return Promise.resolve(found === undefined ? undefined : cloneRequest(found));
			},
			insert: (request) => {
				requests.push(cloneRequest(request));
				return Promise.resolve();
			},
			replace: (request) => {
				const index = requests.findIndex((item) => item.id === request.id);
				if (index === -1) {
					return Promise.reject(new Error('Enrollment request not found.'));
				}
				requests[index] = cloneRequest(request);
				return Promise.resolve();
			},
			nextId: () => {
				const id = `enroll-${String(sequence).padStart(3, '0')}`;
				sequence += 1;
				return id;
			},
		},
	};
}

function cloneRequest(request: EnrollmentRequest): EnrollmentRequest {
	return { ...request, statusHistory: request.statusHistory.map((entry) => ({ ...entry })) };
}

function openApi(courses: readonly Course[]) {
	return buildApplicationServicesFactory(memoryContext(courses)).forRequest();
}

describe('course search', () => {
	it('returns the first page sorted by title', async () => {
		const api = await openApi(generatedCourses());
		const page = await api.courses.search({});

		expect(page.page).toBe(1);
		expect(page.pageSize).toBe(10);
		expect(page.totalItems).toBe(12);
		expect(page.totalPages).toBe(2);
		expect(page.items).toHaveLength(10);
		expect(page.items[0]?.title).toBe('Title 00');
	});

	it('matches keyword search across title, summary, and tags regardless of case', async () => {
		const api = await openApi([
			course({ id: 'title', title: 'Security Foundations', summary: 'Basics', tags: ['intro'] }),
			course({ id: 'summary', title: 'Privacy Workshop', summary: 'Covers SECURITY reviews', tags: ['privacy'] }),
			course({ id: 'tag', title: 'Model Evaluation', summary: 'Measure quality.', tags: ['AI'] }),
			course({ id: 'other', title: 'Gardening', summary: 'Plants', tags: ['outdoors'] }),
		]);

		expect((await api.courses.search({ q: 'security' })).items.map((item) => item.id)).toEqual(['summary', 'title']);
		expect((await api.courses.search({ q: 'ai' })).items.map((item) => item.id)).toEqual(['tag']);
	});

	it('filters by modality, status, and exact tag', async () => {
		const api = await openApi([
			course({ id: 'online', modality: 'online', tags: ['ai'] }),
			course({ id: 'room', modality: 'in-person', tags: ['ai'] }),
			course({ id: 'draft', status: 'draft', tags: ['ai'] }),
			course({ id: 'prefix', title: 'Other', summary: 'Other', tags: ['aiml'] }),
		]);

		expect((await api.courses.search({ modality: 'online', status: 'active' })).items.map((item) => item.id)).toEqual(['online', 'prefix']);
		expect((await api.courses.search({ tag: 'AI' })).items.map((item) => item.id)).toEqual(['draft', 'online', 'room']);
		expect((await api.courses.search({ tag: 'ai' })).items.every((item) => item.id !== 'prefix')).toBe(true);
	});

	it('applies keyword, modality, and status together', async () => {
		const api = await openApi([
			course({ id: 'match', title: 'Security Online', modality: 'online', status: 'active' }),
			course({ id: 'room', title: 'Security Lab', modality: 'in-person', status: 'active' }),
			course({ id: 'draft', title: 'Security Draft', modality: 'online', status: 'draft' }),
		]);
		const page = await api.courses.search({ q: 'SECURITY', modality: 'online', status: 'active' });

		expect(page.items.map((item) => item.id)).toEqual(['match']);
	});

	it('paginates and sorts by createdAt', async () => {
		const api = await openApi(generatedCourses());
		const second = await api.courses.search({ page: '2', pageSize: '5' });
		const byDate = await api.courses.search({ sort: 'createdAt', pageSize: '12' });

		expect(second.items).toHaveLength(5);
		expect(second.page).toBe(2);
		expect(second.pageSize).toBe(5);
		expect(second.totalItems).toBe(12);
		expect(second.totalPages).toBe(3);
		expect(second.items[0]?.title).toBe('Title 05');
		expect(byDate.items[0]?.title).toBe('Title 11');
		expect(byDate.items.at(-1)?.title).toBe('Title 00');
	});

	it('returns an empty page when nothing matches', async () => {
		const api = await openApi([course()]);
		const page = await api.courses.search({ q: 'zzzzzz' });

		expect(page).toMatchObject({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
	});

	it('rejects invalid query parameters', async () => {
		const api = await openApi([course()]);

		await expect(api.courses.search({ pageSize: '0' })).rejects.toMatchObject({
			name: 'CatalogError',
			code: 'INVALID_QUERY_PARAMETER',
			message: 'One or more query parameters are invalid.',
			details: [{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' }],
		});
		await expect(api.courses.search({ modality: 'classroom', status: 'open', sort: 'id', page: '0', pageSize: '51' })).rejects.toMatchObject({
			code: 'INVALID_QUERY_PARAMETER',
			details: [
				{ field: 'modality', message: 'modality must be online, in-person, or hybrid.' },
				{ field: 'status', message: 'status must be draft, active, or retired.' },
				{ field: 'sort', message: 'sort must be title, createdAt, or updatedAt.' },
				{ field: 'page', message: 'page must be an integer greater than or equal to 1.' },
				{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' },
			],
		});
		await expect(api.courses.search({ pageSize: '0' })).rejects.toBeInstanceOf(CatalogError);
	});
});

describe('enrollment requests', () => {
	const courses = [
		course(),
		course({ id: 'course-002', title: 'API Design Clinic' }),
		course({ id: 'course-draft', title: 'Draft Prompt Design', status: 'draft' }),
		course({ id: 'course-retired', title: 'Retired Legacy Operations', status: 'retired' }),
	];

	it('creates a pending request and stores the initial history entry', async () => {
		const api = await openApi(courses);
		const created = await api.enrollmentRequests.create(enrollmentBody());

		expect(created).toMatchObject({ id: 'enroll-001', courseId: 'course-001', learnerEmail: 'learner@example.org', justification, status: 'pending' });
		expect(created.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
		expect(created.updatedAt).toBe(created.createdAt);
		expect(created.statusHistory).toEqual([{ fromStatus: null, toStatus: 'pending', changedAt: created.createdAt, changedBy: 'system', reason: null }]);
		await expect(api.enrollmentRequests.getById(created.id)).resolves.toEqual(created);
	});

	it('accepts justification at the length boundaries', async () => {
		const api = await openApi(courses);
		const short = await api.enrollmentRequests.create(enrollmentBody({ justification: 'x'.repeat(20) }));
		const long = await api.enrollmentRequests.create(enrollmentBody({ courseId: 'course-002', justification: 'y'.repeat(500) }));

		expect(short.justification).toHaveLength(20);
		expect(long.justification).toHaveLength(500);
		expect(long.status).toBe('pending');
	});

	it('rejects a missing, draft, or retired course', async () => {
		const api = await openApi(courses);

		await expect(api.enrollmentRequests.create(enrollmentBody({ courseId: 'missing' }))).rejects.toMatchObject({ code: 'COURSE_NOT_FOUND' });
		await expect(api.enrollmentRequests.create(enrollmentBody({ courseId: 'course-draft' }))).rejects.toMatchObject({ code: 'COURSE_NOT_ACTIVE' });
		await expect(api.enrollmentRequests.create(enrollmentBody({ courseId: 'course-retired' }))).rejects.toMatchObject({ code: 'COURSE_NOT_ACTIVE' });
	});

	it('rejects an invalid email and a short or long justification', async () => {
		const api = await openApi(courses);

		await expect(api.enrollmentRequests.create(enrollmentBody({ learnerEmail: 'not-an-email', justification: 'short' }))).rejects.toMatchObject({
			code: 'INVALID_REQUEST',
			message: 'The request could not be completed.',
			details: [
				{ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' },
				{ field: 'justification', message: 'justification must be between 20 and 500 characters.' },
			],
		});
		await expect(api.enrollmentRequests.create(enrollmentBody({ justification: 'x'.repeat(19) }))).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
		await expect(api.enrollmentRequests.create(enrollmentBody({ justification: 'x'.repeat(501) }))).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
	});

	it('blocks a second pending or approved request for the same learner and course', async () => {
		const api = await openApi(courses);
		await api.enrollmentRequests.create(enrollmentBody());
		await expect(api.enrollmentRequests.create(enrollmentBody({ learnerEmail: 'Learner@Example.org' }))).rejects.toMatchObject({ code: 'DUPLICATE_ACTIVE_REQUEST' });

		const approved = await api.enrollmentRequests.create(enrollmentBody({ learnerEmail: 'second@example.org' }));
		await api.enrollmentRequests.updateStatus(approved.id, { status: 'approved', changedBy: 'reviewer@example.org' });
		await expect(api.enrollmentRequests.create(enrollmentBody({ learnerEmail: 'second@example.org' }))).rejects.toMatchObject({ code: 'DUPLICATE_ACTIVE_REQUEST' });

		const otherCourse = await api.enrollmentRequests.create(enrollmentBody({ courseId: 'course-002' }));
		const otherLearner = await api.enrollmentRequests.create(enrollmentBody({ learnerEmail: 'third@example.org' }));
		expect(otherCourse.courseId).toBe('course-002');
		expect(otherLearner.learnerEmail).toBe('third@example.org');
	});

	it('allows a new request after rejection or cancellation', async () => {
		const api = await openApi(courses);
		const rejected = await api.enrollmentRequests.create(enrollmentBody());
		await api.enrollmentRequests.updateStatus(rejected.id, { status: 'rejected', changedBy: 'reviewer@example.org', reason: 'Prerequisite course is still incomplete.' });
		await expect(api.enrollmentRequests.create(enrollmentBody())).resolves.toMatchObject({ status: 'pending' });

		const cancelled = await api.enrollmentRequests.create(enrollmentBody({ learnerEmail: 'cancel@example.org' }));
		await api.enrollmentRequests.updateStatus(cancelled.id, { status: 'cancelled', changedBy: 'learner@example.org' });
		await expect(api.enrollmentRequests.create(enrollmentBody({ learnerEmail: 'cancel@example.org' }))).resolves.toMatchObject({ status: 'pending' });
	});

	it('filters by status, course, and learner email', async () => {
		const api = await openApi(courses);
		const pending = await api.enrollmentRequests.create(enrollmentBody());
		const approved = await api.enrollmentRequests.create(enrollmentBody({ courseId: 'course-002' }));
		await api.enrollmentRequests.updateStatus(approved.id, { status: 'approved', changedBy: 'reviewer@example.org' });
		const rejected = await api.enrollmentRequests.create(enrollmentBody({ learnerEmail: 'other@example.org' }));
		await api.enrollmentRequests.updateStatus(rejected.id, { status: 'rejected', changedBy: 'reviewer@example.org', reason: 'Prerequisite course is still incomplete.' });

		expect((await api.enrollmentRequests.list({})).map((item) => item.id)).toEqual([pending.id, approved.id, rejected.id]);
		expect((await api.enrollmentRequests.list({ status: 'pending' })).map((item) => item.id)).toEqual([pending.id]);
		expect((await api.enrollmentRequests.list({ courseId: 'course-001' })).map((item) => item.id)).toEqual([pending.id, rejected.id]);
		expect((await api.enrollmentRequests.list({ learnerEmail: 'LEARNER@example.org' })).map((item) => item.id)).toEqual([pending.id, approved.id]);
		expect((await api.enrollmentRequests.list({ status: 'approved', courseId: 'course-002', learnerEmail: 'learner@example.org' })).map((item) => item.id)).toEqual([approved.id]);
		await expect(api.enrollmentRequests.list({ status: 'done' })).rejects.toMatchObject({
			code: 'INVALID_REQUEST',
			details: [{ field: 'status', message: 'status must be pending, approved, rejected, or cancelled.' }],
		});
	});

	it('returns not found for an unknown request', async () => {
		const api = await openApi(courses);

		await expect(api.enrollmentRequests.getById('missing')).rejects.toMatchObject({ code: 'ENROLLMENT_REQUEST_NOT_FOUND' });
		await expect(api.enrollmentRequests.updateStatus('missing', { status: 'approved', changedBy: 'reviewer@example.org' })).rejects.toMatchObject({ code: 'ENROLLMENT_REQUEST_NOT_FOUND' });
	});

	it('applies the allowed status transitions and appends history', async () => {
		const api = await openApi(courses);
		const created = await api.enrollmentRequests.create(enrollmentBody());
		const approved = await api.enrollmentRequests.updateStatus(created.id, { status: 'approved', changedBy: 'reviewer@example.org' });
		const cancelled = await api.enrollmentRequests.updateStatus(approved.id, { status: 'cancelled', changedBy: 'learner@example.org' });
		const rejected = await api.enrollmentRequests.updateStatus((await api.enrollmentRequests.create(enrollmentBody({ learnerEmail: 'reject@example.org' }))).id, {
			status: 'rejected',
			changedBy: 'reviewer@example.org',
			reason: 'Learner has not completed the prerequisite course.',
		});
		const pendingCancelled = await api.enrollmentRequests.updateStatus((await api.enrollmentRequests.create(enrollmentBody({ learnerEmail: 'stop@example.org' }))).id, { status: 'cancelled', changedBy: 'learner@example.org' });

		expect(approved.statusHistory.map((entry) => entry.toStatus)).toEqual(['pending', 'approved']);
		expect(approved.statusHistory[1]).toMatchObject({ fromStatus: 'pending', toStatus: 'approved', changedBy: 'reviewer@example.org', reason: null, changedAt: approved.updatedAt });
		expect(approved.createdAt).toBe(created.createdAt);
		expect(cancelled.status).toBe('cancelled');
		expect(cancelled.statusHistory).toHaveLength(3);
		expect(rejected.statusHistory[1]).toMatchObject({ fromStatus: 'pending', toStatus: 'rejected', changedBy: 'reviewer@example.org', reason: 'Learner has not completed the prerequisite course.' });
		expect(pendingCancelled.statusHistory[1]).toMatchObject({ fromStatus: 'pending', toStatus: 'cancelled' });
		await expect(api.enrollmentRequests.getById(rejected.id)).resolves.toMatchObject({ statusHistory: rejected.statusHistory });
	});

	it('rejects invalid transitions and a rejection without a reason', async () => {
		const api = await openApi(courses);
		const created = await api.enrollmentRequests.create(enrollmentBody());

		await expect(api.enrollmentRequests.updateStatus(created.id, { status: 'rejected', changedBy: 'reviewer@example.org' })).rejects.toMatchObject({
			code: 'INVALID_REQUEST',
			details: [{ field: 'reason', message: 'reason is required when rejecting a request.' }],
		});
		await expect(api.enrollmentRequests.updateStatus(created.id, { status: 'rejected', changedBy: 'reviewer@example.org', reason: '   ' })).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
		await expect(api.enrollmentRequests.updateStatus(created.id, { status: 'enrolled', changedBy: 'reviewer@example.org' })).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
		await expect(api.enrollmentRequests.getById(created.id)).resolves.toMatchObject({ status: 'pending', statusHistory: [{ toStatus: 'pending' }] });

		const approved = await api.enrollmentRequests.updateStatus(created.id, { status: 'approved', changedBy: 'reviewer@example.org' });
		await expect(api.enrollmentRequests.updateStatus(created.id, { status: 'rejected', changedBy: 'reviewer@example.org', reason: 'Too late to reject.' })).rejects.toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
		await expect(api.enrollmentRequests.updateStatus(created.id, { status: 'pending', changedBy: 'reviewer@example.org' })).rejects.toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
		await expect(api.enrollmentRequests.getById(created.id)).resolves.toMatchObject({ status: 'approved', statusHistory: approved.statusHistory });
	});
});

function generatedCourses(): Course[] {
	return Array.from({ length: 12 }, (_, index) =>
		course({
			id: `course-${String(index).padStart(3, '0')}`,
			title: `Title ${String(index).padStart(2, '0')}`,
			summary: 'Generated course',
			tags: ['generated'],
			createdAt: new Date(Date.UTC(2026, 0, 12 - index)).toISOString(),
		}),
	);
}
