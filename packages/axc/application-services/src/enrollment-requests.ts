import {
	type CourseRepository,
	canTransitionEnrollmentStatus,
	ENROLLMENT_CREATED_BY,
	type EnrollmentRequest,
	type EnrollmentRequestRepository,
	type EnrollmentStatus,
	hasActiveEnrollment,
	isEnrollmentStatus,
	isJustificationLength,
	isLearnerEmail,
	learnerEmailsMatch,
} from '@axc/domain';
import { type FieldError, failure, invalidRequest, type ServiceError, type ServiceResult, success } from './service-result.ts';

const LIST_FIELDS = new Set(['status', 'courseId', 'learnerEmail']);

export interface EnrollmentRequestList {
	items: EnrollmentRequest[];
}

export interface EnrollmentContext {
	courses: CourseRepository;
	enrollmentRequests: EnrollmentRequestRepository;
	now: () => string;
	createEnrollmentId: () => string;
}

interface CreateInput {
	courseId: string;
	learnerEmail: string;
	justification: string;
}

interface StatusUpdate {
	status: EnrollmentStatus;
	changedBy: string;
	reason: string | null;
}

interface ListFilter {
	status?: EnrollmentStatus;
	courseId?: string;
	learnerEmail?: string;
}

export async function createEnrollmentRequest(context: EnrollmentContext, body: unknown): Promise<ServiceResult<EnrollmentRequest>> {
	const parsed = parseCreate(body);
	if (!parsed.ok) {
		return parsed;
	}

	const input = parsed.value;
	const course = await context.courses.getById(input.courseId);
	if (course === undefined) {
		return failure({
			status: 404,
			code: 'COURSE_NOT_FOUND',
			message: 'The request could not be completed.',
			details: [{ field: 'courseId', message: 'No course exists with this id.' }],
		});
	}
	if (course.status !== 'active') {
		return failure({
			status: 409,
			code: 'COURSE_NOT_ACTIVE',
			message: 'The request could not be completed.',
			details: [{ field: 'courseId', message: 'Course status must be active.' }],
		});
	}

	const existing = await context.enrollmentRequests.list();
	if (hasActiveEnrollment(existing, input.courseId, input.learnerEmail)) {
		return failure({
			status: 409,
			code: 'DUPLICATE_ACTIVE_REQUEST',
			message: 'The request could not be completed.',
			details: [{ field: 'learnerEmail', message: 'A pending or approved request already exists for this course.' }],
		});
	}

	const timestamp = context.now();
	const request: EnrollmentRequest = {
		id: context.createEnrollmentId(),
		courseId: input.courseId,
		learnerEmail: input.learnerEmail,
		justification: input.justification,
		status: 'pending',
		createdAt: timestamp,
		updatedAt: timestamp,
		statusHistory: [
			{
				fromStatus: null,
				toStatus: 'pending',
				changedAt: timestamp,
				changedBy: ENROLLMENT_CREATED_BY,
				reason: null,
			},
		],
	};
	return success(await context.enrollmentRequests.save(request));
}

export async function getEnrollmentRequest(context: EnrollmentContext, id: string): Promise<ServiceResult<EnrollmentRequest>> {
	const found = await context.enrollmentRequests.getById(id);
	if (found === undefined) {
		return failure(requestNotFound());
	}
	return success(found);
}

export async function listEnrollmentRequests(context: EnrollmentContext, query: Readonly<Record<string, string>>): Promise<ServiceResult<EnrollmentRequestList>> {
	const parsed = parseListQuery(query);
	if (!parsed.ok) {
		return parsed;
	}
	const filter = parsed.value;
	const items = (await context.enrollmentRequests.list()).filter((request) => matchesFilter(request, filter));
	return success({ items });
}

export async function updateEnrollmentStatus(context: EnrollmentContext, id: string, body: unknown): Promise<ServiceResult<EnrollmentRequest>> {
	const parsed = parseStatusUpdate(body);
	if (!parsed.ok) {
		return parsed;
	}

	const current = await context.enrollmentRequests.getById(id);
	if (current === undefined) {
		return failure(requestNotFound());
	}

	const update = parsed.value;
	if (!canTransitionEnrollmentStatus(current.status, update.status)) {
		return failure({
			status: 409,
			code: 'INVALID_STATUS_TRANSITION',
			message: 'The request could not be completed.',
			details: [{ field: 'status', message: `Cannot change status from ${current.status} to ${update.status}.` }],
		});
	}

	const timestamp = context.now();
	const next: EnrollmentRequest = {
		...current,
		status: update.status,
		updatedAt: timestamp,
		statusHistory: [
			...current.statusHistory,
			{
				fromStatus: current.status,
				toStatus: update.status,
				changedAt: timestamp,
				changedBy: update.changedBy,
				reason: update.reason,
			},
		],
	};
	return success(await context.enrollmentRequests.save(next));
}

function matchesFilter(request: EnrollmentRequest, filter: ListFilter): boolean {
	if (filter.status !== undefined && request.status !== filter.status) {
		return false;
	}
	if (filter.courseId !== undefined && request.courseId !== filter.courseId) {
		return false;
	}
	if (filter.learnerEmail !== undefined && !learnerEmailsMatch(request.learnerEmail, filter.learnerEmail)) {
		return false;
	}
	return true;
}

