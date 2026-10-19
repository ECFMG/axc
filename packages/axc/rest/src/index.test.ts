import {
	type ApplicationServicesFactory,
	buildApplicationServicesFactory,
	type Course,
	type EnrollmentRequest,
	type EnrollmentRequestRepository,
	type EnrollmentRequestStatus,
	type StatusHistoryEntry,
} from '@axc/application-services';
import { describe, expect, it, vi } from 'vitest';
import { createRestApp } from './index.ts';

// Local fixtures, independent from the seed.
// title order (case-insensitive): r1 Alpha, r2 beta, r3 Charlie, r4 delta
// createdAt order: r3, r1, r4, r2 | updatedAt order: r4, r2, r3, r1
const r1: Course = {
	id: 'r1',
	title: 'Alpha Security',
	summary: 'Securing services.',
	modality: 'online',
	status: 'active',
	tags: ['ai', 'security'],
	createdAt: '2026-01-02T00:00:00.000Z',
	updatedAt: '2026-09-01T00:00:00.000Z',
};
const r2: Course = {
	id: 'r2',
	title: 'beta Clouds',
	summary: 'Cloud SECURITY patterns.',
	modality: 'hybrid',
	status: 'active',
	tags: ['cloud'],
	createdAt: '2026-04-01T00:00:00.000Z',
	updatedAt: '2026-05-01T00:00:00.000Z',
};
const r3: Course = {
	id: 'r3',
	title: 'Charlie Ethics',
	summary: 'Responsible practice.',
	modality: 'online',
	status: 'draft',
	tags: ['AI', 'ethics'],
	createdAt: '2025-11-01T00:00:00.000Z',
	updatedAt: '2026-06-01T00:00:00.000Z',
};
const r4: Course = {
	id: 'r4',
	title: 'delta Design',
	summary: 'Design systems.',
	modality: 'in-person',
	status: 'retired',
	tags: ['design'],
	createdAt: '2026-02-01T00:00:00.000Z',
	updatedAt: '2026-03-01T00:00:00.000Z',
};

const fixtures: readonly Course[] = [r4, r2, r3, r1];

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

const factoryFor = (courses: readonly Course[]): ApplicationServicesFactory =>
	buildApplicationServicesFactory({ environment: 'test', courseRepository: { getAll: () => Promise.resolve(courses) }, enrollmentRequestRepository: new FakeEnrollmentRequestRepository() });

const appFor = (courses: readonly Course[] = fixtures) => createRestApp(factoryFor(courses));

