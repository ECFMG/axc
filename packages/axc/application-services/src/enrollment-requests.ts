import type { CourseRepository, EnrollmentRequest, EnrollmentRequestRepository, EnrollmentRequestStatus, StatusHistoryEntry } from '@axc/domain';
import type { RawCourseQuery } from './course-catalog.ts';

export const ENROLLMENT_REQUEST_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'] as const satisfies readonly EnrollmentRequestStatus[];

export const JUSTIFICATION_MIN_LENGTH = 20;
export const JUSTIFICATION_MAX_LENGTH = 500;
export const LEARNER_EMAIL_MAX_LENGTH = 254;
export const CHANGED_BY_MAX_LENGTH = 200;
export const REASON_MAX_LENGTH = 500;

/** Actor recorded in the status history for changes the system makes itself (for example, creation). */
export const SYSTEM_ACTOR = 'system';

/** Status changes an enrollment request may go through; any pair not listed is rejected. */
export const ALLOWED_STATUS_TRANSITIONS: Readonly<Record<EnrollmentRequestStatus, readonly EnrollmentRequestStatus[]>> = {
	pending: ['approved', 'rejected', 'cancelled'],
	approved: ['cancelled'],
	rejected: [],
	cancelled: [],
};

/** Statuses that block a learner from submitting another request for the same course. */
export const ACTIVE_REQUEST_STATUSES: readonly EnrollmentRequestStatus[] = ['pending', 'approved'];

export type EnrollmentErrorCode = 'INVALID_REQUEST' | 'COURSE_NOT_FOUND' | 'COURSE_NOT_ACTIVE' | 'DUPLICATE_ACTIVE_REQUEST' | 'ENROLLMENT_REQUEST_NOT_FOUND' | 'INVALID_STATUS_TRANSITION';

/** Same shape as `QueryParameterError`. */
export interface FieldError {
	field: string;
	message: string;
}

export interface EnrollmentError {
	code: EnrollmentErrorCode;
	message: string;
	details: FieldError[];
}

export type EnrollmentOutcome<T> = { ok: true; result: T } | { ok: false; error: EnrollmentError };

export interface EnrollmentRequestList {
	items: EnrollmentRequest[];
	totalItems: number;
}

export interface CreateEnrollmentRequestInput {
	courseId: string;
	learnerEmail: string;
	justification: string;
}

export interface StatusUpdateInput {
	status: EnrollmentRequestStatus;
	changedBy: string;
	reason: string | null;
}

export interface EnrollmentRequestListCriteria {
	status?: EnrollmentRequestStatus;
	courseId?: string;
	learnerEmail?: string;
}

export type EnrollmentParseResult<T> = { ok: true; value: T } | { ok: false; errors: FieldError[] };

export const INVALID_REQUEST_MESSAGE = 'The request could not be completed.';

/** Field name used in `details` when the body as a whole is unusable (not JSON, or not a JSON object). */
export const BODY_FIELD = 'body';

const ERROR_MESSAGES: Readonly<Record<Exclude<EnrollmentErrorCode, 'INVALID_REQUEST'>, string>> = {
	COURSE_NOT_FOUND: 'The requested course does not exist.',
	COURSE_NOT_ACTIVE: 'Enrollment requests can only be submitted for active courses.',
	DUPLICATE_ACTIVE_REQUEST: 'The learner already has a pending or approved request for this course.',
	ENROLLMENT_REQUEST_NOT_FOUND: 'The requested enrollment request does not exist.',
	INVALID_STATUS_TRANSITION: 'The enrollment request cannot move from its current status to the requested status.',
};

export const invalidRequest = (details: FieldError[]): EnrollmentError => ({ code: 'INVALID_REQUEST', message: INVALID_REQUEST_MESSAGE, details });

const failure = <T>(code: Exclude<EnrollmentErrorCode, 'INVALID_REQUEST'>): EnrollmentOutcome<T> => ({ ok: false, error: { code, message: ERROR_MESSAGES[code], details: [] } });

const success = <T>(result: T): EnrollmentOutcome<T> => ({ ok: true, result });

// ---------------------------------------------------------------------------
// Field parsing
// ---------------------------------------------------------------------------

