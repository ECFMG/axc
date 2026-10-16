import { Domain } from '@axc/domain';

const courseValues = Domain.Contexts.Catalog.Course;
interface CourseQueryError {
	field: string;
	message: string;
}
type ParsedCourseQuery = { valid: true; criteria: Domain.Contexts.Catalog.Course.CourseSearchCriteria } | { valid: false; details: CourseQueryError[] };

function optionalText(raw: string | undefined): string | undefined {
	if (raw === undefined || raw.trim() === '') {
		return undefined;
	}
	return raw.trim();
}

function enumParameter<T extends string>(raw: string | undefined, field: string, allowed: readonly T[], details: CourseQueryError[]): T | undefined {
	const value = optionalText(raw);
	if (value === undefined) {
		return undefined;
	}
	const accepted = allowed.find((item) => item === value);
	if (accepted === undefined) {
		details.push({ field, message: `${field} must be one of: ${allowed.join(', ')}.` });
	}
	return accepted;
}

function integerParameter(raw: string | undefined, field: string, defaultValue: number, details: CourseQueryError[], maximum?: number): number | undefined {
	if (optionalText(raw) === undefined) {
		return defaultValue;
	}
	const message = maximum === undefined ? `${field} must be a positive integer.` : `${field} must be between 1 and ${maximum}.`;
	if (raw === undefined || !/^[0-9]+$/.test(raw)) {
		details.push({ field, message });
		return undefined;
	}
	const value = Number(raw);
	if (!Number.isSafeInteger(value) || value < 1 || (maximum !== undefined && value > maximum)) {
		details.push({ field, message });
		return undefined;
	}
	return value;
}

export function parseCourseQuery(query: Partial<Record<'q' | 'tag' | 'modality' | 'status' | 'sort' | 'page' | 'pageSize', string>>): ParsedCourseQuery {
	const details: CourseQueryError[] = [];
	const modality = enumParameter(query.modality, 'modality', courseValues.COURSE_MODALITIES, details);
	const status = enumParameter(query.status, 'status', courseValues.COURSE_STATUSES, details);
	const sort = enumParameter(query.sort, 'sort', courseValues.COURSE_SORT_FIELDS, details);
	const page = integerParameter(query.page, 'page', courseValues.COURSE_DEFAULT_PAGE, details);
	const pageSize = integerParameter(query.pageSize, 'pageSize', courseValues.COURSE_DEFAULT_PAGE_SIZE, details, courseValues.COURSE_MAX_PAGE_SIZE);
	if (details.length > 0 || page === undefined || pageSize === undefined) {
		return { valid: false, details };
	}
	return {
		valid: true,
		criteria: {
			q: optionalText(query.q),
			tag: optionalText(query.tag),
			modality,
			status,
			page,
			pageSize,
			sort: sort ?? courseValues.COURSE_DEFAULT_SORT,
		},
	};
}