interface CoursePageBody {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

const getPage = async (path: string, courses: readonly Course[] = fixtures): Promise<CoursePageBody> => {
	const response = await appFor(courses).request(path);
	expect(response.status).toBe(200);
	return (await response.json()) as CoursePageBody;
};

const ids = (body: CoursePageBody): string[] => body.items.map((course) => course.id);

const invalidQueryBody = (details: { field: string; message: string }[]) => ({
	error: {
		code: 'INVALID_QUERY_PARAMETER',
		message: 'One or more query parameters are invalid.',
		details,
	},
});

describe('GET /api/courses', () => {
	describe('success', () => {
		it('returns 200 JSON with the default page sorted by title', async () => {
			const response = await appFor().request('/api/courses');

			expect(response.status).toBe(200);
			expect(response.headers.get('content-type')).toMatch(/^application\/json/);
			expect(await response.json()).toEqual({ items: [r1, r2, r3, r4], page: 1, pageSize: 10, totalItems: 4, totalPages: 1 });
		});

		it('filters by q across title, summary, and tags case-insensitively', async () => {
			expect(ids(await getPage('/api/courses?q=SECURITY'))).toEqual(['r1', 'r2']);
		});

		it('filters by modality', async () => {
			expect(ids(await getPage('/api/courses?modality=online'))).toEqual(['r1', 'r3']);
		});

		it('filters by status', async () => {
			expect(ids(await getPage('/api/courses?status=active'))).toEqual(['r1', 'r2']);
		});

		it('filters by tag case-insensitively', async () => {
			expect(ids(await getPage('/api/courses?tag=ai'))).toEqual(['r1', 'r3']);
		});

		it('combines q, modality, and status', async () => {
			expect(ids(await getPage('/api/courses?q=security&modality=online&status=active'))).toEqual(['r1']);
		});

		it('combines tag and status', async () => {
			expect(ids(await getPage('/api/courses?tag=AI&status=draft'))).toEqual(['r3']);
		});

		it('paginates with page and pageSize and reports metadata', async () => {
			const body = await getPage('/api/courses?page=2&pageSize=3');

			expect(body).toEqual({ items: [r4], page: 2, pageSize: 3, totalItems: 4, totalPages: 2 });
		});

		it('returns no more than pageSize items', async () => {
			const body = await getPage('/api/courses?page=1&pageSize=2');

			expect(body.items).toHaveLength(2);
			expect(body).toMatchObject({ page: 1, pageSize: 2, totalItems: 4, totalPages: 2 });
		});

		it('returns 200 with empty items for a page beyond the end', async () => {
			expect(await getPage('/api/courses?page=5&pageSize=2')).toEqual({ items: [], page: 5, pageSize: 2, totalItems: 4, totalPages: 2 });
		});

		it('sorts by createdAt', async () => {
			expect(ids(await getPage('/api/courses?sort=createdAt'))).toEqual(['r3', 'r1', 'r4', 'r2']);
		});

		it('sorts by updatedAt', async () => {
			expect(ids(await getPage('/api/courses?sort=updatedAt'))).toEqual(['r4', 'r2', 'r3', 'r1']);
		});

		it('returns 200 with empty items when nothing matches', async () => {
			const response = await appFor().request('/api/courses?q=quantum');

			expect(response.status).toBe(200);
			expect(await response.json()).toEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
		});

		it('passes the Authorization header through to the application services factory', async () => {
			const real = factoryFor(fixtures);
			const forRequest = vi.fn((rawAuthHeader?: string) => real.forRequest(rawAuthHeader));
			const app = createRestApp({ forRequest });

			const response = await app.request('/api/courses', { headers: { Authorization: 'Bearer token-123' } });

			expect(response.status).toBe(200);
			expect(forRequest).toHaveBeenCalledWith('Bearer token-123');
		});
	});

	describe('invalid query parameters', () => {
		it.each([
			['modality', '/api/courses?modality=remote', 'modality must be one of: online, in-person, hybrid.'],
			['status', '/api/courses?status=archived', 'status must be one of: draft, active, retired.'],
			['page', '/api/courses?page=0', 'page must be a positive integer.'],
			['page', '/api/courses?page=abc', 'page must be a positive integer.'],
			['pageSize', '/api/courses?pageSize=51', 'pageSize must be between 1 and 50.'],
			['pageSize', '/api/courses?pageSize=0', 'pageSize must be between 1 and 50.'],
			['sort', '/api/courses?sort=name', 'sort must be one of: title, createdAt, updatedAt.'],
		])('returns 400 with the error contract for invalid %s (%s)', async (field, path, message) => {
			const response = await appFor().request(path);

			expect(response.status).toBe(400);
			expect(response.headers.get('content-type')).toMatch(/^application\/json/);
			expect(await response.json()).toEqual(invalidQueryBody([{ field, message }]));
		});

		it('returns 400 for an unsupported query parameter', async () => {
			const response = await appFor().request('/api/courses?category=x');

			expect(response.status).toBe(400);
			expect(await response.json()).toEqual(invalidQueryBody([{ field: 'category', message: 'category is not a supported query parameter.' }]));
		});

		it('returns 400 for a parameter given more than once', async () => {
			const response = await appFor().request('/api/courses?page=1&page=2');

			expect(response.status).toBe(400);
			expect(await response.json()).toEqual(invalidQueryBody([{ field: 'page', message: 'page must be specified at most once.' }]));
		});

		it('returns every error in one 400 response', async () => {
			const response = await appFor().request('/api/courses?sort=name&modality=remote&pageSize=100');

			expect(response.status).toBe(400);
			expect(await response.json()).toEqual(
				invalidQueryBody([
					{ field: 'modality', message: 'modality must be one of: online, in-person, hybrid.' },
					{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' },
					{ field: 'sort', message: 'sort must be one of: title, createdAt, updatedAt.' },
				]),
			);
		});
	});
});

describe('GET /health', () => {
	it('still returns the health contract', async () => {
		const response = await appFor().request('/health');

		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ status: 'ok', service: 'agentCourses-api', projectCode: 'axc', environment: 'test' });
	});
});