/** `local@domain.tld`: exactly one `@`, no whitespace, and a domain of two or more non-empty dot-separated labels. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

export function isValidEmail(value: string): boolean {
	return EMAIL_PATTERN.test(value);
}

export function canTransition(from: EnrollmentRequestStatus, to: EnrollmentRequestStatus): boolean {
	return ALLOWED_STATUS_TRANSITIONS[from].includes(to);
}

type FieldOutcome<T> = { ok: true; value: T } | { ok: false; message: string };

type BodyParsers<T> = { readonly [K in keyof T]-?: (value: unknown) => FieldOutcome<T[K]> };

const accept = <T>(value: T): FieldOutcome<T> => ({ ok: true, value });

const reject = <T>(message: string): FieldOutcome<T> => ({ ok: false, message });

const isJsonObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

const isStatus = (value: unknown): value is EnrollmentRequestStatus => (ENROLLMENT_REQUEST_STATUSES as readonly unknown[]).includes(value);

/** Wraps a parser for a required string field: missing and non-string values are rejected before `parse` runs. */
const requiredString =
	<T>(field: string, parse: (value: string) => FieldOutcome<T>) =>
	(value: unknown): FieldOutcome<T> => {
		if (value === undefined) {
			return reject(`${field} is required.`);
		}
		return typeof value === 'string' ? parse(value) : reject(`${field} must be a string.`);
	};

const parseCourseId = requiredString<string>('courseId', (value) => (value.trim() === '' ? reject('courseId must not be empty.') : accept(value)));

const parseLearnerEmail = requiredString<string>('learnerEmail', (value) => {
	const trimmed = value.trim();
	if (trimmed.length > LEARNER_EMAIL_MAX_LENGTH) {
		return reject(`learnerEmail must be at most ${LEARNER_EMAIL_MAX_LENGTH} characters.`);
	}
	return isValidEmail(trimmed) ? accept(trimmed.toLowerCase()) : reject('learnerEmail must be a valid email address.');
});

const parseJustification = requiredString<string>('justification', (value) => {
	const trimmed = value.trim();
	return trimmed.length >= JUSTIFICATION_MIN_LENGTH && trimmed.length <= JUSTIFICATION_MAX_LENGTH ? accept(trimmed) : reject(`justification must be between ${JUSTIFICATION_MIN_LENGTH} and ${JUSTIFICATION_MAX_LENGTH} characters.`);
});

const parseStatus = (value: unknown): FieldOutcome<EnrollmentRequestStatus> => (isStatus(value) ? accept(value) : reject(`status must be one of: ${ENROLLMENT_REQUEST_STATUSES.join(', ')}.`));

const parseChangedBy = requiredString<string>('changedBy', (value) => {
	const trimmed = value.trim();
	if (trimmed === '') {
		return reject('changedBy must not be empty.');
	}
	return trimmed.length <= CHANGED_BY_MAX_LENGTH ? accept(trimmed) : reject(`changedBy must be at most ${CHANGED_BY_MAX_LENGTH} characters.`);
});

/** Optional: absent, null, and blank all become `null`. Whether a reason is required depends on the status. */
const parseReason = (value: unknown): FieldOutcome<string | null> => {
	if (value === undefined || value === null) {
		return accept(null);
	}
	if (typeof value !== 'string') {
		return reject('reason must be a string.');
	}
	const trimmed = value.trim();
	if (trimmed.length > REASON_MAX_LENGTH) {
		return reject(`reason must be at most ${REASON_MAX_LENGTH} characters.`);
	}
	return accept(trimmed === '' ? null : trimmed);
};

const CREATE_PARSERS: BodyParsers<CreateEnrollmentRequestInput> = {
	courseId: parseCourseId,
	learnerEmail: parseLearnerEmail,
	justification: parseJustification,
};

const STATUS_UPDATE_PARSERS: BodyParsers<StatusUpdateInput> = {
	status: parseStatus,
	changedBy: parseChangedBy,
	reason: parseReason,
};

interface ParsedFields<T> {
	values: Partial<T>;
	errors: FieldError[];
}

