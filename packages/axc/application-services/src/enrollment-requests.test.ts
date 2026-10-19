import type { Course, EnrollmentRequest, EnrollmentRequestRepository, EnrollmentRequestStatus, StatusHistoryEntry } from '@axc/domain';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	canTransition,
	ENROLLMENT_REQUEST_STATUSES,
	type EnrollmentErrorCode,
	type EnrollmentOutcome,
	type EnrollmentParseResult,
	isValidEmail,
	parseCreateEnrollmentRequest,
	parseEnrollmentRequestListQuery,
	parseStatusUpdate,
} from './enrollment-requests.ts';
import { buildApplicationServicesFactory } from './index.ts';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const INVALID_REQUEST_MESSAGE = 'The request could not be completed.';
const JUSTIFICATION_MESSAGE = 'justification must be between 20 and 500 characters.';

const T0 = '2026-06-27T10:00:00.000Z';
const T1 = '2026-06-28T09:30:00.000Z';
const T2 = '2026-06-29T15:45:00.000Z';
const SEEDED_AT = '2026-06-01T08:00:00.000Z';

const VALID_JUSTIFICATION = 'I need this course to prepare for upcoming secure development work.';
const REVIEWER = 'reviewer@example.org';
const LEARNER = 'learner@example.org';

const course = (id: string, status: Course['status']): Course => ({
	id,
	title: `Course ${id}`,
	summary: `Summary for ${id}`,
	modality: 'online',
	status,
	tags: ['tag'],
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-02T00:00:00.000Z',
});

const ACTIVE_COURSE = course('course-a', 'active');
const OTHER_ACTIVE_COURSE = course('course-b', 'active');
const DRAFT_COURSE = course('course-d', 'draft');
const RETIRED_COURSE = course('course-r', 'retired');
const courses: readonly Course[] = [ACTIVE_COURSE, OTHER_ACTIVE_COURSE, DRAFT_COURSE, RETIRED_COURSE];

const creationEntry = (changedAt: string): StatusHistoryEntry => ({ fromStatus: null, toStatus: 'pending', changedAt, changedBy: 'system', reason: null });

/** A stored request with a status history consistent with its status. */
const storedRequest = (overrides: Partial<EnrollmentRequest> & { id: string }): EnrollmentRequest => {
	const status: EnrollmentRequestStatus = overrides.status ?? 'pending';
	const createdAt = overrides.createdAt ?? SEEDED_AT;
	const history: StatusHistoryEntry[] = [creationEntry(createdAt)];
	if (status === 'approved' || status === 'rejected' || status === 'cancelled') {
		history.push({ fromStatus: 'pending', toStatus: status, changedAt: createdAt, changedBy: REVIEWER, reason: status === 'rejected' ? 'Prerequisite missing.' : null });
	}
	return {
		courseId: ACTIVE_COURSE.id,
		learnerEmail: LEARNER,
		justification: VALID_JUSTIFICATION,
		status,
		createdAt,
		updatedAt: createdAt,
		statusHistory: history,
		...overrides,
	};
};

/** In-test fake: an in-memory store whose ids follow the documented 'enroll-001' pattern. */
class FakeEnrollmentRequestRepository implements EnrollmentRequestRepository {
	private readonly store = new Map<string, EnrollmentRequest>();
	private counter = 0;

	constructor(initial: readonly EnrollmentRequest[] = []) {
		for (const request of initial) {
			this.store.set(request.id, structuredClone(request));
		}
	}

	nextId(): Promise<string> {
		let id: string;
		do {
			this.counter += 1;
			id = `enroll-${String(this.counter).padStart(3, '0')}`;
		} while (this.store.has(id));
		return Promise.resolve(id);
	}

	getById(id: string): Promise<EnrollmentRequest | undefined> {
		const found = this.store.get(id);
		return Promise.resolve(found === undefined ? undefined : structuredClone(found));
	}

	getAll(): Promise<readonly EnrollmentRequest[]> {
		return Promise.resolve([...this.store.values()].map((request) => structuredClone(request)));
	}

	save(request: EnrollmentRequest): Promise<void> {
		this.store.set(request.id, structuredClone(request));
		return Promise.resolve();
	}
}

const setup = async (initial: readonly EnrollmentRequest[] = []) => {
	const repository = new FakeEnrollmentRequestRepository(initial);
	let current = new Date(T0);
	const services = await buildApplicationServicesFactory({
		environment: 'test',
		courseRepository: { getAll: () => Promise.resolve(courses) },
		enrollmentRequestRepository: repository,
		now: () => new Date(current.getTime()),
	}).forRequest();
	const setNow = (iso: string): void => {
		current = new Date(iso);
	};
	return { services: services.enrollmentRequests, repository, setNow };
};

const validBody = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
	courseId: ACTIVE_COURSE.id,
	learnerEmail: LEARNER,
	justification: VALID_JUSTIFICATION,
	...overrides,
});

const expectFailure = <T>(outcome: EnrollmentOutcome<T>, code: Exclude<EnrollmentErrorCode, 'INVALID_REQUEST'>): void => {
	expect(outcome).toEqual({ ok: false, error: { code, message: expect.stringMatching(/\S/), details: [] } });
};

const expectInvalidRequest = <T>(outcome: EnrollmentOutcome<T>, fields: string[]): void => {
	expect(outcome.ok).toBe(false);
	if (outcome.ok) {
		throw new Error('expected a failure outcome');
	}
	expect(outcome.error.code).toBe('INVALID_REQUEST');
	expect(outcome.error.message).toBe(INVALID_REQUEST_MESSAGE);
	expect(outcome.error.details.map((detail) => detail.field).sort()).toEqual([...fields].sort());
	for (const detail of outcome.error.details) {
		expect(detail.message).toMatch(/\S/);
	}
};

