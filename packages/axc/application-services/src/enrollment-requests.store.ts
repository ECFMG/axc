import { findCourse } from './courses.ts';
import { canTransitionEnrollmentStatus, isValidJustification, isValidLearnerEmail, JUSTIFICATION_MAX, JUSTIFICATION_MIN, normalizeLearnerEmail } from './enrollment-requests.rules.ts';
import type { ChangeEnrollmentStatusInput, CreateEnrollmentInput, EnrollmentListQuery, EnrollmentRequest, EnrollmentStatus, StatusHistoryEntry } from './enrollment-requests.ts';

export type EnrollmentErrorCode = 'COURSE_NOT_FOUND' | 'COURSE_NOT_ACTIVE' | 'DUPLICATE_ACTIVE_REQUEST' | 'ENROLLMENT_REQUEST_NOT_FOUND' | 'INVALID_STATUS_TRANSITION' | 'INVALID_REQUEST';

export class EnrollmentError extends Error {
	readonly code: EnrollmentErrorCode;
	readonly field: string;

	constructor(code: EnrollmentErrorCode, field: string, message: string) {
		super(message);
		this.name = 'EnrollmentError';
		this.code = code;
		this.field = field;
	}
}

interface EnrollmentStoreDeps {
	newId?: () => string;
	now?: () => Date;
}

export interface EnrollmentStore {
	list(query: EnrollmentListQuery): EnrollmentRequest[];
	get(id: string): EnrollmentRequest;
	create(input: CreateEnrollmentInput): EnrollmentRequest;
	changeStatus(id: string, input: ChangeEnrollmentStatusInput): EnrollmentRequest;
}

const activeStatuses: ReadonlySet<EnrollmentStatus> = new Set(['pending', 'approved']);

const clone = (item: EnrollmentRequest): EnrollmentRequest => ({
	id: item.id,
	courseId: item.courseId,
	learnerEmail: item.learnerEmail,
	justification: item.justification,
	status: item.status,
	createdAt: item.createdAt,
	updatedAt: item.updatedAt,
	statusHistory: item.statusHistory.map((entry) => ({
		fromStatus: entry.fromStatus,
		toStatus: entry.toStatus,
		changedAt: entry.changedAt,
		changedBy: entry.changedBy,
		reason: entry.reason,
	})),
});

const activeKey = (learnerEmail: string, courseId: string): string => `${learnerEmail}\u0000${courseId}`;

export const createEnrollmentStore = (deps: EnrollmentStoreDeps = {}): EnrollmentStore => {
	let seq = 0;
	const newId =
		deps.newId ??
		((): string => {
			seq += 1;
			return `enroll-${String(seq).padStart(3, '0')}`;
		});
	const now = deps.now ?? ((): Date => new Date());
	const items = new Map<string, EnrollmentRequest>();
	const activeKeys = new Set<string>();

	const list = (query: EnrollmentListQuery): EnrollmentRequest[] => {
		const email = query.learnerEmail === undefined ? undefined : normalizeLearnerEmail(query.learnerEmail);
		return [...items.values()]
			.filter((item) => query.status === undefined || item.status === query.status)
			.filter((item) => query.courseId === undefined || item.courseId === query.courseId)
			.filter((item) => email === undefined || item.learnerEmail === email)
			.sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id))
			.map((item) => clone(item));
	};

	const get = (id: string): EnrollmentRequest => {
		const item = items.get(id);
		if (item === undefined) throw new EnrollmentError('ENROLLMENT_REQUEST_NOT_FOUND', 'id', `Enrollment request ${id} was not found.`);
		return clone(item);
	};

	const create = (input: CreateEnrollmentInput): EnrollmentRequest => {
		if (!isValidLearnerEmail(input.learnerEmail)) throw new EnrollmentError('INVALID_REQUEST', 'learnerEmail', 'learnerEmail must be a valid email address.');
		if (!isValidJustification(input.justification)) {
			throw new EnrollmentError('INVALID_REQUEST', 'justification', `justification must be between ${JUSTIFICATION_MIN} and ${JUSTIFICATION_MAX} characters.`);
		}
		const course = findCourse(input.courseId);
		if (course === undefined) throw new EnrollmentError('COURSE_NOT_FOUND', 'courseId', `Course ${input.courseId} was not found.`);
		if (course.status !== 'active') throw new EnrollmentError('COURSE_NOT_ACTIVE', 'courseId', `Course ${input.courseId} is not active.`);
		const learnerEmail = normalizeLearnerEmail(input.learnerEmail);
		const key = activeKey(learnerEmail, course.id);
		if (activeKeys.has(key)) throw new EnrollmentError('DUPLICATE_ACTIVE_REQUEST', 'learnerEmail', 'An active enrollment request already exists for this learner and course.');
		const timestamp = now().toISOString();
		const created: EnrollmentRequest = {
			id: newId(),
			courseId: course.id,
			learnerEmail,
			justification: input.justification,
			status: 'pending',
			createdAt: timestamp,
			updatedAt: timestamp,
			statusHistory: [
				{
					fromStatus: null,
					toStatus: 'pending',
					changedAt: timestamp,
					changedBy: 'system',
					reason: null,
				},
			],
		};
		items.set(created.id, created);
		activeKeys.add(key);
		return clone(created);
	};

	const changeStatus = (id: string, input: ChangeEnrollmentStatusInput): EnrollmentRequest => {
		const item = items.get(id);
		if (item === undefined) throw new EnrollmentError('ENROLLMENT_REQUEST_NOT_FOUND', 'id', `Enrollment request ${id} was not found.`);
		const changedBy = input.changedBy.trim();
		if (changedBy === '') throw new EnrollmentError('INVALID_REQUEST', 'changedBy', 'changedBy is required.');
		const trimmedReason = input.reason?.trim() ?? '';
		if (input.status === 'rejected' && trimmedReason === '') throw new EnrollmentError('INVALID_REQUEST', 'reason', 'reason is required when rejecting a request.');
		if (!canTransitionEnrollmentStatus(item.status, input.status)) {
			throw new EnrollmentError('INVALID_STATUS_TRANSITION', 'status', `Cannot change status from ${item.status} to ${input.status}.`);
		}
		const timestamp = now().toISOString();
		const history: StatusHistoryEntry = {
			fromStatus: item.status,
			toStatus: input.status,
			changedAt: timestamp,
			changedBy,
			reason: trimmedReason === '' ? null : trimmedReason,
		};
		const updated: EnrollmentRequest = {
			...item,
			status: input.status,
			updatedAt: timestamp,
			statusHistory: [...item.statusHistory, history],
		};
		items.set(item.id, updated);
		const key = activeKey(item.learnerEmail, item.courseId);
		if (activeStatuses.has(input.status)) activeKeys.add(key);
		else activeKeys.delete(key);
		return clone(updated);
	};

	return { list, get, create, changeStatus };
};
