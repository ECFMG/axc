import type { EnrollmentRequestRepository } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { buildApplicationServicesFactory, resolveEnvironment } from './index.ts';

const unusedEnrollmentRequestRepository: EnrollmentRequestRepository = {
	nextId: () => Promise.reject(new Error('not used by the health tests')),
	getById: () => Promise.reject(new Error('not used by the health tests')),
	getAll: () => Promise.reject(new Error('not used by the health tests')),
	save: () => Promise.reject(new Error('not used by the health tests')),
};

describe('healthcheck', () => {
	it('maps runtime environments', () => {
		expect(resolveEnvironment('production')).toBe('production');
		expect(resolveEnvironment('test')).toBe('test');
		expect(resolveEnvironment('development')).toBe('local');
		expect(resolveEnvironment(undefined)).toBe('local');
	});

	it('returns the agentCourses health contract', async () => {
		const services = await buildApplicationServicesFactory({ environment: 'test', courseRepository: { getAll: () => Promise.resolve([]) }, enrollmentRequestRepository: unusedEnrollmentRequestRepository }).forRequest();
		const status = services.health.getStatus();

		expect(status.status).toBe('ok');
		expect(status.service).toBe('agentCourses-api');
		expect(status.projectCode).toBe('axc');
		expect(status.environment).toBe('test');
		expect(status.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});
});