const errorFields = <T>(result: EnrollmentParseResult<T>): string[] => {
	if (result.ok) {
		throw new Error(`expected parse errors, got ${JSON.stringify(result.value)}`);
	}
	return result.errors.map((error) => error.field).sort();
};

const parsedValue = <T>(result: EnrollmentParseResult<T>): T => {
	if (!result.ok) {
		throw new Error(`expected ok, got ${JSON.stringify(result.errors)}`);
	}
	return result.value;
};

/** Builds an address of exactly `length` characters: `learner@` + dotted labels of at most 49 characters + `.org`. */
const emailOfLength = (length: number): string => {
	const domainBodyLength = length - 'learner@'.length - '.org'.length;
	const body = `${'a'.repeat(49)}.`.repeat(Math.ceil(domainBodyLength / 50) + 1).slice(0, domainBodyLength);
	const email = `learner@${body}.org`;
	if (email.length !== length || body.endsWith('.')) {
		throw new Error(`bad fixture for length ${length}`);
	}
	return email;
};

const NON_OBJECT_BODIES: [string, unknown][] = [
	['null', null],
	['undefined', undefined],
	['a string', 'courseId=course-a'],
	['a number', 42],
	['a boolean', true],
	['an array', [validBody()]],
];

// ---------------------------------------------------------------------------
// isValidEmail
// ---------------------------------------------------------------------------

