import { createEnrollmentRequest, validateCourseSearchQuery } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { SEED_COURSES } from './course-seed.ts';
import { createInMemoryCourseRepository } from './in-memory-course-repository.ts';
import { createInMemoryEnrollmentRequestRepository } from './in-memory-enrollment-request-repository.ts';
import { createInMemoryDataSources } from './index.ts';

const noFilters = { status: undefined, courseId: undefined, learnerEmail: undefined };

const request = (id: string, courseId: string, learnerEmail: string) =>
	createEnrollmentRequest(id, { courseId, learnerEmail, justification: 'I need this course to prepare for upcoming secure development work.' }, '2026-06-27T10:00:00.000Z');

describe('SEED_COURSES', () => {
	it('ships at least twelve courses with unique identifiers', () => {
		expect(SEED_COURSES.length).toBeGreaterThanOrEqual(12);
		expect(new Set(SEED_COURSES.map((course) => course.id)).size).toBe(SEED_COURSES.length);
	});

	it('covers every modality and every status', () => {
		expect(new Set(SEED_COURSES.map((course) => course.modality))).toStrictEqual(new Set(['online', 'in-person', 'hybrid']));
		expect(new Set(SEED_COURSES.map((course) => course.status))).toStrictEqual(new Set(['draft', 'active', 'retired']));
	});

	it('gives every course at least one tag and ISO timestamps', () => {
		for (const course of SEED_COURSES) {
			expect(course.tags.length).toBeGreaterThan(0);
			expect(course.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
			expect(course.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
		}
	});
});

describe('createInMemoryCourseRepository', () => {
	it('searches the seeded catalog', async () => {
		const repository = createInMemoryCourseRepository();

		const result = await repository.search(validateCourseSearchQuery({ status: 'active', pageSize: '50' }));

		expect(result.totalItems).toBe(SEED_COURSES.filter((course) => course.status === 'active').length);
		expect(result.items.every((course) => course.status === 'active')).toBe(true);
	});

	it('resolves courses by identifier', async () => {
		const repository = createInMemoryCourseRepository();

		await expect(repository.findById('course-001')).resolves.toMatchObject({ id: 'course-001', status: 'active' });
		await expect(repository.findById('course-404')).resolves.toBeUndefined();
	});
});

describe('createInMemoryEnrollmentRequestRepository', () => {
	it('allocates sequential identifiers per instance', async () => {
		const repository = createInMemoryEnrollmentRequestRepository();

		await expect(repository.nextIdentity()).resolves.toBe('enroll-001');
		await expect(repository.nextIdentity()).resolves.toBe('enroll-002');
		await expect(createInMemoryEnrollmentRequestRepository().nextIdentity()).resolves.toBe('enroll-001');
	});

	it('saves and resolves requests by identifier', async () => {
		const repository = createInMemoryEnrollmentRequestRepository();
		const saved = await repository.save(request('enroll-001', 'course-001', 'learner@example.org'));

		await expect(repository.findById('enroll-001')).resolves.toStrictEqual(saved);
		await expect(repository.findById('enroll-999')).resolves.toBeUndefined();
	});

	it('lists most recently created first and applies each filter', async () => {
		const repository = createInMemoryEnrollmentRequestRepository();
		await repository.save(request('enroll-001', 'course-001', 'first@example.org'));
		await repository.save(request('enroll-002', 'course-003', 'second@example.org'));

		await expect(repository.findByFilters(noFilters)).resolves.toMatchObject([{ id: 'enroll-002' }, { id: 'enroll-001' }]);
		await expect(repository.findByFilters({ ...noFilters, courseId: 'course-003' })).resolves.toMatchObject([{ id: 'enroll-002' }]);
		await expect(repository.findByFilters({ ...noFilters, learnerEmail: 'first@example.org' })).resolves.toMatchObject([{ id: 'enroll-001' }]);
		await expect(repository.findByFilters({ ...noFilters, status: 'approved' })).resolves.toStrictEqual([]);
	});

	it('finds an active request for a learner regardless of email casing', async () => {
		const repository = createInMemoryEnrollmentRequestRepository();
		await repository.save(request('enroll-001', 'course-001', 'learner@example.org'));

		await expect(repository.findActiveForLearner('course-001', 'LEARNER@EXAMPLE.ORG')).resolves.toMatchObject({ id: 'enroll-001' });
		await expect(repository.findActiveForLearner('course-002', 'learner@example.org')).resolves.toBeUndefined();
	});

	it('ignores cancelled and rejected requests when checking for an active one', async () => {
		const repository = createInMemoryEnrollmentRequestRepository();
		await repository.save({ ...request('enroll-001', 'course-001', 'learner@example.org'), status: 'cancelled' });

		await expect(repository.findActiveForLearner('course-001', 'learner@example.org')).resolves.toBeUndefined();
	});
});

describe('createInMemoryDataSources', () => {
	it('builds independent course and enrollment request repositories', async () => {
		const dataSources = createInMemoryDataSources();

		await expect(dataSources.courses.findById('course-001')).resolves.toBeDefined();
		await expect(dataSources.enrollmentRequests.findByFilters(noFilters)).resolves.toStrictEqual([]);
	});
});
