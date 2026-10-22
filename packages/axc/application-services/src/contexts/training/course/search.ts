import type { DataSources } from '@axc/persistence';
import { ApplicationFailure } from '../errors.ts';
export interface CourseSearchQuery {
	q?: string;
	modality?: string;
	status?: string;
	tag?: string;
	page?: number;
	pageSize?: number;
	sort?: 'title' | 'createdAt' | 'updatedAt';
}
export interface CourseResult {
	id: string;
	title: string;
	summary: string;
	modality: string;
	status: string;
	tags: string[];
	createdAt: string;
	updatedAt: string;
}
export interface CourseSearchResult {
	items: CourseResult[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}
export const search =
	(dataSources: DataSources) =>
	async (query: CourseSearchQuery): Promise<CourseSearchResult> => {
		const details = [] as { field: string; message: string }[];
		if (query.modality !== undefined && !['online', 'in-person', 'hybrid'].includes(query.modality)) details.push({ field: 'modality', message: 'Invalid modality.' });
		if (query.status !== undefined && !['draft', 'active', 'retired'].includes(query.status)) details.push({ field: 'status', message: 'Invalid status.' });
		if (query.sort !== undefined && !['title', 'createdAt', 'updatedAt'].includes(query.sort)) details.push({ field: 'sort', message: 'Invalid sort.' });
		if (query.page !== undefined && (!Number.isInteger(query.page) || query.page < 1)) details.push({ field: 'page', message: 'page must be a positive integer.' });
		if (query.pageSize !== undefined && (!Number.isInteger(query.pageSize) || query.pageSize < 1 || query.pageSize > 50)) details.push({ field: 'pageSize', message: 'pageSize must be between 1 and 50.' });
		if (details.length) throw new ApplicationFailure('INVALID_QUERY_PARAMETER', 'One or more query parameters are invalid.', details);
		return await dataSources.readonlyDataSource.Training.Course.CourseReadRepo.search({ ...query, page: query.page ?? 1, pageSize: query.pageSize ?? 10, sort: query.sort ?? 'title' });
	};
