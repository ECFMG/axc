import type { Course, CourseModality, CourseStatus } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
export interface CourseSearchQuery {
	q?: string;
	modality?: CourseModality;
	status?: CourseStatus;
	tag?: string;
	page: number;
	pageSize: number;
	sort: 'title' | 'createdAt' | 'updatedAt';
}
export interface CourseSearchResult {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}
export const search =
	(dataSources: DataSources) =>
	async (query: CourseSearchQuery): Promise<CourseSearchResult> => {
		const all = await dataSources.readonlyDataSource.Catalog.Course.CourseReadRepo.getAll();
		const needle = query.q?.toLocaleLowerCase();
		const tag = query.tag?.toLocaleLowerCase();
		const filtered = all.filter(
			(course) =>
				(!needle || [course.title, course.summary, ...course.tags].some((value) => value.toLocaleLowerCase().includes(needle))) &&
				(!query.modality || course.modality === query.modality) &&
				(!query.status || course.status === query.status) &&
				(!tag || course.tags.some((value) => value.toLocaleLowerCase() === tag)),
		);
		filtered.sort((a, b) => a[query.sort].localeCompare(b[query.sort]) || a.id.localeCompare(b.id));
		const totalItems = filtered.length;
		return { items: filtered.slice((query.page - 1) * query.pageSize, query.page * query.pageSize), page: query.page, pageSize: query.pageSize, totalItems, totalPages: Math.ceil(totalItems / query.pageSize) };
	};
