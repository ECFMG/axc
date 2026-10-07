import type { Course, CourseCatalogReadRepository, CourseSearchCriteria } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { buildCourseCatalogApplicationService } from './course-catalog.ts';

const course: Course = {
	id: 'course-001',
	title: 'AI Security Foundations',
	summary: 'Introductory course on secure AI-assisted development.',
	modality: 'online',
	status: 'active',
	tags: ['ai', 'security'],
	createdAt: '2026-01-15T00:00:00.000Z',
	updatedAt: '2026-06-01T00:00:00.000Z',
};

/** Records the criteria it was called with and returns a canned page. */
function recordingCatalog(totalItems: number, items: readonly Course[] = [course]): { repository: CourseCatalogReadRepository; criteria: () => CourseSearchCriteria } {
	let received: CourseSearchCriteria | undefined;
	return {
		repository: {
			search: (criteria) => {
				received = criteria;
				return Promise.resolve({ items, totalItems });
			},
		},
		criteria: () => {
			if (received === undefined) {
				throw new Error('the repository was never searched');
			}
			return received;
		},
	};
}

describe('course catalog search', () => {
	it('applies the default page, page size, and sort', async () => {
		const catalog = recordingCatalog(1);
		const result = await buildCourseCatalogApplicationService(catalog.repository).search({});

		expect(catalog.criteria()).toStrictEqual({ keyword: undefined, modality: undefined, status: undefined, tag: undefined, page: 1, pageSize: 10, sort: 'title' });
		expect(result).toStrictEqual({ outcome: 'found', page: { items: [course], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 } });
	});

	it('normalizes the supplied filters before searching', async () => {
		const catalog = recordingCatalog(1);
		await buildCourseCatalogApplicationService(catalog.repository).search({ q: '  security  ', modality: 'online', status: 'active', tag: ' AI ', page: '2', pageSize: '5', sort: 'createdAt' });

		expect(catalog.criteria()).toStrictEqual({ keyword: 'security', modality: 'online', status: 'active', tag: 'AI', page: 2, pageSize: 5, sort: 'createdAt' });
	});

	it('treats blank q and tag values as absent filters', async () => {
		const catalog = recordingCatalog(1);
		await buildCourseCatalogApplicationService(catalog.repository).search({ q: '   ', tag: '' });

		expect(catalog.criteria().keyword).toBeUndefined();
		expect(catalog.criteria().tag).toBeUndefined();
	});

	it('derives totalPages from totalItems and pageSize', async () => {
		const catalog = recordingCatalog(14);
		const result = await buildCourseCatalogApplicationService(catalog.repository).search({ pageSize: '5' });

		expect(result).toMatchObject({ outcome: 'found', page: { page: 1, pageSize: 5, totalItems: 14, totalPages: 3 } });
	});

	it('reports an empty page rather than an error when nothing matches', async () => {
		const catalog = recordingCatalog(0, []);
		const result = await buildCourseCatalogApplicationService(catalog.repository).search({ q: 'no-such-course' });

		expect(result).toStrictEqual({ outcome: 'found', page: { items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } });
	});

	it.each([
		{ label: 'modality=remote', query: { modality: 'remote' }, field: 'modality', message: 'modality must be one of online, in-person, hybrid.' },
		{ label: 'status=archived', query: { status: 'archived' }, field: 'status', message: 'status must be one of draft, active, retired.' },
		{ label: 'sort=summary', query: { sort: 'summary' }, field: 'sort', message: 'sort must be one of title, createdAt, updatedAt.' },
		{ label: 'page=0', query: { page: '0' }, field: 'page', message: 'page must be an integer greater than or equal to 1.' },
		{ label: 'page=-1', query: { page: '-1' }, field: 'page', message: 'page must be an integer greater than or equal to 1.' },
		{ label: 'page=1.5', query: { page: '1.5' }, field: 'page', message: 'page must be an integer greater than or equal to 1.' },
		{ label: 'page=first', query: { page: 'first' }, field: 'page', message: 'page must be an integer greater than or equal to 1.' },
		{ label: 'pageSize=0', query: { pageSize: '0' }, field: 'pageSize', message: 'pageSize must be between 1 and 50.' },
		{ label: 'pageSize=51', query: { pageSize: '51' }, field: 'pageSize', message: 'pageSize must be between 1 and 50.' },
		{ label: 'pageSize=ten', query: { pageSize: 'ten' }, field: 'pageSize', message: 'pageSize must be between 1 and 50.' },
	])('rejects $label', async ({ query, field, message }) => {
		const catalog = recordingCatalog(1);
		const result = await buildCourseCatalogApplicationService(catalog.repository).search(query);

		expect(result).toStrictEqual({ outcome: 'invalid', errors: [{ field, message }] });
	});

	it('reports every invalid parameter, not only the first', async () => {
		const catalog = recordingCatalog(1);
		const result = await buildCourseCatalogApplicationService(catalog.repository).search({ modality: 'remote', status: 'archived', page: '0', pageSize: '99', sort: 'summary' });

		expect(result.outcome).toBe('invalid');
		if (result.outcome !== 'invalid') {
			return;
		}
		expect(result.errors.map((error) => error.field)).toStrictEqual(['modality', 'status', 'sort', 'page', 'pageSize']);
	});

	it('does not reach the repository when the query is invalid', async () => {
		const catalog = recordingCatalog(1);
		await buildCourseCatalogApplicationService(catalog.repository).search({ sort: 'summary' });

		expect(() => catalog.criteria()).toThrow('the repository was never searched');
	});
});
