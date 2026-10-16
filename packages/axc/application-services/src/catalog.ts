import { randomUUID } from 'node:crypto';
import { type Course, canTransition, courseStatuses, type EnrollmentRequest, type EnrollmentStatus, enrollmentStatuses, modalities } from '@axc/domain';
import { InMemoryCatalogRepository } from '@axc/persistence';

export interface ErrorDetail {
	field: string;
	message: string;
}
export class CatalogError extends Error {
	readonly status: number;
	readonly code: string;
	readonly details: ErrorDetail[];
	constructor(status: number, code: string, message: string, details: ErrorDetail[] = []) {
		super(message);
		this.status = status;
		this.code = code;
		this.details = details;
	}
}

function invalid(field: string, message: string, code = 'INVALID_REQUEST'): never {
	throw new CatalogError(400, code, code === 'INVALID_QUERY_PARAMETER' ? 'One or more query parameters are invalid.' : 'The request could not be completed.', [{ field, message }]);
}
function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function requiredString(body: Record<string, unknown>, field: string): string {
	const value = body[field];
	if (typeof value !== 'string' || value.trim() === '') invalid(field, `${field} is required.`);
	return value.trim();
}
function optionalQuery(params: URLSearchParams, field: string): string | undefined {
	const values = params.getAll(field);
	if (values.length > 1 || (values.length === 1 && values[0]?.trim() === '')) invalid(field, `${field} must occur once and cannot be empty.`, 'INVALID_QUERY_PARAMETER');
	return values[0]?.trim();
}
function enumQuery<T extends string>(params: URLSearchParams, field: string, values: readonly T[]): T | undefined {
	const value = optionalQuery(params, field);
	if (value !== undefined && !values.includes(value as T)) invalid(field, `${field} must be one of: ${values.join(', ')}.`, 'INVALID_QUERY_PARAMETER');
	return value as T | undefined;
}
function integerQuery(params: URLSearchParams, field: string, fallback: number, maximum?: number): number {
	const raw = optionalQuery(params, field);
	if (raw === undefined) return fallback;
	if (!/^[1-9]\d*$/.test(raw)) invalid(field, `${field} must be a positive integer.`, 'INVALID_QUERY_PARAMETER');
	const value = Number(raw);
	if (!Number.isSafeInteger(value) || (maximum !== undefined && value > maximum)) invalid(field, `${field} must be between 1 and ${maximum ?? Number.MAX_SAFE_INTEGER}.`, 'INVALID_QUERY_PARAMETER');
	return value;
}

export class CatalogService {
	private readonly repository: InMemoryCatalogRepository;
	constructor(repository: InMemoryCatalogRepository = new InMemoryCatalogRepository()) {
		this.repository = repository;
	}

	searchCourses(params: URLSearchParams): { items: Course[]; page: number; pageSize: number; totalItems: number; totalPages: number } {
		for (const key of params.keys()) if (!['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort'].includes(key)) invalid(key, `${key} is not supported.`, 'INVALID_QUERY_PARAMETER');
		const q = optionalQuery(params, 'q')?.toLowerCase();
		const modality = enumQuery(params, 'modality', modalities);
		const status = enumQuery(params, 'status', courseStatuses);
		const tag = optionalQuery(params, 'tag')?.toLowerCase();
		const page = integerQuery(params, 'page', 1);
		const pageSize = integerQuery(params, 'pageSize', 10, 50);
		const sort = enumQuery(params, 'sort', ['title', 'createdAt', 'updatedAt'] as const) ?? 'title';
		const filtered = this.repository
			.listCourses()
			.filter(
				(course) =>
					(modality === undefined || course.modality === modality) &&
					(status === undefined || course.status === status) &&
					(tag === undefined || course.tags.some((item) => item.toLowerCase() === tag)) &&
					(q === undefined || [course.title, course.summary, ...course.tags].some((item) => item.toLowerCase().includes(q))),
			);
		filtered.sort((a, b) => a[sort].localeCompare(b[sort]) || a.id.localeCompare(b.id));
		return { items: filtered.slice((page - 1) * pageSize, page * pageSize), page, pageSize, totalItems: filtered.length, totalPages: Math.ceil(filtered.length / pageSize) };
	}