// ---------------------------------------------------------------------------
// Enrollment requests
// ---------------------------------------------------------------------------

const INVALID_REQUEST_MESSAGE = 'The request could not be completed.';
const JUSTIFICATION_MESSAGE = 'justification must be between 20 and 500 characters.';
const VALID_JUSTIFICATION = 'I need this course to prepare for upcoming secure development work.';
const LEARNER = 'learner@example.org';
const REVIEWER = 'reviewer@example.org';
const T0 = '2026-06-27T10:00:00.000Z';
const T1 = '2026-06-28T09:30:00.000Z';
const T2 = '2026-06-29T15:45:00.000Z';
const SEEDED_AT = '2026-06-01T08:00:00.000Z';

// Course fixtures reused from above: r1 and r2 are active, r3 is draft, r4 is retired.

const storedRequest = (overrides: Partial<EnrollmentRequest> & { id: string }): EnrollmentRequest => {
	const status: EnrollmentRequestStatus = overrides.status ?? 'pending';
	const createdAt = overrides.createdAt ?? SEEDED_AT;
	const history: StatusHistoryEntry[] = [{ fromStatus: null, toStatus: 'pending', changedAt: createdAt, changedBy: 'system', reason: null }];
	if (status !== 'pending') {
		history.push({ fromStatus: 'pending', toStatus: status, changedAt: createdAt, changedBy: REVIEWER, reason: status === 'rejected' ? 'Prerequisite missing.' : null });
	}
	return { courseId: r1.id, learnerEmail: LEARNER, justification: VALID_JUSTIFICATION, status, createdAt, updatedAt: createdAt, statusHistory: history, ...overrides };
};