describe('isValidEmail', () => {
	it.each(['learner@example.org', 'first.last+tag@sub.example.co.uk', 'LEARNER@EXAMPLE.ORG', 'a_b-c@domain.io'])('accepts %s', (email) => {
		expect(isValidEmail(email)).toBe(true);
	});

	it.each([
		['an empty string', ''],
		['no @', 'plainaddress'],
		['no domain', 'learner@'],
		['no local part', '@example.org'],
		['no top-level domain', 'learner@example'],
		['an empty top-level domain', 'learner@example.'],
		['two consecutive @', 'learner@@example.org'],
		['two separate @', 'learner@exa@mple.org'],
		['a space in the local part', 'lear ner@example.org'],
		['a space in the domain', 'learner@example .org'],
		['a leading space', ' learner@example.org'],
	])('rejects an address with %s (%j)', (_label, email) => {
		expect(isValidEmail(email)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// canTransition
// ---------------------------------------------------------------------------

describe('canTransition', () => {
	const allowed = new Set(['pending->approved', 'pending->rejected', 'pending->cancelled', 'approved->cancelled']);
	const pairs = ENROLLMENT_REQUEST_STATUSES.flatMap((from) => ENROLLMENT_REQUEST_STATUSES.map((to) => [from, to, allowed.has(`${from}->${to}`)] as const));

	it('covers all 16 status pairs', () => {
		expect(pairs).toHaveLength(16);
	});

	it.each(pairs)('%s -> %s is allowed: %s', (from, to, expected) => {
		expect(canTransition(from, to)).toBe(expected);
	});
});

// ---------------------------------------------------------------------------
// parseCreateEnrollmentRequest
// ---------------------------------------------------------------------------

describe('parseCreateEnrollmentRequest', () => {
	it('accepts a valid body', () => {
		expect(parseCreateEnrollmentRequest(validBody())).toEqual({
			ok: true,
			value: { courseId: ACTIVE_COURSE.id, learnerEmail: LEARNER, justification: VALID_JUSTIFICATION },
		});
	});

	it('trims learnerEmail and justification', () => {
		const value = parsedValue(parseCreateEnrollmentRequest(validBody({ learnerEmail: `  ${LEARNER}  `, justification: `   ${VALID_JUSTIFICATION}   ` })));

		expect(value.learnerEmail).toBe(LEARNER);
		expect(value.justification).toBe(VALID_JUSTIFICATION);
	});

	describe('justification length', () => {
		it.each([20, 500])('accepts exactly %i characters', (length) => {
			const justification = 'j'.repeat(length);

			expect(parsedValue(parseCreateEnrollmentRequest(validBody({ justification }))).justification).toBe(justification);
		});

		it.each([19, 501])('rejects %i characters with the documented message', (length) => {
			expect(parseCreateEnrollmentRequest(validBody({ justification: 'j'.repeat(length) }))).toEqual({ ok: false, errors: [{ field: 'justification', message: JUSTIFICATION_MESSAGE }] });
		});

		it('measures the length after trimming (19 characters padded with spaces is too short)', () => {
			expect(parseCreateEnrollmentRequest(validBody({ justification: `   ${'j'.repeat(19)}   ` }))).toEqual({ ok: false, errors: [{ field: 'justification', message: JUSTIFICATION_MESSAGE }] });
		});

		it('accepts 500 characters padded with spaces', () => {
			expect(parsedValue(parseCreateEnrollmentRequest(validBody({ justification: `  ${'j'.repeat(500)}  ` }))).justification).toBe('j'.repeat(500));
		});

		it('rejects an empty justification', () => {
			expect(errorFields(parseCreateEnrollmentRequest(validBody({ justification: '' })))).toEqual(['justification']);
		});
	});

	describe('learnerEmail', () => {
		it.each(['not-an-email', 'learner@example', 'learner@@example.org', 'lear ner@example.org', ''])('rejects %j', (learnerEmail) => {
			expect(errorFields(parseCreateEnrollmentRequest(validBody({ learnerEmail })))).toEqual(['learnerEmail']);
		});

		it('accepts an address of exactly 254 characters', () => {
			const email = emailOfLength(254);

			expect(parsedValue(parseCreateEnrollmentRequest(validBody({ learnerEmail: email }))).learnerEmail.toLowerCase()).toBe(email);
		});

		it('rejects an address of 255 characters', () => {
			expect(errorFields(parseCreateEnrollmentRequest(validBody({ learnerEmail: emailOfLength(255) })))).toEqual(['learnerEmail']);
		});
	});

	describe('missing and wrongly typed fields', () => {
		it.each(['courseId', 'learnerEmail', 'justification'])('rejects a body without %s', (field) => {
			const body = validBody();
			delete body[field];

			expect(errorFields(parseCreateEnrollmentRequest(body))).toEqual([field]);
		});

		it.each([
			['courseId', 7],
			['courseId', null],
			['learnerEmail', ['learner@example.org']],
			['learnerEmail', 123],
			['justification', { text: VALID_JUSTIFICATION }],
			['justification', 12345678901234],
		])('rejects a non-string %s (%j)', (field, value) => {
			expect(errorFields(parseCreateEnrollmentRequest(validBody({ [field]: value })))).toEqual([field]);
		});

		it('rejects an empty courseId', () => {
			expect(errorFields(parseCreateEnrollmentRequest(validBody({ courseId: '' })))).toEqual(['courseId']);
		});

		it.each([
			['spaces', '   '],
			['a tab and a newline', '\t\n'],
		])('rejects a courseId of only whitespace (%s)', (_label, courseId) => {
			expect(errorFields(parseCreateEnrollmentRequest(validBody({ courseId })))).toEqual(['courseId']);
		});
	});

	it('rejects an unknown field and names it', () => {
		expect(errorFields(parseCreateEnrollmentRequest(validBody({ priority: 'high' })))).toEqual(['priority']);
	});

	it('rejects a status supplied by the client as an unknown field', () => {
		expect(errorFields(parseCreateEnrollmentRequest(validBody({ status: 'approved' })))).toEqual(['status']);
	});

	it.each(NON_OBJECT_BODIES)('rejects %s as the body', (_label, body) => {
		const result = parseCreateEnrollmentRequest(body);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.errors.length).toBeGreaterThan(0);
		}
	});

	it('collects every field error in one result', () => {
		expect(errorFields(parseCreateEnrollmentRequest({}))).toEqual(['courseId', 'justification', 'learnerEmail']);
	});

	it('collects errors for invalid values and unknown fields together', () => {
		expect(errorFields(parseCreateEnrollmentRequest(validBody({ learnerEmail: 'bad', justification: 'too short', extra: 1 })))).toEqual(['extra', 'justification', 'learnerEmail']);
	});
});

// ---------------------------------------------------------------------------
// parseStatusUpdate
// ---------------------------------------------------------------------------

describe('parseStatusUpdate', () => {
	it('accepts an approval without a reason and sets reason to null', () => {
		expect(parseStatusUpdate({ status: 'approved', changedBy: REVIEWER })).toEqual({ ok: true, value: { status: 'approved', changedBy: REVIEWER, reason: null } });
	});

	it('accepts a rejection with a reason', () => {
		expect(parseStatusUpdate({ status: 'rejected', changedBy: REVIEWER, reason: 'Learner has not completed the prerequisite course.' })).toEqual({
			ok: true,
			value: { status: 'rejected', changedBy: REVIEWER, reason: 'Learner has not completed the prerequisite course.' },
		});
	});

	it.each(ENROLLMENT_REQUEST_STATUSES.filter((status) => status !== 'rejected'))('accepts status %s without a reason', (status) => {
		expect(parsedValue(parseStatusUpdate({ status, changedBy: REVIEWER })).status).toBe(status);
	});

	it('trims changedBy and reason', () => {
		expect(parsedValue(parseStatusUpdate({ status: 'rejected', changedBy: `  ${REVIEWER}  `, reason: '  Prerequisite missing.  ' }))).toEqual({
			status: 'rejected',
			changedBy: REVIEWER,
			reason: 'Prerequisite missing.',
		});
	});

	it('treats a blank reason on a non-rejection as null', () => {
		expect(parsedValue(parseStatusUpdate({ status: 'cancelled', changedBy: REVIEWER, reason: '   ' })).reason).toBeNull();
	});

	it.each(ENROLLMENT_REQUEST_STATUSES.filter((status) => status !== 'rejected'))('treats reason: null on %s as no reason', (status) => {
		expect(parseStatusUpdate({ status, changedBy: REVIEWER, reason: null })).toEqual({ ok: true, value: { status, changedBy: REVIEWER, reason: null } });
	});

	describe('rejection reason', () => {
		it.each([
			['missing', {}],
			['null', { reason: null }],
			['empty', { reason: '' }],
			['blank', { reason: '    ' }],
		])('rejects a rejection with a %s reason', (_label, extra) => {
			expect(errorFields(parseStatusUpdate({ status: 'rejected', changedBy: REVIEWER, ...extra }))).toEqual(['reason']);
		});
	});

	describe('status', () => {
		it.each([
			['missing', undefined],
			['unknown', 'archived'],
			['differently cased', 'Approved'],
			['a number', 1],
			['empty', ''],
		])('rejects a %s status', (_label, status) => {
			const body = status === undefined ? { changedBy: REVIEWER } : { changedBy: REVIEWER, status };

			expect(errorFields(parseStatusUpdate(body))).toEqual(['status']);
		});
	});

	describe('changedBy', () => {
		it.each([
			['missing', undefined],
			['empty', ''],
			['blank', '   '],
			['a number', 42],
			['201 characters', 'c'.repeat(201)],
		])('rejects a %s changedBy', (_label, changedBy) => {
			const body = changedBy === undefined ? { status: 'approved' } : { status: 'approved', changedBy };

			expect(errorFields(parseStatusUpdate(body))).toEqual(['changedBy']);
		});

		it('accepts a changedBy of exactly 200 characters', () => {
			expect(parsedValue(parseStatusUpdate({ status: 'approved', changedBy: 'c'.repeat(200) })).changedBy).toBe('c'.repeat(200));
		});
	});

	describe('reason length and type', () => {
		it('accepts a reason of exactly 500 characters', () => {
			expect(parsedValue(parseStatusUpdate({ status: 'rejected', changedBy: REVIEWER, reason: 'r'.repeat(500) })).reason).toBe('r'.repeat(500));
		});

		it('rejects a reason of 501 characters', () => {
			expect(errorFields(parseStatusUpdate({ status: 'rejected', changedBy: REVIEWER, reason: 'r'.repeat(501) }))).toEqual(['reason']);
		});

		it('rejects a non-string reason', () => {
			expect(errorFields(parseStatusUpdate({ status: 'approved', changedBy: REVIEWER, reason: 42 }))).toEqual(['reason']);
		});
	});

	it('rejects an unknown field and names it', () => {
		expect(errorFields(parseStatusUpdate({ status: 'approved', changedBy: REVIEWER, note: 'x' }))).toEqual(['note']);
	});

	it.each(NON_OBJECT_BODIES)('rejects %s as the body', (_label, body) => {
		const result = parseStatusUpdate(body);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.errors.length).toBeGreaterThan(0);
		}
	});

	it('collects every field error in one result', () => {
		expect(errorFields(parseStatusUpdate({}))).toEqual(['changedBy', 'status']);
	});
});

// ---------------------------------------------------------------------------
// parseEnrollmentRequestListQuery
// ---------------------------------------------------------------------------

describe('parseEnrollmentRequestListQuery', () => {
	it('accepts an empty query with no filters', () => {
		expect(parseEnrollmentRequestListQuery({})).toEqual({ ok: true, value: {} });
	});

	it.each(ENROLLMENT_REQUEST_STATUSES)('accepts status=%s', (status) => {
		expect(parseEnrollmentRequestListQuery({ status: [status] })).toEqual({ ok: true, value: { status } });
	});

	it('accepts courseId', () => {
		expect(parseEnrollmentRequestListQuery({ courseId: ['course-a'] })).toEqual({ ok: true, value: { courseId: 'course-a' } });
	});

	it('accepts learnerEmail', () => {
		expect(parseEnrollmentRequestListQuery({ learnerEmail: [LEARNER] })).toEqual({ ok: true, value: { learnerEmail: LEARNER } });
	});

	it('accepts all three filters together', () => {
		expect(parseEnrollmentRequestListQuery({ status: ['pending'], courseId: ['course-a'], learnerEmail: [LEARNER] })).toEqual({
			ok: true,
			value: { status: 'pending', courseId: 'course-a', learnerEmail: LEARNER },
		});
	});

	it('rejects an unknown status', () => {
		expect(errorFields(parseEnrollmentRequestListQuery({ status: ['archived'] }))).toEqual(['status']);
	});

	it('rejects an unsupported query parameter and names it', () => {
		expect(errorFields(parseEnrollmentRequestListQuery({ page: ['1'] }))).toEqual(['page']);
	});

	it.each(['status', 'courseId', 'learnerEmail'])('rejects %s given more than once', (field) => {
		const value = field === 'status' ? 'pending' : field === 'courseId' ? 'course-a' : LEARNER;

		expect(errorFields(parseEnrollmentRequestListQuery({ [field]: [value, value] }))).toEqual([field]);
	});

	it('collects every error in one result', () => {
		expect(errorFields(parseEnrollmentRequestListQuery({ status: ['archived'], sort: ['createdAt'] }))).toEqual(['sort', 'status']);
	});

	it('trims courseId and learnerEmail', () => {
		expect(parseEnrollmentRequestListQuery({ courseId: ['  course-a '], learnerEmail: [` ${LEARNER}  `] })).toEqual({ ok: true, value: { courseId: 'course-a', learnerEmail: LEARNER } });
	});

	it.each([
		['courseId', ''],
		['courseId', '   '],
		['learnerEmail', ''],
		['learnerEmail', ' \t '],
	])('treats an empty %s (%j) as no filter', (field, value) => {
		expect(parseEnrollmentRequestListQuery({ [field]: [value] })).toEqual({ ok: true, value: {} });
	});
});

// ---------------------------------------------------------------------------
// ApplicationServices.enrollmentRequests.create
// ---------------------------------------------------------------------------

describe('ApplicationServices enrollmentRequests.create', () => {
	it('creates a pending request with the injected clock, the repository id, and the initial history entry', async () => {
		const { services } = await setup();

		await expect(services.create(validBody())).resolves.toEqual({
			ok: true,
			result: {
				id: 'enroll-001',
				courseId: ACTIVE_COURSE.id,
				learnerEmail: LEARNER,
				justification: VALID_JUSTIFICATION,
				status: 'pending',
				createdAt: T0,
				updatedAt: T0,
				statusHistory: [{ fromStatus: null, toStatus: 'pending', changedAt: T0, changedBy: 'system', reason: null }],
			},
		});
	});

	it('saves the created request in the repository', async () => {
		const { services, repository } = await setup();

		const outcome = await services.create(validBody());

		expect(outcome.ok).toBe(true);
		if (outcome.ok) {
			await expect(repository.getById(outcome.result.id)).resolves.toEqual(outcome.result);
		}
	});

	it('assigns a new id to each created request', async () => {
		const { services } = await setup();

		const first = await services.create(validBody());
		const second = await services.create(validBody({ courseId: OTHER_ACTIVE_COURSE.id }));

		expect(first.ok && first.result.id).toBe('enroll-001');
		expect(second.ok && second.result.id).toBe('enroll-002');
	});

	describe('without an injected clock', () => {
		afterEach(() => {
			vi.useRealTimers();
		});

		it('uses the current system time for createdAt, updatedAt, and the history entry', async () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date(T2));
			const services = await buildApplicationServicesFactory({
				environment: 'test',
				courseRepository: { getAll: () => Promise.resolve(courses) },
				enrollmentRequestRepository: new FakeEnrollmentRequestRepository(),
			}).forRequest();

			const outcome = await services.enrollmentRequests.create(validBody());

			expect(outcome.ok && [outcome.result.createdAt, outcome.result.updatedAt, outcome.result.statusHistory[0]?.changedAt]).toEqual([T2, T2, T2]);
		});
	});

	it('stores learnerEmail trimmed and lowercased', async () => {
		const { services } = await setup();

		const outcome = await services.create(validBody({ learnerEmail: '  Learner@Example.ORG ' }));

		expect(outcome.ok && outcome.result.learnerEmail).toBe(LEARNER);
	});

	describe('validation (400 INVALID_REQUEST)', () => {
		it('rejects an invalid email', async () => {
			const { services } = await setup();

			expectInvalidRequest(await services.create(validBody({ learnerEmail: 'not-an-email' })), ['learnerEmail']);
		});

		it('rejects a short justification with the documented field message', async () => {
			const { services } = await setup();

			await expect(services.create(validBody({ justification: 'Too short.' }))).resolves.toEqual({
				ok: false,
				error: { code: 'INVALID_REQUEST', message: INVALID_REQUEST_MESSAGE, details: [{ field: 'justification', message: JUSTIFICATION_MESSAGE }] },
			});
		});

		it('rejects a long justification', async () => {
			const { services } = await setup();

			expectInvalidRequest(await services.create(validBody({ justification: 'j'.repeat(501) })), ['justification']);
		});

		it('rejects an unknown field', async () => {
			const { services } = await setup();

			expectInvalidRequest(await services.create(validBody({ priority: 'high' })), ['priority']);
		});

		it('reports every field error together', async () => {
			const { services } = await setup();

			expectInvalidRequest(await services.create({}), ['courseId', 'justification', 'learnerEmail']);
		});

		it('rejects a courseId of only whitespace instead of looking it up', async () => {
			const { services } = await setup();

			expectInvalidRequest(await services.create(validBody({ courseId: '   ' })), ['courseId']);
		});

		it.each(NON_OBJECT_BODIES)('rejects %s as the body', async (_label, body) => {
			const { services } = await setup();

			const outcome = await services.create(body);

			expect(outcome.ok).toBe(false);
			if (!outcome.ok) {
				expect(outcome.error.code).toBe('INVALID_REQUEST');
				expect(outcome.error.message).toBe(INVALID_REQUEST_MESSAGE);
				expect(outcome.error.details.length).toBeGreaterThan(0);
			}
		});

		it('validates the body before looking up the course (400 wins over 404)', async () => {
			const { services } = await setup();

			expectInvalidRequest(await services.create(validBody({ courseId: 'no-such-course', learnerEmail: 'bad' })), ['learnerEmail']);
		});

		it('does not save anything when validation fails', async () => {
			const { services, repository } = await setup();

			await services.create(validBody({ learnerEmail: 'bad' }));

			await expect(repository.getAll()).resolves.toEqual([]);
		});
	});

	describe('course rules', () => {
		it('returns COURSE_NOT_FOUND for a course that does not exist', async () => {
			const { services } = await setup();

			expectFailure(await services.create(validBody({ courseId: 'no-such-course' })), 'COURSE_NOT_FOUND');
		});

		it('returns COURSE_NOT_ACTIVE for a draft course', async () => {
			const { services } = await setup();

			expectFailure(await services.create(validBody({ courseId: DRAFT_COURSE.id })), 'COURSE_NOT_ACTIVE');
		});

		it('returns COURSE_NOT_ACTIVE for a retired course', async () => {
			const { services } = await setup();

			expectFailure(await services.create(validBody({ courseId: RETIRED_COURSE.id })), 'COURSE_NOT_ACTIVE');
		});

		it('does not save anything when the course is not active', async () => {
			const { services, repository } = await setup();

			await services.create(validBody({ courseId: DRAFT_COURSE.id }));

			await expect(repository.getAll()).resolves.toEqual([]);
		});

		it('checks the course before duplicates (404 wins over 409)', async () => {
			const { services } = await setup([storedRequest({ id: 'enroll-900', courseId: 'no-such-course' })]);

			expectFailure(await services.create(validBody({ courseId: 'no-such-course' })), 'COURSE_NOT_FOUND');
		});
	});

	describe('duplicate prevention', () => {
		it.each(['pending', 'approved'] as const)('returns DUPLICATE_ACTIVE_REQUEST when a %s request exists for the same learner and course', async (status) => {
			const { services } = await setup([storedRequest({ id: 'enroll-900', status })]);

			expectFailure(await services.create(validBody()), 'DUPLICATE_ACTIVE_REQUEST');
		});

		it('matches the learner email case-insensitively', async () => {
			const { services } = await setup([storedRequest({ id: 'enroll-900', status: 'pending' })]);

			expectFailure(await services.create(validBody({ learnerEmail: 'LEARNER@Example.Org' })), 'DUPLICATE_ACTIVE_REQUEST');
		});

		it('blocks a second request created through the service', async () => {
			const { services } = await setup();

			expect((await services.create(validBody())).ok).toBe(true);
			expectFailure(await services.create(validBody()), 'DUPLICATE_ACTIVE_REQUEST');
		});

		it.each(['rejected', 'cancelled'] as const)('allows a new request when the only existing one is %s', async (status) => {
			const { services } = await setup([storedRequest({ id: 'enroll-900', status })]);

			const outcome = await services.create(validBody());

			expect(outcome.ok).toBe(true);
			expect(outcome.ok && outcome.result.status).toBe('pending');
		});

		it('allows the same learner to request a different course', async () => {
			const { services } = await setup([storedRequest({ id: 'enroll-900', status: 'pending' })]);

			expect((await services.create(validBody({ courseId: OTHER_ACTIVE_COURSE.id }))).ok).toBe(true);
		});

		it('allows a different learner to request the same course', async () => {
			const { services } = await setup([storedRequest({ id: 'enroll-900', status: 'approved' })]);

			expect((await services.create(validBody({ learnerEmail: 'other@example.org' }))).ok).toBe(true);
		});

		it('does not save anything for a duplicate', async () => {
			const existing = storedRequest({ id: 'enroll-900', status: 'pending' });
			const { services, repository } = await setup([existing]);

			await services.create(validBody());

			await expect(repository.getAll()).resolves.toEqual([existing]);
		});
	});
});

