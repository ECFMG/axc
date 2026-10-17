import type { Catalog } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
import { ApplicationError } from '../errors.ts';
export interface CourseSearchQuery {
	q?: string;
	modality?: string;
	status?: string;
	tag?: string;
	page?: number;
	pageSize?: number;
	sort?: string;
}
export interface CourseSearchResult {
	items: Catalog.Course.CourseEntityReference[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}
export const list =
	(dataSources: DataSources) =>
	async (query: CourseSearchQuery = {}): Promise<CourseSearchResult> => {
		const details: { field: string; message: string }[] = [];
		const page = query.page ?? 1;
		const pageSize = query.pageSize ?? 10;
		const sort = query.sort ?? 'title';
		if (!Number.isInteger(page) || page < 1) details.push({ field: 'page', message: 'page must be a positive integer.' });
		if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) details.push({ field: 'pageSize', message: 'pageSize must be between 1 and 50.' });
		if (query.modality && !['online', 'in-person', 'hybrid'].includes(query.modality)) details.push({ field: 'modality', message: 'Invalid modality.' });
		if (query.status && !['draft', 'active', 'retired'].includes(query.status)) details.push({ field: 'status', message: 'Invalid status.' });
		if (!['title', 'createdAt', 'updatedAt'].includes(sort)) details.push({ field: 'sort', message: 'Invalid sort.' });
		if (details.length) throw new ApplicationError('INVALID_QUERY_PARAMETER', 'One or more query parameters are invalid.', details);
		let items = [...(await dataSources.readonlyDataSource.Catalog.Course.CourseReadRepo.list())];
		if (query.q) {
			const q = query.q.toLowerCase();
			items = items.filter((course) => [course.title, course.summary, ...course.tags].some((v) => v.toLowerCase().includes(q)));
		}
		if (query.modality) items = items.filter((course) => course.modality === query.modality);
		if (query.status) items = items.filter((course) => course.status === query.status);
		if (query.tag) items = items.filter((course) => course.tags.some((tag) => tag.toLowerCase() === query.tag?.toLowerCase()));
		items.sort((a, b) => String(a[sort as keyof typeof a]).localeCompare(String(b[sort as keyof typeof b])) || a.id.localeCompare(b.id));
		return { items: items.slice((page - 1) * pageSize, page * pageSize), page, pageSize, totalItems: items.length, totalPages: Math.ceil(items.length / pageSize) };
	};
