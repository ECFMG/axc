import { Domain } from '@axc/domain';
import { optionalQuery, queryEnum, RequestValidationError, requiredString } from '../../validation.ts';

const Enrollments = Domain.Contexts.Training.EnrollmentRequest;
export function parseEnrollmentCreate(body: Record<string, unknown>): Domain.Contexts.Training.EnrollmentRequest.CreateEnrollmentInput {
	return {
		courseId: requiredString(body, 'courseId'),
		learnerEmail: new Enrollments.LearnerEmail(requiredString(body, 'learnerEmail')).value,
		justification: new Enrollments.EnrollmentJustification(requiredString(body, 'justification')).value,
	};
}
export function parseEnrollmentStatus(body: Record<string, unknown>): Domain.Contexts.Training.EnrollmentRequest.ChangeEnrollmentStatusInput {
	const supplied = requiredString(body, 'status');
	const status = queryEnum(supplied, Enrollments.ENROLLMENT_STATUSES, 'status', 'INVALID_REQUEST');
	if (status === undefined) {
		throw new RequestValidationError('INVALID_REQUEST', 'status', 'status is required.');
	}
	const changedBy = requiredString(body, 'changedBy');
	const { reason: rawReason } = body;
	if (rawReason !== undefined && typeof rawReason !== 'string') {
		throw new RequestValidationError('INVALID_REQUEST', 'reason', 'reason must be a string.');
	}
	const reason = optionalQuery(rawReason)?.trim();
	if (status === 'rejected' && reason === undefined) {
		throw new RequestValidationError('INVALID_REQUEST', 'reason', 'reason is required when rejecting a request.');
	}
	return { status, changedBy, ...(reason === undefined ? {} : { reason }) };
}
export function parseEnrollmentQuery(query: Partial<Record<'status' | 'courseId' | 'learnerEmail', string>>): Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestCriteria {
	const status = queryEnum(query.status, Enrollments.ENROLLMENT_STATUSES, 'status', 'INVALID_REQUEST');
	const courseId = optionalQuery(query.courseId)?.trim();
	const email = optionalQuery(query.learnerEmail);
	const learnerEmail = email === undefined ? undefined : new Enrollments.LearnerEmail(email).value;
	return { ...(status === undefined ? {} : { status }), ...(courseId === undefined ? {} : { courseId }), ...(learnerEmail === undefined ? {} : { learnerEmail }) };
}
