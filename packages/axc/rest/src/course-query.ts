import type { CourseQuery } from '@axc/application-services';

interface QueryIssue {
	field: string;
	message: string;
}
const fields = ['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort'];
export function parseCourseQuery(params: URLSearchParams): { query: CourseQuery; issues: QueryIssue[] } {
	const issues: QueryIssue[] = [];
	for (const [field] of params) {
		if (!fields.includes(field)) issues.push({ field, message: `${field} is not supported.` });
	}
	for (const field of fields) {
		if (params.getAll(field).length > 1) issues.push({ field, message: `${field} must be supplied at most once.` });
	}
	function choice<T extends string>(field: string, allowed: readonly T[], fallback: T): T {
		const value = params.get(field);
		if (value === null) return fallback;
		const match = allowed.find((candidate) => candidate === value);
		if (match !== undefined) return match;
		issues.push({ field, message: `${field} must be one of: ${allowed.join(', ')}.` });
		return fallback;
	}
	function integer(field: string, fallback: number, maximum: number, message: string): number {
		const raw = params.get(field);
		if (raw === null) return fallback;
		const value = Number(raw);
		if (/^\d+$/.test(raw) && Number.isSafeInteger(value) && value >= 1 && value <= maximum) return value;
		issues.push({ field, message });
		return fallback;
	}
	const query: CourseQuery = {
		page: integer('page', 1, Number.MAX_SAFE_INTEGER, 'page must be a positive safe integer.'),
		pageSize: integer('pageSize', 10, 50, 'pageSize must be between 1 and 50.'),
		sort: choice('sort', ['title', 'createdAt', 'updatedAt'], 'title'),
	};
	if (params.has('modality')) query.modality = choice('modality', ['online', 'in-person', 'hybrid'], 'online');
	if (params.has('status')) query.status = choice('status', ['draft', 'active', 'retired'], 'active');
	if (params.has('q')) query.q = params.get('q') ?? '';
	if (params.has('tag')) query.tag = params.get('tag') ?? '';
	return { query, issues };
}