	createRequest(input: unknown): EnrollmentRequest {
		if (!isRecord(input)) invalid('body', 'A JSON object is required.');
		const courseId = requiredString(input, 'courseId');
		const learnerEmail = requiredString(input, 'learnerEmail').toLowerCase();
		const justification = requiredString(input, 'justification');
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(learnerEmail)) invalid('learnerEmail', 'learnerEmail must be a valid email address.');
		if (justification.length < 20 || justification.length > 500) invalid('justification', 'justification must be between 20 and 500 characters.');
		const course = this.repository.getCourse(courseId);
		if (course === undefined) throw new CatalogError(404, 'COURSE_NOT_FOUND', 'Course not found.');
		if (course.status !== 'active') throw new CatalogError(409, 'COURSE_NOT_ACTIVE', 'Course is not active.');
		if (this.repository.listRequests().some((request) => request.courseId === courseId && request.learnerEmail === learnerEmail && (request.status === 'pending' || request.status === 'approved')))
			throw new CatalogError(409, 'DUPLICATE_ACTIVE_REQUEST', 'An active request already exists.');
		const now = new Date().toISOString();
		const request: EnrollmentRequest = {
			id: `enroll-${randomUUID()}`,
			courseId,
			learnerEmail,
			justification,
			status: 'pending',
			createdAt: now,
			updatedAt: now,
			statusHistory: [{ fromStatus: null, toStatus: 'pending', changedAt: now, changedBy: 'system', reason: null }],
		};
		this.repository.saveRequest(request);
		return request;
	}

	getRequest(id: string): EnrollmentRequest {
		const request = this.repository.getRequest(id);
		if (request === undefined) throw new CatalogError(404, 'ENROLLMENT_REQUEST_NOT_FOUND', 'Enrollment request not found.');
		return request;
	}

	listRequests(params: URLSearchParams): EnrollmentRequest[] {
		for (const key of params.keys()) if (!['status', 'courseId', 'learnerEmail'].includes(key)) invalid(key, `${key} is not supported.`, 'INVALID_QUERY_PARAMETER');
		const status = enumQuery(params, 'status', enrollmentStatuses);
		const courseId = optionalQuery(params, 'courseId');
		const learnerEmail = optionalQuery(params, 'learnerEmail')?.toLowerCase();
		return this.repository
			.listRequests()
			.filter((request) => (status === undefined || request.status === status) && (courseId === undefined || request.courseId === courseId) && (learnerEmail === undefined || request.learnerEmail === learnerEmail));
	}

	changeStatus(id: string, input: unknown): EnrollmentRequest {
		const request = this.getRequest(id);
		if (!isRecord(input)) invalid('body', 'A JSON object is required.');
		const status = requiredString(input, 'status') as EnrollmentStatus;
		const changedBy = requiredString(input, 'changedBy');
		if (!enrollmentStatuses.includes(status)) invalid('status', `status must be one of: ${enrollmentStatuses.join(', ')}.`);
		const reason = input['reason'];
		if (status === 'rejected' && (typeof reason !== 'string' || reason.trim() === '')) invalid('reason', 'reason is required for rejection.');
		if (reason !== undefined && typeof reason !== 'string') invalid('reason', 'reason must be a string.');
		if (!canTransition(request.status, status)) throw new CatalogError(409, 'INVALID_STATUS_TRANSITION', `Cannot transition from ${request.status} to ${status}.`);
		const now = new Date().toISOString();
		request.statusHistory.push({ fromStatus: request.status, toStatus: status, changedAt: now, changedBy, reason: typeof reason === 'string' && reason.trim() !== '' ? reason.trim() : null });
		request.status = status;
		request.updatedAt = now;
		this.repository.saveRequest(request);
		return request;
	}
}
