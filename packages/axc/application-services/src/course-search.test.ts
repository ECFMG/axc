import { describe, expect, it } from 'vitest';
import type { CourseSearchErrorBody, CourseSearchResult } from './course-search.ts';
import { buildApplicationServicesFactory } from './index.ts';

const search = async (query: Record<string, string>) => {
	const services = await buildApplicationServicesFactory({ environment: 'test' }).forRequest();
	return services.courses.search(query);
};

const ok = async (query: Record<string, string>): Promise<CourseSearchResult> => {
	const outcome = await search(query);
	if (outcome.kind !== 'ok') {
		throw new Error(`expected success, got ${JSON.stringify(outcome.error)}`);
	}
	return outcome.result;
};

const invalid = async (query: Record<string, string>): Promise<CourseSearchErrorBody> => {
	const outcome = await search(query);
	if (outcome.kind !== 'invalid') {
		throw new Error('expected a validation failure');
	}
	return outcome.error;
};

describe('course search', () => {
	it('applies default pagination and sorting', async () => {
		const result = await ok({});
		expect(result.page).toBe(1);
		expect(result.pageSize).toBe(10);
		expect(result.totalItems).toBe(12);
		expect(result.totalPages).toBe(2);
		expect(result.items).toHaveLength(10);
		expect(result.items[0]?.title).toBe('AI Security Foundations');
	});

	it('matches the keyword against title, summary and tags, case-insensitively', async () => {
		const result = await ok({ q: 'SeCuRiTy' });
		expect(result.items.map((course) => course.id)).toStrictEqual(['course-001', 'course-004', 'course-009']);
	});

	it('filters by modality, status and tag', async () => {
		expect((await ok({ modality: 'hybrid' })).items.every((course) => course.modality === 'hybrid')).toBe(true);
		expect((await ok({ status: 'retired' })).items.map((course) => course.id)).toStrictEqual(['course-008', 'course-009']);
		expect((await ok({ tag: 'AI' })).items.map((course) => course.id)).toStrictEqual(['course-001', 'course-002', 'course-008']);
	});

	it('combines keyword, modality and status filters', async () => {
		const result = await ok({ q: 'ai', modality: 'online', status: 'active' });
		expect(result.items.map((course) => course.id)).toStrictEqual(['course-001', 'course-002']);
		expect(result.totalItems).toBe(2);
	});

	it('paginates with the requested page and pageSize', async () => {
		const result = await ok({ page: '3', pageSize: '5' });
		expect(result.items).toHaveLength(2);
		expect(result.page).toBe(3);
		expect(result.pageSize).toBe(5);
		expect(result.totalPages).toBe(3);
	});

	it('sorts by createdAt and updatedAt', async () => {
		for (const sort of ['createdAt', 'updatedAt'] as const) {
			const values = (await ok({ sort, pageSize: '50' })).items.map((course) => course[sort]);
			expect([...values].sort()).toStrictEqual(values);
		}
	});

	it('returns an empty page, not an error, when nothing matches', async () => {
		const result = await ok({ q: 'quantum basket weaving' });
		expect(result.items).toStrictEqual([]);
		expect(result.totalItems).toBe(0);
		expect(result.totalPages).toBe(0);
		expect(result.page).toBe(1);
		expect(result.pageSize).toBe(10);
	});

	it('rejects invalid enum, page, pageSize and sort values', async () => {
		expect((await invalid({ modality: 'telepathic' })).error.details).toStrictEqual([{ field: 'modality', message: 'modality must be one of online, in-person, hybrid.' }]);
		expect((await invalid({ status: 'archived' })).error.details[0]?.field).toBe('status');
		expect((await invalid({ sort: 'price' })).error.details[0]?.field).toBe('sort');
		expect((await invalid({ page: '0' })).error.details[0]?.message).toBe('page must be an integer of at least 1.');
		expect((await invalid({ page: '1.5' })).error.details[0]?.field).toBe('page');
		expect((await invalid({ pageSize: '51' })).error.details[0]?.message).toBe('pageSize must be between 1 and 50.');
		expect((await invalid({ pageSize: 'ten' })).error.details[0]?.field).toBe('pageSize');
		expect((await invalid({ q: '  ' })).error.details[0]?.field).toBe('q');
	});

	it('reports every invalid parameter under one consistent error envelope', async () => {
		const body = await invalid({ modality: 'telepathic', pageSize: '500' });
		expect(body.error.code).toBe('INVALID_QUERY_PARAMETER');
		expect(body.error.message).toBe('One or more query parameters are invalid.');
		expect(body.error.details.map((detail) => detail.field)).toStrictEqual(['modality', 'pageSize']);
	});
});
