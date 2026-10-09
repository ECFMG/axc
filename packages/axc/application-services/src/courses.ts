import { COURSE_MODALITIES, COURSE_STATUSES, type Course, type CourseCatalogRepository } from '@axc/domain';

const COURSE_SORTS = ['title', 'createdAt', 'updatedAt'] as const;

export interface CourseQuery {
	q?: string;
	modality?: Course['modality'];
	status?: Course['status'];
	tag?: string;
	page: number;
	pageSize: number;
	sort: (typeof COURSE_SORTS)[number];
}

export interface CoursePage {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

interface QueryIssue {
	field: string;
	message: string;
}

function enumValue<T extends string>(field: string, value: string | undefined, allowed: readonly T[], details: QueryIssue[]): T | undefined {
	if (value === undefined) return undefined;
	const match = allowed.find((candidate) => candidate === value);
	if (match === undefined) details.push({ field, message: `${field} must be one of: ${allowed.join(', ')}.` });
	return match;
}

function positiveInteger(field: string, value: string | undefined, fallback: number, maximum: number, details: QueryIssue[]): number {
	if (value === undefined) return fallback;
	const parsed = Number(value);
	if (!/^[0-9]+$/.test(value) || !Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) {
		details.push({ field, message: field === 'pageSize' ? 'pageSize must be between 1 and 50.' : 'page must be a positive safe integer.' });
	}
	return parsed;
}

export function parseCourseQuery(parameters: Record<string, string[]>): { query: CourseQuery; details: QueryIssue[] } {
	const details: QueryIssue[] = [];
	const supported = ['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort'];
	for (const [field, values] of Object.entries(parameters)) {
		if (!supported.includes(field)) details.push({ field, message: 'Unknown query parameter.' });
		if (values.length !== 1) details.push({ field, message: `${field} must be supplied once.` });
	}
	const value = (field: string) => parameters[field]?.[0];
	const modality = enumValue('modality', value('modality'), COURSE_MODALITIES, details);
	const status = enumValue('status', value('status'), COURSE_STATUSES, details);
	const sort = enumValue('sort', value('sort'), COURSE_SORTS, details) ?? 'title';
	const page = positiveInteger('page', value('page'), 1, Number.MAX_SAFE_INTEGER, details);
	const pageSize = positiveInteger('pageSize', value('pageSize'), 10, 50, details);
	const q = value('q')?.trim().toLowerCase();
	const tag = value('tag')?.trim().toLowerCase();
	return { query: { page, pageSize, sort, ...(modality === undefined ? {} : { modality }), ...(status === undefined ? {} : { status }), ...(q === undefined ? {} : { q }), ...(tag === undefined ? {} : { tag }) }, details };
}

export async function searchCourses(repository: CourseCatalogRepository, query: CourseQuery): Promise<CoursePage> {
	const q = query.q?.trim().toLowerCase();
	const tag = query.tag?.trim().toLowerCase();
	const courses = (await repository.list()).filter(
		(course) =>
			(query.modality === undefined || course.modality === query.modality) &&
			(query.status === undefined || course.status === query.status) &&
			(!tag || course.tags.some((candidate) => candidate.toLowerCase() === tag)) &&
			(!q || [course.title, course.summary, ...course.tags].some((text) => text.toLowerCase().includes(q))),
	);
	courses.sort((left, right) => left[query.sort].localeCompare(right[query.sort]) || left.id.localeCompare(right.id));
	const totalItems = courses.length;
	const offset = (query.page - 1) * query.pageSize;
	return { items: courses.slice(offset, offset + query.pageSize), page: query.page, pageSize: query.pageSize, totalItems, totalPages: Math.ceil(totalItems / query.pageSize) };
}