// ---------------------------------------------------------------------------
// ApplicationServices.enrollmentRequests.getById
// ---------------------------------------------------------------------------

describe('ApplicationServices enrollmentRequests.getById', () => {
	it('returns the stored request including its status history', async () => {
		const existing = storedRequest({ id: 'enroll-007', status: 'approved' });
		const { services } = await setup([existing]);

		await expect(services.getById('enroll-007')).resolves.toEqual({ ok: true, result: existing });
	});

	it('returns a request created through the service', async () => {
		const { services } = await setup();
		const created = await services.create(validBody());
		if (!created.ok) {
			throw new Error('create failed');
		}

		await expect(services.getById(created.result.id)).resolves.toEqual({ ok: true, result: created.result });
	});

	it('returns ENROLLMENT_REQUEST_NOT_FOUND for an unknown id', async () => {
		const { services } = await setup([storedRequest({ id: 'enroll-007' })]);

		expectFailure(await services.getById('enroll-999'), 'ENROLLMENT_REQUEST_NOT_FOUND');
	});
});

// ---------------------------------------------------------------------------
// ApplicationServices.enrollmentRequests.list
// ---------------------------------------------------------------------------

describe('ApplicationServices enrollmentRequests.list', () => {
	// createdAt order: e3, (e1, e2 tie -> id order), e5, e4
	const e1 = storedRequest({ id: 'enroll-001', status: 'pending', createdAt: '2026-06-02T00:00:00.000Z' });
	const e2 = storedRequest({ id: 'enroll-002', status: 'approved', learnerEmail: 'other@example.org', createdAt: '2026-06-02T00:00:00.000Z' });
	const e3 = storedRequest({ id: 'enroll-003', status: 'rejected', courseId: OTHER_ACTIVE_COURSE.id, createdAt: '2026-06-01T00:00:00.000Z' });
	const e4 = storedRequest({ id: 'enroll-004', status: 'pending', courseId: OTHER_ACTIVE_COURSE.id, createdAt: '2026-06-05T00:00:00.000Z' });
	const e5 = storedRequest({ id: 'enroll-005', status: 'cancelled', learnerEmail: 'other@example.org', createdAt: '2026-06-03T00:00:00.000Z' });
	const seeded = [e4, e2, e5, e1, e3];

	const listIds = async (raw: Record<string, string[]>): Promise<string[]> => {
		const { services } = await setup(seeded);
		const outcome = await services.list(raw);
		if (!outcome.ok) {
			throw new Error(`expected ok, got ${JSON.stringify(outcome.error)}`);
		}
		expect(outcome.result.totalItems).toBe(outcome.result.items.length);
		return outcome.result.items.map((item) => item.id);
	};

	it('returns every request sorted by createdAt then id, with totalItems', async () => {
		const { services } = await setup(seeded);

		await expect(services.list({})).resolves.toEqual({ ok: true, result: { items: [e3, e1, e2, e5, e4], totalItems: 5 } });
	});

	it('returns an empty list when the repository is empty', async () => {
		const { services } = await setup();

		await expect(services.list({})).resolves.toEqual({ ok: true, result: { items: [], totalItems: 0 } });
	});

	it('filters by status', async () => {
		expect(await listIds({ status: ['pending'] })).toEqual(['enroll-001', 'enroll-004']);
	});

	it('filters by courseId', async () => {
		expect(await listIds({ courseId: [OTHER_ACTIVE_COURSE.id] })).toEqual(['enroll-003', 'enroll-004']);
	});

	it('filters by learnerEmail', async () => {
		expect(await listIds({ learnerEmail: ['other@example.org'] })).toEqual(['enroll-002', 'enroll-005']);
	});

	it('filters by learnerEmail case-insensitively', async () => {
		expect(await listIds({ learnerEmail: ['OTHER@Example.ORG'] })).toEqual(['enroll-002', 'enroll-005']);
	});

	it('combines status, courseId, and learnerEmail with AND', async () => {
		expect(await listIds({ status: ['pending'], courseId: [ACTIVE_COURSE.id], learnerEmail: [LEARNER] })).toEqual(['enroll-001']);
	});

	it('combines two filters with AND', async () => {
		expect(await listIds({ status: ['pending'], courseId: [OTHER_ACTIVE_COURSE.id] })).toEqual(['enroll-004']);
	});

	it('returns ok with no items when nothing matches', async () => {
		const { services } = await setup(seeded);

		await expect(services.list({ status: ['approved'], courseId: [OTHER_ACTIVE_COURSE.id] })).resolves.toEqual({ ok: true, result: { items: [], totalItems: 0 } });
	});

	it('returns INVALID_REQUEST for an unknown status', async () => {
		const { services } = await setup(seeded);

		expectInvalidRequest(await services.list({ status: ['archived'] }), ['status']);
	});

	it('returns INVALID_REQUEST for an unsupported query parameter', async () => {
		const { services } = await setup(seeded);

		expectInvalidRequest(await services.list({ q: ['security'] }), ['q']);
	});

	it('returns INVALID_REQUEST for a repeated query parameter', async () => {
		const { services } = await setup(seeded);

		expectInvalidRequest(await services.list({ courseId: ['course-a', 'course-b'] }), ['courseId']);
	});

	it('orders requests with the same createdAt by id whatever the storage order', async () => {
		const { services } = await setup([e1, e2]);

		await expect(services.list({})).resolves.toEqual({ ok: true, result: { items: [e1, e2], totalItems: 2 } });
	});

	it('trims the courseId filter value', async () => {
		expect(await listIds({ courseId: [`  ${OTHER_ACTIVE_COURSE.id} `] })).toEqual(['enroll-003', 'enroll-004']);
	});

	it('trims the learnerEmail filter value', async () => {
		expect(await listIds({ learnerEmail: ['  OTHER@example.org '] })).toEqual(['enroll-002', 'enroll-005']);
	});

	it.each([
		['courseId', ''],
		['courseId', '  '],
		['learnerEmail', ''],
		['learnerEmail', '  '],
	])('treats an empty %s (%j) as no filter', async (field, value) => {
		expect(await listIds({ [field]: [value] })).toEqual(['enroll-003', 'enroll-001', 'enroll-002', 'enroll-005', 'enroll-004']);
	});
});

