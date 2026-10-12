import { randomUUID } from 'node:crypto';
import {
	createEnrollmentRequest,
	type EnrollmentRequest,
	type EnrollmentStatus,
	enrollmentStatuses,
	isEnrollmentStatus,
	isValidJustification,
	isValidLearnerEmail,
	isValidTransition,
	justificationMaxLength,
	justificationMinLength,
	withStatusChange,
} from '@axc/domain';
import type { CourseRepository, EnrollmentRequestFilters, EnrollmentRequestRepository } from '@axc/persistence';
import { oneOf, optionalParam, type RawQuery } from './course-search.ts';
import { invalidQueryParameters, invalidRequest, ServiceError, type ServiceErrorDetail } from './errors.ts';

export interface EnrollmentRequestServices {
	create(body: unknown): Promise<EnrollmentRequest>;
	getById(id: string): Promise<EnrollmentRequest>;
	list(query: RawQuery): Promise<{ items: EnrollmentRequest[] }>;
	updateStatus(id: string, body: unknown): Promise<EnrollmentRequest>;
}

function asRecord(body: unknown): Record<string, unknown> {
	return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
}

function nonEmptyString(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

export function buildEnrollmentRequestServices(courses: CourseRepository, requests: EnrollmentRequestRepository): EnrollmentRequestServices {
	const getById = async (id: string): Promise<EnrollmentRequest> => {
		const request = await requests.getById(id);
		if (request === undefined) {
			throw new ServiceError('ENROLLMENT_REQUEST_NOT_FOUND', `Enrollment request ${id} does not exist.`);
		}
		return request;
	};

	return {
		async create(body: unknown): Promise<EnrollmentRequest> {
			const input = asRecord(body);
			const details: ServiceErrorDetail[] = [];
			const courseId = nonEmptyString(input['courseId']);
			if (courseId === undefined) {
				details.push({ field: 'courseId', message: 'courseId is required.' });
			}
			if (!isValidLearnerEmail(input['learnerEmail'])) {
				details.push({ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' });
			}
			if (!isValidJustification(input['justification'])) {
				details.push({ field: 'justification', message: `justification must be between ${justificationMinLength} and ${justificationMaxLength} characters.` });
			}
			if (details.length > 0 || courseId === undefined) {
				throw invalidRequest(details);
			}

			const learnerEmail = String(input['learnerEmail']);
			const course = await courses.getById(courseId);
			if (course === undefined) {
				throw new ServiceError('COURSE_NOT_FOUND', `Course ${courseId} does not exist.`);
			}
			if (course.status !== 'active') {
				throw new ServiceError('COURSE_NOT_ACTIVE', `Course ${courseId} is not active.`);
			}
			if ((await requests.findActive(courseId, learnerEmail)) !== undefined) {
				throw new ServiceError('DUPLICATE_ACTIVE_REQUEST', `${learnerEmail} already has a pending or approved request for ${courseId}.`);
			}

			return await requests.save(
				createEnrollmentRequest({
					id: randomUUID(),
					courseId,
					learnerEmail,
					justification: String(input['justification']).trim(),
					changedBy: 'system',
					now: new Date().toISOString(),
				}),
			);
		},

		getById,

		async list(query: RawQuery): Promise<{ items: EnrollmentRequest[] }> {
			const details: ServiceErrorDetail[] = [];
			const status = oneOf<EnrollmentStatus>(optionalParam(query, 'status'), enrollmentStatuses, 'status', details);
			if (details.length > 0) {
				throw invalidQueryParameters(details);
			}
			const filters: EnrollmentRequestFilters = {
				status,
				courseId: optionalParam(query, 'courseId'),
				learnerEmail: optionalParam(query, 'learnerEmail'),
			};
			return { items: await requests.list(filters) };
		},

		async updateStatus(id: string, body: unknown): Promise<EnrollmentRequest> {
			const input = asRecord(body);
			const details: ServiceErrorDetail[] = [];
			const status = input['status'];
			if (!isEnrollmentStatus(status)) {
				details.push({ field: 'status', message: `status must be one of ${enrollmentStatuses.join(', ')}.` });
			}
			const changedBy = nonEmptyString(input['changedBy']);
			if (changedBy === undefined) {
				details.push({ field: 'changedBy', message: 'changedBy is required.' });
			}
			const reason = nonEmptyString(input['reason']);
			if (status === 'rejected' && reason === undefined) {
				details.push({ field: 'reason', message: 'reason is required when rejecting a request.' });
			}
			if (details.length > 0 || !isEnrollmentStatus(status) || changedBy === undefined) {
				throw invalidRequest(details);
			}

			const request = await getById(id);
			if (!isValidTransition(request.status, status)) {
				throw new ServiceError('INVALID_STATUS_TRANSITION', `Cannot change status from ${request.status} to ${status}.`);
			}
			return await requests.save(withStatusChange(request, { toStatus: status, changedBy, reason, now: new Date().toISOString() }));
		},
	};
}
