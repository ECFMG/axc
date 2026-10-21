import type { Course, CourseStatus, EnrollmentRequest, EnrollmentRequestRepository, EnrollmentStatus } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import type { AppResult } from './index.ts';
import { buildApplicationServicesFactory } from './index.ts';

const justification = 'I need this course to prepare for upcoming secure development work.';

describe('enrollment requests', () => {
	it('creates a pending request with an initial history entry', async () => {
		const result = await enroll().create(validBody());

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.value).toMatchObject({
			id: 'enroll-001',
			courseId: 'course-001',
			learnerEmail: 'learner@example.org',
			justification,
			status: 'pending',
			createdAt: '2026-06-27T10:00:01.000Z',
			updatedAt: '2026-06-27T10:00:01.000Z',
		});
		expect(result.value.statusHistory).toEqual([{ fromStatus: null, toStatus: 'pending', changedAt: '2026-06-27T10:00:01.000Z', changedBy: 'system', reason: null }]);
	});

	it('rejects a missing course', async () => {
		const result = await enroll().create(validBody({ courseId: 'missing' }));

		expect(errorOf(result).code).toBe('COURSE_NOT_FOUND');
		expect(errorOf(result).details).toEqual([]);
	});

	it('rejects a draft or retired course', async () => {
		const draft = await enroll([sampleCourse('draft')]).create(validBody());
		const retired = await enroll([sampleCourse('retired')]).create(validBody());

		expect(errorOf(draft).code).toBe('COURSE_NOT_ACTIVE');
		expect(errorOf(retired).code).toBe('COURSE_NOT_ACTIVE');
	});

	it('rejects an invalid email and a short justification together', async () => {
		const result = await enroll().create(validBody({ learnerEmail: 'not-an-email', justification: 'too short' }));

		expect(errorOf(result)).toEqual({
			code: 'INVALID_REQUEST',
			message: 'The request could not be completed.',
			details: [
				{ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' },
				{ field: 'justification', message: 'justification must be between 20 and 500 characters.' },
			],
		});
	});

	it('rejects a justification longer than 500 characters', async () => {
		const result = await enroll().create(validBody({ justification: 'a'.repeat(501) }));

		expect(errorOf(result).details).toEqual([{ field: 'justification', message: 'justification must be between 20 and 500 characters.' }]);
	});

	it('accepts justification at the length bounds', async () => {
		const short = await enroll().create(validBody({ justification: 'a'.repeat(20) }));
		const long = await enroll().create(validBody({ justification: 'a'.repeat(500) }));

		expect(short.ok).toBe(true);
		expect(long.ok).toBe(true);
	});

	it('rejects a second pending or approved request for the same learner and course', async () => {
		const pending = enroll();
		expect((await pending.create(validBody())).ok).toBe(true);
		expect(errorOf(await pending.create(validBody({ learnerEmail: 'Learner@Example.org' }))).code).toBe('DUPLICATE_ACTIVE_REQUEST');

		const approved = enroll();
		const created = await approved.create(validBody());
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
		expect((await approved.updateStatus(created.value.id, { status: 'approved', changedBy: 'reviewer@example.org' })).ok).toBe(true);
		expect(errorOf(await approved.create(validBody())).code).toBe('DUPLICATE_ACTIVE_REQUEST');
	});

	it('allows a new request after rejection or cancellation', async () => {
		const rejected = enroll();
		const first = await rejected.create(validBody());
		expect(first.ok).toBe(true);
		if (!first.ok) {
			return;
		}
		await rejected.updateStatus(first.value.id, { status: 'rejected', changedBy: 'reviewer@example.org', reason: 'Prerequisite is missing.' });
		expect((await rejected.create(validBody())).ok).toBe(true);

		const cancelled = enroll();
		const second = await cancelled.create(validBody());
		expect(second.ok).toBe(true);
		if (!second.ok) {
			return;
		}
		await cancelled.updateStatus(second.value.id, { status: 'cancelled', changedBy: 'learner@example.org' });
		expect((await cancelled.create(validBody())).ok).toBe(true);
	});

	it('returns a request by id and reports an unknown id', async () => {
		const services = enroll();
		const created = await services.create(validBody());
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
		const found = await services.getById(created.value.id);
		expect(found.ok).toBe(true);
		if (found.ok) {
			expect(found.value.statusHistory).toHaveLength(1);
		}
		expect(errorOf(await services.getById('missing')).code).toBe('ENROLLMENT_REQUEST_NOT_FOUND');
	});

	it('filters by status, courseId, and learnerEmail', async () => {
		const services = enroll([sampleCourse('active'), sampleCourse('active', 'course-002')]);
		await services.create(validBody());
		await services.create(validBody({ courseId: 'course-002', learnerEmail: 'other@example.org' }));
		const third = await services.create(validBody({ learnerEmail: 'second@example.org' }));
		expect(third.ok).toBe(true);
		if (!third.ok) {
			return;
		}
		await services.updateStatus(third.value.id, { status: 'approved', changedBy: 'reviewer@example.org' });

		expect(ids(await services.list({ status: 'approved' }))).toEqual([third.value.id]);
		expect(ids(await services.list({ courseId: 'course-002' }))).toHaveLength(1);
		expect(ids(await services.list({ learnerEmail: 'Learner@Example.org' }))).toEqual(['enroll-001']);
		expect(ids(await services.list({ status: 'pending', courseId: 'course-001', learnerEmail: 'learner@example.org' }))).toEqual(['enroll-001']);
	});

	it('rejects an invalid list status', async () => {
		const result = await enroll().list({ status: 'closed' });

		expect(errorOf(result).details).toEqual([{ field: 'status', message: 'status must be pending, approved, rejected, or cancelled.' }]);
	});

	it('applies the allowed transitions and appends history', async () => {
		const services = enroll();
		const pendingToApproved = await transition(services, 'approved');
		expect(pendingToApproved.status).toBe('approved');
		expect(pendingToApproved.statusHistory.map((entry) => entry.toStatus)).toEqual(['pending', 'approved']);
		expect(pendingToApproved.statusHistory[1]).toMatchObject({ fromStatus: 'pending', changedBy: 'reviewer@example.org', reason: null });

		const pendingToRejected = await transition(enroll(), 'rejected', 'Prerequisite is missing.');
		expect(pendingToRejected.statusHistory[1]).toMatchObject({ fromStatus: 'pending', toStatus: 'rejected', reason: 'Prerequisite is missing.' });

		const pendingToCancelled = await transition(enroll(), 'cancelled');
		expect(pendingToCancelled.status).toBe('cancelled');

		const approved = enroll();
		const created = await approved.create(validBody());
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
		await approved.updateStatus(created.value.id, { status: 'approved', changedBy: 'reviewer@example.org' });
		const approvedToCancelled = await approved.updateStatus(created.value.id, { status: 'cancelled', changedBy: 'reviewer@example.org' });
		expect(approvedToCancelled.ok).toBe(true);
		if (approvedToCancelled.ok) {
			expect(approvedToCancelled.value.statusHistory.map((entry) => `${entry.fromStatus ?? 'null'}->${entry.toStatus}`)).toEqual(['null->pending', 'pending->approved', 'approved->cancelled']);
		}
	});

	it('rejects an invalid transition without changing history', async () => {
		const services = enroll();
		const created = await services.create(validBody());
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
		await services.updateStatus(created.value.id, { status: 'approved', changedBy: 'reviewer@example.org' });
		const rejected = await services.updateStatus(created.value.id, { status: 'rejected', changedBy: 'reviewer@example.org', reason: 'Too late.' });
		expect(errorOf(rejected).code).toBe('INVALID_STATUS_TRANSITION');
		const found = await services.getById(created.value.id);
		expect(found.ok).toBe(true);
		if (found.ok) {
			expect(found.value.status).toBe('approved');
			expect(found.value.statusHistory).toHaveLength(2);
		}
	});

	it('rejects a rejection without a reason', async () => {
		const services = enroll();
		const created = await services.create(validBody());
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
		const blank = await services.updateStatus(created.value.id, { status: 'rejected', changedBy: 'reviewer@example.org', reason: '   ' });
		const missing = await services.updateStatus(created.value.id, { status: 'rejected', changedBy: 'reviewer@example.org' });

		expect(errorOf(blank).details).toEqual([{ field: 'reason', message: 'reason is required when rejecting a request.' }]);
		expect(errorOf(missing).code).toBe('INVALID_REQUEST');
	});
});

