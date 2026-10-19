import {
	type Course,
	type CourseModality,
	type CourseRepository,
	type CourseSort,
	type CourseStatus,
	courseModalities,
	courseSorts,
	courseStatuses,
	type EnrollmentRequest,
	type EnrollmentRequestRepository,
	type EnrollmentStatus,
	enrollmentStatuses,
	isEnrollmentTransition,
} from '@axc/domain';

export interface CatalogErrorDetail {
	field: string;
	message: string;
}

export type CatalogErrorCode = 'INVALID_QUERY_PARAMETER' | 'INVALID_REQUEST' | 'COURSE_NOT_FOUND' | 'COURSE_NOT_ACTIVE' | 'DUPLICATE_ACTIVE_REQUEST' | 'ENROLLMENT_REQUEST_NOT_FOUND' | 'INVALID_STATUS_TRANSITION';

export class CatalogError extends Error {
	readonly code: CatalogErrorCode;
	readonly details: readonly CatalogErrorDetail[];

	constructor(code: CatalogErrorCode, message: string, details: readonly CatalogErrorDetail[] = []) {
		super(message);
		this.name = 'CatalogError';
		this.code = code;
		this.details = details;
	}
}

export interface CoursePage {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

const requestMessage = 'The request could not be completed.';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function searchCourses(repository: CourseRepository, query: Readonly<Record<string, string | undefined>>): Promise<CoursePage> {
	const parsed = parseCourseQuery(query);
	const filtered = (await repository.list()).filter((course) => matchesCourse(course, parsed));
	const sorted = [...filtered].sort((left, right) => compareCourses(left, right, parsed.sort));
	const start = (parsed.page - 1) * parsed.pageSize;
	const totalItems = sorted.length;
	return {
		items: sorted.slice(start, start + parsed.pageSize),
		page: parsed.page,
		pageSize: parsed.pageSize,
		totalItems,
		totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / parsed.pageSize),
	};
}

