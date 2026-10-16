import type { CourseSearchQuery, CourseSearchResult, DataSources } from '@axc/persistence';
import { ApplicationError } from '../errors.ts';

export type CourseSearchInput = Partial<Record<keyof CourseSearchQuery, unknown>>;
export const search =
	(dataSources: DataSources) =>
	async (input: CourseSearchInput = {}): Promise<CourseSearchResult> => {
		const allowed = ['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort'];
		for (const key of Object.keys(input)) if (!allowed.includes(key)) throw new ApplicationError(400, 'INVALID_QUERY_PARAMETER', `${key} is not a supported query parameter.`, key);
		const optionalString = (value: unknown, field: string): string | undefined => {
			if (value === undefined) return undefined;
			if (typeof value !== 'string' || !value.trim()) throw new ApplicationError(400, 'INVALID_QUERY_PARAMETER', `${field} must be a non-empty string.`, field);
			return value.trim();
		};
		const q = optionalString(input.q, 'q');
		const tag = optionalString(input.tag, 'tag');
		const modality = optionalString(input.modality, 'modality');
		if (modality && !['online', 'in-person', 'hybrid'].includes(modality)) throw new ApplicationError(400, 'INVALID_QUERY_PARAMETER', 'modality must be online, in-person, or hybrid.', 'modality');
		const status = optionalString(input.status, 'status');
		if (status && !['draft', 'active', 'retired'].includes(status)) throw new ApplicationError(400, 'INVALID_QUERY_PARAMETER', 'status must be draft, active, or retired.', 'status');
		const sort = optionalString(input.sort, 'sort') ?? 'title';
		if (!['title', 'createdAt', 'updatedAt'].includes(sort)) throw new ApplicationError(400, 'INVALID_QUERY_PARAMETER', 'sort must be title, createdAt, or updatedAt.', 'sort');
		const number = (value: unknown, field: string, fallback: number, max: number): number => {
			if (value === undefined) return fallback;
			const numeric = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
			if (typeof numeric !== 'number' || !Number.isSafeInteger(numeric) || numeric < 1 || numeric > max) throw new ApplicationError(400, 'INVALID_QUERY_PARAMETER', `${field} must be between 1 and ${max}.`, field);
			return numeric;
		};
		const query: CourseSearchQuery = {
			...(q ? { q } : {}),
			...(tag ? { tag } : {}),
			...(modality ? { modality: modality as NonNullable<CourseSearchQuery['modality']> } : {}),
			...(status ? { status: status as NonNullable<CourseSearchQuery['status']> } : {}),
			sort: sort as CourseSearchQuery['sort'],
			page: number(input.page, 'page', 1, Number.MAX_SAFE_INTEGER),
			pageSize: number(input.pageSize, 'pageSize', 10, 50),
		};
		return await dataSources.readonlyDataSource.Training.Course.CourseReadRepo.search(query);
	};
