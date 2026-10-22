import {
	type CoursePage,
	type CourseRepository,
	type CourseSearchQuery,
	type CourseSortField,
	DEFAULT_COURSE_PAGE,
	DEFAULT_COURSE_PAGE_SIZE,
	isCourseModality,
	isCourseSortField,
	isCourseStatus,
	MAX_COURSE_PAGE_SIZE,
	searchCourses,
} from '@axc/domain';
import { ApplicationError, type FieldError } from './errors.ts';
import { type RawQuery, readSingle } from './query.ts';

const COURSE_QUERY_FIELDS = new Set(['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort']);
const INVALID_QUERY_MESSAGE = 'One or more query parameters are invalid.';

export function createCourseSearch(courses: CourseRepository): { search(query: RawQuery): Promise<CoursePage> } {
	return {
		async search(query: RawQuery): Promise<CoursePage> {
			const parsed = parseCourseQuery(query);
			const all = await courses.list();
			return searchCourses(all, parsed);
		},
	};
}

function parseCourseQuery(query: RawQuery): CourseSearchQuery {
	const details: FieldError[] = [];
	for (const field of Object.keys(query)) {
		if (!COURSE_QUERY_FIELDS.has(field)) {
			details.push({ field, message: `${field} is not a supported query parameter.` });
		}
	}

	const qRaw = readSingle(query, 'q', details);
	const modalityRaw = readSingle(query, 'modality', details);
	const statusRaw = readSingle(query, 'status', details);
	const tagRaw = readSingle(query, 'tag', details);
	const page = readBoundedInt(readSingle(query, 'page', details), 'page', DEFAULT_COURSE_PAGE, undefined, 'page must be an integer greater than or equal to 1.', details);
	const pageSize = readBoundedInt(readSingle(query, 'pageSize', details), 'pageSize', DEFAULT_COURSE_PAGE_SIZE, MAX_COURSE_PAGE_SIZE, 'pageSize must be between 1 and 50.', details);

	let q: string | undefined;
	if (qRaw !== undefined) {
		const trimmed = qRaw.trim();
		if (trimmed.length > 0) {
			q = trimmed;
		}
	}

	let modality: CourseSearchQuery['modality'];
	if (modalityRaw !== undefined) {
		if (!isCourseModality(modalityRaw)) {
			details.push({ field: 'modality', message: 'modality must be one of online, in-person, or hybrid.' });
		} else {
			modality = modalityRaw;
		}
	}

	let status: CourseSearchQuery['status'];
	if (statusRaw !== undefined) {
		if (!isCourseStatus(statusRaw)) {
			details.push({ field: 'status', message: 'status must be one of draft, active, or retired.' });
		} else {
			status = statusRaw;
		}
	}

	let tag: string | undefined;
	if (tagRaw !== undefined) {
		const trimmed = tagRaw.trim();
		if (trimmed.length === 0) {
			details.push({ field: 'tag', message: 'tag must be a non-empty string.' });
		} else {
			tag = trimmed;
		}
	}

	const sortRaw = readSingle(query, 'sort', details);
	let sort: CourseSortField = 'title';
	if (sortRaw !== undefined) {
		if (!isCourseSortField(sortRaw)) {
			details.push({ field: 'sort', message: 'sort must be one of title, createdAt, or updatedAt.' });
		} else {
			sort = sortRaw;
		}
	}

	if (details.length > 0) {
		throw new ApplicationError('INVALID_QUERY_PARAMETER', INVALID_QUERY_MESSAGE, details);
	}

	const parsed: CourseSearchQuery = { page, pageSize, sort };
	if (q !== undefined) {
		parsed.q = q;
	}
	if (modality !== undefined) {
		parsed.modality = modality;
	}
	if (status !== undefined) {
		parsed.status = status;
	}
	if (tag !== undefined) {
		parsed.tag = tag;
	}
	return parsed;
}

function readBoundedInt(raw: string | undefined, field: string, defaultValue: number, max: number | undefined, invalidMessage: string, details: FieldError[]): number {
	if (raw === undefined) {
		return defaultValue;
	}
	if (!/^[1-9]\d*$/.test(raw)) {
		details.push({ field, message: invalidMessage });
		return defaultValue;
	}
	const value = Number(raw);
	if (!Number.isSafeInteger(value) || (max !== undefined && value > max)) {
		details.push({ field, message: invalidMessage });
		return defaultValue;
	}
	return value;
}