function parseCreate(body: unknown): ServiceResult<CreateInput> {
	if (!isRecord(body)) {
		return failure(invalidRequest([{ field: 'body', message: 'Request body must be a JSON object.' }]));
	}
	const details: FieldError[] = [];
	const courseId = readRequiredString(body, 'courseId', details);
	const learnerEmail = readEmail(body, details);
	const justification = readJustification(body, details);
	if (details.length > 0 || courseId === undefined || learnerEmail === undefined || justification === undefined) {
		return failure(invalidRequest(details));
	}
	return success({ courseId, learnerEmail, justification });
}

function parseStatusUpdate(body: unknown): ServiceResult<StatusUpdate> {
	if (!isRecord(body)) {
		return failure(invalidRequest([{ field: 'body', message: 'Request body must be a JSON object.' }]));
	}
	const details: FieldError[] = [];
	const status = readStatus(body, details);
	const changedBy = readRequiredString(body, 'changedBy', details);
	const reason = readReason(body, status, details);
	if (details.length > 0 || status === undefined || changedBy === undefined) {
		return failure(invalidRequest(details));
	}
	return success({ status, changedBy, reason });
}

function parseListQuery(query: Readonly<Record<string, string>>): ServiceResult<ListFilter> {
	const details: FieldError[] = [];
	for (const field of Object.keys(query)) {
		if (!LIST_FIELDS.has(field)) {
			details.push({ field, message: `${field} is not a supported query parameter.` });
		}
	}
	const status = readListStatus(query, details);
	const courseId = readQueryText(query, 'courseId', details);
	const learnerEmail = readQueryText(query, 'learnerEmail', details);
	if (details.length > 0) {
		return failure(invalidRequest(details));
	}
	const filter: ListFilter = {};
	if (status !== undefined) {
		filter.status = status;
	}
	if (courseId !== undefined) {
		filter.courseId = courseId;
	}
	if (learnerEmail !== undefined) {
		filter.learnerEmail = learnerEmail;
	}
	return success(filter);
}

function readListStatus(query: Readonly<Record<string, string>>, details: FieldError[]): EnrollmentStatus | undefined {
	const value = query['status'];
	if (value === undefined) {
		return undefined;
	}
	if (!isEnrollmentStatus(value)) {
		details.push({ field: 'status', message: 'status must be pending, approved, rejected, or cancelled.' });
		return undefined;
	}
	return value;
}

function readQueryText(query: Readonly<Record<string, string>>, field: 'courseId' | 'learnerEmail', details: FieldError[]): string | undefined {
	const value = query[field];
	if (value === undefined) {
		return undefined;
	}
	if (value.trim() === '') {
		details.push({ field, message: `${field} must not be empty.` });
		return undefined;
	}
	return value.trim();
}

function readStatus(body: Record<string, unknown>, details: FieldError[]): EnrollmentStatus | undefined {
	const value = body['status'];
	if (typeof value !== 'string' || !isEnrollmentStatus(value)) {
		details.push({ field: 'status', message: 'status must be pending, approved, rejected, or cancelled.' });
		return undefined;
	}
	return value;
}

function readReason(body: Record<string, unknown>, status: EnrollmentStatus | undefined, details: FieldError[]): string | null {
	const value = body['reason'];
	if (status === 'rejected') {
		if (typeof value !== 'string' || value.trim() === '') {
			details.push({ field: 'reason', message: 'reason is required when rejecting an enrollment request.' });
			return null;
		}
		return value.trim();
	}
	if (value === undefined) {
		return null;
	}
	if (typeof value !== 'string') {
		details.push({ field: 'reason', message: 'reason must be a string.' });
		return null;
	}
	const trimmed = value.trim();
	return trimmed === '' ? null : trimmed;
}

function readEmail(body: Record<string, unknown>, details: FieldError[]): string | undefined {
	const value = body['learnerEmail'];
	if (typeof value !== 'string' || value.trim() === '') {
		details.push({ field: 'learnerEmail', message: 'learnerEmail is required.' });
		return undefined;
	}
	const email = value.trim();
	if (!isLearnerEmail(email)) {
		details.push({ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' });
		return undefined;
	}
	return email;
}

function readJustification(body: Record<string, unknown>, details: FieldError[]): string | undefined {
	const value = body['justification'];
	if (typeof value !== 'string') {
		details.push({ field: 'justification', message: 'justification is required.' });
		return undefined;
	}
	if (!isJustificationLength(value)) {
		details.push({ field: 'justification', message: 'justification must be between 20 and 500 characters.' });
		return undefined;
	}
	return value;
}

function readRequiredString(body: Record<string, unknown>, field: string, details: FieldError[]): string | undefined {
	const value = body[field];
	if (typeof value !== 'string' || value.trim() === '') {
		details.push({ field, message: `${field} is required.` });
		return undefined;
	}
	return value.trim();
}

function requestNotFound(): ServiceError {
	return {
		status: 404,
		code: 'ENROLLMENT_REQUEST_NOT_FOUND',
		message: 'The request could not be completed.',
		details: [{ field: 'id', message: 'No enrollment request exists with this id.' }],
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