function errorOf(result: AppResult<unknown>): { code: string; message?: string; details: { field: string; message: string }[] } {
	if (result.ok) {
		throw new Error('expected an error');
	}
	return { code: result.error.code, message: result.error.message, details: result.error.details };
}

function ids(result: AppResult<{ items: EnrollmentRequest[] }>): string[] {
	if (!result.ok) {
		throw new Error('expected a list');
	}
	return result.value.items.map((request) => request.id);
}

async function transition(services: ReturnType<typeof enroll>, status: EnrollmentStatus, reason?: string): Promise<EnrollmentRequest> {
	const created = await services.create(validBody());
	if (!created.ok) {
		throw new Error('create failed');
	}
	const body = reason === undefined ? { status, changedBy: 'reviewer@example.org' } : { status, changedBy: 'reviewer@example.org', reason };
	const updated = await services.updateStatus(created.value.id, body);
	if (!updated.ok) {
		throw new Error('transition failed');
	}
	return updated.value;
}

function enroll(courses: Course[] = [sampleCourse('active')]) {
	let tick = 0;
	let sequence = 0;
	const factory = buildApplicationServicesFactory(
		{ environment: 'test' },
		{
			courses: {
				getById(id: string) {
					return Promise.resolve(courses.find((course) => course.id === id));
				},
				list() {
					return Promise.resolve(courses);
				},
			},
			enrollmentRequests: memoryEnrollmentRequests(),
			now: () => {
				tick += 1;
				return `2026-06-27T10:00:${String(tick).padStart(2, '0')}.000Z`;
			},
			nextEnrollmentId: () => {
				sequence += 1;
				return `enroll-${String(sequence).padStart(3, '0')}`;
			},
		},
	);
	return {
		async create(input: unknown) {
			return (await factory.forRequest()).enrollmentRequests.create(input);
		},
		async getById(id: string) {
			return (await factory.forRequest()).enrollmentRequests.getById(id);
		},
		async list(query: Record<string, string | undefined>) {
			return (await factory.forRequest()).enrollmentRequests.list(query);
		},
		async updateStatus(id: string, input: unknown) {
			return (await factory.forRequest()).enrollmentRequests.updateStatus(id, input);
		},
	};
}