/** One app with its own enrollment store and a controllable clock. */
const enrollmentApp = (initial: readonly EnrollmentRequest[] = []) => {
	let current = new Date(T0);
	const app = createRestApp(
		buildApplicationServicesFactory({
			environment: 'test',
			courseRepository: { getAll: () => Promise.resolve(fixtures) },
			enrollmentRequestRepository: new FakeEnrollmentRequestRepository(initial),
			now: () => new Date(current.getTime()),
		}),
	);
	const setNow = (iso: string): void => {
		current = new Date(iso);
	};
	const send = (method: 'POST' | 'PATCH', path: string, body: unknown) => app.request(path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
	const sendRaw = (method: 'POST' | 'PATCH', path: string, raw: string) => app.request(path, { method, headers: { 'Content-Type': 'application/json' }, body: raw });
	return { app, setNow, send, sendRaw };
};

const createBody = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({ courseId: r1.id, learnerEmail: LEARNER, justification: VALID_JUSTIFICATION, ...overrides });

interface EnrollmentErrorBody {
	error: { code: string; message: string; details: { field: string; message: string }[] };
}

const expectErrorResponse = async (response: Response, status: number, code: string): Promise<void> => {
	expect(response.status).toBe(status);
	expect(response.headers.get('content-type')).toMatch(/^application\/json/);
	expect(await response.json()).toEqual({ error: { code, message: expect.stringMatching(/\S/), details: [] } });
};

const expectInvalidRequestResponse = async (response: Response, fields?: string[]): Promise<void> => {
	expect(response.status).toBe(400);
	expect(response.headers.get('content-type')).toMatch(/^application\/json/);
	const body = (await response.json()) as EnrollmentErrorBody;
	expect(body.error.code).toBe('INVALID_REQUEST');
	expect(body.error.message).toBe(INVALID_REQUEST_MESSAGE);
	expect(Array.isArray(body.error.details)).toBe(true);
	if (fields !== undefined) {
		expect(body.error.details.map((detail) => detail.field).sort()).toEqual([...fields].sort());
	}
};

const INVALID_JSON_BODY = { error: { code: 'INVALID_REQUEST', message: INVALID_REQUEST_MESSAGE, details: [{ field: 'body', message: 'The request body must be valid JSON.' }] } };
const NON_OBJECT_BODY = { error: { code: 'INVALID_REQUEST', message: INVALID_REQUEST_MESSAGE, details: [{ field: 'body', message: 'The request body must be a JSON object.' }] } };
const NON_OBJECT_JSON: [string, unknown][] = [
	['a JSON array', [{ status: 'approved', changedBy: REVIEWER }]],
	['a JSON string', 'approved'],
	['a JSON number', 42],
	['JSON null', null],
];

describe('POST /api/enrollment-requests', () => {
	it('returns 201 with the created pending request and its initial history entry', async () => {
		const { send } = enrollmentApp();

		const response = await send('POST', '/api/enrollment-requests', createBody());

		expect(response.status).toBe(201);
		expect(response.headers.get('content-type')).toMatch(/^application\/json/);
		expect(await response.json()).toEqual({
			id: 'enroll-001',
			courseId: r1.id,
			learnerEmail: LEARNER,
			justification: VALID_JUSTIFICATION,
			status: 'pending',
			createdAt: T0,
			updatedAt: T0,
			statusHistory: [{ fromStatus: null, toStatus: 'pending', changedAt: T0, changedBy: 'system', reason: null }],
		});
	});

	it('returns 400 INVALID_REQUEST for an invalid email', async () => {
		const { send } = enrollmentApp();

		await expectInvalidRequestResponse(await send('POST', '/api/enrollment-requests', createBody({ learnerEmail: 'not-an-email' })), ['learnerEmail']);
	});

	it('returns 400 with the documented body for a short justification', async () => {
		const { send } = enrollmentApp();

		const response = await send('POST', '/api/enrollment-requests', createBody({ justification: 'Too short.' }));

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: { code: 'INVALID_REQUEST', message: INVALID_REQUEST_MESSAGE, details: [{ field: 'justification', message: JUSTIFICATION_MESSAGE }] } });
	});

	it('returns 400 INVALID_REQUEST for an unknown field', async () => {
		const { send } = enrollmentApp();

		await expectInvalidRequestResponse(await send('POST', '/api/enrollment-requests', createBody({ priority: 'high' })), ['priority']);
	});

	it('returns 400 INVALID_REQUEST for malformed JSON', async () => {
		const { sendRaw } = enrollmentApp();

		await expectInvalidRequestResponse(await sendRaw('POST', '/api/enrollment-requests', '{"courseId": "r1", '));
	});

	it('returns 400 INVALID_REQUEST for an empty body', async () => {
		const { sendRaw } = enrollmentApp();

		await expectInvalidRequestResponse(await sendRaw('POST', '/api/enrollment-requests', ''));
	});

	it('returns 400 INVALID_REQUEST for a JSON array body', async () => {
		const { send } = enrollmentApp();

		await expectInvalidRequestResponse(await send('POST', '/api/enrollment-requests', [createBody()]));
	});

	it.each([
		['malformed JSON', '{"courseId": "r1", '],
		['an empty body', ''],
	])('returns the documented invalid-JSON body for %s', async (_label, raw) => {
		const { sendRaw } = enrollmentApp();

		const response = await sendRaw('POST', '/api/enrollment-requests', raw);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual(INVALID_JSON_BODY);
	});

	it.each(NON_OBJECT_JSON)('returns the documented non-object body for %s', async (_label, body) => {
		const { send } = enrollmentApp();

		const response = await send('POST', '/api/enrollment-requests', body);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual(NON_OBJECT_BODY);
	});

	it('does not create anything when the body is not valid JSON', async () => {
		const { app, sendRaw } = enrollmentApp();

		await sendRaw('POST', '/api/enrollment-requests', '{');

		expect(await (await app.request('/api/enrollment-requests')).json()).toEqual({ items: [], totalItems: 0 });
	});

	it('returns 400 INVALID_REQUEST for a courseId of only whitespace', async () => {
		const { send } = enrollmentApp();

		await expectInvalidRequestResponse(await send('POST', '/api/enrollment-requests', createBody({ courseId: '   ' })), ['courseId']);
	});

	it('returns 404 COURSE_NOT_FOUND for a missing course', async () => {
		const { send } = enrollmentApp();

		await expectErrorResponse(await send('POST', '/api/enrollment-requests', createBody({ courseId: 'no-such-course' })), 404, 'COURSE_NOT_FOUND');
	});

	it.each([
		['draft', r3.id],
		['retired', r4.id],
	])('returns 409 COURSE_NOT_ACTIVE for a %s course', async (_label, courseId) => {
		const { send } = enrollmentApp();

		await expectErrorResponse(await send('POST', '/api/enrollment-requests', createBody({ courseId })), 409, 'COURSE_NOT_ACTIVE');
	});

	it.each(['pending', 'approved'] as const)('returns 409 DUPLICATE_ACTIVE_REQUEST when a %s request exists', async (status) => {
		const { send } = enrollmentApp([storedRequest({ id: 'enroll-900', status })]);

		await expectErrorResponse(await send('POST', '/api/enrollment-requests', createBody({ learnerEmail: 'Learner@Example.org' })), 409, 'DUPLICATE_ACTIVE_REQUEST');
	});

	it.each(['rejected', 'cancelled'] as const)('returns 201 when the only existing request is %s', async (status) => {
		const { send } = enrollmentApp([storedRequest({ id: 'enroll-900', status })]);

		const response = await send('POST', '/api/enrollment-requests', createBody());

		expect(response.status).toBe(201);
		expect(await response.json()).toMatchObject({ status: 'pending' });
	});
});

