import { buildApplicationServicesFactory } from '@axc/application-services';
import { describe, expect, it } from 'vitest';
import { createRestApp } from './index.ts';

const app = () => createRestApp(buildApplicationServicesFactory({ environment: 'test' }));
const send = (a: ReturnType<typeof app>, method: string, path: string, body?: unknown) =>
	a.request(path, { method, headers: { 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }) });
const valid = { courseId: 'course-001', learnerEmail: 'learner@example.org', justification: 'I need this course for secure development work.' };

describe('rest routes', () => {
	it('serves health and course search', async () => {
		const a = app();
		expect((await send(a, 'GET', '/health')).status).toBe(200);
		const res = await send(a, 'GET', '/api/courses?tag=AI&status=active');
		expect(res.status).toBe(200);
		expect(((await res.json()) as { totalItems: number }).totalItems).toBe(2);
		const bad = await send(a, 'GET', '/api/courses?pageSize=51');
		expect(bad.status).toBe(400);
		expect(await bad.json()).toEqual({ error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: [{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' }] } });
	});

	it('runs the enrollment workflow over HTTP', async () => {
		const a = app();
		const created = await send(a, 'POST', '/api/enrollment-requests', valid);
		expect(created.status).toBe(201);
		const { id } = (await created.json()) as { id: string };
		expect((await send(a, 'GET', `/api/enrollment-requests/${id}`)).status).toBe(200);
		expect((await send(a, 'GET', '/api/enrollment-requests?status=pending&courseId=course-001&learnerEmail=learner@example.org')).status).toBe(200);
		const approved = await send(a, 'PATCH', `/api/enrollment-requests/${id}/status`, { status: 'approved', changedBy: 'reviewer@example.org' });
		expect(approved.status).toBe(200);
		expect(((await approved.json()) as { statusHistory: unknown[] }).statusHistory).toHaveLength(2);
	});

	it.each([
		['POST', '/api/enrollment-requests', { ...valid, courseId: 'course-999' }, 404, 'COURSE_NOT_FOUND'],
		['POST', '/api/enrollment-requests', { ...valid, courseId: 'course-005' }, 409, 'COURSE_NOT_ACTIVE'],
		['POST', '/api/enrollment-requests', { ...valid, learnerEmail: 'x' }, 400, 'INVALID_REQUEST'],
		['POST', '/api/enrollment-requests', '{not json', 400, 'INVALID_REQUEST'],
		['GET', '/api/enrollment-requests/enroll-404', undefined, 404, 'ENROLLMENT_REQUEST_NOT_FOUND'],
		['GET', '/api/enrollment-requests?status=open', undefined, 400, 'INVALID_REQUEST'],
		['PATCH', '/api/enrollment-requests/enroll-001/status', { status: 'rejected', changedBy: 'r' }, 400, 'INVALID_REQUEST'],
		['PATCH', '/api/enrollment-requests/enroll-001/status', { status: 'done', changedBy: 'r' }, 400, 'INVALID_REQUEST'],
		['PATCH', '/api/enrollment-requests/enroll-001/status', { status: 'pending', changedBy: 'r' }, 409, 'INVALID_STATUS_TRANSITION'],
	])('%s %s -> %i %s', async (method, path, body, status, code) => {
		const a = app();
		await send(a, 'POST', '/api/enrollment-requests', valid);
		const res = await send(a, method, path, body);
		expect(res.status).toBe(status);
		expect(((await res.json()) as { error: { code: string } }).error.code).toBe(code);
	});
});