// ---------------------------------------------------------------------------
// ApplicationServices.enrollmentRequests.updateStatus
// ---------------------------------------------------------------------------

describe('ApplicationServices enrollmentRequests.updateStatus', () => {
	describe('valid transitions', () => {
		it.each([
			['pending', 'approved', undefined, null],
			['pending', 'rejected', 'Learner has not completed the prerequisite course.', 'Learner has not completed the prerequisite course.'],
			['pending', 'cancelled', undefined, null],
			['approved', 'cancelled', 'Learner withdrew.', 'Learner withdrew.'],
		] as const)('%s -> %s updates status and updatedAt and appends one history entry', async (from, to, reason, expectedReason) => {
			const existing = storedRequest({ id: 'enroll-010', status: from });
			const { services, setNow } = await setup([existing]);
			setNow(T1);

			const body = reason === undefined ? { status: to, changedBy: REVIEWER } : { status: to, changedBy: REVIEWER, reason };

			await expect(services.updateStatus('enroll-010', body)).resolves.toEqual({
				ok: true,
				result: {
					...existing,
					status: to,
					updatedAt: T1,
					statusHistory: [...existing.statusHistory, { fromStatus: from, toStatus: to, changedAt: T1, changedBy: REVIEWER, reason: expectedReason }],
				},
			});
		});

		it('persists the change so getById returns the updated request', async () => {
			const { services, setNow } = await setup([storedRequest({ id: 'enroll-010' })]);
			setNow(T1);

			const updated = await services.updateStatus('enroll-010', { status: 'approved', changedBy: REVIEWER });

			expect(updated.ok).toBe(true);
			await expect(services.getById('enroll-010')).resolves.toEqual(updated);
		});

		it('records reason: null on an approval as a null reason in the history', async () => {
			const { services, setNow } = await setup([storedRequest({ id: 'enroll-010' })]);
			setNow(T1);

			const outcome = await services.updateStatus('enroll-010', { status: 'approved', changedBy: REVIEWER, reason: null });

			expect(outcome.ok && outcome.result.statusHistory.at(-1)).toEqual({ fromStatus: 'pending', toStatus: 'approved', changedAt: T1, changedBy: REVIEWER, reason: null });
		});

		it('records the trimmed changedBy and reason', async () => {
			const { services, setNow } = await setup([storedRequest({ id: 'enroll-010' })]);
			setNow(T1);

			const outcome = await services.updateStatus('enroll-010', { status: 'rejected', changedBy: `  ${REVIEWER} `, reason: '  Prerequisite missing.  ' });

			expect(outcome.ok && outcome.result.statusHistory.at(-1)).toEqual({ fromStatus: 'pending', toStatus: 'rejected', changedAt: T1, changedBy: REVIEWER, reason: 'Prerequisite missing.' });
		});
	});

	describe('audit trail', () => {
		it('keeps the full history from creation through approval and cancellation', async () => {
			const { services, setNow } = await setup();
			const created = await services.create(validBody());
			if (!created.ok) {
				throw new Error('create failed');
			}
			const id = created.result.id;

			setNow(T1);
			await services.updateStatus(id, { status: 'approved', changedBy: REVIEWER });
			setNow(T2);
			const cancelled = await services.updateStatus(id, { status: 'cancelled', changedBy: 'operator-7', reason: 'Learner withdrew.' });

			expect(cancelled).toEqual({
				ok: true,
				result: {
					...created.result,
					status: 'cancelled',
					createdAt: T0,
					updatedAt: T2,
					statusHistory: [
						{ fromStatus: null, toStatus: 'pending', changedAt: T0, changedBy: 'system', reason: null },
						{ fromStatus: 'pending', toStatus: 'approved', changedAt: T1, changedBy: REVIEWER, reason: null },
						{ fromStatus: 'approved', toStatus: 'cancelled', changedAt: T2, changedBy: 'operator-7', reason: 'Learner withdrew.' },
					],
				},
			});
		});

		it('allows a new request after the earlier one is rejected through the service', async () => {
			const { services } = await setup();
			const first = await services.create(validBody());
			if (!first.ok) {
				throw new Error('create failed');
			}
			await services.updateStatus(first.result.id, { status: 'rejected', changedBy: REVIEWER, reason: 'Course is full.' });

			const second = await services.create(validBody());

			expect(second.ok && second.result.id).not.toBe(first.result.id);
			expect(second.ok && second.result.status).toBe('pending');
		});

		it('blocks a new request while the earlier one is approved', async () => {
			const { services } = await setup();
			const first = await services.create(validBody());
			if (!first.ok) {
				throw new Error('create failed');
			}
			await services.updateStatus(first.result.id, { status: 'approved', changedBy: REVIEWER });

			expectFailure(await services.create(validBody()), 'DUPLICATE_ACTIVE_REQUEST');
		});
	});

	describe('invalid transitions (409 INVALID_STATUS_TRANSITION)', () => {
		it.each([
			['approved', 'approved'],
			['approved', 'pending'],
			['approved', 'rejected'],
			['rejected', 'approved'],
			['rejected', 'cancelled'],
			['rejected', 'pending'],
			['rejected', 'rejected'],
			['cancelled', 'approved'],
			['cancelled', 'pending'],
			['cancelled', 'cancelled'],
			['pending', 'pending'],
		] as const)('%s -> %s is rejected', async (from, to) => {
			const { services } = await setup([storedRequest({ id: 'enroll-020', status: from })]);

			expectFailure(await services.updateStatus('enroll-020', { status: to, changedBy: REVIEWER, reason: 'Some reason.' }), 'INVALID_STATUS_TRANSITION');
		});

		it('leaves the stored request unchanged', async () => {
			const existing = storedRequest({ id: 'enroll-020', status: 'cancelled' });
			const { services, repository, setNow } = await setup([existing]);
			setNow(T1);

			await services.updateStatus('enroll-020', { status: 'approved', changedBy: REVIEWER });

			await expect(repository.getById('enroll-020')).resolves.toEqual(existing);
		});
	});

	describe('validation (400 INVALID_REQUEST)', () => {
		it('rejects a rejection without a reason', async () => {
			const { services } = await setup([storedRequest({ id: 'enroll-030' })]);

			expectInvalidRequest(await services.updateStatus('enroll-030', { status: 'rejected', changedBy: REVIEWER }), ['reason']);
		});

		it('rejects a rejection with reason: null', async () => {
			const { services } = await setup([storedRequest({ id: 'enroll-030' })]);

			expectInvalidRequest(await services.updateStatus('enroll-030', { status: 'rejected', changedBy: REVIEWER, reason: null }), ['reason']);
		});

		it('rejects a rejection with a blank reason', async () => {
			const { services } = await setup([storedRequest({ id: 'enroll-030' })]);

			expectInvalidRequest(await services.updateStatus('enroll-030', { status: 'rejected', changedBy: REVIEWER, reason: '   ' }), ['reason']);
		});

		it('rejects an invalid status value', async () => {
			const { services } = await setup([storedRequest({ id: 'enroll-030' })]);

			expectInvalidRequest(await services.updateStatus('enroll-030', { status: 'archived', changedBy: REVIEWER }), ['status']);
		});

		it('rejects a missing changedBy', async () => {
			const { services } = await setup([storedRequest({ id: 'enroll-030' })]);

			expectInvalidRequest(await services.updateStatus('enroll-030', { status: 'approved' }), ['changedBy']);
		});

		it('rejects an unknown field', async () => {
			const { services } = await setup([storedRequest({ id: 'enroll-030' })]);

			expectInvalidRequest(await services.updateStatus('enroll-030', { status: 'approved', changedBy: REVIEWER, approvedBy: 'x' }), ['approvedBy']);
		});

		it.each(NON_OBJECT_BODIES)('rejects %s as the body', async (_label, body) => {
			const { services } = await setup([storedRequest({ id: 'enroll-030' })]);

			const outcome = await services.updateStatus('enroll-030', body);

			expect(outcome.ok).toBe(false);
			if (!outcome.ok) {
				expect(outcome.error.code).toBe('INVALID_REQUEST');
				expect(outcome.error.message).toBe(INVALID_REQUEST_MESSAGE);
			}
		});

		it('leaves the stored request unchanged', async () => {
			const existing = storedRequest({ id: 'enroll-030' });
			const { services, repository } = await setup([existing]);

			await services.updateStatus('enroll-030', { status: 'rejected', changedBy: REVIEWER });

			await expect(repository.getById('enroll-030')).resolves.toEqual(existing);
		});
	});

	describe('error ordering', () => {
		it('returns ENROLLMENT_REQUEST_NOT_FOUND for an unknown id with a valid body', async () => {
			const { services } = await setup();

			expectFailure(await services.updateStatus('enroll-999', { status: 'approved', changedBy: REVIEWER }), 'ENROLLMENT_REQUEST_NOT_FOUND');
		});

		it('validates the body before looking up the request (400 wins over 404)', async () => {
			const { services } = await setup();

			expectInvalidRequest(await services.updateStatus('enroll-999', { status: 'archived', changedBy: REVIEWER }), ['status']);
		});

		it('validates the body before checking the transition (400 wins over 409)', async () => {
			const { services } = await setup([storedRequest({ id: 'enroll-040', status: 'cancelled' })]);

			expectInvalidRequest(await services.updateStatus('enroll-040', { status: 'rejected', changedBy: REVIEWER }), ['reason']);
		});
	});
});
