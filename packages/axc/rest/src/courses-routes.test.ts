import type { ApplicationServices, ApplicationServicesFactory, CourseSearchOutcome, RawCourseQuery } from '@axc/application-services';
import { describe, expect, it } from 'vitest';
import { createRestApp } from './index.ts';

interface RecordedCall {
	readonly rawQuery: RawCourseQuery;
	readonly authorization: string | undefined;
}

const emptyPage: CourseSearchOutcome = { ok: true, result: { items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } };

const onePage: CourseSearchOutcome = {
	ok: true,
	result: {
		items: [
			{
				id: 'course-001',
				title: 'AI Security Foundations',
				summary: 'Introductory course on secure AI-assisted development.',
				modality: 'online',
				status: 'active',
				tags: ['ai', 'security'],
				createdAt: '2026-01-15T00:00:00.000Z',
				updatedAt: '2026-06-01T00:00:00.000Z',
			},
		],
		page: 1,
		pageSize: 5,
		totalItems: 1,
		totalPages: 1,
	},
};

const rejected: CourseSearchOutcome = {
	ok: false,
	errors: [
		{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' },
		{ field: 'sort', message: 'sort must be one of title, createdAt, updatedAt.' },
	],
};

function stubFactory(outcome: CourseSearchOutcome, calls: RecordedCall[] = []): ApplicationServicesFactory {
	return {
		forRequest: (rawAuthHeader?: string) =>
			Promise.resolve({
				health: {
					getStatus: () => ({ status: 'ok', service: 'agentCourses-api', projectCode: 'axc', environment: 'test', timestamp: '2026-01-01T00:00:00.000Z' }),
				},
				courses: {
					search: (rawQuery: RawCourseQuery) => {
						calls.push({ rawQuery, authorization: rawAuthHeader });
						return Promise.resolve(outcome);
					},
				},
			} satisfies ApplicationServices),
	};
}

describe('GET /api/courses', () => {
	it('serves the application service result with status 200', async () => {
		const response = await createRestApp(stubFactory(onePage)).request('/api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title');

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toStrictEqual(onePage.ok ? onePage.result : undefined);
	});

	it('hands the raw query string to the application service unchanged', async () => {
		const calls: RecordedCall[] = [];
		await createRestApp(stubFactory(onePage, calls)).request('/api/courses?q=security&modality=online&page=2&pageSize=51&sort=createdAt&unknown=keep');

		expect(calls).toHaveLength(1);
		expect({ ...calls[0]?.rawQuery }).toStrictEqual({ q: 'security', modality: 'online', page: '2', pageSize: '51', sort: 'createdAt', unknown: 'keep' });
	});

	it('forwards the Authorization header to the application services factory', async () => {
		const calls: RecordedCall[] = [];
		const app = createRestApp(stubFactory(onePage, calls));

		await app.request('/api/courses');
		await app.request('/api/courses', { headers: { Authorization: 'Bearer test-token' } });

		expect(calls.map((call) => call.authorization)).toStrictEqual([undefined, 'Bearer test-token']);
	});

	it('answers 400 with the shared error envelope when validation fails', async () => {
		const response = await createRestApp(stubFactory(rejected)).request('/api/courses?pageSize=99&sort=summary');

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toStrictEqual({
			error: {
				code: 'INVALID_QUERY_PARAMETER',
				message: 'One or more query parameters are invalid.',
				details: [
					{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' },
					{ field: 'sort', message: 'sort must be one of title, createdAt, updatedAt.' },
				],
			},
		});
	});

	it('answers 200 with an empty list rather than an error when nothing matches', async () => {
		const response = await createRestApp(stubFactory(emptyPage)).request('/api/courses?q=no-such-course');

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toStrictEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
	});

	it('does not answer non-GET methods on the courses route', async () => {
		const response = await createRestApp(stubFactory(onePage)).request('/api/courses', { method: 'POST' });

		expect(response.status).toBe(404);
	});
});

describe('GET /health', () => {
	it('still serves the healthcheck contract alongside the courses route', async () => {
		const response = await createRestApp(stubFactory(emptyPage)).request('/health');

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toMatchObject({ status: 'ok', service: 'agentCourses-api', projectCode: 'axc' });
	});
});
