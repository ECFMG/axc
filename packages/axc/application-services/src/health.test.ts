import { describe, expect, it } from 'vitest';
import { resolveEnvironment } from './index.ts';
import { createTestApiContext, createTestServices } from './test-support/context.ts';

describe('healthcheck', () => {
	it('maps runtime environments', () => {
		expect(resolveEnvironment('production')).toBe('production');
		expect(resolveEnvironment('test')).toBe('test');
		expect(resolveEnvironment('development')).toBe('local');
		expect(resolveEnvironment(undefined)).toBe('local');
	});

	it('returns the agentCourses health contract', async () => {
		const services = await createTestServices({ environment: 'test' });
		const status = services.health.getStatus();

		expect(status.status).toBe('ok');
		expect(status.service).toBe('agentCourses-api');
		expect(status.projectCode).toBe('axc');
		expect(status.environment).toBe('test');
		expect(status.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});

	it('builds a complete context from the shared test builder', () => {
		const context = createTestApiContext();

		expect(context.environment).toBe('test');
		expect(context.catalog.listCourses()).toEqual([]);
		expect(context.clock().toISOString()).toBe('2026-06-27T10:00:00.000Z');
	});
});
