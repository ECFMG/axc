import type { ApplicationServices, ApplicationServicesFactory, CourseQueryCommand } from '@axc/application-services';
import { describe, expect, it } from 'vitest';
import { createRestApp } from './index.ts';

const emptyPage = { items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 };

function appRecording(seen: CourseQueryCommand[]) {
	const services = {
		Catalog: {
			Course: {
				queryCourses: (command: CourseQueryCommand) => {
					seen.push(command);
					return Promise.resolve(emptyPage);
				},
			},
		},
	} as unknown as ApplicationServices;
	const factory: ApplicationServicesFactory = { forRequest: () => Promise.resolve(services) };
	return createRestApp(factory);
}

interface ErrorBody {
	error: { code: string; message: string; details: Array<{ field: string; message: string }> };
}

describe('GET /api/courses', () => {
	it('B-AC1 applies default paging and sort and returns the use-case page', async () => {
		const seen: CourseQueryCommand[] = [];
		const response = await appRecording(seen).request('/api/courses');

		expect(response.status).toBe(200);
		expect(await response.json()).toStrictEqual(emptyPage);
		expect(seen).toStrictEqual([{ page: 1, pageSize: 10, sort: 'title' }]);
	});

	it('B-AC1 passes every supported parameter through, trimmed', async () => {
		const seen: CourseQueryCommand[] = [];
		const response = await appRecording(seen).request('/api/courses?q=%20security%20&modality=online&status=active&tag=ai&page=2&pageSize=5&sort=createdAt');

		expect(response.status).toBe(200);
		expect(seen).toStrictEqual([{ q: 'security', modality: 'online', status: 'active', tag: 'ai', page: 2, pageSize: 5, sort: 'createdAt' }]);
	});

	it('B-AC1 treats an empty keyword or tag as no filter', async () => {
		const seen: CourseQueryCommand[] = [];
		await appRecording(seen).request('/api/courses?q=&tag=%20');
		expect(seen).toStrictEqual([{ page: 1, pageSize: 10, sort: 'title' }]);
	});

	it.each([
		['modality=classroom', 'modality'],
		['status=archived', 'status'],
		['sort=price', 'sort'],
		['page=0', 'page'],
		['page=abc', 'page'],
		['page=1.5', 'page'],
		['pageSize=0', 'pageSize'],
		['pageSize=51', 'pageSize'],
		['unknown=1', 'unknown'],
		['tag=a&tag=b', 'tag'],
	])('B-AC1 rejects %s with 400 INVALID_QUERY_PARAMETER', async (query, field) => {
		const seen: CourseQueryCommand[] = [];
		const response = await appRecording(seen).request(`/api/courses?${query}`);

		expect(response.status).toBe(400);
		const body = (await response.json()) as ErrorBody;
		expect(body.error.code).toBe('INVALID_QUERY_PARAMETER');
		expect(body.error.message).toBe('One or more query parameters are invalid.');
		expect(body.error.details.map((detail) => detail.field)).toStrictEqual([field]);
		expect(seen).toHaveLength(0);
	});

	it('B-AC1 lists every invalid parameter in one response', async () => {
		const response = await appRecording([]).request('/api/courses?pageSize=51&page=0&sort=price&modality=x');
		const body = (await response.json()) as ErrorBody;
		expect(body.error.details.map((detail) => detail.field).sort()).toStrictEqual(['modality', 'page', 'pageSize', 'sort']);
	});
});
