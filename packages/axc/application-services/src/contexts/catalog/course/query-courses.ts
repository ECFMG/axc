import { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';

type Course = Domain.Contexts.Catalog.Course.Course;
type CourseModality = Domain.Contexts.Catalog.Course.CourseModality;
type CourseSortField = Domain.Contexts.Catalog.Course.CourseSortField;
type CourseStatus = Domain.Contexts.Catalog.Course.CourseStatus;

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
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

export interface QueryParameterErrorDetail {
	field: string;
	message: string;
}

export class InvalidQueryParameterError extends Error {
	public readonly code = 'INVALID_QUERY_PARAMETER';
	public readonly details: QueryParameterErrorDetail[];

	public constructor(details: QueryParameterErrorDetail[]) {
		super('One or more query parameters are invalid.');
		this.name = 'InvalidQueryParameterError';
		this.details = details;
	}
}

const POSITIVE_INTEGER_PATTERN = /^\d+$/;

function parseOptionalFilter(value: string | undefined): string | undefined {
	if (value === undefined || value === '') {
		return undefined;
	}
	return value;
}

function parsePositiveInteger(value: string | undefined, defaultValue: number): { ok: true; value: number } | { ok: false } {
	if (value === undefined) {
		return { ok: true, value: defaultValue };
	}
	if (!POSITIVE_INTEGER_PATTERN.test(value)) {
		return { ok: false };
	}
	return { ok: true, value: Number(value) };
}

export const queryCourses = (dataSources: DataSources) => {
	return async (query: CourseSearchQuery): Promise<CourseSearchResult> => {
		const details: QueryParameterErrorDetail[] = [];

		let modality: CourseModality | undefined;
		const requestedModality = parseOptionalFilter(query.modality);
		if (requestedModality !== undefined) {
			if (Domain.Contexts.Catalog.Course.isCourseModality(requestedModality)) {
				modality = requestedModality;
			} else {
				details.push({
					field: 'modality',
					message: `modality must be one of: ${Domain.Contexts.Catalog.Course.COURSE_MODALITIES.join(', ')}.`,
				});
			}
		}

		let status: CourseStatus | undefined;
		const requestedStatus = parseOptionalFilter(query.status);
		if (requestedStatus !== undefined) {
			if (Domain.Contexts.Catalog.Course.isCourseStatus(requestedStatus)) {
				status = requestedStatus;
			} else {
				details.push({
					field: 'status',
					message: `status must be one of: ${Domain.Contexts.Catalog.Course.COURSE_STATUSES.join(', ')}.`,
				});
			}
		}

		const parsedPage = parsePositiveInteger(query.page, Domain.Contexts.Catalog.Course.DEFAULT_COURSE_PAGE);
		let page = Domain.Contexts.Catalog.Course.DEFAULT_COURSE_PAGE;
		if (!parsedPage.ok || parsedPage.value < 1) {
			details.push({
				field: 'page',
				message: 'page must be a positive integer.',
			});
		} else {
			page = parsedPage.value;
		}

		const parsedPageSize = parsePositiveInteger(query.pageSize, Domain.Contexts.Catalog.Course.DEFAULT_COURSE_PAGE_SIZE);
		let pageSize = Domain.Contexts.Catalog.Course.DEFAULT_COURSE_PAGE_SIZE;
		if (!parsedPageSize.ok || parsedPageSize.value < 1 || parsedPageSize.value > Domain.Contexts.Catalog.Course.MAX_COURSE_PAGE_SIZE) {
			details.push({
				field: 'pageSize',
				message: `pageSize must be between 1 and ${Domain.Contexts.Catalog.Course.MAX_COURSE_PAGE_SIZE}.`,
			});
		} else {
			pageSize = parsedPageSize.value;
		}

		let sort: CourseSortField = Domain.Contexts.Catalog.Course.DEFAULT_COURSE_SORT;
		if (query.sort !== undefined && query.sort !== '') {
			if (Domain.Contexts.Catalog.Course.isCourseSortField(query.sort)) {
				sort = query.sort;
			} else {
				details.push({
					field: 'sort',
					message: `sort must be one of: ${Domain.Contexts.Catalog.Course.COURSE_SORT_FIELDS.join(', ')}.`,
				});
			}
		}

		if (details.length > 0) {
			throw new InvalidQueryParameterError(details);
		}

		const pageResult = await dataSources.readonlyDataSource.Catalog.Course.CourseReadRepo.search({
			q: parseOptionalFilter(query.q),
			modality,
			status,
			tag: parseOptionalFilter(query.tag),
			page,
			pageSize,
			sort,
		});

		return {
			items: pageResult.items,
			page,
			pageSize,
			totalItems: pageResult.totalItems,
			totalPages: pageResult.totalItems === 0 ? 0 : Math.ceil(pageResult.totalItems / pageSize),
		};
	};
};