export async function createEnrollmentRequest(requests: EnrollmentRequestRepository, courses: CourseRepository, input: unknown): Promise<EnrollmentRequest> {
	const body = readObject(input);
	const courseIdValue = textField(body, 'courseId');
	const learnerEmailValue = textField(body, 'learnerEmail');
	const justificationValue = textField(body, 'justification');
	const courseId = typeof courseIdValue === 'string' ? courseIdValue.trim() : '';
	const learnerEmail = typeof learnerEmailValue === 'string' ? learnerEmailValue.trim() : '';
	const justification = typeof justificationValue === 'string' ? justificationValue : '';
	const details: CatalogErrorDetail[] = [];
	if (courseId === '') {
		details.push({ field: 'courseId', message: 'courseId is required.' });
	}
	if (!emailPattern.test(learnerEmail)) {
		details.push({ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' });
	}
	if (justification.length < 20 || justification.length > 500) {
		details.push({ field: 'justification', message: 'justification must be between 20 and 500 characters.' });
	}
	if (details.length > 0) {
		throw new CatalogError('INVALID_REQUEST', requestMessage, details);
	}

	const course = await courses.findById(courseId);
	if (course === undefined) {
		throw new CatalogError('COURSE_NOT_FOUND', 'The course does not exist.', [{ field: 'courseId', message: 'Course not found.' }]);
	}
	if (course.status !== 'active') {
		throw new CatalogError('COURSE_NOT_ACTIVE', 'The course is not active.', [{ field: 'courseId', message: 'Course is not active.' }]);
	}

	const emailKey = learnerEmail.toLowerCase();
	// shortcut: duplicate check can race across awaits, use a unique index when a real database is introduced.
	const duplicate = (await requests.list()).some((request) => request.courseId === courseId && request.learnerEmail.toLowerCase() === emailKey && (request.status === 'pending' || request.status === 'approved'));
	if (duplicate) {
		throw new CatalogError('DUPLICATE_ACTIVE_REQUEST', 'An active enrollment request already exists for this learner and course.', [
			{ field: 'learnerEmail', message: 'A learner cannot have more than one pending or approved request for the same course.' },
		]);
	}

	const timestamp = new Date().toISOString();
	const created: EnrollmentRequest = {
		id: requests.nextId(),
		courseId,
		learnerEmail,
		justification,
		status: 'pending',
		createdAt: timestamp,
		updatedAt: timestamp,
		statusHistory: [{ fromStatus: null, toStatus: 'pending', changedAt: timestamp, changedBy: 'system', reason: null }],
	};
	await requests.insert(created);
	return created;
}

export async function getEnrollmentRequest(requests: EnrollmentRequestRepository, id: string): Promise<EnrollmentRequest> {
	const request = await requests.findById(id);
	if (request === undefined) {
		throw new CatalogError('ENROLLMENT_REQUEST_NOT_FOUND', 'The enrollment request does not exist.', [{ field: 'id', message: 'Enrollment request not found.' }]);
	}
	return request;
}

export async function listEnrollmentRequests(requests: EnrollmentRequestRepository, query: Readonly<Record<string, string | undefined>>): Promise<EnrollmentRequest[]> {
	const status = parseStatusFilter(queryField(query, 'status'));
	const courseId = queryField(query, 'courseId');
	const email = queryField(query, 'learnerEmail')?.trim().toLowerCase();
	return (await requests.list()).filter((request) => {
		if (status !== undefined && request.status !== status) {
			return false;
		}
		if (courseId !== undefined && courseId !== '' && request.courseId !== courseId) {
			return false;
		}
		if (email !== undefined && email !== '' && request.learnerEmail.toLowerCase() !== email) {
			return false;
		}
		return true;
	});
}

export async function updateEnrollmentStatus(requests: EnrollmentRequestRepository, id: string, input: unknown): Promise<EnrollmentRequest> {
	const command = parseStatusCommand(input);
	const current = await requests.findById(id);
	if (current === undefined) {
		throw new CatalogError('ENROLLMENT_REQUEST_NOT_FOUND', 'The enrollment request does not exist.', [{ field: 'id', message: 'Enrollment request not found.' }]);
	}
	if (!isEnrollmentTransition(current.status, command.status)) {
		throw new CatalogError('INVALID_STATUS_TRANSITION', 'The status transition is not allowed.', [{ field: 'status', message: `Cannot change status from ${current.status} to ${command.status}.` }]);
	}
	const changedAt = new Date().toISOString();
	const updated: EnrollmentRequest = {
		...current,
		status: command.status,
		updatedAt: changedAt,
		statusHistory: [...current.statusHistory, { fromStatus: current.status, toStatus: command.status, changedAt, changedBy: command.changedBy, reason: command.reason }],
	};
	await requests.replace(updated);
	return updated;
}

interface ParsedCourseQuery {
	q: string | undefined;
	modality: CourseModality | undefined;
	status: CourseStatus | undefined;
	tag: string | undefined;
	page: number;
	pageSize: number;
	sort: CourseSort;
}

function parseCourseQuery(query: Readonly<Record<string, string | undefined>>): ParsedCourseQuery {
	const details: CatalogErrorDetail[] = [];
	const modality = readChoice(queryField(query, 'modality'), courseModalities, 'modality', 'modality must be online, in-person, or hybrid.', details);
	const status = readChoice(queryField(query, 'status'), courseStatuses, 'status', 'status must be draft, active, or retired.', details);
	const sort = readChoice(queryField(query, 'sort'), courseSorts, 'sort', 'sort must be title, createdAt, or updatedAt.', details);
	const page = readInt(queryField(query, 'page'), 'page', 1, 1, Number.MAX_SAFE_INTEGER, 'page must be an integer greater than or equal to 1.', details);
	const pageSize = readInt(queryField(query, 'pageSize'), 'pageSize', 10, 1, 50, 'pageSize must be between 1 and 50.', details);
	if (details.length > 0) {
		throw new CatalogError('INVALID_QUERY_PARAMETER', 'One or more query parameters are invalid.', details);
	}
	return { q: normalizeSearchText(queryField(query, 'q')), modality, status, tag: normalizeSearchText(queryField(query, 'tag')), page, pageSize, sort: sort ?? 'title' };
}

function matchesCourse(course: Course, query: ParsedCourseQuery): boolean {
	if (query.modality !== undefined && course.modality !== query.modality) {
		return false;
	}
	if (query.status !== undefined && course.status !== query.status) {
		return false;
	}
	if (query.tag !== undefined && !course.tags.some((tag) => tag.toLowerCase() === query.tag)) {
		return false;
	}
	if (query.q !== undefined) {
		const needle = query.q;
		const haystack = [course.title, course.summary, ...course.tags];
		if (!haystack.some((value) => value.toLowerCase().includes(needle))) {
			return false;
		}
	}
	return true;
}

function compareCourses(left: Course, right: Course, sort: CourseSort): number {
	const primary = left[sort].localeCompare(right[sort]);
	return primary === 0 ? left.id.localeCompare(right.id) : primary;
}

function parseStatusFilter(value: string | undefined): EnrollmentStatus | undefined {
	if (value === undefined) {
		return undefined;
	}
	if (!isEnrollmentStatus(value)) {
		throw new CatalogError('INVALID_REQUEST', requestMessage, [{ field: 'status', message: 'status must be pending, approved, rejected, or cancelled.' }]);
	}
	return value;
}

interface StatusCommand {
	status: EnrollmentStatus;
	changedBy: string;
	reason: string | null;
}

function parseStatusCommand(input: unknown): StatusCommand {
	const body = readObject(input);
	const details: CatalogErrorDetail[] = [];
	const statusValue = textField(body, 'status');
	const status = typeof statusValue === 'string' && isEnrollmentStatus(statusValue) ? statusValue : undefined;
	if (status === undefined) {
		details.push({ field: 'status', message: 'status must be pending, approved, rejected, or cancelled.' });
	}
	const changedByValue = textField(body, 'changedBy');
	const changedBy = typeof changedByValue === 'string' ? changedByValue.trim() : '';
	if (changedBy === '') {
		details.push({ field: 'changedBy', message: 'changedBy is required.' });
	}
	let reason: string | null = null;
	const reasonValue = textField(body, 'reason');
	if (reasonValue !== undefined && reasonValue !== null) {
		if (typeof reasonValue !== 'string') {
			details.push({ field: 'reason', message: 'reason must be a string.' });
		} else {
			const trimmed = reasonValue.trim();
			reason = trimmed === '' ? null : trimmed;
		}
	}
	if (status === 'rejected' && reason === null && !details.some((detail) => detail.field === 'reason')) {
		details.push({ field: 'reason', message: 'reason is required when rejecting a request.' });
	}
	if (details.length > 0 || status === undefined || changedBy === '') {
		throw new CatalogError('INVALID_REQUEST', requestMessage, details);
	}
	return { status, changedBy, reason };
}

function readObject(input: unknown): Record<string, unknown> {
	if (!isRecord(input)) {
		throw new CatalogError('INVALID_REQUEST', requestMessage, [{ field: 'body', message: 'Request body must be an object.' }]);
	}
	return input;
}

function isRecord(input: unknown): input is Record<string, unknown> {
	return typeof input === 'object' && input !== null && !Array.isArray(input);
}

function textField(record: Readonly<Record<string, unknown>>, key: string): unknown {
	return record[key];
}

function queryField(query: Readonly<Record<string, string | undefined>>, key: string): string | undefined {
	return query[key];
}

function readChoice<T extends string>(value: string | undefined, allowed: readonly T[], field: string, message: string, details: CatalogErrorDetail[]): T | undefined {
	if (value === undefined) {
		return undefined;
	}
	const match = allowed.find((item) => item === value);
	if (match === undefined) {
		details.push({ field, message });
		return undefined;
	}
	return match;
}

function readInt(value: string | undefined, field: string, fallback: number, min: number, max: number, message: string, details: CatalogErrorDetail[]): number {
	if (value === undefined) {
		return fallback;
	}
	if (!/^\d+$/.test(value)) {
		details.push({ field, message });
		return fallback;
	}
	const parsed = Number(value);
	if (parsed < min || parsed > max) {
		details.push({ field, message });
		return fallback;
	}
	return parsed;
}

function normalizeSearchText(value: string | undefined): string | undefined {
	if (value === undefined) {
		return undefined;
	}
	const trimmed = value.trim().toLowerCase();
	return trimmed === '' ? undefined : trimmed;
}

function isEnrollmentStatus(value: string): value is EnrollmentStatus {
	return (enrollmentStatuses as readonly string[]).includes(value);
}
