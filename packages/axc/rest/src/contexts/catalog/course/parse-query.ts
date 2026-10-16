import { Domain } from '@axc/domain';

const CourseValues = Domain.Contexts.Catalog.Course;
type Criteria = Domain.Contexts.Catalog.Course.CourseSearchCriteria;
interface QueryError {
	field: string;
	message: string;
}
type CourseQueryResult = { criteria: Criteria; details?: never } | { criteria?: never; details: QueryError[] };
const queryFields = ['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort'];
function optionalText(value: string | undefined): string | undefined {
	if (value === undefined || value.trim() === '') {
		return undefined;
	}
	return value.trim();
}
function enumValue<T extends string>(field: string, value: string | undefined, allowed: readonly T[], details: QueryError[]): T | undefined {
	if (value === undefined) {
		return undefined;
	}
	const match = allowed.find((candidate) => candidate === value);
	if (match === undefined) {
		details.push({ field, message: `${field} must be one of: ${allowed.join(', ')}.` });
	}
	return match;
}
function positiveInteger(field: string, raw: string | undefined, defaultValue: number, maximum: number, details: QueryError[]): number | undefined {
	if (optionalText(raw) === undefined) {
		return defaultValue;
	}
	if (raw !== undefined && /^[0-9]+$/.test(raw)) {
		const value = Number(raw);
		if (Number.isSafeInteger(value) && value >= 1 && value <= maximum) {
			return value;
		}
	}
	details.push({ field, message: `${field} must be between 1 and ${maximum}.` });
	return undefined;
}
export function parseCourseQuery(query: Record<string, string[]>): CourseQueryResult {
	const details: QueryError[] = [];
	for (const [field, values] of Object.entries(query)) {
		if (!queryFields.includes(field)) {
			details.push({ field, message: 'Unknown query parameter.' });
		} else if (values.length > 1) {
			details.push({ field, message: `${field} must be supplied only once.` });
		}
	}
	// biome-ignore lint/complexity/useLiteralKeys: Query parameters use an index signature.
	const modality = enumValue('modality', optionalText(query['modality']?.[0]), CourseValues.COURSE_MODALITIES, details);
	// biome-ignore lint/complexity/useLiteralKeys: Query parameters use an index signature.
	const status = enumValue('status', optionalText(query['status']?.[0]), CourseValues.COURSE_STATUSES, details);
	// biome-ignore lint/complexity/useLiteralKeys: Query parameters use an index signature.
	const sort = enumValue('sort', optionalText(query['sort']?.[0]) ?? 'title', CourseValues.COURSE_SORT_FIELDS, details);
	// biome-ignore lint/complexity/useLiteralKeys: Query parameters use an index signature.
	const page = positiveInteger('page', query['page']?.[0], CourseValues.COURSE_DEFAULT_PAGE, Number.MAX_SAFE_INTEGER, details);
	// biome-ignore lint/complexity/useLiteralKeys: Query parameters use an index signature.
	const pageSize = positiveInteger('pageSize', query['pageSize']?.[0], CourseValues.COURSE_DEFAULT_PAGE_SIZE, CourseValues.COURSE_MAX_PAGE_SIZE, details);
	if (details.length > 0 || page === undefined || pageSize === undefined || sort === undefined) {
		return { details };
	}
	const criteria: Criteria = { page, pageSize, sort };
	// biome-ignore lint/complexity/useLiteralKeys: Query parameters use an index signature.
	const q = optionalText(query['q']?.[0]);
	// biome-ignore lint/complexity/useLiteralKeys: Query parameters use an index signature.
	const tag = optionalText(query['tag']?.[0]);
	if (q !== undefined) {
		criteria.q = q;
	}
	if (tag !== undefined) {
		criteria.tag = tag;
	}
	if (modality !== undefined) {
		criteria.modality = modality;
	}
	if (status !== undefined) {
		criteria.status = status;
	}
	return { criteria };
}