function memoryEnrollmentRequests(): EnrollmentRequestRepository {
	const items: EnrollmentRequest[] = [];
	return {
		getById(id: string) {
			const found = items.find((request) => request.id === id);
			return Promise.resolve(found === undefined ? undefined : { ...found, statusHistory: found.statusHistory.map((entry) => ({ ...entry })) });
		},
		list() {
			return Promise.resolve(items.map((request) => ({ ...request, statusHistory: request.statusHistory.map((entry) => ({ ...entry })) })));
		},
		add(request: EnrollmentRequest) {
			items.push({ ...request, statusHistory: request.statusHistory.map((entry) => ({ ...entry })) });
			return Promise.resolve();
		},
		save(request: EnrollmentRequest) {
			const index = items.findIndex((item) => item.id === request.id);
			if (index >= 0) {
				items[index] = { ...request, statusHistory: request.statusHistory.map((entry) => ({ ...entry })) };
			}
			return Promise.resolve();
		},
	};
}

function validBody(overrides?: { courseId?: string; learnerEmail?: string; justification?: string }) {
	return {
		courseId: overrides?.courseId ?? 'course-001',
		learnerEmail: overrides?.learnerEmail ?? 'learner@example.org',
		justification: overrides?.justification ?? justification,
	};
}

function sampleCourse(status: CourseStatus, id = 'course-001'): Course {
	return {
		id,
		title: 'AI Security Foundations',
		summary: 'Introductory course on secure AI-assisted development.',
		modality: 'online',
		status,
		tags: ['ai', 'security'],
		createdAt: '2026-01-15T00:00:00.000Z',
		updatedAt: '2026-06-01T00:00:00.000Z',
	};
}