/** Runs every field parser and reports unknown fields, collecting all errors. */
function parseFields<T>(body: unknown, parsers: BodyParsers<T>): ParsedFields<T> {
	if (!isJsonObject(body)) {
		return { values: {}, errors: [{ field: BODY_FIELD, message: 'The request body must be a JSON object.' }] };
	}
	const values: Partial<T> = {};
	const errors: FieldError[] = [];
	const fields = Object.keys(parsers) as (keyof T & string)[];

	for (const field of fields) {
		const outcome = parsers[field](body[field]);
		if (outcome.ok) {
			values[field] = outcome.value;
		} else {
			errors.push({ field, message: outcome.message });
		}
	}
	for (const name of Object.keys(body).filter((key) => !(fields as string[]).includes(key))) {
		errors.push({ field: name, message: `${name} is not a supported field.` });
	}
	return { values, errors };
}

/** Only called when every parser succeeded, so every field of `T` is set. */
const toResult = <T>({ values, errors }: ParsedFields<T>): EnrollmentParseResult<T> => (errors.length > 0 ? { ok: false, errors } : { ok: true, value: values as T });

export function parseCreateEnrollmentRequest(body: unknown): EnrollmentParseResult<CreateEnrollmentRequestInput> {
	return toResult(parseFields(body, CREATE_PARSERS));
}

export function parseStatusUpdate(body: unknown): EnrollmentParseResult<StatusUpdateInput> {
	const parsed = parseFields(body, STATUS_UPDATE_PARSERS);
	if (parsed.values.status === 'rejected' && parsed.values.reason === null) {
		parsed.errors.push({ field: 'reason', message: 'reason is required when status is rejected.' });
	}
	return toResult(parsed);
}

// ---------------------------------------------------------------------------
// List query parsing
// ---------------------------------------------------------------------------

const LIST_QUERY_FIELDS = ['status', 'courseId', 'learnerEmail'] as const;

type ListQueryField = (typeof LIST_QUERY_FIELDS)[number];

type QueryParsers = { readonly [K in ListQueryField]: (value: string) => FieldOutcome<EnrollmentRequestListCriteria[K]> };

/** Trimmed; an empty value means "no filter". */
const parseTextFilter = (value: string): FieldOutcome<string | undefined> => {
	const trimmed = value.trim();
	return accept(trimmed === '' ? undefined : trimmed);
};

const QUERY_PARSERS: QueryParsers = {
	status: parseStatus,
	courseId: parseTextFilter,
	learnerEmail: parseTextFilter,
};

const isListQueryField = (name: string): name is ListQueryField => (LIST_QUERY_FIELDS as readonly string[]).includes(name);

function applyQueryField<K extends ListQueryField>(field: K, values: readonly string[] | undefined, criteria: EnrollmentRequestListCriteria, errors: FieldError[]): void {
	if (values === undefined || values.length === 0) {
		return;
	}
	const [value] = values;
	if (values.length > 1 || value === undefined) {
		errors.push({ field, message: `${field} must be specified at most once.` });
		return;
	}
	const outcome = QUERY_PARSERS[field](value);
	if (!outcome.ok) {
		errors.push({ field, message: outcome.message });
	} else if (outcome.value !== undefined) {
		criteria[field] = outcome.value;
	}
}

