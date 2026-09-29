import type { CourseReadRepository } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { type ApiContext, buildApplicationServicesFactory, resolveEnvironment } from './index.ts';

const emptyCourseRepository: CourseReadRepository = {
	search: (criteria) => Promise.resolve({ items: [], page: criteria.page, pageSize: criteria.pageSize, totalItems: 0, totalPages: 0 }),
};

const context: ApiContext = { environment: 'test', courses: emptyCourseRepository };

describe('healthcheck', () => {
	it('maps runtime environments', () => {
		expect(resolveEnvironment('production')).toBe('production');
		expect(resolveEnvironment('test')).toBe('test');
		expect(resolveEnvironment('development')).toBe('local');
		expect(resolveEnvironment(undefined)).toBe('local');
	});

	it('returns the agentCourses health contract', async () => {
		const services = await buildApplicationServicesFactory(context).forRequest();
		const status = services.health.getStatus();

		expect(status.status).toBe('ok');
		expect(status.service).toBe('agentCourses-api');
		expect(status.projectCode).toBe('axc');
		expect(status.environment).toBe('test');
		expect(status.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});
});
