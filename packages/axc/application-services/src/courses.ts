import { type CoursePage, type CourseRepository, type CourseSearchQuery, courseModalities, courseSorts, courseStatuses, pageCourses } from '@axc/domain';
import { type AppResult, type FieldError, fail } from './result.ts';

const queryMessage = 'One or more query parameters are invalid.';

export async function searchCourses(courses: CourseRepository, query: Record<string, string | undefined>): Promise<AppResult<CoursePage>> {
	const parsed = parseCourseSearch(query);
	if (!parsed.ok) {
		return parsed;
	}
	return { ok: true, value: pageCourses(await courses.list(), parsed.value) };
}

function parseCourseSearch(query: Record<string, string | undefined>): AppResult<CourseSearchQuery> {
	const details: FieldError[] = [];
	const modality = readEnum(query['modality'], courseModalities, 'modality', 'modality must be online, in-person, or hybrid.', details);
	const status = readEnum(query['status'], courseStatuses, 'status', 'status must be draft, active, or retired.', details);
	const sort = readEnum(query['sort'], courseSorts, 'sort', 'sort must be title, createdAt, or updatedAt.', details) ?? 'title';
	const page = readBoundedInteger(query['page'], 'page', 'page must be an integer greater than or equal to 1.', details) ?? 1;
	const pageSize = readBoundedInteger(query['pageSize'], 'pageSize', 'pageSize must be between 1 and 50.', details) ?? 10;
	if (pageSize > 50) {
		details.push({ field: 'pageSize', message: 'pageSize must be between 1 and 50.' });
	}
	if (details.length > 0) {
		return fail('INVALID_QUERY_PARAMETER', queryMessage, details);
	}
	const search: CourseSearchQuery = { page, pageSize, sort };
	const q = blankToUndefined(query['q']);
	const tag = blankToUndefined(query['tag']);
	if (q !== undefined) {
		search.q = q;
	}
	if (modality !== undefined) {
		search.modality = modality;
	}
	if (status !== undefined) {
		search.status = status;
	}
	if (tag !== undefined) {
		search.tag = tag;
	}
	return { ok: true, value: search };
}

function readEnum<T extends string>(value: string | undefined, allowed: readonly T[], field: string, message: string, details: FieldError[]): T | undefined {
	if (value === undefined) {
		return undefined;
	}
	const candidate = value.trim();
	if ((allowed as readonly string[]).includes(candidate)) {
		return candidate as T;
	}
	details.push({ field, message });
	return undefined;
}

function readBoundedInteger(value: string | undefined, field: 'page' | 'pageSize', message: string, details: FieldError[]): number | undefined {
	if (value === undefined) {
		return undefined;
	}
	const text = value.trim();
	const parsed = /^[1-9]\d*$/.test(text) ? Number(text) : Number.NaN;
	if (!Number.isSafeInteger(parsed)) {
		details.push({ field, message });
		return undefined;
	}
	return parsed;
}

function blankToUndefined(value: string | undefined): string | undefined {
	if (value === undefined) {
		return undefined;
	}
	const text = value.trim();
	return text === '' ? undefined : text;
}
