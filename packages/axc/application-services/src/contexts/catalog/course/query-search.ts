import { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';

const { DEFAULT_COURSE_PAGE, DEFAULT_COURSE_PAGE_SIZE, DEFAULT_COURSE_SORT, MAX_COURSE_PAGE_SIZE, isCourseModality, isCourseSortField, isCourseStatus } = Domain.Contexts.Catalog.Course;

export interface CourseSearchQuery {
	q: string | undefined;
	modality: string | undefined;
	status: string | undefined;
	tag: string | undefined;
	page: string | undefined;
	pageSize: string | undefined;
	sort: string | undefined;
}

export interface CourseSearchResult {
	items: Domain.Contexts.Catalog.Course.Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

interface QueryParameterDetail {
	field: string;
	message: string;
}

export class InvalidQueryParameterError extends Error {
	readonly code = 'INVALID_QUERY_PARAMETER' as const;
	readonly details: QueryParameterDetail[];

	constructor(details: QueryParameterDetail[]) {
		super('One or more query parameters are invalid.');
		this.name = 'InvalidQueryParameterError';
		this.details = details;
	}
}

function isBlank(value: string | undefined): boolean {
	return value === undefined || value.trim() === '';
}

function parseInteger(value: string): number | undefined {
	if (!/^-?\d+$/.test(value)) {
		return undefined;
	}
	return Number(value);
}

export const querySearch = (dataSources: DataSources) => {
	return async (query: CourseSearchQuery): Promise<CourseSearchResult> => {
		const details: QueryParameterDetail[] = [];

		const q = isBlank(query.q) ? undefined : query.q?.trim();
		const tag = isBlank(query.tag) ? undefined : query.tag?.trim();

		let modality: Domain.Contexts.Catalog.Course.CourseModality | undefined;
		if (query.modality !== undefined) {
			const value = query.modality.trim();
			if (value === '' || !isCourseModality(value)) {
				details.push({ field: 'modality', message: 'modality must be one of: online, in-person, hybrid.' });
			} else {
				modality = value;
			}
		}

		let status: Domain.Contexts.Catalog.Course.CourseStatus | undefined;
		if (query.status !== undefined) {
			const value = query.status.trim();
			if (value === '' || !isCourseStatus(value)) {
				details.push({ field: 'status', message: 'status must be one of: draft, active, retired.' });
			} else {
				status = value;
			}
		}

		let page = DEFAULT_COURSE_PAGE;
		if (query.page !== undefined) {
			const value = query.page.trim();
			const parsed = parseInteger(value);
			if (parsed === undefined || parsed < 1) {
				details.push({ field: 'page', message: 'page must be an integer of 1 or greater.' });
			} else {
				page = parsed;
			}
		}

		let pageSize = DEFAULT_COURSE_PAGE_SIZE;
		if (query.pageSize !== undefined) {
			const value = query.pageSize.trim();
			const parsed = parseInteger(value);
			if (parsed === undefined || parsed < 1 || parsed > MAX_COURSE_PAGE_SIZE) {
				details.push({ field: 'pageSize', message: 'pageSize must be between 1 and 50.' });
			} else {
				pageSize = parsed;
			}
		}

		let sort = DEFAULT_COURSE_SORT;
		if (query.sort !== undefined) {
			const value = query.sort.trim();
			if (value === '' || !isCourseSortField(value)) {
				details.push({ field: 'sort', message: 'sort must be one of: title, createdAt, updatedAt.' });
			} else {
				sort = value;
			}
		}

		if (details.length > 0) {
			throw new InvalidQueryParameterError(details);
		}

		const pageResult = await dataSources.readonlyDataSource.Catalog.Course.CourseReadRepo.search({
			q,
			modality,
			status,
			tag,
			page,
			pageSize,
			sort,
		});

		return {
			items: pageResult.items,
			page,
			pageSize,
			totalItems: pageResult.totalItems,
			totalPages: Math.ceil(pageResult.totalItems / pageSize),
		};
	};
};
