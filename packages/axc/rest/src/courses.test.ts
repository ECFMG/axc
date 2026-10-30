import { buildApplicationServicesFactory } from '@axc/application-services';
import { describe, expect, it } from 'vitest';
import { createRestApp } from './index.ts';

const app = createRestApp(buildApplicationServicesFactory({ environment: 'test' }));

describe('GET /api/courses', () => {
	it('returns 200 with a page', async () => {
		const res = await app.request('/api/courses?pageSize=5');
		expect(res.status).toBe(200);
		expect(await res.json()).toMatchObject({ page: 1, pageSize: 5, totalItems: 12 });
	});
	it('returns 400 with the error contract', async () => {
		const res = await app.request('/api/courses?pageSize=99', { headers: { Authorization: 'x' } });
		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({
			error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: [{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' }] },
		});
	});
});