describe('GET /api/enrollment-requests/:id', () => {
	it('returns 200 with the request and its status history', async () => {
		const existing = storedRequest({ id: 'enroll-005', status: 'rejected' });
		const { app } = enrollmentApp([existing]);

		const response = await app.request('/api/enrollment-requests/enroll-005');

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toMatch(/^application\/json/);
		expect(await response.json()).toEqual(existing);
	});

	it('returns 404 ENROLLMENT_REQUEST_NOT_FOUND for an unknown id', async () => {
		const { app } = enrollmentApp([storedRequest({ id: 'enroll-005' })]);

		await expectErrorResponse(await app.request('/api/enrollment-requests/enroll-999'), 404, 'ENROLLMENT_REQUEST_NOT_FOUND');
	});
});

describe('GET /api/enrollment-requests', () => {
	// createdAt order: e3, (e1, e2 tie -> id order), e4
	const e1 = storedRequest({ id: 'enroll-001', status: 'pending', createdAt: '2026-06-02T00:00:00.000Z' });
	const e2 = storedRequest({ id: 'enroll-002', status: 'approved', learnerEmail: 'other@example.org', createdAt: '2026-06-02T00:00:00.000Z' });
	const e3 = storedRequest({ id: 'enroll-003', status: 'rejected', courseId: r2.id, createdAt: '2026-06-01T00:00:00.000Z' });
	const e4 = storedRequest({ id: 'enroll-004', status: 'pending', courseId: r2.id, learnerEmail: 'other@example.org', createdAt: '2026-06-05T00:00:00.000Z' });
	const seeded = [e4, e2, e1, e3];

	const listIds = async (query: string): Promise<string[]> => {
		const response = await enrollmentApp(seeded).app.request(`/api/enrollment-requests${query}`);
		expect(response.status).toBe(200);
		const body = (await response.json()) as { items: EnrollmentRequest[]; totalItems: number };
		expect(body.totalItems).toBe(body.items.length);
		return body.items.map((item) => item.id);
	};

	it('returns 200 with every request sorted by createdAt then id', async () => {
		const response = await enrollmentApp(seeded).app.request('/api/enrollment-requests');

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toMatch(/^application\/json/);
		expect(await response.json()).toEqual({ items: [e3, e1, e2, e4], totalItems: 4 });
	});

	it('filters by status', async () => {
		expect(await listIds('?status=pending')).toEqual(['enroll-001', 'enroll-004']);
	});

	it('filters by courseId', async () => {
		expect(await listIds(`?courseId=${r2.id}`)).toEqual(['enroll-003', 'enroll-004']);
	});

	it('filters by learnerEmail case-insensitively', async () => {
		expect(await listIds('?learnerEmail=OTHER%40Example.org')).toEqual(['enroll-002', 'enroll-004']);
	});

	it('combines status, courseId, and learnerEmail', async () => {
		expect(await listIds(`?status=pending&courseId=${r2.id}&learnerEmail=other%40example.org`)).toEqual(['enroll-004']);
	});

	it('returns 200 with no items when nothing matches', async () => {
		const response = await enrollmentApp(seeded).app.request('/api/enrollment-requests?status=cancelled');

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ items: [], totalItems: 0 });
	});

	it('returns 400 INVALID_REQUEST for an unknown status', async () => {
		await expectInvalidRequestResponse(await enrollmentApp(seeded).app.request('/api/enrollment-requests?status=archived'), ['status']);
	});

	it('returns 400 INVALID_REQUEST for an unsupported query parameter', async () => {
		await expectInvalidRequestResponse(await enrollmentApp(seeded).app.request('/api/enrollment-requests?page=1'), ['page']);
	});

	it('returns 400 INVALID_REQUEST for a repeated query parameter', async () => {
		await expectInvalidRequestResponse(await enrollmentApp(seeded).app.request('/api/enrollment-requests?status=pending&status=approved'), ['status']);
	});

	it('trims the courseId filter value', async () => {
		expect(await listIds(`?courseId=%20%20${r2.id}%20`)).toEqual(['enroll-003', 'enroll-004']);
	});

	it('trims the learnerEmail filter value', async () => {
		expect(await listIds('?learnerEmail=%20other%40example.org%20%20')).toEqual(['enroll-002', 'enroll-004']);
	});

	it.each(['?courseId=', '?courseId=%20%20', '?learnerEmail=', '?learnerEmail=%20'])('treats %s as no filter', async (query) => {
		expect(await listIds(query)).toEqual(['enroll-003', 'enroll-001', 'enroll-002', 'enroll-004']);
	});
});

