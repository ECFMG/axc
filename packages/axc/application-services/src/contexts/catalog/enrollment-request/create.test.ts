import { Domain } from '@axc/domain';
import { Persistence } from '@axc/persistence';
import { describe, expect, it } from 'vitest';
import { create } from './create.ts';
import { getEnrollmentRequest } from './get-enrollment-request.ts';
import { queryEnrollmentRequests } from './query-enrollment-requests.ts';
import { update } from './update.ts';

const justification = 'I need this course to prepare for upcoming secure development work.';

function services() {
	const dataSources = Persistence();
	return {
		create: create(dataSources),
		getById: getEnrollmentRequest(dataSources),
		list: queryEnrollmentRequests(dataSources),
		updateStatus: update(dataSources),
	};
}

describe('enrollment request application services', () => {
	it('creates a pending enrollment request', async () => {
		const result = await services().create({
			courseId: 'course-001',
			learnerEmail: 'learner@example.org',
			justification,
		});

		expect(result.status).toBe('pending');
		expect(result.courseId).toBe('course-001');
		expect(result.learnerEmail).toBe('learner@example.org');
		expect(result.statusHistory).toHaveLength(1);
		expect(result.statusHistory[0]?.fromStatus).toBeNull();
		expect(result.statusHistory[0]?.toStatus).toBe('pending');
		expect(result.statusHistory[0]?.changedBy).toBe('system');
	});

	it('rejects a missing course', async () => {
		await expect(
			services().create({
				courseId: 'course-missing',
				learnerEmail: 'learner@example.org',
				justification,
			}),
		).rejects.toBeInstanceOf(Domain.Contexts.Catalog.EnrollmentRequest.CourseNotFoundError);
	});

	it('rejects draft and retired courses', async () => {
		await expect(
			services().create({
				courseId: 'course-004',
				learnerEmail: 'learner@example.org',
				justification,
			}),
		).rejects.toBeInstanceOf(Domain.Contexts.Catalog.EnrollmentRequest.CourseNotActiveError);

		await expect(
			services().create({
				courseId: 'course-005',
				learnerEmail: 'learner@example.org',
				justification,
			}),
		).rejects.toBeInstanceOf(Domain.Contexts.Catalog.EnrollmentRequest.CourseNotActiveError);
	});

	it('rejects invalid email and short justification', async () => {
		await expect(
			services().create({
				courseId: 'course-001',
				learnerEmail: 'not-an-email',
				justification,
			}),
		).rejects.toBeInstanceOf(Domain.Contexts.Catalog.EnrollmentRequest.InvalidRequestError);

		await expect(
			services().create({
				courseId: 'course-001',
				learnerEmail: 'learner@example.org',
				justification: 'Too short.',
			}),
		).rejects.toBeInstanceOf(Domain.Contexts.Catalog.EnrollmentRequest.InvalidRequestError);
	});

	it('prevents duplicate pending and approved requests', async () => {
		const api = services();
		await api.create({
			courseId: 'course-001',
			learnerEmail: 'dup-pending@example.org',
			justification,
		});
		await expect(
			api.create({
				courseId: 'course-001',
				learnerEmail: 'dup-pending@example.org',
				justification,
			}),
		).rejects.toBeInstanceOf(Domain.Contexts.Catalog.EnrollmentRequest.DuplicateActiveRequestError);

		const approvedApi = services();
		const created = await approvedApi.create({
			courseId: 'course-002',
			learnerEmail: 'dup-approved@example.org',
			justification,
		});
		await approvedApi.updateStatus({
			id: created.id,
			status: 'approved',
			changedBy: 'reviewer@example.org',
			reason: undefined,
		});
		await expect(
			approvedApi.create({
				courseId: 'course-002',
				learnerEmail: 'dup-approved@example.org',
				justification,
			}),
		).rejects.toBeInstanceOf(Domain.Contexts.Catalog.EnrollmentRequest.DuplicateActiveRequestError);
	});

	it('retrieves a request by id including status history', async () => {
		const api = services();
		const created = await api.create({
			courseId: 'course-001',
			learnerEmail: 'get-by-id@example.org',
			justification,
		});
		const loaded = await api.getById({ id: created.id });
		expect(loaded.id).toBe(created.id);
		expect(loaded.statusHistory).toHaveLength(1);
	});

	it('filters requests by status, courseId, and learnerEmail', async () => {
		const api = services();
		await api.create({
			courseId: 'course-001',
			learnerEmail: 'filter-a@example.org',
			justification,
		});
		await api.create({
			courseId: 'course-002',
			learnerEmail: 'filter-b@example.org',
			justification,
		});

		const filtered = await api.list({
			status: 'pending',
			courseId: 'course-001',
			learnerEmail: 'filter-a@example.org',
		});
		expect(filtered.items).toHaveLength(1);
		expect(filtered.items[0]?.learnerEmail).toBe('filter-a@example.org');
	});

	it('applies valid status transitions and appends history', async () => {
		const api = services();
		const created = await api.create({
			courseId: 'course-001',
			learnerEmail: 'transition@example.org',
			justification,
		});
		const approved = await api.updateStatus({
			id: created.id,
			status: 'approved',
			changedBy: 'reviewer@example.org',
			reason: undefined,
		});
		expect(approved.status).toBe('approved');
		expect(approved.statusHistory).toHaveLength(2);
	});

	it('rejects invalid transitions and missing rejection reasons', async () => {
		const api = services();
		const created = await api.create({
			courseId: 'course-001',
			learnerEmail: 'invalid-transition@example.org',
			justification,
		});
		await api.updateStatus({
			id: created.id,
			status: 'approved',
			changedBy: 'reviewer@example.org',
			reason: undefined,
		});
		await expect(
			api.updateStatus({
				id: created.id,
				status: 'rejected',
				changedBy: 'reviewer@example.org',
				reason: 'Learner has not completed the prerequisite course.',
			}),
		).rejects.toBeInstanceOf(Domain.Contexts.Catalog.EnrollmentRequest.InvalidStatusTransitionError);

		const pending = await api.create({
			courseId: 'course-002',
			learnerEmail: 'no-reason@example.org',
			justification,
		});
		await expect(
			api.updateStatus({
				id: pending.id,
				status: 'rejected',
				changedBy: 'reviewer@example.org',
				reason: undefined,
			}),
		).rejects.toBeInstanceOf(Domain.Contexts.Catalog.EnrollmentRequest.InvalidRequestError);
	});
});
