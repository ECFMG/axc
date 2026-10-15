import { Domain } from '@axc/domain';

const Course = Domain.Contexts.Catalog.Course;
type CourseSearchCriteria = Domain.Contexts.Catalog.Course.CourseSearchCriteria;

interface QueryErrorDetail {
	field: string;
	message: string;
}

type CourseQueryResult = { valid: true; criteria: CourseSearchCriteria } | { valid: false; details: QueryErrorDetail[] };

function optionalQueryValue(value: string | undefined): string | undefined {
	if (value === undefined || value.trim() === '') {
		return undefined;
	}
	return value;
}

function parseEnum<T extends string>(value: string | undefined, allowed: readonly T[], field: string, details: QueryErrorDetail[]): T | undefined {
	if (value === undefined) {
		return undefined;
	}
	const match = allowed.find((option) => option === value);
	if (match === undefined) {
		details.push({ field, message: `${field} must be one of: ${allowed.join(', ')}.` });
	}
	return match;
}

function parsePositiveInteger(value: string | undefined, field: string, maximum: number, details: QueryErrorDetail[]): number | undefined {
	if (value === undefined) {
		return undefined;
	}
	if (/^[0-9]+$/.test(value)) {
		const number = Number(value);
		if (Number.isSafeInteger(number) && number >= 1 && number <= maximum) {
			return number;
		}
	}
	const message = field === 'pageSize' ? `pageSize must be between 1 and ${Course.COURSE_MAX_PAGE_SIZE}.` : 'page must be a positive safe integer.';
	details.push({ field, message });
	return undefined;
}

export function parseCoursesQuery(query: Partial<Record<'q' | 'tag' | 'modality' | 'status' | 'sort' | 'page' | 'pageSize', string>>): CourseQueryResult {
	const details: QueryErrorDetail[] = [];
	const q = optionalQueryValue(query.q)?.trim();
	const tag = optionalQueryValue(query.tag)?.trim();
	const modality = parseEnum(optionalQueryValue(query.modality), Course.COURSE_MODALITIES, 'modality', details);
	const status = parseEnum(optionalQueryValue(query.status), Course.COURSE_STATUSES, 'status', details);
	const sort = parseEnum(optionalQueryValue(query.sort), Course.COURSE_SORT_FIELDS, 'sort', details);
	const page = parsePositiveInteger(optionalQueryValue(query.page), 'page', Number.MAX_SAFE_INTEGER, details);
	const pageSize = parsePositiveInteger(optionalQueryValue(query.pageSize), 'pageSize', Course.COURSE_MAX_PAGE_SIZE, details);
	if (details.length > 0) {
		return { valid: false, details };
	}
	return {
		valid: true,
		criteria: {
			...(q === undefined ? {} : { q }),
			...(tag === undefined ? {} : { tag }),
			...(modality === undefined ? {} : { modality }),
			...(status === undefined ? {} : { status }),
			page: page ?? Course.COURSE_DEFAULT_PAGE,
			pageSize: pageSize ?? Course.COURSE_DEFAULT_PAGE_SIZE,
			sort: sort ?? Course.COURSE_DEFAULT_SORT,
		},
	};
}
