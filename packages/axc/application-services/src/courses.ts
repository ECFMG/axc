import { type Course, type CourseEntityReference, CourseModality, type CourseRepository, CourseSort, CourseStatus, DomainError, type ErrorDetail } from '@axc/domain';

export interface CourseDto extends Omit<CourseEntityReference, 'createdAt' | 'updatedAt'> {
	createdAt: string;
	updatedAt: string;
}

export interface CourseSearchResult {
	items: CourseDto[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

const toDto = ({ props }: Course): CourseDto => ({ ...props, createdAt: props.createdAt.toISOString(), updatedAt: props.updatedAt.toISOString() });

const oneOf = <T extends string>(field: string, value: string | undefined, allowed: Record<string, T>, details: ErrorDetail[]): T | undefined => {
	if (value === undefined) return undefined;
	const values = Object.values(allowed);
	if ((values as string[]).includes(value)) return value as T;
	details.push({ field, message: `${field} must be one of ${values.join(', ')}.` });
	return undefined;
};

const intInRange = (field: string, value: string | undefined, fallback: number, max: number, details: ErrorDetail[]): number => {
	if (value === undefined) return fallback;
	const n = Number(value);
	if (/^\d+$/.test(value) && n >= 1 && n <= max) return n;
	details.push({ field, message: max === Number.MAX_SAFE_INTEGER ? `${field} must be a positive integer.` : `${field} must be between 1 and ${max}.` });
	return fallback;
};

export function searchCourses(repository: CourseRepository) {
	return async (query: Record<string, string>): Promise<CourseSearchResult> => {
		const details: ErrorDetail[] = [];
		const { q, tag, modality: rawModality, status: rawStatus, sort: rawSort, page: rawPage, pageSize: rawPageSize } = query;
		const modality = oneOf('modality', rawModality, CourseModality, details);
		const status = oneOf('status', rawStatus, CourseStatus, details);
		const sort = oneOf('sort', rawSort, CourseSort, details) ?? 'title';
		const page = intInRange('page', rawPage, 1, Number.MAX_SAFE_INTEGER, details);
		const pageSize = intInRange('pageSize', rawPageSize, 10, 50, details);
		if (details.length > 0) throw new DomainError('INVALID_QUERY_PARAMETER', 'One or more query parameters are invalid.', details);

		const matches = (await repository.getAll())
			.filter((c) => (q === undefined || c.matchesKeyword(q)) && (tag === undefined || c.hasTag(tag)) && (modality === undefined || c.props.modality === modality) && (status === undefined || c.props.status === status))
			.sort((a, b) => (sort === 'title' ? a.props.title.localeCompare(b.props.title) : a.props[sort].getTime() - b.props[sort].getTime()));

		return {
			items: matches.slice((page - 1) * pageSize, page * pageSize).map(toDto),
			page,
			pageSize,
			totalItems: matches.length,
			totalPages: Math.ceil(matches.length / pageSize),
		};
	};
}
