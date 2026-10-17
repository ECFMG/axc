import { describe, expect, it } from 'vitest';
import { buildApplicationServicesFactory, resolveEnvironment } from './index.ts';

describe('healthcheck', () => {
	it('maps runtime environments', () => {
		expect(resolveEnvironment('production')).toBe('production');
		expect(resolveEnvironment('test')).toBe('test');
		expect(resolveEnvironment('development')).toBe('local');
		expect(resolveEnvironment(undefined)).toBe('local');
	});

	it('returns the agentCourses health contract', async () => {
		const services = await buildApplicationServicesFactory({
			environment: 'test',
			dataSourcesFactory: { withSystemPassport: () => ({ readonlyDataSource: { Catalog: { Course: { CourseReadRepo: { search: async () => ({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 }) } } } } }) },
		}).forRequest();
		const status = services.health.getStatus();

		expect(status.status).toBe('ok');
		expect(status.service).toBe('agentCourses-api');
		expect(status.projectCode).toBe('axc');
		expect(status.environment).toBe('test');
		expect(status.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});
});
