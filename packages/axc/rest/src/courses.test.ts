import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildApplicationServicesFactory } from '@axc/application-services';
import { createRestApp } from './index.ts';

const courses = [
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
	{
		id: 'course-002',
		title: 'Classroom Leadership Lab',
		summary: 'Practice facilitation for instructors who teach in a room.',
		modality: 'in-person',
		status: 'active',
		tags: ['leadership'],
		createdAt: '2026-02-01T00:00:00.000Z',
		updatedAt: '2026-02-10T00:00:00.000Z',
	},
];

function api() {
	return createRestApp(
		buildApplicationServicesFactory({
			environment: 'test',
			courseCatalog: {
				listAll() {
					return Promise.resolve(courses);
				},
			},
		}),
	);
}

describe('GET /api/courses', () => {
	it('returns a paginated catalog page', async () => {
		const response = await api().request('/api/courses');
		assert.equal(response.status, 200);
		assert.equal(response.headers.get('content-type')?.startsWith('application/json'), true);
		assert.deepEqual(await response.json(), {
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
				{
					id: 'course-002',
					title: 'Classroom Leadership Lab',
					summary: 'Practice facilitation for instructors who teach in a room.',
					modality: 'in-person',
					status: 'active',
					tags: ['leadership'],
					createdAt: '2026-02-01T00:00:00.000Z',
					updatedAt: '2026-02-10T00:00:00.000Z',
				},
			],
			page: 1,
			pageSize: 10,
			totalItems: 2,
			totalPages: 1,
		});
	});

	it('applies a combined filter', async () => {
		const response = await api().request('/api/courses?q=security&modality=online&status=active');
		assert.equal(response.status, 200);
		const body = (await response.json()) as { items: { id: string }[]; totalItems: number };
		assert.equal(body.totalItems, 1);
		assert.equal(body.items[0]?.id, 'course-001');
	});

	it('returns an empty page when nothing matches', async () => {
		const response = await api().request('/api/courses?q=zzznomatch');
		assert.equal(response.status, 200);
		assert.deepEqual(await response.json(), {
			items: [],
			page: 1,
			pageSize: 10,
			totalItems: 0,
			totalPages: 0,
		});
	});

	it('returns the invalid query parameter error', async () => {
		const response = await api().request('/api/courses?pageSize=51&modality=classroom');
		assert.equal(response.status, 400);
		assert.deepEqual(await response.json(), {
			error: {
				code: 'INVALID_QUERY_PARAMETER',
				message: 'One or more query parameters are invalid.',
				details: [
					{ field: 'modality', message: 'modality must be one of online, in-person, hybrid.' },
					{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' },
				],
			},
		});
	});
});

describe('GET /health', () => {
	it('still returns the health contract', async () => {
		const response = await api().request('/health');
		assert.equal(response.status, 200);
		const body = (await response.json()) as { status: string; service: string; projectCode: string; environment: string };
		assert.equal(body.status, 'ok');
		assert.equal(body.service, 'agentCourses-api');
		assert.equal(body.projectCode, 'axc');
		assert.equal(body.environment, 'test');
	});
});
