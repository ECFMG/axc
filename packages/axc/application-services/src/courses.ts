import { type CourseEntityReference, CourseModality, type CourseRepository, type CourseSearchCriteria, CourseSortField, CourseStatus } from '@axc/domain';

export interface CoursePage {
	items: CourseEntityReference[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

export interface CourseQueryError {
	error: {
		code: 'INVALID_QUERY_PARAMETER';
		message: string;
		details: { field: string; message: string }[];
	};
}

export type CourseSearchOutcome = { ok: true; value: CoursePage } | { ok: false; error: CourseQueryError };

const MAX_PAGE_SIZE = 50;
const KNOWN = new Set(['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort']);

const oneOf = <T extends string>(values: Record<string, T>, raw: string): T | undefined => Object.values(values).find((v) => v === raw);
const int = (raw: string): number | undefined => (/^\d+$/.test(raw) ? Number(raw) : undefined);

function parseCriteria(query: Record<string, string>): CourseSearchCriteria | CourseQueryError['error']['details'] {
	const details: CourseQueryError['error']['details'] = [];
	const fail = (field: string, message: string) => {
		details.push({ field, message });
		return undefined;
	};
	for (const key of Object.keys(query)) {
		if (!KNOWN.has(key)) fail(key, `${key} is not a supported query parameter.`);
	}
	const { q, tag, modality: modalityRaw, status: statusRaw, sort: sortRaw, page: pageParam, pageSize: pageSizeParam } = query;
	const modality = modalityRaw === undefined ? undefined : (oneOf(CourseModality, modalityRaw) ?? fail('modality', `modality must be one of: ${Object.values(CourseModality).join(', ')}.`));
	const status = statusRaw === undefined ? undefined : (oneOf(CourseStatus, statusRaw) ?? fail('status', `status must be one of: ${Object.values(CourseStatus).join(', ')}.`));
	const sort = sortRaw === undefined ? 'title' : (oneOf(CourseSortField, sortRaw) ?? fail('sort', `sort must be one of: ${Object.values(CourseSortField).join(', ')}.`));
	const pageRaw = pageParam === undefined ? 1 : int(pageParam);
	const page = pageRaw !== undefined && pageRaw >= 1 ? pageRaw : fail('page', 'page must be a positive integer.');
	const sizeRaw = pageSizeParam === undefined ? 10 : int(pageSizeParam);
	const pageSize = sizeRaw !== undefined && sizeRaw >= 1 && sizeRaw <= MAX_PAGE_SIZE ? sizeRaw : fail('pageSize', `pageSize must be between 1 and ${MAX_PAGE_SIZE}.`);
	if (details.length > 0 || sort === undefined || page === undefined || pageSize === undefined) return details;
	return { ...(q !== undefined && { q }), ...(tag !== undefined && { tag }), ...(modality !== undefined && { modality }), ...(status !== undefined && { status }), sort, page, pageSize };
}

/** Validates raw query parameters, then searches the catalog. */
export async function searchCourses(repository: CourseRepository, query: Record<string, string>): Promise<CourseSearchOutcome> {
	const criteria = parseCriteria(query);
	if (Array.isArray(criteria)) {
		return { ok: false, error: { error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: criteria } } };
	}
	const { items, totalItems } = await repository.search(criteria);
	return {
		ok: true,
		value: { items: items.map((c) => c.props), page: criteria.page, pageSize: criteria.pageSize, totalItems, totalPages: Math.ceil(totalItems / criteria.pageSize) },
	};
}