/** Validates the list query parameters and turns them into filter criteria, collecting every error. */
export function parseEnrollmentRequestListQuery(raw: RawCourseQuery): EnrollmentParseResult<EnrollmentRequestListCriteria> {
	const criteria: EnrollmentRequestListCriteria = {};
	const errors: FieldError[] = [];

	for (const field of LIST_QUERY_FIELDS) {
		applyQueryField(field, raw[field], criteria, errors);
	}
	for (const name of Object.keys(raw).filter((key) => !isListQueryField(key))) {
		errors.push({ field: name, message: `${name} is not a supported query parameter.` });
	}

	return errors.length > 0 ? { ok: false, errors } : { ok: true, value: criteria };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export interface EnrollmentRequestService {
	create(body: unknown): Promise<EnrollmentOutcome<EnrollmentRequest>>;
	getById(id: string): Promise<EnrollmentOutcome<EnrollmentRequest>>;
	list(raw: RawCourseQuery): Promise<EnrollmentOutcome<EnrollmentRequestList>>;
	updateStatus(id: string, body: unknown): Promise<EnrollmentOutcome<EnrollmentRequest>>;
}

export interface EnrollmentRequestServiceDependencies {
	courseRepository: CourseRepository;
	enrollmentRequestRepository: EnrollmentRequestRepository;
	now: () => Date;
}

const sameEmail = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase();

const isActiveDuplicate = (request: EnrollmentRequest, input: CreateEnrollmentRequestInput): boolean =>
	request.courseId === input.courseId && sameEmail(request.learnerEmail, input.learnerEmail) && ACTIVE_REQUEST_STATUSES.includes(request.status);

const matchesListCriteria = (request: EnrollmentRequest, criteria: EnrollmentRequestListCriteria): boolean =>
	(criteria.status === undefined || request.status === criteria.status) &&
	(criteria.courseId === undefined || request.courseId === criteria.courseId) &&
	(criteria.learnerEmail === undefined || sameEmail(request.learnerEmail, criteria.learnerEmail));

const compareIds = (a: string, b: string): number => {
	if (a === b) {
		return 0;
	}
	return a < b ? -1 : 1;
};

const byCreatedAtThenId = (a: EnrollmentRequest, b: EnrollmentRequest): number => Date.parse(a.createdAt) - Date.parse(b.createdAt) || compareIds(a.id, b.id);

const withStatusChange = (request: EnrollmentRequest, change: StatusUpdateInput, changedAt: string): EnrollmentRequest => {
	const entry: StatusHistoryEntry = { fromStatus: request.status, toStatus: change.status, changedAt, changedBy: change.changedBy, reason: change.reason };
	return { ...request, status: change.status, updatedAt: changedAt, statusHistory: [...request.statusHistory, entry] };
};

/** Builds the enrollment request workflow: validation (400), then lookups (404), then business rules (409). */
export function createEnrollmentRequestService({ courseRepository, enrollmentRequestRepository, now }: EnrollmentRequestServiceDependencies): EnrollmentRequestService {
	return {
		async create(body) {
			const parsed = parseCreateEnrollmentRequest(body);
			if (!parsed.ok) {
				return { ok: false, error: invalidRequest(parsed.errors) };
			}
			const input = parsed.value;
			const course = (await courseRepository.getAll()).find((candidate) => candidate.id === input.courseId);
			if (course === undefined) {
				return failure('COURSE_NOT_FOUND');
			}
			if (course.status !== 'active') {
				return failure('COURSE_NOT_ACTIVE');
			}
			if ((await enrollmentRequestRepository.getAll()).some((request) => isActiveDuplicate(request, input))) {
				return failure('DUPLICATE_ACTIVE_REQUEST');
			}
			const createdAt = now().toISOString();
			const request: EnrollmentRequest = {
				id: await enrollmentRequestRepository.nextId(),
				courseId: input.courseId,
				learnerEmail: input.learnerEmail,
				justification: input.justification,
				status: 'pending',
				createdAt,
				updatedAt: createdAt,
				statusHistory: [{ fromStatus: null, toStatus: 'pending', changedAt: createdAt, changedBy: SYSTEM_ACTOR, reason: null }],
			};
			await enrollmentRequestRepository.save(request);
			return success(request);
		},

		async getById(id) {
			const request = await enrollmentRequestRepository.getById(id);
			return request === undefined ? failure('ENROLLMENT_REQUEST_NOT_FOUND') : success(request);
		},

		async list(raw) {
			const parsed = parseEnrollmentRequestListQuery(raw);
			if (!parsed.ok) {
				return { ok: false, error: invalidRequest(parsed.errors) };
			}
			const items = (await enrollmentRequestRepository.getAll()).filter((request) => matchesListCriteria(request, parsed.value)).sort(byCreatedAtThenId);
			return success({ items, totalItems: items.length });
		},

		async updateStatus(id, body) {
			const parsed = parseStatusUpdate(body);
			if (!parsed.ok) {
				return { ok: false, error: invalidRequest(parsed.errors) };
			}
			const request = await enrollmentRequestRepository.getById(id);
			if (request === undefined) {
				return failure('ENROLLMENT_REQUEST_NOT_FOUND');
			}
			if (!canTransition(request.status, parsed.value.status)) {
				return failure('INVALID_STATUS_TRANSITION');
			}
			const updated = withStatusChange(request, parsed.value, now().toISOString());
			await enrollmentRequestRepository.save(updated);
			return success(updated);
		},
	};
}