describe('PATCH /api/enrollment-requests/:id/status', () => {
	it.each([
		['pending', 'approved', {}],
		['pending', 'rejected', { reason: 'Learner has not completed the prerequisite course.' }],
		['pending', 'cancelled', {}],
		['approved', 'cancelled', {}],
	] as const)('returns 200 for %s -> %s with the appended history entry', async (from, to, extra) => {
		const existing = storedRequest({ id: 'enroll-010', status: from });
		const { send, setNow } = enrollmentApp([existing]);
		setNow(T1);

		const response = await send('PATCH', '/api/enrollment-requests/enroll-010/status', { status: to, changedBy: REVIEWER, ...extra });

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toMatch(/^application\/json/);
		expect(await response.json()).toEqual({
			...existing,
			status: to,
			updatedAt: T1,
			statusHistory: [...existing.statusHistory, { fromStatus: from, toStatus: to, changedAt: T1, changedBy: REVIEWER, reason: 'reason' in extra ? extra.reason : null }],
		});
	});

	it.each([
		['cancelled', 'approved'],
		['rejected', 'cancelled'],
		['approved', 'rejected'],
		['approved', 'pending'],
		['pending', 'pending'],
	] as const)('returns 409 INVALID_STATUS_TRANSITION for %s -> %s', async (from, to) => {
		const { send } = enrollmentApp([storedRequest({ id: 'enroll-020', status: from })]);

		await expectErrorResponse(await send('PATCH', '/api/enrollment-requests/enroll-020/status', { status: to, changedBy: REVIEWER, reason: 'Some reason.' }), 409, 'INVALID_STATUS_TRANSITION');
	});

	it('returns 400 INVALID_REQUEST for a rejection without a reason', async () => {
		const { send } = enrollmentApp([storedRequest({ id: 'enroll-030' })]);

		await expectInvalidRequestResponse(await send('PATCH', '/api/enrollment-requests/enroll-030/status', { status: 'rejected', changedBy: REVIEWER }), ['reason']);
	});

	it('returns 400 INVALID_REQUEST for an invalid status value', async () => {
		const { send } = enrollmentApp([storedRequest({ id: 'enroll-030' })]);

		await expectInvalidRequestResponse(await send('PATCH', '/api/enrollment-requests/enroll-030/status', { status: 'archived', changedBy: REVIEWER }), ['status']);
	});

	it('returns 400 INVALID_REQUEST for a missing changedBy', async () => {
		const { send } = enrollmentApp([storedRequest({ id: 'enroll-030' })]);

		await expectInvalidRequestResponse(await send('PATCH', '/api/enrollment-requests/enroll-030/status', { status: 'approved' }), ['changedBy']);
	});

	it('returns 400 INVALID_REQUEST for malformed JSON', async () => {
		const { sendRaw } = enrollmentApp([storedRequest({ id: 'enroll-030' })]);

		await expectInvalidRequestResponse(await sendRaw('PATCH', '/api/enrollment-requests/enroll-030/status', '{"status": '));
	});

	it.each([
		['malformed JSON', '{"status": '],
		['an empty body', ''],
	])('returns the documented invalid-JSON body for %s', async (_label, raw) => {
		const { sendRaw } = enrollmentApp([storedRequest({ id: 'enroll-030' })]);

		const response = await sendRaw('PATCH', '/api/enrollment-requests/enroll-030/status', raw);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual(INVALID_JSON_BODY);
	});

	it.each(NON_OBJECT_JSON)('returns the documented non-object body for %s', async (_label, body) => {
		const { send } = enrollmentApp([storedRequest({ id: 'enroll-030' })]);

		const response = await send('PATCH', '/api/enrollment-requests/enroll-030/status', body);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual(NON_OBJECT_BODY);
	});

	it('returns 400 before 404 when the body is not valid JSON and the id is unknown', async () => {
		const { sendRaw } = enrollmentApp();

		const response = await sendRaw('PATCH', '/api/enrollment-requests/enroll-999/status', '{');

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual(INVALID_JSON_BODY);
	});

	it('leaves the request unchanged when the body is not valid JSON', async () => {
		const existing = storedRequest({ id: 'enroll-030' });
		const { app, sendRaw } = enrollmentApp([existing]);

		await sendRaw('PATCH', '/api/enrollment-requests/enroll-030/status', '{"status": "approved"');

		expect(await (await app.request('/api/enrollment-requests/enroll-030')).json()).toEqual(existing);
	});

	it('returns 400 INVALID_REQUEST for a rejection with reason: null', async () => {
		const { send } = enrollmentApp([storedRequest({ id: 'enroll-030' })]);

		await expectInvalidRequestResponse(await send('PATCH', '/api/enrollment-requests/enroll-030/status', { status: 'rejected', changedBy: REVIEWER, reason: null }), ['reason']);
	});

	it('returns 200 with a null reason in the history for an approval with reason: null', async () => {
		const existing = storedRequest({ id: 'enroll-030' });
		const { send, setNow } = enrollmentApp([existing]);
		setNow(T1);

		const response = await send('PATCH', '/api/enrollment-requests/enroll-030/status', { status: 'approved', changedBy: REVIEWER, reason: null });

		expect(response.status).toBe(200);
		expect(((await response.json()) as EnrollmentRequest).statusHistory.at(-1)).toEqual({ fromStatus: 'pending', toStatus: 'approved', changedAt: T1, changedBy: REVIEWER, reason: null });
	});

	it('returns 404 ENROLLMENT_REQUEST_NOT_FOUND for an unknown id', async () => {
		const { send } = enrollmentApp();

		await expectErrorResponse(await send('PATCH', '/api/enrollment-requests/enroll-999/status', { status: 'approved', changedBy: REVIEWER }), 404, 'ENROLLMENT_REQUEST_NOT_FOUND');
	});

	it('returns 400 before 404 when the body is invalid and the id is unknown', async () => {
		const { send } = enrollmentApp();

		await expectInvalidRequestResponse(await send('PATCH', '/api/enrollment-requests/enroll-999/status', { status: 'archived', changedBy: REVIEWER }), ['status']);
	});
});

