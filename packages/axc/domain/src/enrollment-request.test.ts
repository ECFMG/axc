import { describe, expect, it } from 'vitest';
import type { Course } from './course.ts';
import { EnrollmentRequest, type EnrollmentStatus } from './enrollment-request.ts';

const valid = { courseId: 'course-001', learnerEmail: 'Learner@Example.org', justification: 'I need this course for upcoming secure development work.' };
const NOW = '2026-06-27T10:00:00.000Z';
const course = (status: Course['status']): Course => ({ id: 'c', title: 't', summary: 's', modality: 'online', status, tags: [], createdAt: NOW, updatedAt: NOW });
const codeOf = (fn: () => unknown) => {
	try {
		fn();
	} catch (e) {
		return (e as { code: string }).code;
	}
	return undefined;
};
const pending = () => EnrollmentRequest.create('enroll-001', EnrollmentRequest.validate(valid), NOW);

describe('EnrollmentRequest', () => {
	it('validates and normalises input', () => {
		expect(EnrollmentRequest.validate(valid).learnerEmail).toBe('learner@example.org');
		expect(codeOf(() => EnrollmentRequest.validate({ ...valid, courseId: '' }))).toBe('INVALID_REQUEST');
		expect(codeOf(() => EnrollmentRequest.validate({ ...valid, learnerEmail: 'not-an-email' }))).toBe('INVALID_REQUEST');
		expect(codeOf(() => EnrollmentRequest.validate({ ...valid, justification: 'too short' }))).toBe('INVALID_REQUEST');
		expect(codeOf(() => EnrollmentRequest.validate({ ...valid, justification: 'x'.repeat(501) }))).toBe('INVALID_REQUEST');
		expect(codeOf(() => EnrollmentRequest.validate({ ...valid, justification: 'x'.repeat(20) }))).toBeUndefined();
		expect(codeOf(() => EnrollmentRequest.validate({ ...valid, justification: 'x'.repeat(500) }))).toBeUndefined();
	});

	it('only allows active existing courses', () => {
		expect(codeOf(() => EnrollmentRequest.assertEnrollable('x', undefined))).toBe('COURSE_NOT_FOUND');
		expect(codeOf(() => EnrollmentRequest.assertEnrollable('x', course('draft')))).toBe('COURSE_NOT_ACTIVE');
		expect(codeOf(() => EnrollmentRequest.assertEnrollable('x', course('retired')))).toBe('COURSE_NOT_ACTIVE');
		expect(codeOf(() => EnrollmentRequest.assertEnrollable('x', course('active')))).toBeUndefined();
	});

	it('starts pending with a creation history entry', () => {
		const request = pending();
		expect(request.props.status).toBe('pending');
		expect(request.isActive).toBe(true);
		expect(request.props.statusHistory).toEqual([{ fromStatus: null, toStatus: 'pending', changedAt: NOW, changedBy: 'system', reason: null }]);
	});

	it.each<[EnrollmentStatus[], boolean]>([
		[['approved'], true],
		[['rejected'], true],
		[['cancelled'], true],
		[['approved', 'cancelled'], true],
		[['pending'], false],
		[['approved', 'rejected'], false],
		[['approved', 'pending'], false],
		[['rejected', 'approved'], false],
		[['cancelled', 'pending'], false],
	])('transition path pending → %j allowed=%s', (path, allowed) => {
		const request = pending();
		const codes = path.map((to) => codeOf(() => request.changeStatus(to, 'reviewer@example.org', 'reason given', NOW)));
		expect(codes.at(-1)).toBe(allowed ? undefined : 'INVALID_STATUS_TRANSITION');
		expect(request.props.statusHistory).toHaveLength(1 + codes.filter((c) => c === undefined).length);
	});

	it('requires a reason to reject and records it', () => {
		const request = pending();
		expect(codeOf(() => request.changeStatus('rejected', 'r', '  ', NOW))).toBe('INVALID_REQUEST');
		expect(codeOf(() => request.changeStatus('rejected', 'r', null, NOW))).toBe('INVALID_REQUEST');
		request.changeStatus('rejected', 'r', 'No prerequisite', NOW);
		expect(request.props.statusHistory.at(-1)).toEqual({ fromStatus: 'pending', toStatus: 'rejected', changedAt: NOW, changedBy: 'r', reason: 'No prerequisite' });
		expect(request.isActive).toBe(false);
	});
});
