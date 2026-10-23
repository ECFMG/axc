import { type Course, type CoursesQuery, listCourses } from './courses.ts';
import { canTransition } from './enrollment-requests.rules.ts';
import { type CreateEnrollmentRequestInput, type EnrollmentRequest, type EnrollmentRequestsQuery, isValidEmail, isValidJustification, type UpdateEnrollmentRequestStatusInput } from './enrollment-requests.ts';

export type EnrollmentRequestErrorCode = 'INVALID_REQUEST' | 'COURSE_NOT_FOUND' | 'COURSE_NOT_ACTIVE' | 'DUPLICATE_ACTIVE_REQUEST' | 'ENROLLMENT_REQUEST_NOT_FOUND' | 'INVALID_STATUS_TRANSITION';

export class EnrollmentRequestError extends Error {
	readonly code: EnrollmentRequestErrorCode;
	readonly details: { field: string; message: string }[];
	constructor(code: EnrollmentRequestErrorCode, message: string, details: { field: string; message: string }[] = []) {
		super(message);
		this.name = 'EnrollmentRequestError';
		this.code = code;
		this.details = details;
	}
}

const COMPLETE = 'The request could not be completed.';
const catalogPage = (page: number): CoursesQuery => ({ page, pageSize: 50, sort: 'title' });

const findCourse = (id: string): Course | undefined => {
	const first = listCourses(catalogPage(1));
	const pages = Math.max(first.totalPages, 1);
	for (let page = 1; page <= pages; page += 1) {
		const result = page === 1 ? first : listCourses(catalogPage(page));
		const found = result.items.find((course) => course.id === id);
		if (found !== undefined) {
			return found;
		}
	}
	return undefined;
};

let seq = 0;

export const createEnrollmentRequestStore = ({ newId, now } = { newId: () => `enroll-${++seq}`, now: () => new Date() }) => {
	const items = new Map<string, EnrollmentRequest>();

	const create = (input: CreateEnrollmentRequestInput): EnrollmentRequest => {
		const details: { field: string; message: string }[] = [];
		if (input.courseId.length === 0) {
			details.push({ field: 'courseId', message: 'courseId is required.' });
		}
		if (!isValidEmail(input.learnerEmail)) {
			details.push({ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' });
		}
		if (!isValidJustification(input.justification)) {
			details.push({ field: 'justification', message: 'justification must be between 20 and 500 characters.' });
		}
		if (details.length > 0) {
			throw new EnrollmentRequestError('INVALID_REQUEST', COMPLETE, details);
		}

		const course = findCourse(input.courseId);
		if (course === undefined) {
			throw new EnrollmentRequestError('COURSE_NOT_FOUND', COMPLETE, [{ field: 'courseId', message: 'course was not found.' }]);
		}
		if (course.status !== 'active') {
			throw new EnrollmentRequestError('COURSE_NOT_ACTIVE', COMPLETE, [{ field: 'courseId', message: 'course must be active.' }]);
		}

		const email = input.learnerEmail.toLowerCase();
		for (const existing of items.values()) {
			if (existing.courseId === input.courseId && existing.learnerEmail.toLowerCase() === email && (existing.status === 'pending' || existing.status === 'approved')) {
				throw new EnrollmentRequestError('DUPLICATE_ACTIVE_REQUEST', COMPLETE, [{ field: 'learnerEmail', message: 'a pending or approved request already exists for this learner and course.' }]);
			}
		}

		const at = now().toISOString();
		const saved: EnrollmentRequest = {
			id: newId(),
			courseId: input.courseId,
			learnerEmail: input.learnerEmail,
			justification: input.justification,
			status: 'pending',
			createdAt: at,
			updatedAt: at,
			statusHistory: [{ fromStatus: null, toStatus: 'pending', changedAt: at, changedBy: 'system', reason: null }],
		};
		items.set(saved.id, saved);
		return saved;
	};

	const getById = (id: string): EnrollmentRequest => {
		const existing = items.get(id);
		if (existing === undefined) {
			throw new EnrollmentRequestError('ENROLLMENT_REQUEST_NOT_FOUND', COMPLETE, [{ field: 'id', message: 'enrollment request was not found.' }]);
		}
		return existing;
	};

	const list = (q: EnrollmentRequestsQuery): EnrollmentRequest[] => {
		const email = q.learnerEmail?.toLowerCase();
		return [...items.values()].filter((request) => {
			if (q.status !== undefined && request.status !== q.status) {
				return false;
			}
			if (q.courseId !== undefined && request.courseId !== q.courseId) {
				return false;
			}
			if (email !== undefined && request.learnerEmail.toLowerCase() !== email) {
				return false;
			}
			return true;
		});
	};

	const updateStatus = (id: string, input: UpdateEnrollmentRequestStatusInput): EnrollmentRequest => {
		const existing = getById(id);
		const details: { field: string; message: string }[] = [];
		if (input.changedBy.length === 0) {
			details.push({ field: 'changedBy', message: 'changedBy is required.' });
		}
		if (input.status === 'rejected') {
			const reason = input.reason;
			if (reason === undefined || reason.trim().length === 0) {
				details.push({ field: 'reason', message: 'reason is required when rejecting a request.' });
			}
		}
		if (details.length > 0) {
			throw new EnrollmentRequestError('INVALID_REQUEST', COMPLETE, details);
		}
		if (!canTransition(existing.status, input.status)) {
			throw new EnrollmentRequestError('INVALID_STATUS_TRANSITION', COMPLETE, [{ field: 'status', message: `cannot transition from ${existing.status} to ${input.status}.` }]);
		}
		const at = now().toISOString();
		const reason = input.reason === undefined ? null : input.reason;
		const updated: EnrollmentRequest = {
			...existing,
			status: input.status,
			updatedAt: at,
			statusHistory: [...existing.statusHistory, { fromStatus: existing.status, toStatus: input.status, changedAt: at, changedBy: input.changedBy, reason }],
		};
		items.set(id, updated);
		return updated;
	};

	return { create, getById, list, updateStatus };
};