describe('enrollment request workflow over HTTP', () => {
	it('creates, approves, cancels, and returns the full audit trail', async () => {
		const { app, send, setNow } = enrollmentApp();

		const created = await send('POST', '/api/enrollment-requests', createBody());
		expect(created.status).toBe(201);
		const { id } = (await created.json()) as EnrollmentRequest;

		setNow(T1);
		expect((await send('PATCH', `/api/enrollment-requests/${id}/status`, { status: 'approved', changedBy: REVIEWER })).status).toBe(200);
		setNow(T2);
		expect((await send('PATCH', `/api/enrollment-requests/${id}/status`, { status: 'cancelled', changedBy: 'operator-7', reason: 'Learner withdrew.' })).status).toBe(200);

		const fetched = await app.request(`/api/enrollment-requests/${id}`);
		expect(fetched.status).toBe(200);
		expect(await fetched.json()).toEqual({
			id,
			courseId: r1.id,
			learnerEmail: LEARNER,
			justification: VALID_JUSTIFICATION,
			status: 'cancelled',
			createdAt: T0,
			updatedAt: T2,
			statusHistory: [
				{ fromStatus: null, toStatus: 'pending', changedAt: T0, changedBy: 'system', reason: null },
				{ fromStatus: 'pending', toStatus: 'approved', changedAt: T1, changedBy: REVIEWER, reason: null },
				{ fromStatus: 'approved', toStatus: 'cancelled', changedAt: T2, changedBy: 'operator-7', reason: 'Learner withdrew.' },
			],
		});

		const listed = await app.request('/api/enrollment-requests?status=cancelled');
		expect(listed.status).toBe(200);
		expect(((await listed.json()) as { items: EnrollmentRequest[] }).items.map((item) => item.id)).toEqual([id]);
	});

	it('blocks a duplicate while pending and allows a new request after rejection', async () => {
		const { send } = enrollmentApp();

		const first = await send('POST', '/api/enrollment-requests', createBody());
		expect(first.status).toBe(201);
		const { id } = (await first.json()) as EnrollmentRequest;

		await expectErrorResponse(await send('POST', '/api/enrollment-requests', createBody()), 409, 'DUPLICATE_ACTIVE_REQUEST');

		expect((await send('PATCH', `/api/enrollment-requests/${id}/status`, { status: 'rejected', changedBy: REVIEWER, reason: 'Course is full.' })).status).toBe(200);

		expect((await send('POST', '/api/enrollment-requests', createBody())).status).toBe(201);
	});
});
