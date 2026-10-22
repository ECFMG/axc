import type {
	ApplicationServices,
	ApplicationServicesFactory,
	EnrollmentRequestCreateCommand,
	EnrollmentRequestQueryCommand,
	EnrollmentRequestResult,
	EnrollmentRequestStatusUpdateCommand,
	EnrollmentRequestView,
} from '@axc/application-services';
import { describe, expect, it } from 'vitest';
import { createRestApp } from './index.ts';

const justification = 'I need this course to prepare for upcoming secure development work.';
const view: EnrollmentRequestView = {
	id: '6600000000000000000000aa',
	courseId: '650000000000000000000001',
	learnerEmail: 'learner@example.org',
	justification,
	status: 'pending',
	createdAt: '2026-06-27T10:00:00.000Z',
	updatedAt: '2026-06-27T10:00:00.000Z',
	statusHistory: [{ fromStatus: null, toStatus: 'pending', changedAt: '2026-06-27T10:00:00.000Z', changedBy: 'system', reason: null }],
};
const ok: EnrollmentRequestResult = { ok: true, value: view };
const failure = (code: Extract<EnrollmentRequestResult, { ok: false }>['error']['code']): EnrollmentRequestResult => ({ ok: false, error: { code, message: `${code} message` } });

interface Calls {
	create: EnrollmentRequestCreateCommand[];
	getById: Array<{ id: string }>;
	query: EnrollmentRequestQueryCommand[];
	update: EnrollmentRequestStatusUpdateCommand[];
}

function appWith(result: EnrollmentRequestResult = ok) {
	const calls: Calls = { create: [], getById: [], query: [], update: [] };
	const record =
		<T>(list: T[]) =>
		(command: T) => {
			list.push(command);
			return Promise.resolve(result);
		};
	const services = {
		Enrollment: {
			EnrollmentRequest: {
				create: record(calls.create),
				getById: record(calls.getById),
				updateStatus: record(calls.update),
				queryEnrollmentRequests: (command: EnrollmentRequestQueryCommand) => {
					calls.query.push(command);
					return Promise.resolve({ items: [view], page: command.page, pageSize: command.pageSize, totalItems: 1, totalPages: 1 });
				},
			},
		},
	} as unknown as ApplicationServices;
	const factory: ApplicationServicesFactory = { forRequest: () => Promise.resolve(services) };
	return { app: createRestApp(factory), calls };
}

interface ErrorBody {
	error: { code: string; message: string; details: Array<{ field: string; message: string }> };
}

