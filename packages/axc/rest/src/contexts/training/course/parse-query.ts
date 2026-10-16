import { Domain } from '@axc/domain';
import { optionalQuery, queryEnum, RequestValidationError } from '../../validation.ts';

const Courses = Domain.Contexts.Training.Course;
function positiveInteger(raw: string | undefined, field: string, defaultValue: number, maximum?: number): number {
	const supplied = optionalQuery(raw);
	if (supplied === undefined) {
		return defaultValue;
	}
	const message = maximum === undefined ? `${field} must be a positive integer.` : `${field} must be between 1 and ${maximum}.`;
	if (!/^[1-9]\d*$/.test(supplied)) {
		throw new RequestValidationError('INVALID_QUERY_PARAMETER', field, message);
	}
	const value = Number(supplied);
	if (!Number.isSafeInteger(value) || (maximum !== undefined && value > maximum)) {
		throw new RequestValidationError('INVALID_QUERY_PARAMETER', field, message);
	}
	return value;
}
export function parseCourseQuery(query: Partial<Record<'page' | 'pageSize' | 'modality' | 'status' | 'sort' | 'q' | 'tag', string>>): Domain.Contexts.Training.Course.CourseSearchCriteria {
	const page = positiveInteger(query.page, 'page', 1);
	const pageSize = positiveInteger(query.pageSize, 'pageSize', Courses.COURSE_DEFAULT_PAGE_SIZE, Courses.COURSE_MAX_PAGE_SIZE);
	if (!Number.isSafeInteger((page - 1) * pageSize)) {
		throw new RequestValidationError('INVALID_QUERY_PARAMETER', 'page', 'page must be a positive integer.');
	}
	const modality = queryEnum(query.modality, Courses.COURSE_MODALITIES, 'modality', 'INVALID_QUERY_PARAMETER');
	const status = queryEnum(query.status, Courses.COURSE_STATUSES, 'status', 'INVALID_QUERY_PARAMETER');
	const sort = queryEnum(query.sort, Courses.COURSE_SORT_FIELDS, 'sort', 'INVALID_QUERY_PARAMETER') ?? 'title';
	const q = optionalQuery(query.q)?.trim();
	const tag = optionalQuery(query.tag)?.trim();
	return { page, pageSize, sort, ...(modality === undefined ? {} : { modality }), ...(status === undefined ? {} : { status }), ...(q === undefined ? {} : { q }), ...(tag === undefined ? {} : { tag }) };
}
