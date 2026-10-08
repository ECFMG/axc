import { buildApplicationServicesFactory } from '@axc/application-services';
import { createDataSourcesFactory } from '@axc/persistence';
import { describe, expect, it } from 'vitest';
import { createRestApp } from '../../index.ts';

const setup = () => createRestApp(buildApplicationServicesFactory({ environment: 'test', dataSourcesFactory: createDataSourcesFactory() }));
const json = (method: string, body: unknown) => ({ method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const url = (path: string) => `http://localhost${path}`;
const justification = 'I need this course for upcoming project work.';

function create(app: ReturnType<typeof setup>, courseId = 'course-001', learnerEmail = 'learner@example.org') {
	return app.request(url('/api/enrollment-requests'), json('POST', { courseId, learnerEmail, justification }));
}

describe('course catalog and enrollment HTTP API', () => {
	it('searches, filters, pages, sorts and validates courses', async () => {
		const app = setup();
		const basic = await app.request(url('/api/courses'));
		const body = await basic.json();
		expect(basic.status).toBe(200);
		expect(body.items).toHaveLength(10);
		expect(body.totalItems).toBe(12);
		const filtered = await (await app.request(url('/api/courses?q=SECURITY&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=createdAt'))).json();
		expect(filtered.items.length).toBeGreaterThan(0);
		expect(filtered.items.every((item: { modality: string; status: string }) => item.modality === 'online' && item.status === 'active')).toBe(true);
		const empty = await (await app.request(url('/api/courses?q=nevermatches'))).json();
		expect(empty.items).toEqual([]);
		for (const query of ['modality=wrong', 'status=wrong', 'page=0', 'pageSize=51', 'sort=wrong']) {
			const result = await app.request(url(`/api/courses?${query}`));
			expect(result.status).toBe(400);
			expect((await result.json()).error.code).toBe('INVALID_QUERY_PARAMETER');
		}
	});

	it('creates pending requests and blocks missing, inactive, invalid and duplicate requests', async () => {
		const app = setup();
		expect((await create(app, 'missing')).status).toBe(404);
		expect((await create(app, 'course-002')).status).toBe(409);
		expect((await create(app, 'course-003')).status).toBe(409);
		for (const body of [
			{ courseId: 'course-001', learnerEmail: 'bad', justification },
			{ courseId: 'course-001', learnerEmail: 'x@y.org', justification: 'short' },
		]) {
			const result = await app.request(url('/api/enrollment-requests'), json('POST', body));
			expect(result.status).toBe(400);
		}
		const result = await create(app);
		expect(result.status).toBe(201);
		const created = await result.json();
		expect(created.status).toBe('pending');
		expect(created.statusHistory).toHaveLength(1);
		const duplicate = await create(app, 'course-001', 'LEARNER@example.org');
		expect(duplicate.status).toBe(409);
		expect((await duplicate.json()).error.code).toBe('DUPLICATE_ACTIVE_REQUEST');
	});

	it('retrieves, filters, transitions and appends audit history', async () => {
		const app = setup();
		const created = await (await create(app)).json();
		const path = `/api/enrollment-requests/${created.id}`;
		const fetched = await (await app.request(url(path))).json();
		expect(fetched.statusHistory[0].fromStatus).toBeNull();
		const list = await (await app.request(url('/api/enrollment-requests?status=pending&courseId=course-001&learnerEmail=LEARNER%40example.org'))).json();
		expect(list).toHaveLength(1);
		const approved = await app.request(url(`${path}/status`), json('PATCH', { status: 'approved', changedBy: 'reviewer@example.org' }));
		expect(approved.status).toBe(200);
		expect((await approved.json()).statusHistory).toHaveLength(2);
		expect((await create(app)).status).toBe(409);
		const cancelled = await app.request(url(`${path}/status`), json('PATCH', { status: 'cancelled', changedBy: 'reviewer@example.org' }));
		expect(cancelled.status).toBe(200);
		expect((await cancelled.json()).statusHistory).toHaveLength(3);
		const invalid = await app.request(url(`${path}/status`), json('PATCH', { status: 'approved', changedBy: 'reviewer@example.org' }));
		expect(invalid.status).toBe(409);
		expect((await create(app)).status).toBe(201);
	});

	it('supports rejection and pending cancellation; rejects missing reason, invalid status and missing id', async () => {
		const app = setup();
		const first = await (await create(app)).json();
		const path = `/api/enrollment-requests/${first.id}/status`;
		expect((await app.request(url(path), json('PATCH', { status: 'rejected', changedBy: 'reviewer' }))).status).toBe(400);
		expect((await app.request(url(path), json('PATCH', { status: 'wrong', changedBy: 'reviewer' }))).status).toBe(400);
		const rejected = await (await app.request(url(path), json('PATCH', { status: 'rejected', changedBy: 'reviewer', reason: 'Prerequisite missing' }))).json();
		expect(rejected.statusHistory[1].reason).toBe('Prerequisite missing');
		const second = await (await create(app)).json();
		const cancelled = await (await app.request(url(`/api/enrollment-requests/${second.id}/status`), json('PATCH', { status: 'cancelled', changedBy: 'reviewer' }))).json();
		expect(cancelled.status).toBe('cancelled');
		expect((await app.request(url('/api/enrollment-requests/unknown'))).status).toBe(404);
		expect((await app.request(url('/api/enrollment-requests/unknown/status'), json('PATCH', { status: 'approved', changedBy: 'reviewer' }))).status).toBe(404);
	});
});