const json = (method: string, body: unknown) => ({ method, headers: { 'Content-Type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) });
const validBody = { courseId: '650000000000000000000001', learnerEmail: 'learner@example.org', justification };

describe('POST /api/enrollment-requests', () => {
	it('B-AC2 returns 201 with the pending request and its creation history', async () => {
		const { app, calls } = appWith();
		const response = await app.request('/api/enrollment-requests', json('POST', validBody));

		expect(response.status).toBe(201);
		expect(await response.json()).toStrictEqual(view);
		expect(calls.create).toStrictEqual([validBody]);
	});

	it.each([
		[{ ...validBody, learnerEmail: 'not-an-email' }, ['learnerEmail']],
		[{ ...validBody, justification: 'Too short.' }, ['justification']],
		[{ ...validBody, justification: 'x'.repeat(501) }, ['justification']],
		[{ ...validBody, learnerEmail: 'bad', justification: 'short' }, ['justification', 'learnerEmail']],
		[{ justification }, ['courseId', 'learnerEmail']],
		[{ ...validBody, courseId: 42 }, ['courseId']],
	])('B-AC5 returns 400 INVALID_REQUEST for %j', async (body, fields) => {
		const { app, calls } = appWith();
		const response = await app.request('/api/enrollment-requests', json('POST', body));

		expect(response.status).toBe(400);
		const error = ((await response.json()) as ErrorBody).error;
		expect(error.code).toBe('INVALID_REQUEST');
		expect(error.details.map((detail) => detail.field).sort()).toStrictEqual(fields);
		expect(calls.create).toHaveLength(0);
	});

	it('B-AC5 states the justification length rule in the error detail', async () => {
		const response = await appWith().app.request('/api/enrollment-requests', json('POST', { ...validBody, justification: 'short' }));
		expect(((await response.json()) as ErrorBody).error.details).toStrictEqual([{ field: 'justification', message: 'justification must be between 20 and 500 characters.' }]);
	});

	it.each(['not json', '[1,2]', 'null'])('returns 400 for a body that is not a JSON object (%s)', async (body) => {
		const response = await appWith().app.request('/api/enrollment-requests', json('POST', body));
		expect(response.status).toBe(400);
		expect(((await response.json()) as ErrorBody).error.details).toStrictEqual([{ field: 'body', message: 'Request body must be a JSON object.' }]);
	});

	it.each([
		['COURSE_NOT_FOUND', 404],
		['COURSE_NOT_ACTIVE', 409],
		['DUPLICATE_ACTIVE_REQUEST', 409],
	] as const)('B-AC3 B-AC4 B-AC6 maps %s to %i', async (code, status) => {
		const response = await appWith(failure(code)).app.request('/api/enrollment-requests', json('POST', validBody));

		expect(response.status).toBe(status);
		expect(await response.json()).toStrictEqual({ error: { code, message: `${code} message`, details: [] } });
	});
});

describe('GET /api/enrollment-requests/:id', () => {
	it('B-AC7 returns the request including statusHistory', async () => {
		const { app, calls } = appWith();
		const response = await app.request(`/api/enrollment-requests/${view.id}`);

		expect(response.status).toBe(200);
		expect(await response.json()).toStrictEqual(view);
		expect(calls.getById).toStrictEqual([{ id: view.id }]);
	});

	it('B-AC7 returns 404 ENROLLMENT_REQUEST_NOT_FOUND', async () => {
		const response = await appWith(failure('ENROLLMENT_REQUEST_NOT_FOUND')).app.request('/api/enrollment-requests/unknown');
		expect(response.status).toBe(404);
		expect(((await response.json()) as ErrorBody).error.code).toBe('ENROLLMENT_REQUEST_NOT_FOUND');
	});
});

describe('GET /api/enrollment-requests', () => {
	it('B-AC8 passes status, courseId, and learnerEmail filters with default paging', async () => {
		const { app, calls } = appWith();
		const response = await app.request('/api/enrollment-requests?status=pending&courseId=650000000000000000000001&learnerEmail=learner%40example.org');

		expect(response.status).toBe(200);
		expect(calls.query).toStrictEqual([{ status: 'pending', courseId: '650000000000000000000001', learnerEmail: 'learner@example.org', page: 1, pageSize: 10 }]);
		expect(await response.json()).toMatchObject({ items: [view], totalItems: 1 });
	});

	it('B-AC8 lists without filters', async () => {
		const { app, calls } = appWith();
		await app.request('/api/enrollment-requests');
		expect(calls.query).toStrictEqual([{ page: 1, pageSize: 10 }]);
	});

	it.each(['status=open', 'pageSize=51', 'learner=x'])('B-AC8 rejects %s with 400 INVALID_REQUEST', async (query) => {
		const { app, calls } = appWith();
		const response = await app.request(`/api/enrollment-requests?${query}`);
		expect(response.status).toBe(400);
		expect(((await response.json()) as ErrorBody).error.code).toBe('INVALID_REQUEST');
		expect(calls.query).toHaveLength(0);
	});
});

describe('PATCH /api/enrollment-requests/:id/status', () => {
	const path = `/api/enrollment-requests/${view.id}/status`;

	it.each([
		[
			{ status: 'approved', changedBy: 'reviewer@example.org' },
			{ id: view.id, status: 'approved', changedBy: 'reviewer@example.org' },
		],
		[
			{ status: 'rejected', changedBy: 'reviewer@example.org', reason: ' Learner has not completed the prerequisite course. ' },
			{ id: view.id, status: 'rejected', changedBy: 'reviewer@example.org', reason: 'Learner has not completed the prerequisite course.' },
		],
		[
			{ status: 'cancelled', changedBy: 'learner@example.org', reason: '' },
			{ id: view.id, status: 'cancelled', changedBy: 'learner@example.org' },
		],
	])('B-AC9 passes %j to the use case and returns 200', async (body, command) => {
		const { app, calls } = appWith();
		const response = await app.request(path, json('PATCH', body));

		expect(response.status).toBe(200);
		expect(await response.json()).toStrictEqual(view);
		expect(calls.update).toStrictEqual([command]);
	});

	it('B-AC10 returns 409 INVALID_STATUS_TRANSITION', async () => {
		const response = await appWith(failure('INVALID_STATUS_TRANSITION')).app.request(path, json('PATCH', { status: 'approved', changedBy: 'reviewer@example.org' }));
		expect(response.status).toBe(409);
		expect(((await response.json()) as ErrorBody).error.code).toBe('INVALID_STATUS_TRANSITION');
	});

	it('returns 404 when the request does not exist', async () => {
		const response = await appWith(failure('ENROLLMENT_REQUEST_NOT_FOUND')).app.request(path, json('PATCH', { status: 'approved', changedBy: 'reviewer@example.org' }));
		expect(response.status).toBe(404);
	});

	it.each([undefined, '', '   ', null])('B-AC11 returns 400 when rejecting with reason %j', async (reason) => {
		const { app, calls } = appWith();
		const response = await app.request(path, json('PATCH', { status: 'rejected', changedBy: 'reviewer@example.org', reason }));

		expect(response.status).toBe(400);
		const error = ((await response.json()) as ErrorBody).error;
		expect(error.code).toBe('INVALID_REQUEST');
		expect(error.details).toStrictEqual([{ field: 'reason', message: 'reason is required when rejecting a request.' }]);
		expect(calls.update).toHaveLength(0);
	});

	it.each([
		[{ status: 'archived', changedBy: 'reviewer@example.org' }, ['status']],
		[{ changedBy: 'reviewer@example.org' }, ['status']],
		[{ status: 'approved' }, ['changedBy']],
		[{ status: 'approved', changedBy: 'reviewer@example.org', reason: 7 }, ['reason']],
	])('returns 400 INVALID_REQUEST for %j', async (body, fields) => {
		const { app, calls } = appWith();
		const response = await app.request(path, json('PATCH', body));

		expect(response.status).toBe(400);
		expect(((await response.json()) as ErrorBody).error.details.map((detail) => detail.field)).toStrictEqual(fields);
		expect(calls.update).toHaveLength(0);
	});
});
