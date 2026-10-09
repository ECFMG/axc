import { COURSE_MODALITIES, COURSE_SORT_FIELDS, COURSE_STATUSES, type CourseSearch } from '@axc/domain';

interface QueryIssue {
	field: string;
	message: string;
}

type QueryResult = { query: CourseSearch; details?: never } | { details: QueryIssue[]; query?: never };

export function parseCourseQuery(parameters: Record<string, string[]>): QueryResult {
	const details: QueryIssue[] = [];
	const allowed = ['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort'];
	for (const [field, values] of Object.entries(parameters)) {
		if (!allowed.includes(field)) details.push({ field, message: 'Unknown query parameter.' });
		else if (values.length !== 1) details.push({ field, message: 'Query parameter must be supplied once.' });
	}
	const value = (field: string) => parameters[field]?.[0];
	const enumeration = <T extends string>(field: string, options: readonly T[], fallback?: T): T | undefined => {
		const raw = value(field);
		if (raw === undefined) return fallback;
		const selected = options.find((option) => option === raw);
		if (selected === undefined) details.push({ field, message: `${field} must be one of: ${options.join(', ')}.` });
		return selected;
	};
	const integer = (field: string, fallback: number, maximum: number, message: string): number => {
		const raw = value(field);
		if (raw === undefined) return fallback;
		const number = Number(raw);
		if (!/^\d+$/.test(raw) || !Number.isSafeInteger(number) || number < 1 || number > maximum) details.push({ field, message });
		return number;
	};
	const modality = enumeration('modality', COURSE_MODALITIES);
	const status = enumeration('status', COURSE_STATUSES);
	const sort = enumeration('sort', COURSE_SORT_FIELDS, 'title') ?? 'title';
	// Bound the page so that pagination offsets remain safe integers even at pageSize 50.
	const page = integer('page', 1, Math.floor(Number.MAX_SAFE_INTEGER / 50), 'page must be a positive integer with a safe pagination offset.');
	const pageSize = integer('pageSize', 10, 50, 'pageSize must be between 1 and 50.');
	const q = value('q');
	const tag = value('tag');
	if (details.length > 0) return { details };
	return { query: { page, pageSize, sort, ...(q === undefined ? {} : { q }), ...(tag === undefined ? {} : { tag }), ...(modality === undefined ? {} : { modality }), ...(status === undefined ? {} : { status }) } };
}
