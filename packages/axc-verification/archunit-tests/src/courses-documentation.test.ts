import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const docs = new URL('../../../../apps/docs/', import.meta.url);
describe('A11 A-AC12 catalog documentation', () => {
	it('documents the endpoint, every parameter, success and error contracts, and is in the sidebar', () => {
		const page = readFileSync(new URL('docs/courses.md', docs), 'utf8');
		expect(page).toContain('GET /api/courses');
		for (const parameter of ['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort']) expect(page).toContain(`| \`${parameter}\` |`);
		const examples = [...page.matchAll(/```json\n([\s\S]*?)\n```/g)].map((match) => JSON.parse(match[1] ?? 'null'));
		expect(examples).toHaveLength(2);
		expect(examples[0]).toMatchObject({
			page: 1,
			pageSize: 5,
			totalItems: 1,
			totalPages: 1,
			items: [{ id: 'course-001', title: expect.any(String), summary: expect.any(String), modality: 'online', status: 'active', tags: ['ai', 'security'], createdAt: expect.any(String), updatedAt: expect.any(String) }],
		});
		expect(examples[1]).toEqual({ error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: [{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' }] } });
		expect(readFileSync(new URL('sidebars.ts', docs), 'utf8')).toContain("'courses'");
		expect(readFileSync(new URL('docs/decisions/0001-catalog-fixtures.md', docs), 'utf8')).toContain('id: 0001-catalog-fixtures');
		expect(readFileSync(new URL('sidebars.ts', docs), 'utf8')).toContain("'decisions/0001-catalog-fixtures'");
	});
});
